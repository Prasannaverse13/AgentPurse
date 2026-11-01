'use client';

import dynamic from 'next/dynamic';
import Topbar from '@/components/Topbar';
import { useApi } from '@/lib/client';
import type { State } from '@/lib/state';
import type { Txn } from '@/lib/types';

const PurseStudio = dynamic(() => import('@/components/PurseStudio'), {
  ssr: false,
  loading: () => <div className="card small">Loading Studio…</div>,
});

type Config = { licenseKey: string; models: string[] };

export default function StudioPage() {
  // Polling is off: Studio reads its data once. Refresh the page to load new rows.
  const { data } = useApi<State>('/state', 0);
  const { data: txns } = useApi<Txn[]>('/ledger', 0);
  const { data: cfg } = useApi<Config>('/studio-config', 0);
  return (
    <>
      <Topbar title="Studio" sub="Build your own reports on the purse. Drag fields in. Or ask the AI assistant." />
      {data && txns && cfg ? <PurseStudio agents={data.agents} txns={txns} licenseKey={cfg.licenseKey} models={cfg.models} /> : <div className="card small">Loading…</div>}
    </>
  );
}
