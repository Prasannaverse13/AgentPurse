import Link from 'next/link';
import Nav from '@/components/Nav';
import HeroDemo from '@/components/HeroDemo';
import Faq from '@/components/Faq';
import Logo from '@/components/Logo';
import './landing.css';

const agentsList = ['Claude', 'ChatGPT', 'Gemini', 'LangChain', 'CrewAI', 'OpenAI Agents SDK', 'Vercel AI SDK', 'Any MCP client', 'Custom REST'];

const receipts = [
  { agent: 'Shopper', item: 'Printer paper 10 pack', merchant: 'Staples', amount: '$38.90', status: 'Auto approved' },
  { agent: 'Trip Planner', item: 'Flight BLR to SFO', merchant: 'Expedia', amount: '$642.10', status: 'Approved by you' },
  { agent: 'Ops Bot', item: 'GPU credits', merchant: 'unknown-gpu.io', amount: '$95.00', status: 'Blocked' },
  { agent: 'Ops Bot', item: 'Render web service', merchant: 'Render', amount: '$25.00', status: 'Auto approved' },
  { agent: 'Gift Agent', item: 'Custom mug', merchant: 'Etsy', amount: '$22.40', status: 'Refunded' },
  { agent: 'Shopper', item: 'Coffee beans 2 kg', merchant: 'Target', amount: '$25.30', status: 'Auto approved' },
];

export default function Home() {
  return (
    <>
      <Nav />

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="hero-top">
           <div className="container">
            <div className="rating fade-up">
              <span className="stars" aria-hidden>★★★★★</span>
              Built on PayPal. Ready for any MCP agent.
            </div>
            <h1 className="display fade-up d1">Give your agents a wallet. Keep the keys.</h1>
            <p className="lead fade-up d2">
              AgentPurse gives every AI agent its own PayPal budget, spend rules and a direct line to you.
              Small buys go through. Risky ones wait for your yes.
            </p>
            <form className="hero-form fade-up d3" action="/connect-paypal">
              <input className="input" type="email" placeholder="you@company.com" aria-label="Work email" />
              <button className="btn btn-primary" type="submit">Create a purse</button>
            </form>
            <div className="hero-proof fade-up d3">
              <span>Daily caps per agent</span>
              <span>·</span>
              <span>Human approval over your limit</span>
              <span>·</span>
              <span>One tap refunds</span>
            </div>
           </div>
          </div>
          <div className="container">
            <HeroDemo />
          </div>
        </section>

        {/* RECEIPT CAROUSEL */}
        <section style={{ padding: '24px 0 0' }} aria-label="Recent agent purchases">
          <div className="marquee">
            <div className="marquee-track">
              {[...receipts, ...receipts].map((r, i) => (
                <div key={i} className="card card-dark" style={{ width: 300, flexShrink: 0, padding: 24 }}>
                  <div className="row between">
                    <span className="caption" style={{ color: 'var(--color-pebble)' }}>{r.agent}</span>
                    <span className="caption" style={{ color: r.status === 'Blocked' ? 'var(--color-dusty-rose)' : 'var(--color-peach-whisper)' }}>{r.status}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 39, marginTop: 40, lineHeight: 1.1 }}>{r.amount}</div>
                  <div className="small" style={{ color: '#fff', marginTop: 8 }}>{r.item}</div>
                  <div className="caption" style={{ color: 'var(--color-pebble)' }}>{r.merchant} via PayPal</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW: FUND / ORB / SPEND */}
        <section className="section" id="how">
          <div className="container">
            <div className="section-head center">
              <h2 className="h1">Fund it once. Let it spend safely.</h2>
              <p className="lead">You set the budget and the rules. Your agents spend inside them. AgentPurse sits in the middle and checks every cent.</p>
            </div>

            <div className="grid-3" style={{ marginTop: 64, alignItems: 'center', gridTemplateColumns: '1fr auto 1fr' }}>
              <div className="stack gap-12">
                <span className="badge badge-fog" style={{ alignSelf: 'flex-start', background: '#fff' }}>Fund</span>
                {[
                  ['Budget', 'Your PayPal balance. A cap per agent.'],
                  ['Rules', 'Plain words. Shops, limits, times.'],
                  ['Approvals', 'You say yes when it matters.'],
                ].map(([t, d]) => (
                  <div key={t} className="card" style={{ padding: 20 }}>
                    <div className="ink" style={{ fontWeight: 500 }}>{t}</div>
                    <div className="small">{d}</div>
                  </div>
                ))}
                <span className="caption">You feed the purse</span>
              </div>

              <div className="stack" style={{ alignItems: 'center', gap: 16, padding: '0 32px' }}>
                <div className="orb" />
                <span className="caption ink" style={{ fontWeight: 500 }}>AgentPurse</span>
              </div>

              <div className="stack gap-12">
                <span className="badge" style={{ alignSelf: 'flex-start' }}>Spend</span>
                {[
                  ['Shops', 'Checkout with PayPal Orders.'],
                  ['APIs and SaaS', 'Top ups and bills, inside caps.'],
                  ['Other agents', 'Pay agents with PayPal Payouts.'],
                ].map(([t, d]) => (
                  <div key={t} className="card" style={{ padding: 20 }}>
                    <div className="ink" style={{ fontWeight: 500 }}>{t}</div>
                    <div className="small">{d}</div>
                  </div>
                ))}
                <span className="caption">Your agents buy what you allow</span>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" id="features" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <span className="badge" style={{ alignSelf: 'flex-start' }}>Guardrails</span>
              <h2 className="h1">Every buy passes the rules first.</h2>
              <p className="lead">The rule engine runs before PayPal ever sees a request. No rule, no payment.</p>
            </div>

            <div className="grid-2" style={{ marginTop: 48 }}>
              <div className="card stack gap-24" style={{ padding: 32 }}>
                <div className="stack gap-8">
                  <h3 className="h3">Rules in plain words.</h3>
                  <p className="body">Type a rule like you would tell a person. AI turns it into a check the engine can run.</p>
                </div>
                <div className="inner stack gap-12">
                  <div className="small ink">“Ask me before any buy over 300 dollars”</div>
                  <div className="caption" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{'{ when: amount > 300, then: "ask_owner" }'}</div>
                </div>
                <div className="inner stack gap-12">
                  <div className="small ink">“Trip Planner only books refundable fares”</div>
                  <div className="caption" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{'{ agent: "trip", require: "refundable" }'}</div>
                </div>
              </div>

              <div className="card stack gap-24" style={{ padding: 32 }}>
                <div className="stack gap-8">
                  <h3 className="h3">Approve from anywhere.</h3>
                  <p className="body">Big buys ping you with the item, the price and the agent&apos;s reason. One tap pays with PayPal.</p>
                </div>
                <div className="inner stack gap-12" style={{ background: '#fff', boxShadow: 'var(--shadow-subtle)' }}>
                  <div className="row between"><span className="caption">Trip Planner</span><span className="caption">2 min ago</span></div>
                  <div className="ink" style={{ fontWeight: 500 }}>Flight BLR to SFO · $642.10</div>
                  <div className="reason">Cheapest nonstop under your 700 limit. Refundable fare.</div>
                  <div className="row gap-8">
                    <span className="btn btn-primary btn-sm" aria-hidden>Approve</span>
                    <span className="btn btn-ghost btn-sm" aria-hidden>Decline</span>
                  </div>
                </div>
              </div>

              <div className="card stack gap-16" style={{ padding: 32 }}>
                <h3 className="h3">Freeze on odd spend.</h3>
                <p className="body">AI watches each agent&apos;s normal pattern. A sudden spike or a new shady shop freezes the wallet until you look.</p>
                <div className="row gap-8" style={{ alignItems: 'flex-end', height: 80 }}>
                  {[18, 22, 16, 25, 20, 24, 19, 72].map((h, i) => (
                    <span key={i} style={{ flex: 1, height: h, borderRadius: 6, background: i === 7 ? 'var(--color-dusty-rose)' : 'var(--color-fog)' }} />
                  ))}
                </div>
              </div>

              <div className="card stack gap-16" style={{ padding: 32 }}>
                <h3 className="h3">One tap refunds.</h3>
                <p className="body">Wrong item? Refund straight from the ledger. AgentPurse calls PayPal and logs why.</p>
                <div className="inner row between">
                  <div className="stack"><span className="small ink">Custom mug · Etsy</span><span className="caption">Gift Agent</span></div>
                  <span className="badge">Refunded $22.40</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WORKS WITH ANY AGENT */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head center">
              <h2 className="h1">Works with any agent.</h2>
              <p className="lead">One MCP server or one REST call. No custom wiring.</p>
            </div>
          </div>
          <div className="marquee" style={{ marginTop: 48 }}>
            <div className="marquee-track" style={{ animationDuration: '30s' }}>
              {[...agentsList, ...agentsList].map((a, i) => (
                <div key={i} className="card row gap-12" style={{ padding: '16px 24px', flexShrink: 0 }}>
                  <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{a.slice(0, 2)}</span>
                  <span className="small ink" style={{ fontWeight: 500 }}>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MCP DARK */}
        <section className="section" id="mcp" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="card card-dark grid-2" style={{ padding: 48, gap: 48, alignItems: 'center', borderRadius: 32 }}>
              <div className="stack gap-16">
                <span className="badge" style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,.08)', color: '#fff' }}>For developers</span>
                <h2 className="h1" style={{ color: '#fff' }}>Your agent asks. The purse decides.</h2>
                <p className="lead" style={{ color: 'var(--color-pebble)' }}>
                  Add the AgentPurse MCP server and your agent gets three tools. Request a spend, check its budget, ask for a refund.
                  It never touches your PayPal keys.
                </p>
                <div className="row gap-8" style={{ marginTop: 8 }}>
                  <Link href="/connect-paypal" className="btn btn-primary">Get an agent key</Link>
                  <a href="#faq" className="btn btn-ghost">Read the docs</a>
                </div>
              </div>
              <div className="card" style={{ background: 'var(--color-midnight-ink)', boxShadow: 'none', padding: 24 }}>
                <pre className="code">
<span className="c">{'// claude_desktop_config.json'}</span>{'\n'}
{'{\n  '}<span className="k">&quot;mcpServers&quot;</span>{': {\n    '}<span className="k">&quot;agentpurse&quot;</span>{': {\n      '}<span className="k">&quot;command&quot;</span>{': '}<span className="s">&quot;npx&quot;</span>{',\n      '}<span className="k">&quot;args&quot;</span>{': ['}<span className="s">&quot;agentpurse-mcp&quot;</span>{'],\n      '}<span className="k">&quot;env&quot;</span>{': { '}<span className="k">&quot;AGENT_KEY&quot;</span>{': '}<span className="s">&quot;ap_live_...&quot;</span>{' }\n    }\n  }\n}\n\n'}
<span className="c">{'// tools your agent gets'}</span>{'\n'}
{'request_spend(amount, merchant, reason)\nget_budget()\nrequest_refund(order_id, why)'}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* LEDGER PREVIEW */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head center">
              <h2 className="h1">See every cent.</h2>
              <p className="lead">One ledger for every agent. Who spent, where, why, and which rule let it through.</p>
              <Link href="/dashboard/ledger" className="btn btn-ghost" style={{ marginTop: 8 }}>Open the ledger</Link>
            </div>

            <div className="browser" style={{ marginTop: 48 }}>
              <div className="chrome"><i /><i /><i /><div className="url">app.agentpurse.dev/ledger</div></div>
              <div className="scroll-x" style={{ padding: 24 }}>
                <div>
                <div className="row gap-24" style={{ padding: '0 0 12px', borderBottom: '1px solid var(--color-line)' }}>
                  {['Agent', 'Item', 'Merchant', 'Amount', 'Rule', 'Status'].map((h) => (
                    <span key={h} className="caption" style={{ flex: 1 }}>{h}</span>
                  ))}
                </div>
                {receipts.map((r, i) => (
                  <div key={i} className="row gap-24" style={{ padding: '14px 0', borderBottom: '1px solid var(--color-line)' }}>
                    <span className="small ink" style={{ flex: 1 }}>{r.agent}</span>
                    <span className="small" style={{ flex: 1 }}>{r.item}</span>
                    <span className="small" style={{ flex: 1 }}>{r.merchant}</span>
                    <span className="small amount" style={{ flex: 1 }}>{r.amount}</span>
                    <span className="small" style={{ flex: 1 }}>{r.status === 'Blocked' ? 'Allow list' : 'Under cap'}</span>
                    <span style={{ flex: 1 }}><span className="badge badge-fog"><span className={`dot ${r.status === 'Blocked' ? 'dot-rose' : 'dot-ink'}`} />{r.status}</span></span>
                  </div>
                ))}
                </div>
              </div>
            </div>

            <div className="grid-4" style={{ marginTop: 48 }}>
              {[
                ['Spend by agent', 'See which agent costs the most and why.'],
                ['Rule hits', 'Know which rules block the most buys.'],
                ['Weekly summary', 'A plain words recap every Monday.'],
                ['Export', 'Send the ledger to your accountant in one click.'],
              ].map(([t, d]) => (
                <div key={t} className="stack gap-4">
                  <span className="ink" style={{ fontWeight: 500 }}>{t}</span>
                  <span className="small">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" id="faq" style={{ paddingTop: 0 }}>
          <div className="container grid-2" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 64 }}>
            <div className="section-head">
              <h2 className="h1">Frequently asked questions.</h2>
              <p className="lead">Everything you need to know about AgentPurse.</p>
            </div>
            <Faq />
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="card stack" style={{ padding: '80px 24px', alignItems: 'center', textAlign: 'center', gap: 24, borderRadius: 32 }}>
              <div className="orb" style={{ width: 96, height: 96 }} />
              <h2 className="h1" style={{ maxWidth: 720 }}>Let your agents shop. Stay in charge.</h2>
              <p className="lead" style={{ maxWidth: 520 }}>Create a purse in two minutes with the PayPal sandbox.</p>
              <Link href="/connect-paypal" className="btn btn-primary">Create a purse</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container row between" style={{ flexWrap: 'wrap', gap: 24 }}>
          <div className="stack gap-8">
            <Logo />
            <span className="caption">Built for the PayPal AI Hackathon 2026. Sandbox only.</span>
          </div>
          <div className="row gap-24">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#mcp">Developers</a>
            <Link href="/connect-paypal">Dashboard</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
