import crypto from 'node:crypto';
import type { Agent, DB, Rule, Txn, TxnStatus } from './types';

// Demo keys are fixed so the MCP config in the README works out of the box.
// Rotate them from the Wallets page for anything real.
export const DEMO_KEYS = {
  shopper: 'ap_test_shopper_7f3k',
  trip: 'ap_test_trip_9d2m',
  ops: 'ap_test_ops_4h8q',
  gift: 'ap_test_gift_1x6v',
};

export const merchantEmail = (merchant: string) =>
  `${merchant.toLowerCase().replace(/[^a-z0-9]+/g, '')}@merchant.agentpurse.dev`;

export function seed(owner = 'demo'): DB {
  const t0 = Date.now();
  const iso = (msAgo: number) => new Date(t0 - msAgo).toISOString();
  const H = 3600_000;

  const agents: Agent[] = [
    { id: 'ag_shop', name: 'Shopper', kind: 'Buys office supplies', initials: 'SH', key: DEMO_KEYS.shopper, dailyCap: 200, autoApproveLimit: 100, status: 'active', shops: ['amazon', 'staples', 'target', 'walmart', 'bestbuy', 'wayfair', 'vari', 'officedepot'], createdAt: iso(30 * 24 * H) },
    { id: 'ag_trip', name: 'Trip Planner', kind: 'Books travel', initials: 'TP', key: DEMO_KEYS.trip, dailyCap: 800, autoApproveLimit: 300, status: 'active', shops: ['expedia', 'airbnb'], createdAt: iso(30 * 24 * H) },
    { id: 'ag_ops', name: 'Ops Bot', kind: 'Pays API and SaaS bills', initials: 'OP', key: DEMO_KEYS.ops, dailyCap: 150, autoApproveLimit: 60, status: 'active', shops: ['openai', 'render', 'vercel', 'anthropic'], createdAt: iso(30 * 24 * H) },
    { id: 'ag_gift', name: 'Gift Agent', kind: 'Sends team gifts', initials: 'GA', key: DEMO_KEYS.gift, dailyCap: 100, autoApproveLimit: 50, status: 'frozen', frozenReason: 'Spend jumped 4x in one hour', shops: ['etsy'], createdAt: iso(30 * 24 * H) },
  ];

  // Private purses get their own agent keys. Only the shared demo purse keeps the fixed ones.
  if (owner !== 'demo') for (const a of agents) a.key = `ap_${crypto.randomBytes(12).toString('hex')}`;

  const rules: Rule[] = [
    { id: 'r1', agentId: null, text: 'Ask me before any buy over 300 dollars', kind: 'ask_over', params: { value: 300 }, on: true, parsedBy: 'seed', createdAt: iso(20 * 24 * H) },
    { id: 'r2', agentId: null, text: 'Only pay shops on the allow list', kind: 'allow_list_only', params: {}, on: true, parsedBy: 'seed', createdAt: iso(20 * 24 * H) },
    { id: 'r3', agentId: null, text: 'Freeze the wallet if spend jumps 3x in an hour', kind: 'velocity_freeze', params: { factor: 3 }, on: true, parsedBy: 'seed', createdAt: iso(20 * 24 * H) },
    { id: 'r4', agentId: 'ag_shop', text: 'No gift cards or crypto', kind: 'block_keywords', params: { words: ['gift card', 'giftcard', 'crypto', 'bitcoin'] }, on: true, parsedBy: 'seed', createdAt: iso(10 * 24 * H) },
    { id: 'r5', agentId: 'ag_trip', text: 'Refundable fares only', kind: 'require_keywords', params: { words: ['refundable'] }, on: true, parsedBy: 'seed', createdAt: iso(10 * 24 * H) },
    { id: 'r6', agentId: 'ag_ops', text: 'Never pay more than 1000 dollars at once', kind: 'block_over', params: { value: 1000 }, on: true, parsedBy: 'seed', createdAt: iso(10 * 24 * H) },
  ];

  const hist: [string, string, string, number, TxnStatus, string][] = [
    ['ag_shop', 'Amazon', 'Printer paper 10 pack', 38.9, 'paid', 'Office is out of paper'],
    ['ag_shop', 'Staples', 'Whiteboard markers', 12.4, 'paid', 'Markers are dry'],
    ['ag_ops', 'OpenAI', 'API credits', 40, 'paid', 'Credits below 10 dollars'],
    ['ag_ops', 'Render', 'Web service plan', 25, 'paid', 'Monthly bill'],
    ['ag_trip', 'Airbnb', 'Stay in Austin 2 nights refundable', 236, 'paid', 'Conference trip'],
    ['ag_shop', 'Target', 'Coffee beans 2 kg', 25.3, 'paid', 'Kitchen restock'],
    ['ag_ops', 'Vercel', 'Pro seat', 20, 'paid', 'New teammate'],
    ['ag_gift', 'Etsy', 'Custom mug', 22.4, 'refunded', 'Birthday gift'],
    ['ag_shop', 'BestDeals Inc', 'Gift cards x20', 500, 'blocked', 'Team rewards'],
    ['ag_ops', 'unknown-gpu.io', 'GPU credits', 95, 'blocked', 'Usage alert said credits are low'],
    ['ag_shop', 'Amazon', 'USB C cables x5', 18.75, 'paid', 'Cables broke'],
    ['ag_trip', 'Expedia', 'Hotel Chennai 1 night refundable', 84, 'paid', 'Client visit'],
  ];

  const txns: Txn[] = hist.map(([agentId, merchant, item, amount, status, reason], i) => {
    const a = agents.find((x) => x.id === agentId)!;
    const at = iso((i + 1) * 5 * H + 26 * H);
    return {
      id: `tx_seed${i}`,
      agentId,
      agentName: a.name,
      item,
      merchant,
      merchantEmail: merchantEmail(merchant),
      amount,
      currency: 'USD',
      reason,
      status,
      decidedBy: status === 'blocked' ? 'rules' : 'rules',
      checks: [],
      flag: status === 'blocked' ? (item.includes('Gift') ? 'Blocked word: gift card' : 'Shop not on allow list') : undefined,
      paypal: status === 'paid' || status === 'refunded' ? { batchId: `SEED${1000 + i}`, itemId: `SEEDITEM${1000 + i}`, itemStatus: status === 'refunded' ? 'RETURNED' : 'SUCCESS' } : undefined,
      createdAt: at,
      updatedAt: at,
    };
  });

  return {
    balance: 1500,
    agents,
    rules,
    txns,
    fundings: [{ id: 'fd_seed', orderId: 'SEED-ORDER', amount: 2000, refunded: 0, status: 'captured', createdAt: iso(31 * 24 * H) }],
    events: [{ at: iso(0), text: 'Demo data loaded' }],
  };
}
