#!/usr/bin/env node
// AgentPurse MCP server. Gives any MCP agent a safe wallet:
//   search_products find what to buy with Channel3, with a rules preview on every offer.
//   request_spend   ask to pay a merchant. Rules decide: paid, waiting for owner, or blocked.
//   check_request   poll a request that is waiting for the owner.
//   get_budget      see caps, what is left today, allowed shops and rules.
//   request_refund  ask the owner to refund a paid item.
// Env: AGENTPURSE_URL (default http://localhost:3000), AGENT_KEY (from the Wallets page).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = (process.env.AGENTPURSE_URL || 'http://localhost:3000').replace(/\/$/, '');
const KEY = process.env.AGENT_KEY || '';

async function call(method, path, body) {
  const res = await fetch(`${BASE}/api/agent${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  return data;
}

const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });

function explain(r) {
  if (r.error) return `Error: ${r.error}`;
  const failed = (r.checks || []).filter((c) => !c.ok).map((c) => `- ${c.rule}`).join('\n');
  const head = {
    paid: `PAID $${r.amount} to ${r.merchant} with PayPal. Request id ${r.id}.`,
    pending: `WAITING for the owner to approve $${r.amount} at ${r.merchant}. Request id ${r.id}. Call check_request later. Do not retry the purchase.`,
    blocked: `BLOCKED. Do not try again with a different shop or split the amount. Reason: ${r.flag}`,
    declined: `DECLINED by the owner. ${r.flag || ''}`,
    refunded: `REFUNDED. ${r.flag || ''}`,
    failed: `FAILED. ${r.flag || ''}`,
  }[r.status] || JSON.stringify(r);
  return failed ? `${head}\nRules that did not pass:\n${failed}` : head;
}

const server = new McpServer({ name: 'agentpurse', version: '0.1.0' });

function formatSearch(r) {
  if (r.error) return `Error: ${r.error}`;
  if (!r.results?.length) return 'No products found. Try different words.';
  const tag = { auto: 'pays at once', ask: 'owner must approve', block: 'WILL BE BLOCKED' };
  return r.results
    .map((p, i) =>
      `${i + 1}. ${p.title}${p.brand ? ` (${p.brand})` : ''}\n` +
      p.offers.map((o) => `   - ${o.merchant} $${o.price} [${tag[o.rules]}${o.rules !== 'auto' && o.rulesNote ? `: ${o.rulesNote}` : ''}] ${o.url}`).join('\n'),
    )
    .join('\n');
}

server.registerTool(
  'search_products',
  {
    title: 'Search products',
    description:
      'Find a product with Channel3 and compare prices across shops. Each offer shows what your owner rules will do: pays at once, needs owner approval, or will be blocked. Prefer offers that pay at once.',
    inputSchema: {
      query: z.string().describe('What to buy, for example standing desk'),
      maxPrice: z.number().positive().optional().describe('Highest price in USD'),
      limit: z.number().int().min(1).max(10).optional(),
    },
  },
  async ({ query, maxPrice, limit }) => {
    const qs = new URLSearchParams({ q: query, ...(maxPrice ? { maxPrice: String(maxPrice) } : {}), ...(limit ? { limit: String(limit) } : {}) });
    return text(formatSearch(await call('GET', `/search?${qs}`)));
  },
);

server.registerTool(
  'request_spend',
  {
    title: 'Request a payment',
    description:
      'Pay a merchant from your AgentPurse wallet. Always give an honest reason. The owner rules decide: small safe buys are paid at once, others wait for the owner, some are blocked. Never try to get around a block.',
    inputSchema: {
      amount: z.number().positive().describe('Price in USD'),
      merchant: z.string().describe('Shop or service name, for example Staples'),
      item: z.string().describe('What you are buying'),
      reason: z.string().describe('Why the user needs this'),
      merchantEmail: z.string().email().optional().describe('Merchant PayPal email, if known'),
      productUrl: z.string().url().optional().describe('Product link from search_products'),
      image: z.string().url().optional().describe('Product image from search_products'),
    },
  },
  async (args) => text(explain(await call('POST', '/spend', args))),
);

server.registerTool(
  'check_request',
  {
    title: 'Check a request',
    description: 'Check whether a request that was waiting for the owner is now paid, declined or still waiting.',
    inputSchema: { requestId: z.string() },
  },
  async ({ requestId }) => text(explain(await call('GET', `/requests/${encodeURIComponent(requestId)}`))),
);

server.registerTool(
  'get_budget',
  {
    title: 'Get budget',
    description: 'See your daily cap, what is left today, your auto approve limit, allowed shops and the rules you must follow. Call this before shopping.',
    inputSchema: {},
  },
  async () => text(await call('GET', '/budget')),
);

server.registerTool(
  'request_refund',
  {
    title: 'Ask for a refund',
    description: 'Ask the owner to refund something you paid for, for example a wrong item.',
    inputSchema: { requestId: z.string(), why: z.string() },
  },
  async (args) => text(await call('POST', '/refund', args)),
);

if (!KEY) console.error('[agentpurse-mcp] AGENT_KEY is not set. Copy it from the Wallets page.');
await server.connect(new StdioServerTransport());
console.error(`[agentpurse-mcp] ready, talking to ${BASE}`);
