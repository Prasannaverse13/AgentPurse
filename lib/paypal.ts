// Thin PayPal REST client for the sandbox.
// Uses: OAuth, Orders v2 (fund the purse), Payments v2 refunds (withdraw to owner),
// Payouts v1 (pay a merchant for an agent), Payouts item cancel (claw back an unclaimed payout).
// With no credentials set, every call runs in mock mode so the app still works for judges.

import crypto from 'node:crypto';

const BASE = process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

export const paypalMode = (): 'sandbox' | 'live' | 'mock' =>
  !CLIENT_ID || !SECRET ? 'mock' : process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';

const fakeId = (p: string) => `${p}${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

let token: { value: string; exp: number } | null = null;

async function getToken() {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return token.value;
}

async function pp<T>(method: string, path: string, body?: unknown, idem?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      'Content-Type': 'application/json',
      ...(idem ? { 'PayPal-Request-Id': idem } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PayPal ${method} ${path} failed ${res.status}: ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

const money = (n: number) => n.toFixed(2);

/* ---------- Orders: owner funds the purse ---------- */

export async function createFundingOrder(amount: number) {
  if (paypalMode() === 'mock') return { id: fakeId('MOCKORDER') };
  return pp<{ id: string; status: string }>('POST', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: 'agentpurse_fund',
        description: 'AgentPurse top up',
        amount: { currency_code: 'USD', value: money(amount) },
      },
    ],
    payment_source: {
      paypal: { experience_context: { brand_name: 'AgentPurse', user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING' } },
    },
  });
}

export async function captureFundingOrder(orderId: string) {
  if (paypalMode() === 'mock' || orderId.startsWith('MOCKORDER')) {
    return { status: 'COMPLETED', captureId: fakeId('MOCKCAP'), amount: NaN };
  }
  type Cap = { status: string; purchase_units: { payments: { captures: { id: string; amount: { value: string } }[] } }[] };
  const r = await pp<Cap>('POST', `/v2/checkout/orders/${orderId}/capture`, {}, `cap-${orderId}`);
  const cap = r.purchase_units?.[0]?.payments?.captures?.[0];
  return { status: r.status, captureId: cap?.id, amount: cap ? Number(cap.amount.value) : NaN };
}

/* ---------- Refunds: send unused funds back to the owner ---------- */

export async function refundCapture(captureId: string, amount: number, note: string) {
  if (paypalMode() === 'mock' || captureId.startsWith('MOCK')) return { id: fakeId('MOCKREF'), status: 'COMPLETED' };
  return pp<{ id: string; status: string }>('POST', `/v2/payments/captures/${captureId}/refund`, {
    amount: { currency_code: 'USD', value: money(amount) },
    note_to_payer: note.slice(0, 255),
  }, `ref-${captureId}-${money(amount)}-${Date.now()}`);
}

/* ---------- Payouts: pay a merchant on behalf of an agent ---------- */

export async function payMerchant(p: { txnId: string; email: string; amount: number; note: string }) {
  if (paypalMode() === 'mock') {
    return { batchId: fakeId('MOCKBATCH'), itemId: fakeId('MOCKITEM'), itemStatus: 'UNCLAIMED' };
  }
  type Batch = { batch_header: { payout_batch_id: string; batch_status: string } };
  const r = await pp<Batch>('POST', '/v1/payments/payouts', {
    sender_batch_header: {
      sender_batch_id: p.txnId,
      email_subject: 'You have a payment from an AgentPurse agent',
      email_message: p.note.slice(0, 1000),
    },
    items: [
      {
        recipient_type: 'EMAIL',
        receiver: p.email,
        amount: { value: money(p.amount), currency: 'USD' },
        note: p.note.slice(0, 4000),
        sender_item_id: p.txnId,
      },
    ],
  }, `payout-${p.txnId}`);
  const batchId = r.batch_header.payout_batch_id;
  // The item id shows up once the batch is processed. Try briefly, then fall back to later lookup.
  let itemId: string | undefined;
  let itemStatus: string | undefined = r.batch_header.batch_status;
  for (let i = 0; i < 3 && !itemId; i++) {
    await new Promise((res) => setTimeout(res, 800));
    const s = await getPayoutBatch(batchId).catch(() => null);
    if (s?.itemId) ({ itemId, itemStatus } = s);
  }
  return { batchId, itemId, itemStatus };
}

export async function getPayoutBatch(batchId: string) {
  if (paypalMode() === 'mock' || batchId.startsWith('MOCK') || batchId.startsWith('SEED')) return null;
  type B = { batch_header: { batch_status: string }; items?: { payout_item_id: string; transaction_status: string }[] };
  const r = await pp<B>('GET', `/v1/payments/payouts/${batchId}`);
  const it = r.items?.[0];
  return { batchStatus: r.batch_header.batch_status, itemId: it?.payout_item_id, itemStatus: it?.transaction_status };
}

// Only UNCLAIMED payout items can be cancelled. Money goes back to the purse.
export async function cancelPayoutItem(itemId: string) {
  if (paypalMode() === 'mock' || itemId.startsWith('MOCK') || itemId.startsWith('SEED')) {
    return { status: 'RETURNED' };
  }
  const r = await pp<{ transaction_status: string }>('POST', `/v1/payments/payouts-item/${itemId}/cancel`, {});
  return { status: r.transaction_status };
}

/* ---------- Webhooks: PayPal tells us what happened to a payout ---------- */

// Asks PayPal to check the signature of a webhook call. Needs PAYPAL_WEBHOOK_ID from the dashboard.
export async function verifyWebhook(headers: Headers, event: unknown): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID || '';
  if (!webhookId) return false;
  const h = (n: string) => headers.get(n) || '';
  try {
    const r = await pp<{ verification_status: string }>('POST', '/v1/notifications/verify-webhook-signature', {
      auth_algo: h('paypal-auth-algo'),
      cert_url: h('paypal-cert-url'),
      transmission_id: h('paypal-transmission-id'),
      transmission_sig: h('paypal-transmission-sig'),
      transmission_time: h('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: event,
    });
    return r.verification_status === 'SUCCESS';
  } catch {
    return false;
  }
}
