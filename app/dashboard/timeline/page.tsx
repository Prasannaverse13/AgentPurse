'use client';

import dynamic from 'next/dynamic';
import Topbar from '@/components/Topbar';
import { useApi } from '@/lib/client';
import type { State } from '@/lib/state';
import type { Txn } from '@/lib/types';

// Bryntum touches the DOM, so it loads in the browser only.
const TimelineScheduler = dynamic(() => import('@/components/TimelineScheduler'), {
  ssr: false,
  loading: () => <div className="card small">Loading timeline…</div>,
});

export default function Timeline() {
  const { data } = useApi<State>('/state', 4000);
  const { data: txns } = useApi<Txn[]>('/ledger', 4000);
  return (
    <>
      <Topbar title="Timeline" sub="See when every agent spent money, who waited for you, and what was blocked. Click a bar for details." />
      {data && txns ? <TimelineScheduler agents={data.agents} txns={txns} /> : <div className="card small">Loading…</div>}
    </>
  );
}
