import Logo from '@/components/Logo';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, readSession } from '@/lib/session';
import '../landing.css';

export const dynamic = 'force-dynamic';

const errors: Record<string, string> = {
  cancelled: 'You closed the PayPal window. Try again when ready.',
  bad_state: 'The login link expired. Please try again.',
  login_failed: 'PayPal did not accept the login. Check that Log in with PayPal is on for this app.',
  not_configured: 'PayPal keys are missing on the server.',
};

export default async function ConnectPaypal({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  // Already connected in this browser session: go straight in (not right after logging out).
  if (!q.bye && (await readSession((await cookies()).get(COOKIE)?.value))) redirect('/dashboard');
  const demo = process.env.ALLOW_DEMO_LOGIN === 'true';
  const sandbox = process.env.PAYPAL_ENV !== 'live';

  return (
    <main className="connect">
      <div className="hero-top connect-glow" aria-hidden />
      <div className="connect-card">
        <Logo />
        <h1 className="h1" style={{ marginTop: 28 }}>Connect your PayPal</h1>
        <p className="body" style={{ marginTop: 12 }}>
          AgentPurse works with your own PayPal account. Log in each time you open the dashboard. We never see your password.
        </p>
        {q.error && <div className="connect-error" role="alert">{errors[q.error] ?? 'Something went wrong. Please try again.'}</div>}
        {q.bye && <div className="connect-note">You are logged out of PayPal here.</div>}
        <a href="/api/auth/paypal/start" className="pp-btn">
          <svg width="18" height="20" viewBox="0 0 24 28" aria-hidden><path fill="#003087" d="M20.1 2.1C18.8.7 16.5 0 13.4 0H4.6C4 0 3.5.5 3.4 1L0 23.4c-.1.4.3.8.7.8h5.5l1.4-8.7v.3c.1-.6.6-1 1.2-1h2.5c4.9 0 8.7-2 9.8-7.7l.1-.5c.3-2.1 0-3.6-1.1-4.5Z"/><path fill="#0070e0" d="M21.2 6.6c-1.1 5.7-4.9 7.7-9.8 7.7H8.9c-.6 0-1.1.4-1.2 1l-1.6 10.3-.5 2.9c-.1.4.3.7.6.7h4.3c.5 0 1-.4 1.1-.9l.9-5.8c.1-.5.5-.9 1.1-.9h.7c4.2 0 7.5-1.7 8.5-6.7.4-2.1.2-3.8-.9-5Z"/></svg>
          Log in with PayPal
        </a>
        {demo && <a href="/api/auth/demo" className="connect-demo">Just looking? Continue with the demo account</a>}
        <ul className="connect-points">
          <li>Your agents spend from the budget you set, not your whole account.</li>
          <li>Big buys still wait for your yes.</li>
          <li>{sandbox ? 'Sandbox mode. Use a PayPal sandbox personal or business login.' : 'Live PayPal.'}</li>
        </ul>
      </div>
    </main>
  );
}
