// Purse service: the only place that moves money. API routes call these.

import { read, write, id, now, round2, log } from './db';
import { evaluate, spentToday, type SpendInput } from './engine';
import * as paypal from './paypal';
import { riskNote } from './ai';
import { merchantEmail } from './seed';
import type { Agent, Txn } from './types';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function agentByKey(header: string | null): Agent {
  const key = header?.replace(/^Bearer\s+/i, '').trim();
  const agent = key ? read().agents.find((a) => a.key === key) : undefined;
  if (!agent) throw new HttpError(401, 'Unknown agent key. Send it as Authorization: Bearer <key>.');
  return agent;
}

export function publicTxn(t: Txn) {
  return {
    id: t.id, status: t.status, item: t.item, merchant: t.merchant, amount: t.amount, currency: t.currency,
    flag: t.flag ?? null, checks: t.checks, decidedBy: t.decidedBy,
    paypal: t.paypal ? { payoutBatchId: t.paypal.batchId, payoutItemId: t.paypal.itemId, status: t.paypal.itemStatus } : null,
    createdAt: t.createdAt, updatedAt: t.updatedAt,
  };
}

async function pay(txnId: string) {
  const t = read().txns.find((x) => x.id === txnId)!;
  // Reserve the money first so two fast calls cannot overspend.
  write((db) => { db.balance = round2(db.balance - t.amount); });
  try {
    const r = await paypal.payMerchant({
      txnId: t.id,
      email: t.merchantEmail,
      amount: t.amount,
      note: `${t.agentName} bought ${t.item}. Reason: ${t.reason}`.slice(0, 500),
    });
    write((db) => {
      const x = db.txns.find((y) => y.id === txnId)!;
      x.status = 'paid';
      x.paypal = { batchId: r.batchId, itemId: r.itemId, itemStatus: r.itemStatus };
      x.updatedAt = now();
      log(db, `${x.agentName} paid $${x.amount.toFixed(2)} to ${x.merchant} via PayPal Payouts`);
    });
  } catch (e) {
    write((db) => {
      db.balance = round2(db.balance + t.amount);
      const x = db.txns.find((y) => y.id === txnId)!;
      x.status = 'failed';
      x.flag = `PayPal error: ${(e as Error).message.slice(0, 200)}`;
      x.updatedAt = now();
    });
  }
}

const safeUrl = (u: unknown) => {
  try { const x = new URL(String(u)); return x.protocol === 'https:' || x.protocol === 'http:' ? x.toString().slice(0, 600) : undefined; } catch { return undefined; }
};

export async function requestSpend(agent: Agent, body: Partial<SpendInput> & { merchantEmail?: string; productUrl?: string; image?: string }) {
  const req: SpendInput = {
    amount: round2(Number(body.amount)),
    merchant: String(body.merchant || '').trim().slice(0, 120),
    item: String(body.item || '').trim().slice(0, 200),
    reason: String(body.reason || '').trim().slice(0, 500),
  };
  if (!req.merchant || !req.item) throw new HttpError(400, 'merchant and item are required');
  if (!Number.isFinite(req.amount)) throw new HttpError(400, 'amount must be a number in USD');

  const { decision, checks, flag } = evaluate(read(), agent, req);
  const txnId = id('tx');
  const t: Txn = {
    id: txnId, agentId: agent.id, agentName: agent.name, ...req,
    merchantEmail: body.merchantEmail?.includes('@') ? body.merchantEmail : merchantEmail(req.merchant),
    productUrl: safeUrl(body.productUrl), productImage: safeUrl(body.image),
    currency: 'USD', status: decision === 'auto' ? 'paid' : decision === 'ask' ? 'pending' : 'blocked',
    decidedBy: decision === 'ask' ? null : 'rules', checks, flag: decision === 'auto' ? undefined : flag,
    createdAt: now(), updatedAt: now(),
  };
  if (decision === 'auto') t.status = 'pending'; // becomes paid inside pay()

  write((db) => {
    db.txns.unshift(t);
    if (decision === 'freeze') {
      const a = db.agents.find((x) => x.id === agent.id)!;
      a.status = 'frozen';
      a.frozenReason = flag;
      log(db, `${agent.name} wallet frozen: ${flag}`);
    }
  });

  if (decision === 'auto') {
    await pay(txnId);
  } else {
    const note = await riskNote(t, read().txns);
    write((db) => { const x = db.txns.find((y) => y.id === txnId); if (x) x.aiNote = note; });
  }

  const out = read().txns.find((x) => x.id === txnId)!;
  const message = {
    auto: out.status === 'paid' ? 'Paid. The merchant was paid with PayPal.' : 'Payment failed. See flag.',
    ask: 'Waiting for the owner to approve. Poll check_request with this id.',
    block: `Blocked by rule: ${flag}`,
    freeze: `Blocked and wallet frozen: ${flag}`,
  }[decision];
  return { ...publicTxn(out), message };
}

export async function decide(txnId: string, decision: 'approve' | 'decline', note?: string) {
  const t = read().txns.find((x) => x.id === txnId);
  if (!t) throw new HttpError(404, 'No such request');
  if (t.status !== 'pending' || t.decidedBy === 'rules') throw new HttpError(409, `Request is ${t.status}`);
  if (decision === 'decline') {
    write((db) => {
      const x = db.txns.find((y) => y.id === txnId)!;
      x.status = 'declined'; x.decidedBy = 'owner'; x.flag = note || 'Declined by owner'; x.updatedAt = now();
      log(db, `Owner declined ${x.agentName}: ${x.item}`);
    });
  } else {
    const db = read();
    const agent = db.agents.find((a) => a.id === t.agentId)!;
    if (agent.status === 'frozen') throw new HttpError(409, 'Wallet is frozen. Unfreeze it first.');
    if (t.amount > db.balance) throw new HttpError(409, `Purse balance is $${db.balance.toFixed(2)}. Add funds first.`);
    write((d) => { const x = d.txns.find((y) => y.id === txnId)!; x.decidedBy = 'owner'; });
    await pay(txnId);
  }
  return publicTxn(read().txns.find((x) => x.id === txnId)!);
}

export async function refund(txnId: string, why: string, by: 'owner' | 'agent', agentId?: string) {
  const t = read().txns.find((x) => x.id === txnId);
  if (!t) throw new HttpError(404, 'No such payment');
  if (agentId && t.agentId !== agentId) throw new HttpError(403, 'Not your payment');
  if (t.status !== 'paid') throw new HttpError(409, `Only paid items can be refunded. This one is ${t.status}.`);
  if (by === 'agent') {
    // Agents may only ask. The owner sees it on the ledger.
    write((db) => {
      const x = db.txns.find((y) => y.id === txnId)!;
      x.flag = `Agent asked for refund: ${why}`; x.updatedAt = now();
      log(db, `${x.agentName} asked for a refund on ${x.item}`);
    });
    return { ...publicTxn(read().txns.find((x) => x.id === txnId)!), message: 'Refund request sent to the owner.' };
  }
  let status = 'RETURNED';
  if (t.paypal?.itemId) {
    try {
      status = (await paypal.cancelPayoutItem(t.paypal.itemId)).status;
    } catch (e) {
      throw new HttpError(409, `PayPal could not pull the payout back. It is only possible while the payout is unclaimed. ${(e as Error).message.slice(0, 160)}`);
    }
  }
  write((db) => {
    const x = db.txns.find((y) => y.id === txnId)!;
    x.status = 'refunded';
    x.flag = why || 'Refunded by owner';
    x.paypal = { ...x.paypal, itemStatus: status, refundNote: why };
    x.updatedAt = now();
    db.balance = round2(db.balance + x.amount);
    log(db, `Refunded $${x.amount.toFixed(2)} from ${x.merchant} back to the purse`);
  });
  return publicTxn(read().txns.find((x) => x.id === txnId)!);
}

export function budget(agent: Agent) {
  const db = read();
  const a = db.agents.find((x) => x.id === agent.id)!;
  const today = spentToday(db, a.id);
  return {
    agent: a.name,
    status: a.status,
    frozenReason: a.frozenReason ?? null,
    dailyCap: a.dailyCap,
    spentToday: round2(today),
    leftToday: round2(Math.max(0, a.dailyCap - today)),
    autoApproveLimit: a.autoApproveLimit,
    allowedShops: a.shops,
    rules: db.rules.filter((r) => r.on && (!r.agentId || r.agentId === a.id)).map((r) => r.text),
  };
}

/* ---------- Funding ---------- */

export async function startFunding(amount: number) {
  amount = round2(amount);
  if (!(amount >= 1 && amount <= 10_000)) throw new HttpError(400, 'Amount must be between $1 and $10,000');
  const order = await paypal.createFundingOrder(amount);
  write((db) => { db.fundings.unshift({ id: id('fd'), orderId: order.id, amount, refunded: 0, status: 'created', createdAt: now() }); });
  return { orderId: order.id };
}

export async function finishFunding(orderId: string) {
  const f = read().fundings.find((x) => x.orderId === orderId);
  if (!f) throw new HttpError(404, 'Unknown order');
  if (f.status === 'captured') return { balance: read().balance };
  const cap = await paypal.captureFundingOrder(orderId);
  if (cap.status !== 'COMPLETED') throw new HttpError(402, `PayPal capture status ${cap.status}`);
  write((db) => {
    const x = db.fundings.find((y) => y.orderId === orderId)!;
    x.status = 'captured'; x.captureId = cap.captureId;
    if (Number.isFinite(cap.amount)) x.amount = cap.amount;
    db.balance = round2(db.balance + x.amount);
    log(db, `Owner added $${x.amount.toFixed(2)} with PayPal`);
  });
  return { balance: read().balance };
}

// Send unused money back to the owner by refunding the latest funding captures.
export async function withdraw(amount: number) {
  amount = round2(amount);
  const db = read();
  if (!(amount > 0) || amount > db.balance) throw new HttpError(400, `You can withdraw up to $${db.balance.toFixed(2)}`);
  let left = amount;
  for (const f of db.fundings.filter((x) => x.status === 'captured' && x.captureId)) {
    if (left <= 0) break;
    const take = round2(Math.min(left, f.amount - f.refunded));
    if (take <= 0) continue;
    await paypal.refundCapture(f.captureId!, take, 'AgentPurse withdrawal');
    write((d) => {
      const x = d.fundings.find((y) => y.id === f.id)!;
      x.refunded = round2(x.refunded + take);
      if (x.refunded >= x.amount) x.status = 'refunded';
      d.balance = round2(d.balance - take);
    });
    left = round2(left - take);
  }
  if (left > 0) throw new HttpError(409, `Only $${(amount - left).toFixed(2)} could be refunded to PayPal. The rest came from demo funds.`);
  write((d) => log(d, `Owner withdrew $${amount.toFixed(2)} to PayPal`));
  return { balance: read().balance };
}
