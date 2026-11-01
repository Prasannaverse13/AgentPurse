import { timingSafeEqual } from 'node:crypto';
import { cleanDigest, readDigest, writeDigest } from '@/lib/digest';
import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => json({ digest: readDigest() }));

// Called by the Render Workflows task with a shared token.
export const POST = handle(async (req: Request) => {
  const expected = process.env.DIGEST_TOKEN || '';
  if (!expected) return json({ error: 'DIGEST_TOKEN is not set' }, 503);
  const got = req.headers.get('x-digest-token') || '';
  const a = Buffer.from(got), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ error: 'Bad token' }, 401);
  const d = cleanDigest(await req.json().catch(() => null));
  if (!d) return json({ error: 'Bad digest' }, 400);
  writeDigest(d);
  return json({ ok: true });
});
