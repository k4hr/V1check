export const dynamic = 'force-dynamic';

const DEMO = {
  konst_rf: `Конституция Российской Федерации (демо)
Статья 1. Российская Федерация — Россия есть демократическое федеративное правовое государство
с республиканской формой правления.
...
(Подключите файл/БД для полного текста)`,
};

export async function GET(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const content = DEMO[id] ?? `Документ ${id} не найден (демо).`;
  return new Response(JSON.stringify({ id, content }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}
