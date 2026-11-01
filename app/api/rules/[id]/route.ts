import { write } from '@/lib/db';
import { body, handle, json } from '@/lib/http';
import { HttpError } from '@/lib/purse';

export const dynamic = 'force-dynamic';

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = await body<{ on?: boolean }>(req);
  return json(write((db) => {
    const r = db.rules.find((x) => x.id === id);
    if (!r) throw new HttpError(404, 'No such rule');
    if (typeof b.on === 'boolean') r.on = b.on;
    return r;
  }));
});

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  write((db) => { db.rules = db.rules.filter((x) => x.id !== id); });
  return json({ ok: true });
});
