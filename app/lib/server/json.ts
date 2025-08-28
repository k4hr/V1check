// app/lib/server/json.ts
export function noStoreJson(body: any, init?: ResponseInit) {
  const headers = new Headers(init?.headers || {});
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return new Response(JSON.stringify(body), {
    status: init?.status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...Object.fromEntries(headers.entries()),
    },
  });
}
