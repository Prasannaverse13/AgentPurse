import { agentByKey, requestSpend } from '@/lib/purse';
import { body, handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Agent asks to spend. Body: { amount, merchant, item, reason, merchantEmail? }
export const POST = handle(async (req: Request) => {
  const agent = agentByKey(req.headers.get('authorization'));
  const out = await requestSpend(agent, await body(req));
  return json(out, out.status === 'blocked' ? 403 : out.status === 'pending' ? 202 : 200);
});
