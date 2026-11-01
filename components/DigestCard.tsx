'use client';

import { useState } from 'react';
import { api, useApi, usd, ago } from '@/lib/client';
import type { StoredDigest } from '@/lib/digest';

export default function DigestCard() {
  const { data } = useApi<{ digest: StoredDigest | null }>('/digest', 6000);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const d = data?.digest;

  async function run() {
    setBusy(true);
    setNote('');
    try {
      const r = await api<{ ok: boolean; reason?: string }>('/digest/run', { method: 'POST' });
      setNote(r.ok ? 'Started on Render Workflows. The digest lands here in a few seconds.' : r.reason === 'not_configured' ? 'Render Workflows is not connected yet.' : 'Could not start the task.');
    } catch {
      setNote('Could not start the task.');
    }
    setBusy(false);
  }

  return (
    <div className="card stack gap-16" style={{ marginTop: 24 }}>
      <div className="row between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="stack gap-4">
          <span className="stat-label">Weekly digest</span>
          <span className="caption">{d ? `Built by Render Workflows ${ago(d.at)}` : 'Built by a Render Workflows task'}</span>
        </div>
        <button className="btn btn-dark btn-sm" onClick={run} disabled={busy}>{busy ? 'Starting…' : 'Run on Render Workflows'}</button>
      </div>
      {d ? (
        <>
          <p className="body ink" style={{ fontSize: 16, lineHeight: 1.55, margin: 0 }}>{d.recap}</p>
          <div className="grid-4" style={{ gap: 16 }}>
            <div className="inner"><div className="stat-label">Paid</div><div className="amount" style={{ marginTop: 6 }}>{usd(d.paidTotal)}</div></div>
            <div className="inner"><div className="stat-label">Blocked</div><div className="amount" style={{ marginTop: 6 }}>{d.blockedCount}</div></div>
            <div className="inner"><div className="stat-label">Waiting</div><div className="amount" style={{ marginTop: 6 }}>{d.waitingCount}</div></div>
            <div className="inner"><div className="stat-label">Top spender</div><div className="amount" style={{ marginTop: 6 }}>{d.topAgent ? d.topAgent.name : 'None'}</div></div>
          </div>
        </>
      ) : (
        <p className="small" style={{ margin: 0 }}>No digest yet. The task reads the ledger, writes the recap with AI and posts it here.</p>
      )}
      {note && <p className="small" style={{ margin: 0 }} role="status">{note}</p>}
    </div>
  );
}
