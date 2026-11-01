import { read } from '@/lib/db';
import { agentByKey, HttpError, publicTxn } from '@/lib/purse';
import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const agent = agentByKey(req.headers.get('authorization'));
  const { id } = await ctx.params;
  const t = read().txns.find((x) => x.id === id && x.agentId === agent.id);
  if (!t) throw new HttpError(404, 'No such request');
  return json(publicTxn(t));
});
