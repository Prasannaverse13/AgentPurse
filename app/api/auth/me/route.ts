import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = await readSession(req.cookies.get(COOKIE)?.value);
  return NextResponse.json(u ? { email: u.email, name: u.name, demo: !!u.demo } : null);
}
