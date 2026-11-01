import { publicOrigin } from '@/lib/origin';
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/paypal-login';
import { COOKIE, cookieOpts, makeSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const base = publicOrigin(req);
  const fail = (why: string) => NextResponse.redirect(`${base}/connect-paypal?error=${encodeURIComponent(why)}`);
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  if (req.nextUrl.searchParams.get('error')) return fail('cancelled');
  if (!code || !state || state !== req.cookies.get('ap_state')?.value) return fail('bad_state');
  try {
    const user = await exchangeCode(code);
    const res = NextResponse.redirect(`${base}/dashboard`);
    res.cookies.set(COOKIE, await makeSession(user), cookieOpts);
    res.cookies.delete('ap_state');
    return res;
  } catch (e) {
    console.error('paypal login failed', e);
    return fail('login_failed');
  }
}
