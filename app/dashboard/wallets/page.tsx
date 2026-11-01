'use client';

import { useState } from 'react';
import Topbar from '@/components/Topbar';
import { api, refreshAll, useApi, usd } from '@/lib/client';
import type { State } from '@/lib/state';

export default function Wallets() {
  const { data, reload } = useApi<State>('/state', 5000);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', kind: '', dailyCap: 100, autoApproveLimit: 50, shops: '' });
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');

  const patch = async (id: string, body: object) => {
    await api(`/agents/${id}`, { method: 'PATCH', body });
    reload(); refreshAll();
  };

  const copy = async (id: string, key: string) => {
    try { await navigator.clipboard.writeText(key); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch { setShowKey(id); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      const a = await api<{ id: string }>('/agents', { body: form });
      setForm({ name: '', kind: '', dailyCap: 100, autoApproveLimit: 50, shops: '' });
      setAdding(false);
      setShowKey(a.id);
      reload();
    } catch (e2) { setErr((e2 as Error).message); }
  };

  return (
    <>
      <Topbar title="Agent wallets" sub="Each agent gets its own budget, allow list and key. Freeze any wallet in one tap." />

      <div className="grid-2">
        {data?.agents.map((a) => (
          <div key={a.id} className="card stack" style={{ gap: 20 }}>
            <div className="row between">
              <div className="row gap-12">
                <div className="avatar dark">{a.initials}</div>
                <div className="stack">
                  <span className="ink" style={{ fontWeight: 500 }}>{a.name}</span>
                  <span className="caption">{a.kind}</span>
                </div>
              </div>
              <div className="row gap-8">
                <span className="caption">{a.status === 'active' ? 'Active' : 'Frozen'}</span>
                <button className="switch" role="switch" aria-checked={a.status === 'active'} aria-label={`Toggle ${a.name}`}
                  onClick={() => patch(a.id, { status: a.status === 'active' ? 'frozen' : 'active' })} />
              </div>
            </div>
            {a.status === 'frozen' && a.frozenReason && (
              <span className="badge badge-fog" style={{ alignSelf: 'flex-start' }}><span className="dot dot-rose" />{a.frozenReason}</span>
            )}

            <div>
              <div className="stat-label">Spent today</div>
              <div className="stat-value">{usd(a.spentToday)}<span className="muted" style={{ fontSize: 20 }}> / {usd(a.dailyCap)}</span></div>
              <div className="meter" style={{ marginTop: 12 }}><span style={{ width: `${Math.min(100, (a.spentToday / a.dailyCap) * 100)}%` }} /></div>
            </div>

            <div className="grid-2" style={{ gap: 16 }}>
              <div className="field">
                <label>Daily cap USD</label>
                <input type="number" defaultValue={a.dailyCap} onBlur={(e) => Number(e.target.value) !== a.dailyCap && patch(a.id, { dailyCap: Number(e.target.value) })} />
              </div>
              <div className="field">
                <label>Auto approve up to USD</label>
                <input type="number" defaultValue={a.autoApproveLimit} onBlur={(e) => Number(e.target.value) !== a.autoApproveLimit && patch(a.id, { autoApproveLimit: Number(e.target.value) })} />
              </div>
            </div>

            <div className="field">
              <label>Allowed shops, comma separated</label>
              <input defaultValue={a.shops.join(', ')} onBlur={(e) => patch(a.id, { shops: e.target.value.split(',') })} />
            </div>

            <div className="inner row between gap-8">
              <span className="caption" style={{ fontFamily: 'ui-monospace, Menlo, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {showKey === a.id ? a.key : `${a.key.slice(0, 12)}••••••••`}
              </span>
              <div className="row gap-4">
                <button className="btn btn-ghost btn-sm" onClick={() => setShowKey(showKey === a.id ? null : a.id)}>{showKey === a.id ? 'Hide' : 'Show'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => copy(a.id, a.key)}>{copied === a.id ? 'Copied' : 'Copy key'}</button>
              </div>
            </div>
          </div>
        ))}

        {adding ? (
          <form className="card stack gap-16" onSubmit={create}>
            <h3 className="h3">New agent wallet</h3>
            <div className="field"><label htmlFor="n">Name</label><input id="n" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Research Bot" /></div>
            <div className="field"><label htmlFor="k">What it does</label><input id="k" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} placeholder="Buys datasets and papers" /></div>
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="field"><label htmlFor="c">Daily cap USD</label><input id="c" type="number" value={form.dailyCap} onChange={(e) => setForm({ ...form, dailyCap: Number(e.target.value) })} /></div>
              <div className="field"><label htmlFor="l">Auto approve up to USD</label><input id="l" type="number" value={form.autoApproveLimit} onChange={(e) => setForm({ ...form, autoApproveLimit: Number(e.target.value) })} /></div>
            </div>
            <div className="field"><label htmlFor="s">Allowed shops</label><input id="s" value={form.shops} onChange={(e) => setForm({ ...form, shops: e.target.value })} placeholder="arxiv, kaggle" /></div>
            {err && <span className="small" style={{ color: 'var(--color-dusty-rose)' }}>{err}</span>}
            <div className="row gap-8"><button className="btn btn-primary" type="submit">Create wallet</button><button className="btn btn-ghost" type="button" onClick={() => setAdding(false)}>Cancel</button></div>
          </form>
        ) : (
          <div className="card stack gap-16" style={{ boxShadow: 'none', background: 'transparent', border: '1px dashed var(--color-silver)', justifyContent: 'center', alignItems: 'center', minHeight: 320, textAlign: 'center' }}>
            <h3 className="h3">Add an agent</h3>
            <p className="small" style={{ margin: 0, maxWidth: 280 }}>Give it a name, a daily cap and the shops it may use. You get a key for it.</p>
            <button className="btn btn-primary" onClick={() => setAdding(true)}>New agent wallet</button>
          </div>
        )}
      </div>
    </>
  );
}
