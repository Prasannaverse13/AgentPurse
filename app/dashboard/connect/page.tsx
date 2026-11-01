'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import { refreshAll, useApi, usd } from '@/lib/client';
import type { State } from '@/lib/state';
import type { Check } from '@/lib/types';

type Offer = { merchant: string; domain: string; price: number; url: string; rules: 'auto' | 'ask' | 'block'; rulesNote: string };
type Product = { id: string; title: string; brand: string | null; image: string | null; offers: Offer[] };

type SpendResult = { id: string; status: string; message: string; flag: string | null; checks: Check[]; paypal: { payoutBatchId?: string } | null; error?: string };

const presets = [
  { label: 'Paper restock', agent: 'ag_shop', amount: 24.5, merchant: 'Staples', item: 'Printer paper 10 pack', reason: 'Office is out of paper' },
  { label: 'Big flight', agent: 'ag_trip', amount: 642.1, merchant: 'Expedia', item: 'Flight BLR to SFO refundable', reason: 'Summit on Nov 18' },
  { label: 'Shady shop', agent: 'ag_ops', amount: 95, merchant: 'unknown-gpu.io', item: 'GPU credits', reason: 'Credits are low' },
  { label: 'Gift cards', agent: 'ag_shop', amount: 80, merchant: 'Amazon', item: 'Gift card x4', reason: 'Team rewards' },
];

export default function Connect() {
  const { data } = useApi<State>('/state', 0);
  const [origin, setOrigin] = useState('http://localhost:3000');
  useEffect(() => setOrigin(window.location.origin), []);

  const [form, setForm] = useState(presets[0]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<SpendResult | null>(null);

  const agent = data?.agents.find((a) => a.id === form.agent) ?? data?.agents[0];
  const key = agent?.key ?? 'ap_test_...';

  const [q, setQ] = useState('standing desk');
  const [found, setFound] = useState<Product[] | null>(null);
  const [src, setSrc] = useState('');
  const [searching, setSearching] = useState(false);
  const [bought, setBought] = useState<Record<string, string>>({});
  const [shopErr, setShopErr] = useState('');

  const search = async () => {
    if (!agent || !q.trim()) return;
    setSearching(true); setShopErr(''); setBought({});
    try {
      const r = await fetch(`/api/agent/search?${new URLSearchParams({ q, limit: '3' })}`, { headers: { authorization: `Bearer ${agent.key}` } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setFound(j.results); setSrc(j.source);
    } catch (e) { setShopErr((e as Error).message); setFound(null); }
    setSearching(false);
  };

  const buy = async (p: Product, o: Offer) => {
    if (!agent) return;
    const k = `${p.id}-${o.domain}`;
    setBought((b) => ({ ...b, [k]: '…' }));
    const r = await fetch('/api/agent/spend', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${agent.key}` },
      body: JSON.stringify({ amount: o.price, merchant: o.merchant, item: p.title, reason: `Found with Channel3 for ${o.merchant}`, productUrl: o.url, image: p.image }),
    });
    const j = await r.json();
    setBought((b) => ({ ...b, [k]: j.status ?? j.error }));
    refreshAll();
  };

  const send = async () => {
    if (!agent) return;
    setBusy(true);
    setRes(null);
    const r = await fetch('/api/agent/spend', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${agent.key}` },
      body: JSON.stringify({ amount: form.amount, merchant: form.merchant, item: form.item, reason: form.reason }),
    });
    setRes(await r.json());
    setBusy(false);
    refreshAll();
  };

  const mcp = `{
  "mcpServers": {
    "agentpurse": {
      "command": "node",
      "args": ["<path to AgentPurse>/mcp/server.mjs"],
      "env": {
        "AGENTPURSE_URL": "${origin}",
        "AGENT_KEY": "${key}"
      }
    }
  }
}`;

  const curl = `curl -X POST ${origin}/api/agent/spend \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 24.5, "merchant": "Staples", "item": "Printer paper", "reason": "Out of paper"}'`;

  return (
    <>
      <Topbar title="Connect an agent" sub="Plug AgentPurse into any agent with MCP or one REST call. Or try a request right here." />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card stack gap-16">
          <h2 className="title" style={{ fontSize: 18 }}>Try a spend request</h2>
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
            {presets.map((p) => (
              <button key={p.label} className="tab" aria-selected={form.label === p.label} onClick={() => { setForm(p); setRes(null); }} style={{ background: form.label === p.label ? 'var(--color-fog)' : 'transparent', boxShadow: 'inset 0 0 0 1px var(--color-line)' }}>{p.label}</button>
            ))}
          </div>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="ag">Agent</label>
              <select id="ag" value={form.agent} onChange={(e) => setForm({ ...form, label: 'Custom', agent: e.target.value })}>
                {data?.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="am">Amount USD</label>
              <input id="am" type="number" value={form.amount} onChange={(e) => setForm({ ...form, label: 'Custom', amount: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label htmlFor="me">Merchant</label>
              <input id="me" value={form.merchant} onChange={(e) => setForm({ ...form, label: 'Custom', merchant: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="it">Item</label>
              <input id="it" value={form.item} onChange={(e) => setForm({ ...form, label: 'Custom', item: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="re">Agent reason</label>
            <input id="re" value={form.reason} onChange={(e) => setForm({ ...form, label: 'Custom', reason: e.target.value })} />
          </div>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={send} disabled={busy}>{busy ? 'Checking rules…' : `Send as ${agent?.name ?? 'agent'}`}</button>

          {res && (
            <div className="inner stack gap-12 fade-up">
              <div className="row between">
                <span className="badge"><span className={`dot ${res.status === 'paid' ? 'dot-ink' : res.status === 'blocked' ? 'dot-rose' : ''}`} />{res.status ?? 'error'}</span>
                <span className="small amount">{usd(form.amount)}</span>
              </div>
              <span className="small ink">{res.message ?? res.error}</span>
              {res.paypal?.payoutBatchId && <span className="caption" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>PayPal payout batch {res.paypal.payoutBatchId}</span>}
              <div className="stack gap-4">
                {res.checks?.map((c, i) => (
                  <div key={i} className="row gap-8 caption" style={{ color: c.ok ? 'var(--color-stone)' : 'var(--color-midnight-ink)' }}>
                    <span aria-hidden style={{ width: 14, height: 14, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 9, background: c.ok ? '#fff' : 'var(--color-dusty-rose)', color: c.ok ? 'var(--color-stone)' : '#fff', flexShrink: 0 }}>{c.ok ? '✓' : '!'}</span>
                    {c.rule}
                  </div>
                ))}
              </div>
              {res.status === 'pending' && <span className="caption">Open Approvals to say yes or no.</span>}
            </div>
          )}
        </div>

        <div className="stack gap-24">
          <div className="card stack gap-16">
            <div className="row between">
              <h2 className="title" style={{ fontSize: 18 }}>Shop with Channel3</h2>
              <span className="badge badge-fog"><span className={`dot ${data?.mode.channel3 === 'live' ? 'dot-ink' : ''}`} />{data?.mode.channel3 === 'live' ? 'Live catalog' : 'Demo catalog'}</span>
            </div>
            <div className="row gap-12" style={{ alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="q">What should {agent?.name ?? 'the agent'} find?</label>
                <input id="q" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="standing desk" />
              </div>
              <button className="btn btn-primary" onClick={search} disabled={searching}>{searching ? 'Searching…' : 'Search'}</button>
            </div>
            {shopErr && <span className="small" style={{ color: 'var(--color-dusty-rose)' }}>{shopErr}</span>}
            {found && !found.length && <span className="small">No products found. Try other words.</span>}
            {found?.map((p) => (
              <div key={p.id} className="inner stack gap-8">
                <div className="row gap-12">
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" width={48} height={48} referrerPolicy="no-referrer" style={{ borderRadius: 8, objectFit: 'cover' }} />
                  )}
                  <div className="stack"><span className="small ink" style={{ fontWeight: 500 }}>{p.title}</span><span className="caption">{p.brand ?? 'Unbranded'}</span></div>
                </div>
                {p.offers.map((o) => {
                  const k = `${p.id}-${o.domain}`;
                  return (
                    <div key={k} className="row gap-8" style={{ padding: '6px 0', borderTop: '1px solid var(--color-line)' }}>
                      <span className="small ink" style={{ flex: 1 }}>{o.merchant}</span>
                      <span className="small amount" style={{ width: 70, textAlign: 'right' }}>{usd(o.price)}</span>
                      <span className="badge" title={o.rulesNote}><span className={`dot ${o.rules === 'auto' ? 'dot-ink' : o.rules === 'block' ? 'dot-rose' : ''}`} />{o.rules === 'auto' ? 'Pays at once' : o.rules === 'ask' ? 'Needs your yes' : 'Blocked'}</span>
                      {bought[k] ? <span className="caption" style={{ width: 70, textAlign: 'right' }}>{bought[k]}</span>
                        : <button className="btn btn-ghost btn-sm" onClick={() => buy(p, o)}>Buy</button>}
                    </div>
                  );
                })}
              </div>
            ))}
            {found && <span className="caption muted">Source: {src}. Badges show what your rules will do before the agent pays.</span>}
          </div>

          <div className="card card-dark stack gap-12">
            <div className="row between">
              <span className="small" style={{ color: '#fff', fontWeight: 500 }}>MCP config for {agent?.name}</span>
              <span className="caption" style={{ color: 'var(--color-pebble)' }}>Claude Desktop, Cursor, any MCP client</span>
            </div>
            <pre className="code">{mcp}</pre>
            <span className="caption" style={{ color: 'var(--color-pebble)' }}>Tools: search_products, request_spend, check_request, get_budget, request_refund</span>
          </div>
          <div className="card card-dark stack gap-12">
            <span className="small" style={{ color: '#fff', fontWeight: 500 }}>Or plain REST</span>
            <pre className="code">{curl}</pre>
          </div>
        </div>
      </div>
    </>
  );
}
