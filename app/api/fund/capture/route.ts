import { finishFunding } from '@/lib/purse';
import { body, handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req: Request) => {
  const b = await body<{ orderId?: string }>(req);
  return json(await finishFunding(String(b.orderId)));
});
