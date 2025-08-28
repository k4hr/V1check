// app/components/ui/Skeleton.tsx
'use client';

export function CardSkeleton() {
  return (
    <div className="tg-card animate-pulse">
      <div className="h-4 w-1/3 mb-2" style={{background:'rgba(255,255,255,0.15)'}} />
      <div className="h-3 w-1/2" style={{background:'rgba(255,255,255,0.12)'}} />
    </div>
  );
}

export function DocumentSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="tg-button" style={{opacity:0.5}}>← Назад</div>
        <div className="tg-button" style={{opacity:0.5}}>☆ В избранное</div>
      </div>
      <div className="h-6 w-2/3" style={{background:'rgba(255,255,255,0.15)'}} />
      <div className="tg-card">
        <div className="h-4 w-full mb-2" style={{background:'rgba(255,255,255,0.12)'}} />
        <div className="h-4 w-5/6 mb-2" style={{background:'rgba(255,255,255,0.12)'}} />
        <div className="h-4 w-4/6" style={{background:'rgba(255,255,255,0.12)'}} />
      </div>
    </div>
  );
}
