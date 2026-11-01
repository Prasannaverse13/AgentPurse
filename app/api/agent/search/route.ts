import { read } from '@/lib/db';
import { evaluate } from '@/lib/engine';
import { channel3Mode, searchProducts } from '@/lib/channel3';
import { agentByKey, HttpError } from '@/lib/purse';
import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

// GET /api/agent/search?q=standing desk&maxPrice=700&limit=4
// Channel3 product search, with a rules preview on every offer so the agent
// can skip shops it would be blocked at before it tries to pay.
export const GET = handle(async (req: Request) => {
  const agent = agentByKey(req.headers.get('authorization'));
  const u = new URL(req.url);
  const q = (u.searchParams.get('q') || '').trim();
  if (!q) throw new HttpError(400, 'q is required, for example ?q=standing desk');
  const maxPrice = Number(u.searchParams.get('maxPrice')) || undefined;
  const limit = Number(u.searchParams.get('limit')) || 5;

  let products;
  try {
    products = await searchProducts(q, { maxPrice, limit });
  } catch (e) {
    throw new HttpError(502, (e as Error).message);
  }

  const db = read();
  const results = products.map((p) => ({
    ...p,
    offers: p.offers.map((of) => {
      const d = evaluate(db, agent, { amount: of.price, merchant: of.merchant, item: p.title, reason: '' });
      const rules = d.decision === 'auto' ? 'auto' : d.decision === 'ask' ? 'ask' : 'block';
      return {
        ...of,
        rules, // auto = pays at once, ask = owner must approve, block = rules will refuse
        rulesNote: rules === 'auto' ? 'Inside your rules' : d.flag ?? '',
      };
    }),
  }));
  return json({ source: channel3Mode() === 'live' ? 'channel3' : 'channel3-demo-catalog', query: q, results });
});
