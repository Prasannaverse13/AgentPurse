'use client';

import { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from 'ag-grid-community';
import Topbar from '@/components/Topbar';
import { api, refreshAll, useApi, usd } from '@/lib/client';
import type { Txn } from '@/lib/types';

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeQuartz.withParams({
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontSize: 14,
  foregroundColor: '#181825',
  backgroundColor: '#ffffff',
  headerBackgroundColor: '#ffffff',
  headerTextColor: '#636363',
  headerFontWeight: 500,
  headerFontSize: 12,
  borderColor: 'rgba(24,24,37,0.08)',
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  rowHoverColor: '#f7f7f7',
  selectedRowBackgroundColor: '#f7f7f7',
  accentColor: '#181825',
  rowHeight: 52,
  headerHeight: 44,
  spacing: 8,
  columnBorder: false,
});

function StatusCell({ value }: { value: Txn['status'] }) {
  const dot = value === 'blocked' || value === 'failed' || value === 'declined' ? 'dot-rose' : value === 'paid' ? 'dot-ink' : '';
  return <span className="badge badge-fog"><span className={`dot ${dot}`} />{value[0].toUpperCase() + value.slice(1)}</span>;
}

const filters = ['all', 'paid', 'pending', 'blocked', 'declined', 'refunded'] as const;

export default function Ledger() {
  const [q, setQ] = useState('');
  const [f, setF] = useState<(typeof filters)[number]>('all');
  const { data: rows, reload } = useApi<Txn[]>('/ledger', 4000);
  const [note, setNote] = useState('');

  const doRefund = async (t: Txn) => {
    const why = 'Refunded by owner from the ledger';
    try {
      await api(`/ledger/${t.id}/refund`, { body: { why } });
      setNote(`Refunded ${usd(t.amount)} from ${t.merchant}. PayPal payout pulled back to the purse.`);
    } catch (e) { setNote((e as Error).message); }
    reload(); refreshAll();
  };

  const cols = useMemo<ColDef<Txn>[]>(() => [
    { field: 'createdAt', headerName: 'Date', width: 150, sort: 'desc', valueFormatter: (p) => new Date(p.value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) },
    { field: 'agentName', headerName: 'Agent', width: 140 },
    { field: 'item', headerName: 'Item', flex: 1, minWidth: 180 },
    { field: 'merchant', headerName: 'Merchant', width: 150 },
    { field: 'amount', headerName: 'Amount', width: 120, type: 'rightAligned', valueFormatter: (p) => usd(p.value), cellClass: 'amount' },
    { headerName: 'Why', width: 260, cellClass: 'cell-muted', tooltipValueGetter: (p) => p.data?.aiNote || p.data?.flag, valueGetter: (p) => p.data?.flag || (p.data?.decidedBy === 'owner' ? 'Approved by owner' : 'Passed all rules') },
    { field: 'status', headerName: 'Status', width: 130, cellRenderer: StatusCell },
    { headerName: 'PayPal payout', width: 190, cellClass: 'cell-mono', valueGetter: (p) => p.data?.paypal?.batchId ?? '' },
    {
      headerName: '', width: 110, sortable: false, filter: false,
      cellRenderer: (p: { data: Txn }) =>
        p.data.status === 'paid' ? (
          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 12px' }} onClick={() => doRefund(p.data)}>
            Refund
          </button>
        ) : null,
    },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  const data = (rows ?? []).filter((r) => f === 'all' || r.status === f);
  const total = data.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <Topbar title="Ledger" sub="Every request from every agent, and the rule that decided it." />

      <div className="row between" style={{ marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
        <div className="tabs" style={{ marginTop: 0 }} role="tablist" aria-label="Filter by status">
          {filters.map((x) => (
            <button key={x} className="tab" role="tab" aria-selected={f === x} onClick={() => setF(x)}>{x[0].toUpperCase() + x.slice(1)}</button>
          ))}
        </div>
        <div className="row gap-16">
          <span className="small">Paid in view <span className="amount">{usd(total)}</span></span>
          <input className="input" style={{ width: 220, flex: 'none' }} placeholder="Search agent, shop, item" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search ledger" />
        </div>
      </div>

      {note && <p className="small" style={{ margin: '0 4px 12px' }}>{note}</p>}
      <div className="card grid-wrap" style={{ padding: 8, overflow: 'hidden' }}>
        <AgGridReact<Txn>
          theme={theme}
          rowData={data}
          getRowId={(p) => p.data.id}
          tooltipShowDelay={300}
          columnDefs={cols}
          quickFilterText={q}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          pagination
          paginationPageSize={20}
          paginationPageSizeSelector={[20, 50]}
        />
      </div>
    </>
  );
}
