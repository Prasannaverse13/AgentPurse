'use client';

import { useEffect, useState } from 'react';

type Scenario = {
  key: string;
  label: string;
  agent: string;
  ask: string;
  plan: string;
  item: string;
  merchant: string;
  amount: string;
  checks: { text: string; ok: boolean }[];
  verdict: 'ask' | 'auto' | 'block';
  note: string;
};

const scenarios: Scenario[] = [
  {
    key: 'shop',
    label: 'Shopping agent',
    agent: 'Shopper',
    ask: 'We are out of printer paper and coffee. Restock for the week.',
    plan: 'Found 10 reams at Staples and 2 kg beans at Target. Total under budget.',
    item: 'Paper 10 pack + coffee beans',
    merchant: 'Staples, Target',
    amount: '$64.20',
    checks: [
      { text: 'Merchant on allow list', ok: true },
      { text: 'Under daily cap of $200', ok: true },
      { text: 'Under auto approve limit of $300', ok: true },
    ],
    verdict: 'auto',
    note: 'Paid with PayPal. Order 5HX21934PP',
  },
  {
    key: 'trip',
    label: 'Travel agent',
    agent: 'Trip Planner',
    ask: 'Book me a flight to SFO for the summit on Nov 18.',
    plan: 'Cheapest nonstop is $642 on Expedia. Fare is refundable.',
    item: 'Flight BLR to SFO, Nov 18',
    merchant: 'Expedia',
    amount: '$642.10',
    checks: [
      { text: 'Merchant on allow list', ok: true },
      { text: 'Refundable fare', ok: true },
      { text: 'Over auto approve limit of $300', ok: false },
    ],
    verdict: 'ask',
    note: 'Paid with PayPal. Order 9KD77210PP',
  },
  {
    key: 'ops',
    label: 'Ops agent',
    agent: 'Ops Bot',
    ask: 'GPU credits are low. Top them up.',
    plan: 'Found a deal at unknown-gpu.io for $95.',
    item: 'GPU credits',
    merchant: 'unknown-gpu.io',
    amount: '$95.00',
    checks: [
      { text: 'Merchant not on allow list', ok: false },
      { text: 'New domain, 3 days old', ok: false },
      { text: 'Under daily cap of $150', ok: true },
    ],
    verdict: 'block',
    note: 'Blocked. Wallet owner alerted.',
  },
];

export default function HeroDemo() {
  const [active, setActive] = useState(1);
  const [step, setStep] = useState(0);
  const [decision, setDecision] = useState<'none' | 'yes' | 'no'>('none');
  const s = scenarios[active];

  useEffect(() => {
    setStep(0);
    setDecision('none');
    const timers = [1, 2, 3, 4, 5].map((n) => setTimeout(() => setStep(n), n * 550));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const done = step >= 5;
  const status =
    !done ? { text: 'Checking rules', dot: '' } :
    s.verdict === 'auto' ? { text: 'Auto approved', dot: 'dot-ink' } :
    s.verdict === 'block' ? { text: 'Blocked', dot: 'dot-rose' } :
    decision === 'yes' ? { text: 'Approved by you', dot: 'dot-ink' } :
    decision === 'no' ? { text: 'Declined by you', dot: 'dot-rose' } :
    { text: 'Waiting for your yes', dot: '' };

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Demo scenarios">
        {scenarios.map((sc, i) => (
          <button key={sc.key} role="tab" className="tab" aria-selected={i === active} onClick={() => setActive(i)}>
            {sc.label}
          </button>
        ))}
      </div>

      <div className="browser fade-up d4">
        <div className="chrome">
          <i /><i /><i />
          <div className="url">app.agentpurse.dev/approvals</div>
        </div>

        <div className="grid-2" style={{ padding: '24px 24px 56px', gap: 24, minHeight: 420 }}>
          {/* Agent side */}
          <div className="stack gap-16">
            <div className="row gap-8">
              <div className="avatar dark">{s.agent.slice(0, 2).toUpperCase()}</div>
              <div className="stack">
                <span className="small ink" style={{ fontWeight: 500 }}>{s.agent}</span>
                <span className="caption">AI agent via MCP</span>
              </div>
            </div>
            <div className="inner small ink" style={{ alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--color-midnight-ink)', color: '#fff' }}>
              {s.ask}
            </div>
            {step >= 1 && (
              <div className="inner small ink fade-up" style={{ maxWidth: '85%' }}>
                {s.plan}
              </div>
            )}
            {step >= 2 && (
              <div className="caption fade-up" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
                → agentpurse.request_spend({'{'} amount: {s.amount.replace('$', '')}, merchant: &quot;{s.merchant.split(',')[0]}&quot; {'}'})
              </div>
            )}
            <div className="stack gap-8" style={{ marginTop: 'auto' }}>
              <div className="skel" style={{ width: '70%' }} />
              <div className="skel" style={{ width: '45%' }} />
            </div>
          </div>

          {/* Purse side */}
          <div className="card" style={{ boxShadow: 'none', background: 'var(--color-fog)', borderRadius: 16 }}>
            <div className="row between">
              <span className="badge"><span className={`dot ${status.dot}`} />{status.text}</span>
              <span className="caption">Spend request</span>
            </div>
            <div style={{ marginTop: 24 }}>
              <div className="caption">{s.merchant}</div>
              <div className="ink" style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>{s.item}</div>
              <div className="stat-value" style={{ fontSize: 50 }}>{s.amount}</div>
            </div>
            <div className="stack gap-8" style={{ marginTop: 20 }}>
              {s.checks.map((c, i) => (
                <div key={c.text} className="row gap-8 small" style={{ opacity: step >= i + 2 ? 1 : 0.25, transition: 'opacity .3s' }}>
                  <span aria-hidden style={{ width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, background: c.ok ? 'var(--color-midnight-ink)' : 'var(--color-dusty-rose)', color: '#fff' }}>
                    {c.ok ? '✓' : '!'}
                  </span>
                  <span className={c.ok ? 'ink' : ''}>{c.text}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, minHeight: 44 }}>
              {done && s.verdict === 'ask' && decision === 'none' && (
                <div className="row gap-8 fade-up">
                  <button className="btn btn-primary" onClick={() => setDecision('yes')}>Approve and pay</button>
                  <button className="btn btn-ghost" onClick={() => setDecision('no')}>Decline</button>
                </div>
              )}
              {done && (s.verdict !== 'ask' || decision !== 'none') && (
                <div className="small fade-up">
                  {s.verdict === 'ask' && decision === 'no' ? 'Declined. Agent told to find a cheaper option.' : s.note}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
