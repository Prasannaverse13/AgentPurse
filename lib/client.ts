'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const usd = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init?.method || (init?.body ? 'POST' : 'GET'),
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed ${res.status}`);
  return data as T;
}

// Fetch and keep fresh. Polls so new agent requests show up live during the demo.
export function useApi<T>(path: string, every = 3000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const load = useCallback(async () => {
    try {
      const d = await api<T>(path);
      if (alive.current) { setData(d); setError(null); }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    }
  }, [path]);
  useEffect(() => {
    alive.current = true;
    load();
    const t = every ? setInterval(load, every) : undefined;
    const onFocus = () => load();
    window.addEventListener('ap:refresh', onFocus);
    return () => { alive.current = false; if (t) clearInterval(t); window.removeEventListener('ap:refresh', onFocus); };
  }, [load, every]);
  return { data, error, reload: load };
}

// Tell every useApi on the page to reload now.
export const refreshAll = () => window.dispatchEvent(new Event('ap:refresh'));

export const ago = (iso: string) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};
