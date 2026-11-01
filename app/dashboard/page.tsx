'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import ApprovalCard, { StatusBadge } from '@/components/ApprovalCard';
import FundCard from '@/components/FundCard';
import { api, useApi, usd, ago } from '@/lib/client';
import type { State } from '@/lib/state';

export default function Overview() {
  const { data, error } = useApi<State>('/state');
  const [summary, setSummary] = useState<string | null>(null);
  useEffect(() => { api<{ summary: string }>('/summary').then((r) => setSummary(r.summary)).catch(() => {}); }, []);

  if (!data) return <Topbar title="Overview" sub={error ?? 'Loading…'} />;

  const spent = data.agents.reduce((s, a) => s + a.spentToday, 0);
  const cap = data.agents.reduce((s, a) => s + a.dailyCap, 0);
  const frozen = data.agents.filter((a) => a.status === 'frozen').length;

  return (
    <>
      <Topbar title="Overview" sub="Here is what your agents did today." action={{ label: 'Connect an agent', href: '/dashboard/connect' }} />

      <div className="grid-2" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
        <FundCard balance={data.balance} />
        <div className="card stack gap-12">
          <div className="row between">
            <span className="stat-label">This week, in plain words</span>
            <span className="badge badge-fog">{data.mode.ai === 'openai' ? 'Written by AI' : 'Auto summary'}</span>
          </div>
          <p className="body ink" style={{ fontSize: 17, lineHeight: 1.55 }}>{summary ?? 'Writing your summary…'}</p>
        </div>
      </div>

      <div className="grid-4" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="stat-label">Spent today</div>
          <div className="stat-value">{usd(spent)}</div>
          <div className="meter" style={{ marginTop: 16 }}><span style={{ width: `${Math.min(100, (spent / Math.max(cap, 1)) * 100)}%` }} /></div>
          <div className="caption" style={{ marginTop: 8 }}>of {usd(cap)} total daily cap</div>
        </div>
        <div className="card">
          <div className="stat-label">Waiting for you</div>
          <div className="stat-value">{data.pending.length}</div>
          <div className="caption" style={{ marginTop: 16 }}>{usd(data.pending.reduce((s, a) => s + a.amount, 0))} on hold</div>
        </div>
        <div className="card">
          <div className="stat-label">Blocked this week</div>
          <div className="stat-value">{data.blockedWeek}</div>
          <div className="caption" style={{ marginTop: 16 }}>Rules stopped these buys</div>
        </div>
        <div className="card">
          <div className="stat-label">Active agents</div>
          <div className="stat-value">{data.agents.length - frozen}<span className="muted" style={{ fontSize: 24 }}> / {data.agents.length}</span></div>
          <div className="caption" style={{ marginTop: 16 }}>{frozen ? `${frozen} wallet frozen` : 'No wallet frozen'}</div>
        </div>
      </div>

      <div className="row between" style={{ margin: '40px 0 16px' }}>
        <h2 className="title">Needs your yes</h2>
        <Link href="/dashboard/approvals" className="small">See all</Link>
      </div>
      {data.pending.length ? (
        <div className="grid-3">{data.pending.slice(0, 3).map((a) => <ApprovalCard key={a.id} a={a} />)}</div>
      ) : (
        <div className="card small" style={{ textAlign: 'center', padding: 40 }}>Nothing waits for you. Agents are inside their rules.</div>
      )}

      <div className="grid-2" style={{ marginTop: 40, gridTemplateColumns: '1.4fr 1fr' }}>
        <div className="card">
          <div className="row between" style={{ marginBottom: 8 }}>
            <h2 className="title" style={{ fontSize: 18 }}>Recent requests</h2>
            <Link href="/dashboard/ledger" className="small">Open ledger</Link>
          </div>
          {data.recent.map((t) => (
            <div key={t.id} className="list-row">
              <div className="avatar">{t.agentName.slice(0, 2).toUpperCase()}</div>
              <div className="stack" style={{ flex: 1, minWidth: 0 }}>
                <span className="small ink" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.item}</span>
                <span className="caption">{t.agentName} · {t.merchant} · {ago(t.createdAt)}</span>
              </div>
              <StatusBadge status={t.status} />
              <span className="small amount" style={{ width: 90, textAlign: 'right' }}>{usd(t.amount)}</span>
            </div>
          ))}
        </div>

        <div className="stack gap-24">
          <div className="card">
            <h2 className="title" style={{ fontSize: 18, marginBottom: 8 }}>Budgets today</h2>
            {data.agents.map((a) => (
              <div key={a.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <div className="row between">
                  <span className="small ink" style={{ fontWeight: 500 }}>{a.name}{a.status === 'frozen' && <span className="caption" style={{ color: 'var(--color-dusty-rose)' }}> · frozen</span>}</span>
                  <span className="caption">{usd(a.spentToday)} / {usd(a.dailyCap)}</span>
                </div>
                <div className="meter"><span style={{ width: `${Math.min(100, (a.spentToday / a.dailyCap) * 100)}%`, background: a.spentToday / a.dailyCap > 0.9 ? 'var(--color-dusty-rose)' : undefined }} /></div>
              </div>
            ))}
          </div>
          <div className="card">
            <h2 className="title" style={{ fontSize: 18, marginBottom: 8 }}>Activity</h2>
            {data.events.slice(0, 6).map((e, i) => (
              <div key={i} className="list-row" style={{ padding: '10px 0' }}>
                <span className="small" style={{ flex: 1 }}>{e.text}</span>
                <span className="caption">{ago(e.at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
