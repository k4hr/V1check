// app/api/free-reads/route.ts
import { NextRequest } from 'next/server';
import { getRedis } from '@/app/lib/server/redis';
import { noStoreJson } from '@/app/lib/server/json';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DEFAULT_REMAINING = 2;
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

// In-memory fallback
type State = { remaining: number; seen: Set<string>; expiresAt: number; updatedAt: number };
const MEM = new Map<string, State>();

const QuerySchema = z.object({ userId: z.string().optional() });
const PostSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(['consume','reset','seed']).default('consume'),
  docId: z.string().optional(),
  amount: z.number().optional(),
});

function now(){ return Date.now(); }

function memEnsure(userId: string): State {
  const t = now();
  const st = MEM.get(userId);
  if (!st || st.expiresAt <= t) {
    const fresh: State = { remaining: DEFAULT_REMAINING, seen: new Set(), updatedAt: t, expiresAt: t + TTL_MS };
    MEM.set(userId, fresh);
    return fresh;
    }
  return st;
}

export async function GET(req: NextRequest) {
  const redis = getRedis();
  const parse = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const userId = parse.success && parse.data.userId ? parse.data.userId : 'anonymous';

  if (redis) {
    const keyR = `free:${userId}:remaining`;
    const keyS = `free:${userId}:seen`;
    // ensure init
    let remaining = await redis.get<number>(keyR);
    if (remaining === null) {
      await redis.set(keyR, DEFAULT_REMAINING, { px: TTL_MS });
      remaining = DEFAULT_REMAINING;
    } else {
      await redis.pexpire(keyR, TTL_MS);
    }
    const seen = await redis.smembers<string>(keyS) || [];
    if (seen.length === 0) { await redis.pexpire(keyS, TTL_MS); }
    const expiresAt = now() + TTL_MS;
    return noStoreJson({ remaining, seen, expiresAt });
  }

  const st = memEnsure(userId);
  return noStoreJson({ remaining: st.remaining, seen: Array.from(st.seen), expiresAt: st.expiresAt });
}

export async function POST(req: NextRequest) {
  const redis = getRedis();
  const body = await req.json().catch(() => ({}));
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userId, action, docId, amount } = parsed.data;

  if (redis) {
    const keyR = `free:${userId}:remaining`;
    const keyS = `free:${userId}:seen`;

    if (action === 'reset') {
      await redis.set(keyR, DEFAULT_REMAINING, { px: TTL_MS });
      await redis.del(keyS);
      return noStoreJson({ ok: true, remaining: DEFAULT_REMAINING, seen: [] });
    }

    if (action === 'seed') {
      const val = typeof amount === 'number' ? Math.max(0, Math.floor(amount)) : DEFAULT_REMAINING;
      await redis.set(keyR, val, { px: TTL_MS });
      await redis.pexpire(keyS, TTL_MS);
      const seen = await redis.smembers<string>(keyS) || [];
      return noStoreJson({ ok: true, remaining: val, seen });
    }

    // consume
    if (!docId) return noStoreJson({ error: { message: 'docId required' } }, { status: 400 });
    // atomic with Lua
    const script = `
      local keyR = KEYS[1]
      local keyS = KEYS[2]
      local doc  = ARGV[1]
      local ttl  = tonumber(ARGV[2])
      local rem = tonumber(redis.call('GET', keyR) or '-1')
      if rem < 0 then
        rem = ${DEFAULT_REMAINING}
      end
      local seen = redis.call('SISMEMBER', keyS, doc)
      if seen == 1 then
        redis.call('PEXPIRE', keyR, ttl)
        redis.call('PEXPIRE', keyS, ttl)
        return {1, rem} -- ok, no decrement
      end
      if rem > 0 then
        rem = rem - 1
        redis.call('SET', keyR, rem, 'PX', ttl)
        redis.call('SADD', keyS, doc)
        redis.call('PEXPIRE', keyS, ttl)
        return {1, rem} -- ok, decremented
      else
        return {0, rem} -- limit
      end
    `;
    const [ok, remaining] = await redis.eval(script, [keyR, keyS], [docId, String(TTL_MS)]) as [number, number];
    if (ok === 0) return noStoreJson({ ok: false, reason: 'limit', remaining });
    return noStoreJson({ ok: true, remaining });
  }

  // Fallback: memory
  const st = memEnsure(userId);
  if (action === 'reset') {
    const fresh = memEnsure(userId);
    fresh.remaining = DEFAULT_REMAINING;
    fresh.seen = new Set();
    fresh.expiresAt = now() + TTL_MS;
    return noStoreJson({ ok: true, remaining: fresh.remaining, seen: [] });
  }
  if (action === 'seed') {
    st.remaining = typeof amount === 'number' ? Math.max(0, Math.floor(amount)) : DEFAULT_REMAINING;
    st.expiresAt = now() + TTL_MS;
    return noStoreJson({ ok: true, remaining: st.remaining, seen: Array.from(st.seen) });
  }
  if (!docId) return noStoreJson({ error: { message: 'docId required' } }, { status: 400 });
  if (!st.seen.has(docId)) {
    if (st.remaining > 0) {
      st.remaining -= 1;
      st.seen.add(docId);
      st.expiresAt = now() + TTL_MS;
    } else {
      return noStoreJson({ ok: false, reason: 'limit', remaining: 0 });
    }
  }
  return noStoreJson({ ok: true, remaining: st.remaining, seen: Array.from(st.seen), expiresAt: st.expiresAt });
}
