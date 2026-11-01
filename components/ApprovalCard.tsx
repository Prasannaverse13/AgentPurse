'use client';

import { useState } from 'react';
import type { Txn } from '@/lib/types';
import { api, ago, refreshAll, usd } from '@/lib/client';

export function StatusBadge({ status }: { status: Txn['status'] }) {
  const dot = status === 'blocked' || status === 'failed' || status === 'declined' ? 'dot-rose' : status === 'paid' ? 'dot-ink' : '';
  return <span className="badge badge-fog"><span className={`dot ${dot}`} />{status[0].toUpperCase() + status.slice(1)}</span>;
}

export default function ApprovalCard({ a, showChecks = false }: { a: Txn; showChecks?: boolean }) {
  const [state, setState] = useState<'open' | 'busy' | 'done'>('open');
  const [msg, setMsg] = useState('');

  const act = async (decision: 'approve' | 'decline') => {
    setState('busy');
    try {
      const r = await api<Txn & { paypal: { payoutBatchId?: string } | null }>(`/approvals/${a.id}`, { body: { decision } });
      setMsg(decision === 'approve'
        ? r.status === 'paid' ? `Paid with PayPal Payouts · ${r.paypal?.payoutBatchId ?? ''}` : `Payment ${r.status}`
        : 'Declined. The agent was told.');
      setState('done');
      setTimeout(refreshAll, 1200);
    } catch (e) {
      setMsg((e as Error).message);
      setState('open');
    }
  };

  return (
    <div className="card stack gap-16">
      <div className="row between gap-8">
        <div className="row gap-8">
          <div className="avatar dark">{a.agentName.slice(0, 2).toUpperCase()}</div>
          <div className="stack">
            <span className="small ink" style={{ fontWeight: 500 }}>{a.agentName}</span>
            <span className="caption">{ago(a.createdAt)}</span>
          </div>
        </div>
      </div>
      {a.flag && <span className="badge badge-fog" style={{ alignSelf: 'flex-start' }}><span className="dot dot-rose" />{a.flag}</span>}
      <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
        {a.productImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.productImage} alt="" width={64} height={64} referrerPolicy="no-referrer" style={{ borderRadius: 12, objectFit: 'cover', background: 'var(--color-fog)' }} />
        )}
        <div className="stack gap-4" style={{ minWidth: 0 }}>
          <span className="caption">{a.merchant}</span>
          <span className="ink" style={{ fontWeight: 500, fontSize: 18 }}>{a.item}</span>
          {a.productUrl && <a href={a.productUrl} target="_blank" rel="noopener noreferrer" className="caption" style={{ textDecoration: 'underline' }}>View product from Channel3</a>}
        </div>
      </div>
      <span className="stat-value" style={{ marginTop: -4 }}>{usd(a.amount)}</span>
      {a.reason && <div className="reason"><span className="caption">Agent says</span><br />{a.reason}</div>}
      {a.aiNote && <div className="inner small"><span className="caption ink" style={{ fontWeight: 500 }}>AI review</span><br />{a.aiNote}</div>}
      {showChecks && (
        <div className="stack gap-4">
          {a.checks.map((c, i) => (
            <div key={i} className="row gap-8 caption" style={{ color: c.ok ? 'var(--color-stone)' : 'var(--color-midnight-ink)' }}>
              <span aria-hidden style={{ width: 14, height: 14, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 9, background: c.ok ? 'var(--color-fog)' : 'var(--color-dusty-rose)', color: c.ok ? 'var(--color-stone)' : '#fff', flexShrink: 0 }}>{c.ok ? '✓' : '!'}</span>
              {c.rule}
            </div>
          ))}
        </div>
      )}
      <div style={{ minHeight: 44, marginTop: 'auto' }}>
        {state !== 'done' && (
          <div className="row gap-8">
            <button className="btn btn-primary" disabled={state === 'busy'} onClick={() => act('approve')}>{state === 'busy' ? 'Paying…' : 'Approve and pay'}</button>
            <button className="btn btn-ghost" disabled={state === 'busy'} onClick={() => act('decline')}>Decline</button>
          </div>
        )}
        {msg && <div className="small" style={{ marginTop: state === 'done' ? 0 : 8 }}>{msg}</div>}
      </div>
    </div>
  );
}
