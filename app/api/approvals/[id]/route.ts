import { decide, HttpError } from '@/lib/purse';
import { body, handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Body: { decision: "approve" | "decline", note? }
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = await body<{ decision?: string; note?: string }>(req);
  if (b.decision !== 'approve' && b.decision !== 'decline') throw new HttpError(400, 'decision must be approve or decline');
  return json(await decide(id, b.decision, b.note));
});
