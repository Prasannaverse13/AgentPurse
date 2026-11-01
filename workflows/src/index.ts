// AgentPurse weekly digest on Render Workflows.
// Each step is its own task, so Render retries the one that fails and runs the others in parallel.
//
//   buildWeeklyDigest
//     ├─ fetchPurse        reads wallet state and the full ledger    (parallel)
//     ├─ fetchRecap        asks AgentPurse AI for the plain recap     (parallel)
//     └─ savePurseDigest   posts the finished digest back to the dashboard
import { task, type TaskContext } from '@renderinc/sdk/workflows';

const BASE = (process.env.AGENTPURSE_URL || 'https://agentpurse-k4bu.onrender.com').replace(/\/$/, '');
const TOKEN = process.env.DIGEST_TOKEN || '';

type Txn = { agentName: string; merchant: string; item: string; amount: number; status: string; createdAt: string };
type PurseState = {
  balance: number;
  agents: { name: string; status: string; dailyCap: number; spentToday: number }[];
  pending: Txn[];
  blockedWeek: number;
  ledger: Txn[];
};
export type Digest = {
  at: string;
  recap: string;
  balance: number;
  paidTotal: number;
  paidCount: number;
  blockedCount: number;
  waitingCount: number;
  topAgent: { name: string; spent: number } | null;
  byAgent: { name: string; spent: number }[];
  frozen: string[];
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return (await res.json()) as T;
}

const retry = { maxRetries: 3, waitDurationMs: 2000, backoffScaling: 2 };

export const fetchPurse = task(
  { name: 'fetchPurse', retry, timeoutSeconds: 120 },
  async function fetchPurse(_ctx: TaskContext): Promise<PurseState> {
    const [state, ledger] = await Promise.all([getJson<Omit<PurseState, 'ledger'>>('/api/state'), getJson<Txn[]>('/api/ledger')]);
    return { ...state, ledger };
  },
);

export const fetchRecap = task(
  { name: 'fetchRecap', retry, timeoutSeconds: 180 },
  async function fetchRecap(_ctx: TaskContext): Promise<string> {
    const { summary } = await getJson<{ summary: string }>('/api/summary');
    return summary;
  },
);

export const savePurseDigest = task(
  { name: 'savePurseDigest', retry, timeoutSeconds: 120 },
  async function savePurseDigest(_ctx: TaskContext, digest: Digest): Promise<{ ok: boolean }> {
    const res = await fetch(`${BASE}/api/digest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-digest-token': TOKEN },
      body: JSON.stringify(digest),
    });
    if (!res.ok) throw new Error(`save digest returned ${res.status}`);
    return { ok: true };
  },
);

export const buildWeeklyDigest = task(
  { name: 'buildWeeklyDigest', timeoutSeconds: 600 },
  async function buildWeeklyDigest(ctx: TaskContext): Promise<Digest> {
    // The slow steps run at the same time.
    const [state, recap] = await Promise.all([ctx.run(fetchPurse), ctx.run(fetchRecap)]);

    const week = Date.now() - 7 * 24 * 3600_000;
    const recent = state.ledger.filter((t) => new Date(t.createdAt).getTime() > week);
    const paid = recent.filter((t) => t.status === 'paid');
    const byAgent = state.agents
      .map((a) => ({ name: a.name, spent: round(paid.filter((t) => t.agentName === a.name).reduce((s, t) => s + t.amount, 0)) }))
      .sort((a, b) => b.spent - a.spent);

    const digest: Digest = {
      at: new Date().toISOString(),
      recap,
      balance: state.balance,
      paidTotal: round(paid.reduce((s, t) => s + t.amount, 0)),
      paidCount: paid.length,
      blockedCount: state.blockedWeek,
      waitingCount: state.pending.length,
      topAgent: byAgent[0] && byAgent[0].spent > 0 ? byAgent[0] : null,
      byAgent,
      frozen: state.agents.filter((a) => a.status === 'frozen').map((a) => a.name),
    };

    await ctx.run(savePurseDigest, digest);
    return digest;
  },
);

const round = (n: number) => Math.round(n * 100) / 100;
