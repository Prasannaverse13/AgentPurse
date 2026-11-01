import { read } from '@/lib/db';
import { parseRule } from '@/lib/ai';
import { body, handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Preview how a rule will be read, without saving it.
export const POST = handle(async (req: Request) => {
  const b = await body<{ text?: string; agentId?: string | null }>(req);
  return json(await parseRule(String(b.text || ''), read().agents, b.agentId || null));
});
