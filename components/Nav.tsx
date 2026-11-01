'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 60);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className={`nav-wrap${scrolled ? ' scrolled' : ''}`}>
      <div className="container">
        <nav className="nav" aria-label="Main">
          <Logo />
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#mcp">For developers</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-right">
            <Link href="/connect-paypal" className="btn btn-ghost btn-sm nav-open">Open dashboard</Link>
            <Link href="/connect-paypal" className="btn btn-primary btn-sm nav-cta">Get started</Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
