'use client';

import { useEffect, useRef, useState } from 'react';
import { api, refreshAll, usd } from '@/lib/client';

type Config = { paypalClientId: string | null; paypal: 'sandbox' | 'live' | 'mock'; ai: string };

type PayPalButtons = (opts: {
  style?: Record<string, unknown>;
  createOrder: () => Promise<string>;
  onApprove: (d: { orderID: string }) => Promise<void>;
  onError?: (e: unknown) => void;
}) => { render: (el: HTMLElement) => Promise<void>; close?: () => void };

declare global {
  interface Window { paypal?: { Buttons: PayPalButtons } }
}

function loadSdk(clientId: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.paypal) return resolve();
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load PayPal'));
    document.head.appendChild(s);
  });
}

export default function FundCard({ balance }: { balance: number }) {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [amount, setAmount] = useState(100);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const amountRef = useRef(amount);
  amountRef.current = amount;

  useEffect(() => { api<Config>('/config').then(setCfg).catch(() => {}); }, []);

  useEffect(() => {
    if (!cfg?.paypalClientId || !box.current) return;
    let btn: { close?: () => void } | undefined;
    loadSdk(cfg.paypalClientId).then(() => {
      if (!window.paypal || !box.current) return;
      box.current.innerHTML = '';
      const b = window.paypal.Buttons({
        style: { layout: 'horizontal', shape: 'pill', color: 'gold', label: 'pay', height: 44, tagline: false },
        createOrder: async () => (await api<{ orderId: string }>('/fund/order', { body: { amount: amountRef.current } })).orderId,
        onApprove: async ({ orderID }) => {
          const r = await api<{ balance: number }>('/fund/capture', { body: { orderId: orderID } });
          setMsg(`Added. Balance is now ${usd(r.balance)}`);
          refreshAll();
        },
        onError: (e) => setMsg(`PayPal error: ${String(e)}`),
      });
      btn = b;
      b.render(box.current);
    }).catch((e) => setMsg(e.message));
    return () => btn?.close?.();
  }, [cfg?.paypalClientId]);

  const mockFund = async () => {
    setBusy(true);
    try {
      const { orderId } = await api<{ orderId: string }>('/fund/order', { body: { amount } });
      const r = await api<{ balance: number }>('/fund/capture', { body: { orderId } });
      setMsg(`Added. Balance is now ${usd(r.balance)}`);
      refreshAll();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };

  const withdraw = async () => {
    setBusy(true);
    try {
      const r = await api<{ balance: number }>('/fund/withdraw', { body: { amount } });
      setMsg(`Sent back to your PayPal. Balance is now ${usd(r.balance)}`);
      refreshAll();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="card stack gap-16">
      <div className="row between">
        <span className="stat-label">Purse balance</span>
        <span className="badge badge-fog"><span className={`dot ${cfg?.paypal === 'mock' ? '' : 'dot-ink'}`} />PayPal {cfg?.paypal ?? '…'}</span>
      </div>
      <div className="stat-value" style={{ marginTop: 0 }}>{usd(balance)}</div>
      <div className="row gap-12" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ width: 110 }}>
          <label htmlFor="fund-amt">Amount USD</label>
          <input id="fund-amt" type="number" min={1} max={10000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        {cfg?.paypalClientId ? (
          <div ref={box} style={{ flex: 1, minWidth: 180 }} />
        ) : (
          <button className="btn btn-primary" onClick={mockFund} disabled={busy}>Add funds</button>
        )}
        <button className="btn btn-ghost" onClick={withdraw} disabled={busy}>Withdraw</button>
      </div>
      {msg && <div className="small">{msg}</div>}
      {cfg?.paypal === 'mock' && <div className="caption muted">Mock mode. Add PayPal sandbox keys to .env.local to move sandbox money.</div>}
    </div>
  );
}
