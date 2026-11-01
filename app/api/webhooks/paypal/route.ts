// PayPal webhook. Payout events arrive here after the payment call returns.
// A payout that is returned, blocked, failed or cancelled gives the money back to the purse.
import { read, write, log, now, round2 } from '@/lib/db';
import { paypalMode, verifyWebhook } from '@/lib/paypal';
import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

type Event = {
  id?: string;
  event_type?: string;
  resource?: { payout_item_id?: string; transaction_status?: string; errors?: { message?: string } };
};

// Statuses that mean the shop did not get the money.
const GIVE_BACK: Record<string, { status: 'refunded' | 'failed'; text: string }> = {
  RETURNED: { status: 'refunded', text: 'Payout was returned by the shop' },
  CANCELED: { status: 'refunded', text: 'Payout was cancelled' },
  REFUNDED: { status: 'refunded', text: 'Payout was refunded' },
  FAILED: { status: 'failed', text: 'PayPal could not send the payout' },
  BLOCKED: { status: 'failed', text: 'PayPal blocked the payout' },
  DENIED: { status: 'failed', text: 'PayPal denied the payout' },
};

export const POST = handle(async (req: Request) => {
  const raw = await req.text();
  let event: Event;
  try { event = JSON.parse(raw); } catch { return json({ error: 'Bad JSON' }, 400); }

  // Real PayPal calls must pass signature check. Mock mode (no keys) accepts calls so the demo can fire test events.
  if (paypalMode() !== 'mock' && !(await verifyWebhook(req.headers, event))) {
    return json({ error: 'Signature check failed. Set PAYPAL_WEBHOOK_ID.' }, 401);
  }

  const type = event.event_type || '';
  if (!type.startsWith('PAYMENT.PAYOUTS-ITEM.')) return json({ ok: true, ignored: type });

  const itemId = event.resource?.payout_item_id;
  const status = (event.resource?.transaction_status || type.split('.').pop() || '').toUpperCase();
  if (!itemId) return json({ ok: true, ignored: 'no payout item' });

  const found = read().txns.find((t) => t.paypal?.itemId === itemId);
  if (!found) return json({ ok: true, ignored: 'unknown payout item' });

  const give = GIVE_BACK[status];
  write((db) => {
    const t = db.txns.find((x) => x.id === found.id)!;
    t.paypal = { ...t.paypal, itemStatus: status };
    t.updatedAt = now();
    log(db, `PayPal says payout for ${t.item} is ${status}`);
    // Only a paid request can give money back, and only once.
    if (give && t.status === 'paid') {
      t.status = give.status;
      t.flag = give.text;
      db.balance = round2(db.balance + t.amount);
      log(db, `$${t.amount.toFixed(2)} went back to the purse from ${t.merchant}`);
    }
  });
  return json({ ok: true, txn: found.id, status });
});
