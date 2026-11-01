'use client';

import Topbar from '@/components/Topbar';
import ApprovalCard from '@/components/ApprovalCard';
import { useApi } from '@/lib/client';
import type { Txn } from '@/lib/types';

export default function Approvals() {
  const { data, error } = useApi<Txn[]>('/approvals');
  return (
    <>
      <Topbar title="Approvals" sub="Buys that broke a rule wait here. Read the reason and the AI review, then decide." />
      {!data && <p className="small">{error ?? 'Loading…'}</p>}
      {data && !data.length && (
        <div className="card small" style={{ textAlign: 'center', padding: 48 }}>Nothing waits for you right now. New requests show up here live.</div>
      )}
      <div className="grid-3">
        {data?.map((a) => <ApprovalCard key={a.id} a={a} showChecks />)}
      </div>
    </>
  );
}
