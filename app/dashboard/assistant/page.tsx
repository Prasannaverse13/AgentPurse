'use client';

import { useRef, useState } from 'react';
import Topbar from '@/components/Topbar';
import { api, refreshAll } from '@/lib/client';

type Step = { tool: string; source: 'paypal' | 'agentpurse'; args: string };
type Turn = { role: 'user' | 'assistant'; content: string; steps?: Step[] };

const ideas = [
  'What is my balance and who is waiting for me?',
  'Which agent spent the most today?',
  'Show blocked requests and why',
  'List my latest PayPal transactions',
];

// Show **bold** from the AI reply as real bold text.
const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((x, i) => (x.startsWith('**') && x.endsWith('**') ? <strong key={i}>{x.slice(2, -2)}</strong> : x));

export default function Assistant() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const send = async (q: string) => {
    if (!q.trim() || busy) return;
    const history = turns.map(({ role, content }) => ({ role, content }));
    setTurns((t) => [...t, { role: 'user', content: q }]);
    setText(''); setBusy(true);
    try {
      const r = await api<{ reply: string; steps: Step[] }>('/assistant', { body: { message: q, history } });
      setTurns((t) => [...t, { role: 'assistant', content: r.reply, steps: r.steps }]);
      refreshAll();
    } catch (e) {
      setTurns((t) => [...t, { role: 'assistant', content: (e as Error).message }]);
    }
    setBusy(false);
    setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <>
      <Topbar title="Ask the treasurer" sub="Ask about your money in plain words. It reads PayPal and your wallets with the PayPal Agent Toolkit." />
      <div className="card stack gap-16" style={{ maxWidth: 760 }}>
        {!turns.length && (
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
            {ideas.map((i) => (
              <button key={i} className="tab" onClick={() => send(i)} style={{ boxShadow: 'inset 0 0 0 1px var(--color-line)' }}>{i}</button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === 'user' ? 'inner' : 'stack gap-8'} style={t.role === 'user' ? { alignSelf: 'flex-end', maxWidth: '85%' } : undefined}>
            <span className="small ink" style={{ whiteSpace: 'pre-wrap' }}>{bold(t.content)}</span>
            {t.steps?.length ? (
              <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                {t.steps.map((s, k) => (
                  <span key={k} className="badge badge-fog" title={s.args}><span className={`dot ${s.source === 'paypal' ? 'dot-ink' : ''}`} />{s.source === 'paypal' ? 'PayPal' : 'Purse'} · {s.tool}</span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {busy && <span className="caption">Checking…</span>}
        <div ref={end} />
        <div className="row gap-12" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="q">Your question</label>
            <input id="q" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(text)} placeholder="How much did Shopper spend today?" />
          </div>
          <button className="btn btn-primary" onClick={() => send(text)} disabled={busy}>Ask</button>
        </div>
      </div>
    </>
  );
}
