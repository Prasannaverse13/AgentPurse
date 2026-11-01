import { read } from '@/lib/db';
import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => json(read().txns));
