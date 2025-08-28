// app/components/DocumentsList.tsx
'use client';

import { useRef } from 'react';
import { Doc, getDocsByCategory, getCategoryTitle } from '../data/library';

export default function DocumentsList({
  categoryId,
  onOpen,
  locked
}: {
  categoryId: string;
  onOpen: (doc: Doc) => void;
  locked: boolean;
}) {
  const docs = getDocsByCategory(categoryId);
  const title = getCategoryTitle(categoryId);
  const lastClickRef = useRef<number>(0);

  const click = (d: Doc) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return; // debounce 200ms
    lastClickRef.current = now;
    onOpen(d);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="tg-hint -mt-1 mb-2">
        {categoryId === 'charters' ? 'Служебные уставы и регламенты' : 'Список документов'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {docs.map((d) => (
          <div
            key={d.id}
            className="tg-card flex items-center justify-between cursor-pointer hover:opacity-95"
            onClick={() => click(d)}
          >
            <div className="font-medium">{d.title}</div>
            {locked && <span title="Доступ по подписке">🔒</span>}
          </div>
        ))}
      </div>

      {docs.length === 0 && <p className="tg-hint">Пока пусто</p>}
    </div>
  );
}
