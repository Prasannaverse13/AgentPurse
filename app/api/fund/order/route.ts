import { startFunding } from '@/lib/purse';
import { body, handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req: Request) => {
  const b = await body<{ amount?: number }>(req);
  return json(await startFunding(Number(b.amount)));
});
