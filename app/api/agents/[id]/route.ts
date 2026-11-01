import crypto from 'node:crypto';
import { write, log } from '@/lib/db';
import { body, handle, json } from '@/lib/http';
import { HttpError } from '@/lib/purse';

export const dynamic = 'force-dynamic';

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = await body<{ status?: 'active' | 'frozen'; dailyCap?: number; autoApproveLimit?: number; shops?: string[]; rotateKey?: boolean }>(req);
  const a = write((db) => {
    const a = db.agents.find((x) => x.id === id);
    if (!a) throw new HttpError(404, 'No such agent');
    if (b.status === 'active' || b.status === 'frozen') {
      a.status = b.status;
      a.frozenReason = b.status === 'frozen' ? 'Frozen by owner' : undefined;
      log(db, `${a.name} wallet ${b.status === 'frozen' ? 'frozen' : 'unfrozen'} by owner`);
    }
    if (Number(b.dailyCap) > 0) a.dailyCap = Number(b.dailyCap);
    if (Number(b.autoApproveLimit) >= 0 && b.autoApproveLimit !== undefined) a.autoApproveLimit = Number(b.autoApproveLimit);
    if (Array.isArray(b.shops)) a.shops = b.shops.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
    if (b.rotateKey) a.key = `ap_test_${crypto.randomBytes(12).toString('hex')}`;
    return a;
  });
  return json(a);
});
