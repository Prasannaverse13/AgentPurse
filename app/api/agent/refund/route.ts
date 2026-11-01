import { agentByKey, refund } from '@/lib/purse';
import { body, handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Agent asks for a refund. Body: { requestId, why }. The owner makes the final call.
export const POST = handle(async (req: Request) => {
  const agent = agentByKey(req.headers.get('authorization'));
  const b = await body<{ requestId?: string; why?: string }>(req);
  return json(await refund(String(b.requestId), String(b.why || ''), 'agent', agent.id));
});
