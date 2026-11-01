import { publicOrigin } from '@/lib/origin';
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, cookieOpts, makeSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Judges without a PayPal sandbox login can still look around. Off unless ALLOW_DEMO_LOGIN=true.
export async function GET(req: NextRequest) {
  const base = publicOrigin(req);
  if (process.env.ALLOW_DEMO_LOGIN !== 'true') return NextResponse.redirect(`${base}/connect-paypal`);
  const res = NextResponse.redirect(`${base}/dashboard`);
  res.cookies.set(COOKIE, await makeSession({ id: 'demo', email: 'demo@agentpurse.dev', name: 'Demo owner', demo: true }, 2), cookieOpts);
  return res;
}
