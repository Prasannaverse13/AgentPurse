// AI layer. Uses OpenAI when OPENAI_API_KEY is set, with a rule based fallback so the app
// always works. Three jobs:
// 1. parseRule: turn a plain words rule into a structured rule the engine can run
// 2. riskNote: write a short note for the owner on a spend that needs a yes or was blocked
// 3. weeklySummary: a plain words recap of agent spend

import type { Agent, DB, Rule, RuleKind, Txn } from './types';

const KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.AI_MODEL || 'gpt-5.6-luna';

export const aiMode = () => (KEY ? 'openai' : 'heuristic');

async function llm(system: string, user: string, maxTokens = 400): Promise<string | null> {
  if (!KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
      // Reasoning models spend part of the limit on thinking, so leave room.
      body: JSON.stringify({ model: MODEL, max_completion_tokens: maxTokens * 4, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      console.warn('[ai] openai error', res.status, await res.text());
      return null;
    }
    const j = (await res.json()) as { choices: { message: { content: string | null } }[] };
    return (j.choices?.[0]?.message?.content ?? '').trim() || null;
  } catch (e) {
    console.warn('[ai] openai call failed', e);
    return null;
  }
}

function firstJson<T>(s: string | null): T | null {
  if (!s) return null;
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as T; } catch { return null; }
}

/* ---------------- 1. Rule parsing ---------------- */

export type ParsedRule = Pick<Rule, 'kind' | 'params'> & { agentId: string | null; explain: string; parsedBy: 'ai' | 'heuristic' };

const KINDS: RuleKind[] = ['ask_over', 'block_over', 'allow_list_only', 'block_keywords', 'require_keywords', 'velocity_freeze', 'time_window'];

export async function parseRule(text: string, agents: Agent[], forcedAgentId: string | null): Promise<ParsedRule> {
  const system = `You convert a spending rule for AI agents into JSON for a rule engine.
Kinds:
- ask_over {value}: owner must approve when amount > value USD
- block_over {value}: block when amount > value USD
- allow_list_only {}: merchant must be on the agent allow list
- block_keywords {words[]}: block when item or merchant contains any word (lower case)
- require_keywords {words[]}: owner must approve unless item or reason contains all words (lower case)
- velocity_freeze {factor}: freeze wallet when spend in the last hour is more than factor x the normal hourly spend
- time_window {from,to}: owner must approve outside UTC hours from..to (0-23)
Agents: ${agents.map((a) => `${a.id}=${a.name}`).join(', ')}.
Reply with JSON only: {"kind":"...","params":{...},"agentId":"ag_x or null","explain":"one short sentence"}`;
  const out = firstJson<{ kind: RuleKind; params: ParsedRule['params']; agentId: string | null; explain: string }>(
    await llm(system, text, 300),
  );
  if (out && KINDS.includes(out.kind)) {
    const agentId = forcedAgentId ?? (agents.some((a) => a.id === out.agentId) ? out.agentId : null);
    if (out.params?.words) out.params.words = out.params.words.map((w) => w.toLowerCase());
    return { kind: out.kind, params: out.params || {}, agentId, explain: out.explain || '', parsedBy: 'ai' };
  }
  return { ...heuristicRule(text, agents), agentId: forcedAgentId ?? heuristicRule(text, agents).agentId };
}

export function heuristicRule(text: string, agents: Agent[]): ParsedRule {
  const t = text.toLowerCase();
  const num = Number((t.match(/(\d+(?:\.\d+)?)/) || [])[1]);
  const agent = agents.find((a) => t.includes(a.name.toLowerCase()));
  const agentId = agent ? agent.id : null;
  const base = { agentId, parsedBy: 'heuristic' as const };

  if (/freeze|spike|jump/.test(t)) {
    const f = Number((t.match(/(\d+(?:\.\d+)?)\s*x/) || [])[1]) || 3;
    return { ...base, kind: 'velocity_freeze', params: { factor: f }, explain: `Freeze when hourly spend is over ${f}x normal` };
  }
  const hrs = t.match(/between\s+(\d{1,2})\s*(?:am|pm)?\s+and\s+(\d{1,2})\s*(am|pm)?/);
  if (hrs) {
    const from = Number(hrs[1]);
    let to = Number(hrs[2]);
    if (hrs[3] === 'pm' && to < 12) to += 12;
    return { ...base, kind: 'time_window', params: { from, to }, explain: `Ask outside ${from}:00 to ${to}:00 UTC` };
  }
  if (/allow ?list|approved shops|listed shops|known shops/.test(t)) {
    return { ...base, kind: 'allow_list_only', params: {}, explain: 'Merchant must be on the allow list' };
  }
  if (!Number.isNaN(num) && /(ask|before|approve|check with|ping)/.test(t)) {
    return { ...base, kind: 'ask_over', params: { value: num }, explain: `Ask owner over $${num}` };
  }
  if (!Number.isNaN(num) && /(never|block|max|maximum|no more than|limit|cap|over)/.test(t)) {
    return { ...base, kind: 'block_over', params: { value: num }, explain: `Block over $${num}` };
  }
  const only = t.match(/^(?:only\s+)?([a-z ]+?)\s+(?:fares|items|buys|purchases|tickets)?\s*only$/) || t.match(/only\s+(?:book|buy)\s+([a-z ]+)/);
  if (only) {
    const word = only[1].replace(/^(only|book|buy)\s+/, '').split(' ')[0];
    return { ...base, kind: 'require_keywords', params: { words: [word] }, explain: `Ask owner unless it says ${word}` };
  }
  const neg = t.match(/(?:no|never buy|don'?t buy|block|ban)\s+(.+)/);
  if (neg) {
    const words = neg[1].split(/,|\bor\b|\band\b/).map((w) => w.trim().replace(/s$/, '')).filter(Boolean);
    return { ...base, kind: 'block_keywords', params: { words }, explain: `Block ${words.join(', ')}` };
  }
  if (!Number.isNaN(num)) return { ...base, kind: 'ask_over', params: { value: num }, explain: `Ask owner over $${num}` };
  return { ...base, kind: 'require_keywords', params: { words: [] }, explain: 'Could not understand. Saved as a note.' };
}

/* ---------------- 2. Risk note ---------------- */

export async function riskNote(txn: Txn, history: Txn[]): Promise<string> {
  const past = history.filter((h) => h.agentId === txn.agentId && h.status === 'paid').slice(0, 15);
  const avg = past.length ? past.reduce((s, h) => s + h.amount, 0) / past.length : 0;
  const ai = await llm(
    'You review a spend request from an AI agent for its human owner. Reply with one or two short plain sentences: is it reasonable, and what should the owner check. No markdown.',
    JSON.stringify({
      request: { item: txn.item, merchant: txn.merchant, amount: txn.amount, agentReason: txn.reason },
      failedChecks: txn.checks.filter((c) => !c.ok).map((c) => c.rule),
      agentHistory: past.map((h) => ({ item: h.item, merchant: h.merchant, amount: h.amount })),
    }),
    150,
  );
  if (ai) return ai;
  const seen = past.some((h) => h.merchant.toLowerCase() === txn.merchant.toLowerCase());
  const size = avg ? `${(txn.amount / avg).toFixed(1)}x this agent's usual spend` : 'first spend for this agent';
  return `${seen ? 'Known shop' : 'New shop for this agent'}. Amount is ${size}.`;
}

/* ---------------- 3. Weekly summary ---------------- */

export async function weeklySummary(db: DB): Promise<string> {
  const weekAgo = Date.now() - 7 * 24 * 3600_000;
  const week = db.txns.filter((t) => new Date(t.createdAt).getTime() > weekAgo);
  const paid = week.filter((t) => t.status === 'paid');
  const byAgent = db.agents.map((a) => ({ agent: a.name, spent: paid.filter((t) => t.agentId === a.id).reduce((s, t) => s + t.amount, 0) }));
  const facts = {
    totalPaid: paid.reduce((s, t) => s + t.amount, 0),
    byAgent,
    blocked: week.filter((t) => t.status === 'blocked').map((t) => `${t.agentName}: ${t.item} (${t.flag})`),
    waiting: week.filter((t) => t.status === 'pending').length,
    frozen: db.agents.filter((a) => a.status === 'frozen').map((a) => a.name),
  };
  const ai = await llm(
    'Write a short weekly recap of AI agent spending for a busy owner. 3 to 4 plain sentences. Mention the biggest spender, anything blocked, and one suggestion. No markdown, no lists.',
    JSON.stringify(facts),
    250,
  );
  if (ai) return ai;
  const top = [...byAgent].sort((a, b) => b.spent - a.spent)[0];
  return `Agents paid $${facts.totalPaid.toFixed(2)} this week. ${top?.agent ?? 'No agent'} spent the most at $${(top?.spent ?? 0).toFixed(2)}. Rules blocked ${facts.blocked.length} buys${facts.frozen.length ? ` and ${facts.frozen.join(', ')} is frozen` : ''}. ${facts.waiting ? `${facts.waiting} buys still wait for you.` : 'Nothing waits for you.'}`;
}
