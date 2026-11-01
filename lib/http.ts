import { NextResponse } from 'next/server';
import { HttpError } from './purse';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response> | Response) {
  return async (...args: A) => {
    try {
      return await fn(...args);
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
