// Rule engine. Pure function: given the store, an agent and a spend request, decide
// auto pay, ask the owner, block, or freeze. Runs before any PayPal call.

import type { Agent, Check, DB, Rule } from './types';

export type SpendInput = { amount: number; merchant: string; item: string; reason: string };
export type Decision = 'auto' | 'ask' | 'block' | 'freeze';

const startOfDay = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.getTime(); };

export function spentToday(db: DB, agentId: string) {
  const t0 = startOfDay();
  return db.txns
    .filter((t) => t.agentId === agentId && t.status === 'paid' && new Date(t.updatedAt).getTime() >= t0)
    .reduce((s, t) => s + t.amount, 0);
}

// Normal spend for one hour: twice the usual buy, or a quarter of the daily cap, whichever is higher.
export function hourBaseline(db: DB, agentId: string) {
  const paid = db.txns.filter((t) => t.agentId === agentId && t.status === 'paid').slice(0, 30);
  const avg = paid.length ? paid.reduce((s, t) => s + t.amount, 0) / paid.length : 0;
  const cap = db.agents.find((a) => a.id === agentId)?.dailyCap ?? 0;
  return Math.max(20, avg * 2, cap / 4);
}

function lastHour(db: DB, agentId: string) {
  const h = Date.now() - 3600_000;
  const xs = db.txns.filter((t) => t.agentId === agentId && t.status === 'paid' && new Date(t.createdAt).getTime() >= h);
  return { total: xs.reduce((s, t) => s + t.amount, 0), count: xs.length };
}

const hay = (r: SpendInput) => `${r.item} ${r.merchant} ${r.reason}`.toLowerCase();

function runRule(rule: Rule, agent: Agent, req: SpendInput, db: DB): Check {
  const p = rule.params;
  switch (rule.kind) {
    case 'ask_over':
      return { rule: rule.text, ok: req.amount <= (p.value ?? Infinity), effect: req.amount > (p.value ?? Infinity) ? 'ask' : 'pass' };
    case 'block_over':
      return { rule: rule.text, ok: req.amount <= (p.value ?? Infinity), effect: req.amount > (p.value ?? Infinity) ? 'block' : 'pass' };
    case 'allow_list_only': {
      const ok = agent.shops.some((s) => req.merchant.toLowerCase().includes(s.toLowerCase()));
      return { rule: rule.text, ok, effect: ok ? 'pass' : 'block' };
    }
    case 'block_keywords': {
      const hit = (p.words || []).find((w) => w && hay(req).includes(w.toLowerCase()));
      return { rule: hit ? `${rule.text} (found "${hit}")` : rule.text, ok: !hit, effect: hit ? 'block' : 'pass' };
    }
    case 'require_keywords': {
      const words = p.words || [];
      const ok = words.every((w) => hay(req).includes(w.toLowerCase()));
      return { rule: rule.text, ok, effect: ok ? 'pass' : 'ask' };
    }
    case 'velocity_freeze': {
      const factor = p.factor ?? 3;
      // A spike is many buys adding up fast. One big buy is handled by caps and ask rules instead.
      const lh = lastHour(db, agent.id);
      const total = lh.total + req.amount;
      const limit = factor * hourBaseline(db, agent.id);
      const ok = lh.count + 1 < 4 || total <= limit;
      return { rule: ok ? rule.text : `${rule.text} ($${total.toFixed(0)} in the last hour, limit $${limit.toFixed(0)})`, ok, effect: ok ? 'pass' : 'freeze' };
    }
    case 'time_window': {
      const h = new Date().getUTCHours();
      const from = p.from ?? 0;
      const to = p.to ?? 24;
      const ok = from <= to ? h >= from && h < to : h >= from || h < to;
      return { rule: rule.text, ok, effect: ok ? 'pass' : 'ask' };
    }
  }
}

export function evaluate(db: DB, agent: Agent, req: SpendInput): { decision: Decision; checks: Check[]; flag?: string } {
  const checks: Check[] = [];

  // Built in checks first.
  if (agent.status === 'frozen') {
    checks.push({ rule: `Wallet is frozen${agent.frozenReason ? `: ${agent.frozenReason}` : ''}`, ok: false, effect: 'block' });
  }
  if (!(req.amount > 0) || req.amount > 10_000) {
    checks.push({ rule: 'Amount must be between $0.01 and $10,000', ok: false, effect: 'block' });
  }
  if (req.amount > db.balance) {
    checks.push({ rule: `Purse balance is $${db.balance.toFixed(2)}`, ok: false, effect: 'block' });
  }
  const today = spentToday(db, agent.id);
  const capOk = today + req.amount <= agent.dailyCap;
  checks.push({ rule: capOk ? `Inside daily cap of $${agent.dailyCap}` : `Would go over the daily cap of $${agent.dailyCap} (spent $${today.toFixed(2)} today)`, ok: capOk, effect: capOk ? 'pass' : 'ask' });
  const autoOk = req.amount <= agent.autoApproveLimit;
  checks.push({ rule: autoOk ? `Under auto approve limit of $${agent.autoApproveLimit}` : `Over auto approve limit of $${agent.autoApproveLimit}`, ok: autoOk, effect: autoOk ? 'pass' : 'ask' });

  // Owner rules for all agents and for this agent.
  for (const r of db.rules) {
    if (!r.on) continue;
    if (r.agentId && r.agentId !== agent.id) continue;
    checks.push(runRule(r, agent, req, db));
  }

  const has = (e: Check['effect']) => checks.find((c) => c.effect === e);
  const first = has('freeze') || has('block') || has('ask');
  const decision: Decision = has('freeze') ? 'freeze' : has('block') ? 'block' : has('ask') ? 'ask' : 'auto';
  return { decision, checks, flag: first?.rule };
}
