// AG Studio data sources built from the purse: agents and every spend request.
import type { AgDataSourcesDefinition, AgFormat } from 'ag-studio';
import type { Agent, Txn } from '@/lib/types';

type Spec = [id: string, name: string, format: AgFormat, hide?: boolean];
const fields = (s: Spec[]) => s.map(([id, name, format, hide]) => ({ id, name, format, ...(hide && { hide }) }));
const day = (iso: string) => iso.slice(0, 10);

export function buildStudioData(agents: Agent[], txns: Txn[]): AgDataSourcesDefinition {
  const rows = txns.map((t) => ({
    id: t.id,
    agentId: t.agentId,
    agent: t.agentName,
    merchant: t.merchant,
    item: t.item,
    status: t.status,
    decidedBy: t.decidedBy ?? 'waiting',
    amount: t.amount,
    // One column per outcome, so a sum widget needs no filter.
    paid: t.status === 'paid' ? t.amount : 0,
    pending: t.status === 'pending' ? t.amount : 0,
    blocked: t.status === 'blocked' || t.status === 'declined' ? t.amount : 0,
    refunded: t.status === 'refunded' ? t.amount : 0,
    date: day(t.createdAt),
    flag: t.flag ?? '',
    reason: t.reason,
  }));
  const dates = rows.map((r) => r.date).sort();
  const today = day(new Date().toISOString());

  return {
    description:
      'AgentPurse is a PayPal wallet for AI agents. Each row in spends is one purchase request from an agent, in USD. ' +
      'Paid is money sent. Pending waits for the owner. Blocked was stopped by a rule or declined by the owner. Refunded came back to the purse. ' +
      'Use the paid, pending, blocked and refunded columns for money totals.',
    sources: [
      {
        id: 'agents',
        description: 'The AI agents that hold a budget in the purse.',
        data: agents.map((a) => ({ id: a.id, name: a.name, kind: a.kind, status: a.status, dailyCap: a.dailyCap, autoApproveLimit: a.autoApproveLimit })),
        fields: fields([
          ['id', 'Agent ID', 'textFormat', true],
          ['name', 'Agent', 'textFormat'],
          ['kind', 'Kind', 'textFormat'],
          ['status', 'Wallet Status', 'textFormat'],
          ['dailyCap', 'Daily Cap', 'currencyFormat'],
          ['autoApproveLimit', 'Auto Approve Limit', 'currencyFormat'],
        ]),
      },
      {
        id: 'spends',
        description: 'Every purchase request an agent made, with the rule outcome.',
        data: rows,
        fields: fields([
          ['id', 'Request ID', 'textFormat', true],
          ['agentId', 'Agent ID', 'textFormat', true],
          ['agent', 'Agent Name', 'textFormat'],
          ['merchant', 'Shop', 'textFormat'],
          ['item', 'Item', 'textFormat'],
          ['status', 'Status', 'textFormat'],
          ['decidedBy', 'Decided By', 'textFormat'],
          ['amount', 'Requested', 'currencyFormat'],
          ['paid', 'Paid', 'currencyFormat'],
          ['pending', 'Waiting For Yes', 'currencyFormat'],
          ['blocked', 'Blocked', 'currencyFormat'],
          ['refunded', 'Refunded', 'currencyFormat'],
          ['date', 'Date', 'dateFormat'],
          ['flag', 'Why Flagged', 'textFormat'],
          ['reason', 'Agent Reason', 'textFormat'],
        ]),
      },
    ],
    relationships: [
      {
        id: 'spend-agent',
        source: { tableId: 'spends', fieldId: 'agentId' },
        target: { tableId: 'agents', fieldId: 'id' },
        type: 'many-to-one',
      },
      { id: 'spend-calendar', source: { tableId: 'spends', fieldId: 'date' }, target: { calendarId: 'calendar' } },
    ],
    calendars: [
      {
        id: 'calendar',
        label: 'Calendar',
        range: { from: { type: 'date', value: dates[0] ?? today }, to: { type: 'date', value: dates.at(-1) ?? today } },
        fragments: ['year', 'month', 'week', 'day', 'dayOfWeek'],
      },
    ],
  };
}
