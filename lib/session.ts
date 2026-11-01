// Signed session cookie for the PayPal login. Works in Node and Edge (Web Crypto only).
export const COOKIE = 'ap_pp';
export type PaypalUser = { id: string; email: string; name: string; demo?: boolean; exp: number };

const enc = new TextEncoder();
const secret = () => process.env.SESSION_SECRET || process.env.PAYPAL_CLIENT_SECRET || 'agentpurse-dev-secret';
const b64u = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

async function sign(data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function makeSession(u: Omit<PaypalUser, 'exp'>, hours = 12) {
  const body = b64u(enc.encode(JSON.stringify({ ...u, exp: Date.now() + hours * 3600_000 })));
  return `${body}.${await sign(body)}`;
}

export async function readSession(value?: string | null): Promise<PaypalUser | null> {
  if (!value) return null;
  const [body, sig] = value.split('.');
  if (!body || !sig || (await sign(body)) !== sig) return null;
  try {
    const u = JSON.parse(decodeURIComponent(escape(fromB64u(body)))) as PaypalUser;
    return u.exp > Date.now() ? u : null;
  } catch { return null; }
}

// Session cookie: no max-age, so closing the browser means connecting PayPal again.
export const cookieOpts = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
