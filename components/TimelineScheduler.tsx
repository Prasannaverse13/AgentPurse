'use client';

// Bryntum Scheduler: one row per agent wallet, one bar per payment request.
import { useEffect, useMemo, useRef, useState } from 'react';
import { BryntumScheduler, type BryntumSchedulerProps } from '@bryntum/scheduler-react';
import { StringHelper } from '@bryntum/scheduler';
import '@bryntum/scheduler/scheduler.css';
import '@bryntum/scheduler/svalbard-light.css';
import '@bryntum/scheduler/fontawesome/css/fontawesome.css';
import '@bryntum/scheduler/fontawesome/css/solid.css';
import type { Txn } from '@/lib/types';
import { usd } from '@/lib/client';

type Agent = { id: string; name: string };

const colors: Record<string, string> = { paid: '#181825', pending: '#9a9a9a', blocked: '#c97b84', refunded: '#8b8b8b', declined: '#8b8b8b', failed: '#c97b84' };
const MIN = 60_000;

export default function TimelineScheduler({ agents, txns }: { agents: Agent[]; txns: Txn[] }) {
  const [picked, setPicked] = useState<Txn | null>(null);
  const ref = useRef<BryntumScheduler>(null);
  // Open at the present, with the latest activity in view.
  useEffect(() => {
    const t = setTimeout(() => ref.current?.instance.scrollToDate(new Date(Date.now() - 2 * 60 * MIN), { block: 'start' }), 400);
    return () => clearTimeout(t);
  }, []);

  const { resources, events, start, end } = useMemo(() => {
    const now = Date.now();
    const end = new Date(Math.ceil((now + 60 * MIN) / (60 * MIN)) * 60 * MIN);
    const start = new Date(end.getTime() - 16 * 60 * MIN);
    return {
      start, end,
      resources: agents.map((a) => ({ id: a.id, name: a.name })),
      events: txns.map((t) => {
        const s = new Date(t.createdAt);
        return {
          id: t.id, resourceId: t.agentId, startDate: s, endDate: new Date(s.getTime() + 60 * MIN),
          name: `${t.item}`, merchant: t.merchant, amount: t.amount, status: t.status,
          eventColor: colors[t.status] ?? '#b2b2b2',
        };
      }),
    };
  }, [agents, txns]);

  const config = {
    startDate: start,
    endDate: end,
    viewPreset: 'hourAndDay',
    rowHeight: 56,
    tickSize: 140,
    barMargin: 10,
    eventStyle: 'filled',
    features: {
      timeRanges: { showCurrentTimeLine: true },
      eventDrag: false,
      eventResize: false,
      eventEdit: false,
      eventMenu: false,
      cellMenu: false,
      scheduleMenu: false,
      eventTooltip: {
        template: ({ eventRecord }: { eventRecord: { name: string; merchant: string; amount: number; status: string } }) =>
          `<div style="padding:4px 2px"><b>${StringHelper.encodeHtml(eventRecord.name)}</b><br>${StringHelper.encodeHtml(eventRecord.merchant)} · $${Number(eventRecord.amount).toFixed(2)}<br><i>${StringHelper.encodeHtml(eventRecord.status)}</i></div>`,
      },
    },
    columns: [{ type: 'resourceInfo', text: 'Agent', field: 'name', width: 170, showEventCount: false, showImage: false }],
    eventRenderer: ({ eventRecord }: { eventRecord: { name: string; amount: number; status: string } }) =>
      `<span style="font-weight:500">${StringHelper.encodeHtml(`${usd(eventRecord.amount)} · ${eventRecord.name}`)}</span>`,
    listeners: {
      eventClick: ({ eventRecord }: { eventRecord: { id: string } }) => setPicked(txns.find((t) => t.id === eventRecord.id) ?? null),
    },
  } as unknown as BryntumSchedulerProps;

  return (
    <div className="stack gap-16">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="ap-timeline" style={{ height: 520 }}>
          <BryntumScheduler ref={ref} {...config} resources={resources} events={events} />
        </div>
      </div>
      <div className="row gap-16" style={{ flexWrap: 'wrap' }}>
        {Object.entries({ paid: 'Paid', pending: 'Waiting for you', blocked: 'Blocked', refunded: 'Refunded' }).map(([k, label]) => (
          <span key={k} className="caption row gap-8"><span style={{ width: 10, height: 10, borderRadius: 3, background: colors[k] }} />{label}</span>
        ))}
      </div>
      {picked && (
        <div className="card stack gap-8 fade-up">
          <div className="row between">
            <span className="ink" style={{ fontWeight: 500 }}>{picked.item}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPicked(null)}>Close</button>
          </div>
          <span className="small">{picked.agentName} · {picked.merchant} · {usd(picked.amount)} · {picked.status}</span>
          {picked.reason && <span className="small">Agent says: {picked.reason}</span>}
          {picked.flag && <span className="small">{picked.flag}</span>}
        </div>
      )}
    </div>
  );
}
