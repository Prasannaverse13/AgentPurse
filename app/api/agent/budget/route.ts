import { agentByKey, budget } from '@/lib/purse';
import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req: Request) => json(budget(agentByKey(req.headers.get('authorization')))));
