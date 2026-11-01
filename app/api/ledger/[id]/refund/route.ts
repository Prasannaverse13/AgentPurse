import { refund } from '@/lib/purse';
import { body, handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = await body<{ why?: string }>(req);
  return json(await refund(id, String(b.why || 'Refunded by owner'), 'owner'));
});
