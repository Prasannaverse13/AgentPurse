'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import { useApi } from '@/lib/client';
import type { State } from '@/lib/state';

const links = [
  { href: '/dashboard', label: 'Overview', icon: 'M3 12h7V3H3v9Zm0 9h7v-6H3v6Zm11 0h7v-9h-7v9Zm0-18v6h7V3h-7Z' },
  { href: '/dashboard/approvals', label: 'Approvals', icon: 'M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', count: true },
  { href: '/dashboard/wallets', label: 'Agent wallets', icon: 'M3 7h18v12H3zM3 11h18M16 15h1' },
  { href: '/dashboard/rules', label: 'Rules', icon: 'M4 6h16M4 12h10M4 18h6' },
  { href: '/dashboard/ledger', label: 'Ledger', icon: 'M5 4h14v16H5zM9 8h6M9 12h6M9 16h3' },
  { href: '/dashboard/studio', label: 'Studio', icon: 'M4 5h7v6H4zM13 5h7v3h-7zM13 11h7v8h-7zM4 14h7v5H4z' },
  { href: '/dashboard/timeline', label: 'Timeline', icon: 'M4 7h9M8 12h12M4 17h7' },
  { href: '/dashboard/assistant', label: 'Ask the treasurer', icon: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z' },
  { href: '/dashboard/connect', label: 'Connect an agent', icon: 'M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1' },
];

export default function Sidebar() {
  const path = usePathname();
  const { data } = useApi<State>('/state', 4000);
  const pending = data?.pending.length ?? 0;
  const mode = data?.mode;

  return (
    <aside className="side">
      <div style={{ padding: '6px 12px' }}><Logo href="/" /></div>
      <nav className="side-nav" aria-label="Dashboard">
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={path === l.href ? 'page' : undefined}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={l.icon} />
            </svg>
            {l.label}
            {l.count && pending ? <span className="count">{pending}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="card" style={{ marginTop: 'auto', padding: 16 }}>
        <div className="caption">PayPal</div>
        <div className="row gap-8" style={{ marginTop: 6 }}>
          <span className={`dot ${mode?.paypal === 'mock' ? '' : 'dot-ink'}`} />
          <span className="small ink" style={{ fontWeight: 500 }}>{mode ? (mode.paypal === 'mock' ? 'Mock mode' : `Sandbox connected`) : '…'}</span>
        </div>
        <div className="caption" style={{ marginTop: 10 }}>AI</div>
        <div className="row gap-8" style={{ marginTop: 6 }}>
          <span className={`dot ${mode?.ai === 'openai' ? 'dot-ink' : ''}`} />
          <span className="small ink" style={{ fontWeight: 500 }}>{mode ? (mode.ai === 'openai' ? 'OpenAI' : 'Built in rules') : '…'}</span>
        </div>
      </div>
    </aside>
  );
}
