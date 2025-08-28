// app/components/DocumentView.tsx
'use client';

import { useEffect, useState } from 'react';
import { Doc, getCategoryTitle } from '../data/library';
import { DocumentSkeleton } from './ui/Skeleton';

export default function DocumentView({
  doc,
  onBack,
  userId
}: {
  doc: Doc;
  onBack: () => void;
  userId: string;
}) {
  const [content, setContent] = useState<string>('');
  const [isFav, setIsFav] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [favLoading, setFavLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/document?id=${encodeURIComponent(doc.id)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setContent(data.content || 'Документ загружен.');
        } else {
          if (isMounted) setContent('Предпросмотр документа недоступен.');
        }
      } catch {
        if (isMounted) setContent('Ошибка загрузки документа.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    (async () => {
      try {
        const res = await fetch(`/api/favorites?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const list: string[] = data.favorites || [];
          setIsFav(list.includes(doc.id));
        }
      } catch {}
    })();

    return () => { isMounted = false; };
  }, [doc.id, userId]);

  const toggleFav = async () => {
    if (favLoading) return;
    setFavLoading(true);
    try {
      if (!isFav) {
        await fetch('/api/favorites', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, docId: doc.id })
        });
        setIsFav(true);
      } else {
        await fetch('/api/favorites', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, docId: doc.id })
        });
        setIsFav(false);
      }
    } finally {
      setFavLoading(false);
    }
  };

  const catTitle = getCategoryTitle(doc.category);

  if (loading) return <DocumentSkeleton />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className="tg-button" onClick={onBack}>← Назад</button>
        <button className="tg-button" onClick={toggleFav} disabled={favLoading}>
          {isFav ? '★ В избранном' : '☆ В избранное'}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">{doc.title}</h2>
        <span className="px-2 py-0.5 rounded-full text-xs" style={{background:'rgba(255,255,255,0.1)'}}>
          {catTitle}
        </span>
      </div>
      <div className="tg-card" style={{whiteSpace:'pre-wrap'}}>
        {content || 'Загрузка…'}
      </div>
    </div>
  );
}
