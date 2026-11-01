'use client';

import { useState } from 'react';
import Topbar from '@/components/Topbar';
import { api, useApi } from '@/lib/client';
import type { State } from '@/lib/state';
import type { Rule } from '@/lib/types';

const describe = (r: Rule) => {
  const p = r.params;
  switch (r.kind) {
    case 'ask_over': return `ask owner if amount > $${p.value}`;
    case 'block_over': return `block if amount > $${p.value}`;
    case 'allow_list_only': return 'block if shop is not on the allow list';
    case 'block_keywords': return `block if it mentions ${(p.words || []).join(', ')}`;
    case 'require_keywords': return `ask owner unless it says ${(p.words || []).join(', ') || '…'}`;
    case 'velocity_freeze': return `freeze if hourly spend > ${p.factor}x normal`;
    case 'time_window': return `ask owner outside ${p.from}:00 to ${p.to}:00 UTC`;
  }
};

export default function Rules() {
  const { data, reload } = useApi<State>('/state', 0);
  const [text, setText] = useState('');
  const [agentId, setAgentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string>('');

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await api<Rule & { explain: string }>('/rules', { body: { text, agentId: agentId || null } });
      setLast(`${r.parsedBy === 'ai' ? 'AI' : 'Built in parser'} read it as: ${describe(r)}`);
      setText('');
      reload();
    } catch (err) { setLast((err as Error).message); }
    setBusy(false);
  };

  const agentName = (id: string | null) => (id ? data?.agents.find((a) => a.id === id)?.name ?? 'Agent' : 'All agents');

  return (
    <>
      <Topbar title="Rules" sub="Write rules in plain words. AI turns them into checks that run before every payment." />

      <form className="card grid-2" onSubmit={add} style={{ gridTemplateColumns: '1fr 200px auto', alignItems: 'end', gap: 24 }}>
        <div className="field">
          <label htmlFor="rule">New rule</label>
          <input id="rule" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask me before any buy over 100 dollars" />
        </div>
        <div className="field">
          <label htmlFor="agent">Applies to</label>
          <select id="agent" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">All agents</option>
            {data?.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Reading…' : 'Add rule'}</button>
      </form>
      {last && <p className="small" style={{ margin: '12px 4px 0' }}>{last}</p>}

      <div className="card" style={{ marginTop: 24 }}>
        {data?.rules.map((r) => (
          <div key={r.id} className="list-row" style={{ gap: 16 }}>
            <span className="badge badge-fog" style={{ width: 120, justifyContent: 'center', flexShrink: 0 }}>{agentName(r.agentId)}</span>
            <div className="stack" style={{ flex: 1, minWidth: 0 }}>
              <span className="small ink">{r.text}</span>
              <span className="caption" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{describe(r)}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={async () => { await api(`/rules/${r.id}`, { method: 'DELETE' }); reload(); }}>Delete</button>
            <button className="switch" role="switch" aria-checked={r.on} aria-label={`Toggle rule ${r.text}`}
              onClick={async () => { await api(`/rules/${r.id}`, { method: 'PATCH', body: { on: !r.on } }); reload(); }} />
          </div>
        ))}
      </div>
    </>
  );
}
