// app/api/document/route.ts
import { NextRequest } from 'next/server';
import { noStoreJson } from '@/app/lib/server/json';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DEMO: Record<string, string> = {
  'ustav_vs_rf': `Устав Вооружённых Сил Российской Федерации (демо-версия)
\nРаздел I. Общие положения
\nРаздел II. Права и обязанности военнослужащих
\nРаздел III. Организация службы и подчинённость
\n\nДемо-текст. Подключите реальную базу, чтобы отдавать актуальную редакцию.`,
  'ustav_vnutr_sluzhby': `Устав внутренней службы ВС РФ (демо-версия)
\nГлава 1. Назначение устава
\nГлава 2. Организация внутренней службы
\nГлава 3. Должностные лица и их обязанности
\n\nДемо-текст. Здесь будет полный текст устава из вашей БД.`,
  'ustav_disciplinarny': `Дисциплинарный устав ВС РФ (демо-версия)
\nРаздел I. Дисциплинарная власть
\nРаздел II. Виды дисциплинарных взысканий
\nРаздел III. Порядок наложения взысканий
\n\nДемо-текст. Подмените на актуальную редакцию.`,
  'ustav_garnizon': `Устав гарнизонной и караульной службы ВС РФ (демо-версия)
\nЧасть 1. Гарнизонная служба
\nЧасть 2. Караульная служба
\nПриложения: обязанности, распорядки, формы документов
\n\nДемо-текст. Подключите реальные материалы.`,
};

const QuerySchema = z.object({ id: z.string().min(1) });

export async function GET(req: NextRequest) {
  const parse = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parse.success) return noStoreJson({ error: parse.error.flatten() }, { status: 400 });
  const id = parse.data.id;
  const content = DEMO[id] || `Это демо-контент для документа: ${id}.

Здесь будет отображаться текст кодекса/закона из вашей базы данных.
Подключите сюда реальный провайдер данных и отдавайте актуальную редакцию.`;
  return noStoreJson({ id, content });
}
