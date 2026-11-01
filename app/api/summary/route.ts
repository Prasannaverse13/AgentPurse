import { read } from '@/lib/db';
import { weeklySummary } from '@/lib/ai';
import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => json({ summary: await weeklySummary(read()) }));
