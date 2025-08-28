// app/api/favorites/route.ts
import { NextRequest } from 'next/server';
import { getRedis } from '@/app/lib/server/redis';
import { noStoreJson } from '@/app/lib/server/json';
import { FavoritesWriteSchema } from '@/app/lib/server/schemas';

export const dynamic = 'force-dynamic';

// in-memory fallback
const MEM = new Map<string, Set<string>>();

export async function GET(req: NextRequest) {
  const redis = getRedis();
  const userId = req.nextUrl.searchParams.get('userId') || 'anonymous';
  if (redis) {
    const key = `fav:${userId}`;
    const favs = await redis.smembers<string>(key) || [];
    return noStoreJson({ favorites: favs });
  }
  const set = MEM.get(userId) || new Set();
  return noStoreJson({ favorites: Array.from(set) });
}

export async function POST(req: NextRequest) {
  const redis = getRedis();
  const json = await req.json().catch(() => ({}));
  const parsed = FavoritesWriteSchema.safeParse(json);
  if (!parsed.success) return noStoreJson({ error: parsed.error.flatten() }, { status: 400 });
  const { userId, docId } = parsed.data;

  if (redis) {
    const key = `fav:${userId}`;
    await redis.sadd(key, docId);
    return noStoreJson({ ok: true });
  }
  const set = MEM.get(userId) || new Set();
  set.add(docId);
  MEM.set(userId, set);
  return noStoreJson({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const redis = getRedis();
  const json = await req.json().catch(() => ({}));
  const parsed = FavoritesWriteSchema.safeParse(json);
  if (!parsed.success) return noStoreJson({ error: parsed.error.flatten() }, { status: 400 });
  const { userId, docId } = parsed.data;

  if (redis) {
    const key = `fav:${userId}`;
    await redis.srem(key, docId);
    return noStoreJson({ ok: true });
  }
  const set = MEM.get(userId) || new Set();
  set.delete(docId);
  MEM.set(userId, set);
  return noStoreJson({ ok: true });
}
