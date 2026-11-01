import { publicOrigin } from '@/lib/origin';
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const base = publicOrigin(req);
  const res = NextResponse.redirect(`${base}/connect-paypal?bye=1`);
  res.cookies.delete(COOKIE);
  return res;
}
