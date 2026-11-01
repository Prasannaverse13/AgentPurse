import type { NextRequest } from 'next/server';

// Public origin behind a proxy like Render. Falls back to the request URL locally.
export function publicOrigin(req: NextRequest) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host');
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0];
  return host && proto ? `${proto}://${host}` : req.nextUrl.origin;
}
