import { paypalMode } from '@/lib/paypal';
import { aiMode } from '@/lib/ai';
import { channel3Mode } from '@/lib/channel3';
import { json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = () => json({ paypalClientId: process.env.PAYPAL_CLIENT_ID || null, paypal: paypalMode(), ai: aiMode(), channel3: channel3Mode() });
