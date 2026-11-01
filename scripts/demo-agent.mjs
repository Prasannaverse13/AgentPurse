#!/usr/bin/env node
// Demo shopping agent. Searches products with Channel3 through AgentPurse and pays with the purse.
// With OPENAI_API_KEY, OpenAI drives the shopping with tools. Without it, a fixed script runs
// so the demo still works.
//
//   node scripts/demo-agent.mjs "Restock the office: paper, coffee and a standing desk"
//
// Env: AGENTPURSE_URL (default http://localhost:3000), AGENT_KEY (default: Shopper demo key),
//      OPENAI_API_KEY, AI_MODEL

const BASE = (process.env.AGENTPURSE_URL || 'http://localhost:3000').replace(/\/$/, '');
const KEY = process.env.AGENT_KEY || 'ap_test_shopper_7f3k';
const AI_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.AI_MODEL || 'gpt-5.6-luna';
const task = process.argv.slice(2).join(' ') || 'Restock the office: 10 reams of paper, 2 kg of coffee, and a standing desk.';

const purse = async (method, path, body) => {
  const r = await fetch(`${BASE}/api/agent${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
};

const search = (query, maxPrice) =>
  purse('GET', `/search?${new URLSearchParams({ q: query, limit: '3', ...(maxPrice ? { maxPrice: String(maxPrice) } : {}) })}`);

const toolDefs = [
  { name: 'search_products', description: 'Search products with Channel3. Each offer shows what the owner rules will do: auto (pays at once), ask (owner must approve) or block.', input_schema: { type: 'object', properties: { query: { type: 'string' }, maxPrice: { type: 'number' } }, required: ['query'] } },
  { name: 'get_budget', description: 'Your AgentPurse budget, allowed shops and rules.', input_schema: { type: 'object', properties: {} } },
  { name: 'request_spend', description: 'Pay a merchant from AgentPurse. Rules decide paid, pending owner approval, or blocked. Never work around a block.', input_schema: { type: 'object', properties: { amount: { type: 'number' }, merchant: { type: 'string' }, item: { type: 'string' }, reason: { type: 'string' }, productUrl: { type: 'string' } }, required: ['amount', 'merchant', 'item', 'reason'] } },
];

const tools = toolDefs.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));

async function runTool(name, input) {
  if (name === 'search_products') return search(input.query, input.maxPrice);
  if (name === 'get_budget') return purse('GET', '/budget');
  if (name === 'request_spend') return purse('POST', '/spend', input);
  return { error: 'unknown tool' };
}

const say = (who, msg) => console.log(`\n${who === 'agent' ? '🤖' : '👛'}  ${msg}`);

async function withAI() {
  const messages = [
    { role: 'system', content: 'You are an office shopping agent. You find products with Channel3 and pay through AgentPurse.' },
    { role: 'user', content: `${task}\nCheck your budget first. Search each item. Prefer the cheapest offer that pays at once. Explain each buy in one line.` },
  ];
  for (let turn = 0; turn < 14; turn++) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, tools, messages }),
    }).then((x) => x.json());
    if (r.error) throw new Error(r.error.message);
    const msg = r.choices[0].message;
    messages.push(msg);
    if (msg.content?.trim()) say('agent', msg.content.trim());
    if (!msg.tool_calls?.length) return;
    for (const c of msg.tool_calls) {
      const input = JSON.parse(c.function.arguments || '{}');
      const out = await runTool(c.function.name, input);
      if (c.function.name === 'request_spend') say('purse', `${input.item} at ${input.merchant} $${input.amount}: ${out.status?.toUpperCase()} ${out.flag ? `(${out.flag})` : ''}`);
      messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(out) });
    }
  }
}

// Fixed script: the agent picks the cheapest offer first. If the rules block it,
// it reads the reason and moves to the next cheapest offer.
async function scripted() {
  say('agent', `Task: ${task}`);
  const b = await purse('GET', '/budget');
  if (b.error) throw new Error(b.error);
  say('agent', `Budget: $${b.leftToday} left today, auto approve up to $${b.autoApproveLimit}. Shops: ${b.allowedShops.join(', ')}`);

  for (const need of ['copy paper 10 reams', 'coffee beans 2 kg', 'standing desk']) {
    const found = await search(need);
    if (found.error) throw new Error(found.error);
    const product = found.results?.[0];
    if (!product) { say('agent', `Found nothing for "${need}".`); continue; }
    const offers = [...product.offers].sort((a, c) => a.price - c.price);
    say('agent', `Channel3 found ${product.title}. Cheapest: ${offers[0].merchant} $${offers[0].price}.`);
    for (const offer of offers) {
      say('agent', `Buying from ${offer.merchant} for $${offer.price}`);
      const r = await purse('POST', '/spend', {
        amount: offer.price, merchant: offer.merchant, item: product.title, productUrl: offer.url,
        reason: `Restock request. ${offer === offers[0] ? 'Cheapest option found.' : 'Next cheapest option inside the rules.'}`,
      });
      say('purse', `${r.status?.toUpperCase()}${r.flag ? `: ${r.flag}` : ''}${r.paypal?.payoutBatchId ? ` · PayPal ${r.paypal.payoutBatchId}` : ''}`);
      if (r.status !== 'blocked') break;
      say('agent', 'Blocked by the owner rules. I will not work around it. Trying the next offer.');
    }
  }
  say('agent', 'Done. Anything over the limit waits for your yes in the AgentPurse dashboard.');
}

(AI_KEY ? withAI() : scripted()).catch((e) => { console.error('Demo agent failed:', e.message); process.exit(1); });
