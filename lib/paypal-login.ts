// Log in with PayPal (OpenID Connect). Each owner connects their own PayPal account.
const LIVE = process.env.PAYPAL_ENV === 'live';
const API = LIVE ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const WEB = LIVE ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com';

export const loginEnabled = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

export const redirectUri = (origin: string) => `${process.env.PUBLIC_URL || origin}/api/auth/paypal/callback`;

export function authorizeUrl(origin: string, state: string) {
  const q = new URLSearchParams({
    flowEntry: 'static',
    client_id: process.env.PAYPAL_CLIENT_ID!,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: redirectUri(origin),
    state,
  });
  return `${WEB}/connect?${q}`;
}

export async function exchangeCode(code: string) {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${API}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code }),
  });
  if (!res.ok) throw new Error(`PayPal token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { access_token } = (await res.json()) as { access_token: string };
  const info = await fetch(`${API}/v1/identity/openidconnect/userinfo?schema=openid`, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!info.ok) throw new Error(`PayPal userinfo ${info.status}`);
  const u = (await info.json()) as { user_id?: string; payer_id?: string; email?: string; name?: string; emails?: { value: string }[] };
  return {
    id: u.payer_id || u.user_id || 'paypal',
    email: u.email || u.emails?.[0]?.value || '',
    name: u.name || u.email || 'PayPal user',
  };
}
