import crypto from 'node:crypto';
import { write, id, now, log } from '@/lib/db';
import { body, handle, json } from '@/lib/http';
import { HttpError } from '@/lib/purse';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req: Request) => {
  const b = await body<{ name?: string; kind?: string; dailyCap?: number; autoApproveLimit?: number; shops?: string[] | string }>(req);
  const name = String(b.name || '').trim().slice(0, 40);
  if (!name) throw new HttpError(400, 'name is required');
  const shops = (Array.isArray(b.shops) ? b.shops : String(b.shops || '').split(','))
    .map((s) => s.trim().toLowerCase()).filter(Boolean);
  const agent = write((db) => {
    const a = {
      id: id('ag'), name, kind: String(b.kind || 'AI agent').slice(0, 60),
      initials: name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      key: `ap_test_${crypto.randomBytes(12).toString('hex')}`,
      dailyCap: Number(b.dailyCap) || 100, autoApproveLimit: Number(b.autoApproveLimit) || 50,
      status: 'active' as const, shops, createdAt: now(),
    };
    db.agents.push(a);
    log(db, `New agent wallet: ${name}`);
    return a;
  });
  return json(agent, 201);
});
