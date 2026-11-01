import { read, write, id, now, log } from '@/lib/db';
import { parseRule } from '@/lib/ai';
import { body, handle, json } from '@/lib/http';
import { HttpError } from '@/lib/purse';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => json(read().rules));

// Body: { text, agentId? }. AI turns the words into a rule the engine can run.
export const POST = handle(async (req: Request) => {
  const b = await body<{ text?: string; agentId?: string | null }>(req);
  const text = String(b.text || '').trim().slice(0, 300);
  if (!text) throw new HttpError(400, 'text is required');
  const p = await parseRule(text, read().agents, b.agentId || null);
  const rule = write((db) => {
    const r = { id: id('r'), agentId: p.agentId, text, kind: p.kind, params: p.params, on: true, parsedBy: p.parsedBy, createdAt: now() };
    db.rules.unshift(r);
    log(db, `New rule: ${text}`);
    return r;
  });
  return json({ ...rule, explain: p.explain }, 201);
});
