import { reset } from '@/lib/db';
import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Reset demo data. Handy before recording the demo video.
export const POST = handle(async () => { reset(); return json({ ok: true }); });
