import Link from 'next/link';
import Logo from './Logo';

export default function Nav() {
  return (
    <div className="nav-wrap">
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
            <Link href="/dashboard" className="btn btn-ghost btn-sm">Open dashboard</Link>
            <Link href="/dashboard" className="btn btn-primary btn-sm">Get started</Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
