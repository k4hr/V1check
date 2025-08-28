// app/page.tsx (V7 client guards + server hardening)
'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ITEMS, Item } from './data/items';
import Library from './components/Library';
import DocumentsList from './components/DocumentsList';
import DocumentView from './components/DocumentView';
import SearchOverlay from './components/SearchOverlay';
import type { Doc } from './data/library';

const Cabinet = dynamic(() => import('./components/Cabinet'), { ssr: false });

type Purchase = {
  itemId: string;
  createdAt?: string;
  expiresAt?: string;
};

export default function Home() {
  const [initialized, setInitialized] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showPlans, setShowPlans] = useState(false);
  const [showCabinet, setShowCabinet] = useState(false);

  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const [demoRemaining, setDemoRemaining] = useState<number>(2);
  const [freeReadsExpiry, setFreeReadsExpiry] = useState<number | null>(null);

  const inFlight = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const WebApp = (await import('@twa-dev/sdk')).default;
        if (WebApp) {
          WebApp.ready();
          WebApp.expand();
          try { WebApp.setHeaderColor('#0f1114'); WebApp.setBackgroundColor('#0f1114'); } catch {}
          if (WebApp.initDataUnsafe?.user) setUserId(String(WebApp.initDataUnsafe.user.id));
        }
      } catch {}
      setInitialized(true);
    })();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    (async () => {
      try {
        setIsLoading(true);
        const [pRes, fRes] = await Promise.all([
          fetch(`/api/purchases?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' }),
          fetch(`/api/free-reads?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' }),
        ]);
        if (!pRes.ok) throw new Error('Failed to fetch purchases');
        const pdata = await pRes.json();
        setPurchases(pdata.purchases || []);

        if (fRes.ok) {
          const fdata = await fRes.json();
          setDemoRemaining(typeof fdata.remaining === 'number' ? fdata.remaining : 2);
          setFreeReadsExpiry(typeof fdata.expiresAt === 'number' ? fdata.expiresAt : null);
        }
      } catch (e) {
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [initialized, userId]);

  const now = Date.now();
  const hasActiveSubscription = purchases.some(p => {
    const exp = p.expiresAt ? new Date(p.expiresAt) : null;
    if (exp) return exp.getTime() > now;
    return ['sub_week','sub_month','sub_halfyear','sub_year'].includes(p.itemId);
  });

  const handlePurchase = async (itemOrPlanId: Item | string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const planId = typeof itemOrPlanId === 'string' ? itemOrPlanId : itemOrPlanId.id;
    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: planId, userId })
      });
      if (!response.ok) throw new Error('Failed to create invoice');
      const { invoice_link } = await response.json();
      const WebApp = (await import('@twa-dev/sdk')).default;
      WebApp.openInvoice(invoice_link, async (status: string) => {
        if (status === 'paid') {
          const r = await fetch(`/api/purchases?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
          if (r.ok) {
            const d = await r.json();
            setPurchases(d.purchases || []);
          }
        }
      });
    } catch (e) {
      setError('Не удалось создать инвойс');
    } finally {
      inFlight.current = false;
    }
  };

  const openLibrary = () => { setShowLibrary(true); setSelectedCategory(null); setSelectedDoc(null); };
  const handleSelectCategory = (categoryId: string) => { setSelectedCategory(categoryId); setSelectedDoc(null); };

  const handleOpenDoc = async (doc: Doc) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (hasActiveSubscription) { setSelectedDoc(doc); return; }
      const res = await fetch('/api/free-reads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, docId: doc.id, action: 'consume' })
      });
      if (!res.ok) { setShowPlans(true); return; }
      const data = await res.json();
      if (data.ok === false && data.reason === 'limit') { setDemoRemaining(0); setShowPlans(true); return; }
      setSelectedDoc(doc);
      setDemoRemaining(typeof data.remaining === 'number' ? data.remaining : 0);
      if (typeof data.expiresAt === 'number') setFreeReadsExpiry(data.expiresAt);
    } finally {
      inFlight.current = false;
    }
  };

  const freeReadsBadge = freeReadsExpiry ? `Сброс через ${Math.max(1, Math.ceil((freeReadsExpiry - Date.now()) / (1000*60*60)))} ч` : '';

  if (isLoading) return <div className="p-6 text-center">Загрузка…</div>;
  if (error) return <div className="p-6 text-center">{error}</div>;

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2 text-center">Juristum</h1>
      <p className="text-center tg-hint mb-6">Кодексы, законы и свежие редакции</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        <button className="tg-button w-full py-3 font-bold" onClick={() => setShowCabinet(true)} disabled={inFlight.current}>Личный кабинет</button>
        <button className="tg-button w-full py-3 font-bold" onClick={() => handlePurchase('sub_month')} disabled={inFlight.current}>Купить подписку</button>
        {hasActiveSubscription ? (
          <button className="tg-button w-full py-3 font-bold" onClick={openLibrary} disabled={inFlight.current}>Мои законы</button>
        ) : (
          <button className="tg-button w-full py-3 font-bold" onClick={openLibrary} disabled={inFlight.current}>Читать бесплатно ({demoRemaining})</button>
        )}
      </div>
      {!hasActiveSubscription && <p className="text-center tg-hint mb-6">{freeReadsBadge}</p>}

      {showPlans && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Выберите подписку <span className="tg-hint text-sm">• оплата в ⭐</span></h2>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="tg-card cursor-pointer hover:opacity-95 transition-all flex items-center" onClick={() => handlePurchase(item)}>
                <div className="text-3xl mr-4">{item.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold">
                    {item.name}{' '}
                    {item.id === 'sub_year' && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-extrabold" style={{ background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>Выгодно</span>}
                  </div>
                  <div className="text-sm tg-hint">{item.description}</div>
                </div>
                <div className="px-3 py-1 rounded-full text-sm tg-button">{item.price} ⭐</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCabinet && (
        <div className="mb-8">
          <Cabinet purchases={purchases} userId={userId} onRenew={(planId) => handlePurchase(planId)} />
        </div>
      )}

      {showLibrary && !selectedCategory && !selectedDoc && (
        <div className="mb-8">
          <Library onSelect={(id) => setSelectedCategory(id)} onSearch={() => setShowSearch(true)} />
        </div>
      )}

      {showLibrary && selectedCategory && !selectedDoc && (
        <div className="mb-8">
          <DocumentsList categoryId={selectedCategory} onOpen={handleOpenDoc} locked={!hasActiveSubscription && demoRemaining <= 0} />
        </div>
      )}

      {showLibrary && selectedCategory && selectedDoc && (
        <div className="mb-8">
          <DocumentView doc={selectedDoc} onBack={() => setSelectedDoc(null)} userId={userId} />
        </div>
      )}

      {showSearch && (
        <SearchOverlay onClose={() => setShowSearch(false)} onOpen={(doc) => { setShowSearch(false); handleOpenDoc(doc); }} />
      )}
    </div>
  );
}
