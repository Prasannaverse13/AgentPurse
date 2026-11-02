import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { HttpError } from './purse';
import { DEMO_OWNER, ownerForAgentKey, runAs } from './db';
import { COOKIE, readSession } from './session';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

// Picks whose purse this call touches: an agent key opens that agent's purse,
// a PayPal login opens that user's private purse, anything else gets the shared demo purse.
async function whoseCall(): Promise<string> {
  const auth = (await headers()).get('authorization');
  const key = auth?.replace(/^Bearer\s+/i, '').trim();
  const byKey = ownerForAgentKey(key);
  if (byKey) return byKey;
  const user = await readSession((await cookies()).get(COOKIE)?.value);
  return user && !user.demo ? `pp_${user.id}` : DEMO_OWNER;
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response> | Response) {
  return async (...args: A) => {
    try {
      const owner = await whoseCall();
      return await runAs(owner, () => fn(...args));
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error('[api]', e);
      return json({ error: (e as Error).message || 'Server error' }, 500);
    }
  };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { return {} as T; }
}
