import { publicOrigin } from '@/lib/origin';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeUrl, loginEnabled } from '@/lib/paypal-login';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  if (!loginEnabled()) return NextResponse.redirect(new URL('/connect-paypal?error=not_configured', req.url));
  const state = crypto.randomUUID();
  const origin = publicOrigin(req);
  const res = NextResponse.redirect(authorizeUrl(origin, state));
  res.cookies.set('ap_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600, secure: process.env.NODE_ENV === 'production' });
  return res;
}
