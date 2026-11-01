import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, readSession } from '@/lib/session';

// Every dashboard visit needs a PayPal login from this browser session.
export async function middleware(req: NextRequest) {
  const user = await readSession(req.cookies.get(COOKIE)?.value);
  if (user) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/connect-paypal';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/dashboard/:path*'] };
