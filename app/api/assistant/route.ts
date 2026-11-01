import { ask, type Turn } from '@/lib/treasurer';
import { body, handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = handle(async (req: Request) => {
  const b = await body<{ message?: string; history?: Turn[] }>(req);
  const message = String(b.message || '').trim().slice(0, 800);
  if (!message) return json({ error: 'Type a question first.' }, 400);
  return json(await ask(message, Array.isArray(b.history) ? b.history : []));
});
