import { read } from '@/lib/db';
import { spentToday } from '@/lib/engine';
import { paypalMode } from '@/lib/paypal';
import { aiMode } from '@/lib/ai';
import { channel3Mode } from '@/lib/channel3';
import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Everything the owner dashboard needs in one call.
export const GET = handle(async () => {
  const db = read();
  const weekAgo = Date.now() - 7 * 24 * 3600_000;
  return json({
    mode: { paypal: paypalMode(), ai: aiMode(), channel3: channel3Mode() },
    balance: db.balance,
    agents: db.agents.map((a) => ({ ...a, spentToday: spentToday(db, a.id) })),
    rules: db.rules,
    pending: db.txns.filter((t) => t.status === 'pending' && t.decidedBy === null),
    recent: db.txns.slice(0, 8),
    blockedWeek: db.txns.filter((t) => t.status === 'blocked' && new Date(t.createdAt).getTime() > weekAgo).length,
    events: db.events.slice(0, 20),
  });
});
