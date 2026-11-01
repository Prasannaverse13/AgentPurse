# AgentPurse

A PayPal wallet for AI agents. Give each agent a budget and rules. Small safe buys go through on their own. Risky ones wait for your yes. Shady ones get blocked.

Built for the PayPal AI Hackathon 2026. Runs on the PayPal sandbox.

## Run it

```bash
npm install
cp .env.example .env.local   # optional, add PayPal sandbox keys and an OpenAI key
npm run dev
```

Open http://localhost:3000. With no keys it runs in mock mode so you can click through everything.

## How money moves

| Step | PayPal API |
|---|---|
| Owner adds funds to the purse | Orders v2 create + capture, with the PayPal JS SDK button |
| Agent buy is approved (by rules or owner) | Payouts v1 sends the money to the merchant PayPal email |
| Owner refunds a wrong buy | Payouts item cancel pulls an unclaimed payout back to the purse |
| Owner withdraws unused money | Payments v2 refund on the funding capture |

Every agent request runs through the rule engine before PayPal is called.

## Where AI is used

1. **Rules in plain words.** Type "ask me before any buy over 100 dollars". AI turns it into a rule the engine runs. A built in parser is the fallback.
2. **AI review on every held or blocked buy.** AI writes a short note for the owner using the agent history.
3. **Weekly summary** in plain words on the overview.
4. **The agents themselves.** Any MCP agent can spend through AgentPurse. `scripts/demo-agent.mjs` is an OpenAI shopping agent you can run.

## Rule engine

Built in checks: frozen wallet, purse balance, daily cap, auto approve limit.
Owner rules: ask over amount, block over amount, allow list only, blocked words, required words, time window, and a spike rule that freezes a wallet when many buys add up fast.
Order of effect: freeze, then block, then ask, then auto pay.

## Connect an agent

### MCP (Claude Desktop, Cursor, any MCP client)

```bash
cd mcp && npm install
```

```json
{
  "mcpServers": {
    "agentpurse": {
      "command": "node",
      "args": ["C:/path/to/AgentPurse/mcp/server.mjs"],
      "env": { "AGENTPURSE_URL": "http://localhost:3000", "AGENT_KEY": "ap_test_shopper_7f3k" }
    }
  }
}
```

Tools: `request_spend`, `check_request`, `get_budget`, `request_refund`.

### REST

```bash
curl -X POST http://localhost:3000/api/agent/spend \
  -H "Authorization: Bearer ap_test_shopper_7f3k" \
  -H "Content-Type: application/json" \
  -d '{"amount": 24.5, "merchant": "Staples", "item": "Printer paper", "reason": "Out of paper"}'
```

Returns `paid` (200), `pending` (202) or `blocked` (403) with every check that ran.

### Shop with Channel3

Agents can find products first. `search_products` (MCP) and `GET /api/agent/search?q=standing+desk` call the Channel3 API and compare offers across shops. Every offer comes back with a rules preview: pays at once, needs your yes, or will be blocked. The product link and photo then show on the approval card and in the ledger. Without `CHANNEL3_API_KEY` a small demo catalog is used.

You can also try it in the dashboard under Connect an agent.

### Demo agent

```bash
node scripts/demo-agent.mjs "Restock the office: paper, coffee and a standing desk"
```

Demo keys: Shopper `ap_test_shopper_7f3k`, Trip Planner `ap_test_trip_9d2m`, Ops Bot `ap_test_ops_4h8q`, Gift Agent `ap_test_gift_1x6v`.

## API

| Who | Route |
|---|---|
| Agent | `GET /api/agent/search`, `POST /api/agent/spend`, `GET /api/agent/budget`, `GET /api/agent/requests/:id`, `POST /api/agent/refund` |
| Owner | `GET /api/state`, `POST /api/agents`, `PATCH /api/agents/:id`, `GET POST /api/rules`, `PATCH DELETE /api/rules/:id`, `GET /api/approvals`, `POST /api/approvals/:id`, `GET /api/ledger`, `POST /api/ledger/:id/refund`, `POST /api/fund/order`, `POST /api/fund/capture`, `POST /api/fund/withdraw`, `GET /api/summary`, `POST /api/reset` |

## PayPal sandbox setup

1. Create an app at developer.paypal.com and copy the sandbox client id and secret into `.env.local`.
2. Payouts must be on for the sandbox business account (it is by default for new sandbox apps).
3. Use the sandbox personal account to pay when you add funds.
4. Merchant emails default to `<shop>@merchant.agentpurse.dev`. Those payouts stay unclaimed, which is what makes refunds possible. Pass `merchantEmail` to pay a real sandbox account.

## Webhook and treasurer
Webhook: add `https://YOUR-RENDER-URL/api/webhooks/paypal` in the PayPal developer dashboard. Pick the event types `PAYMENT.PAYOUTS-ITEM.*`. Put the webhook id in `PAYPAL_WEBHOOK_ID`. A returned or failed payout puts the money back in the purse and marks the row refunded or failed. Signatures are checked with PayPal verify-webhook-signature.

Treasurer: the page Ask the treasurer is a chat for the owner. It uses OpenAI tool calling with the PayPal Agent Toolkit (read only: transactions, orders, refunds, disputes) and local purse tools (summary, ledger, refund). Without an OpenAI key it shows a plain summary.

## AG Studio
The Studio page uses AG Studio (ag-studio-react) on the purse data. Agents and spend requests are two tables joined on agent. It has a Dialog theme, a starter report and an AI assistant that can add charts. The assistant calls `/api/ai/responses`, which holds the OpenAI key on the server. Put the AG Studio trial key in `AG_STUDIO_LICENSE`. Set `OPENAI_MODELS` to pick models for the assistant. The page loads data once, so refresh it to see new rows.

## Timeline

The Timeline page uses Bryntum Scheduler. One row per agent wallet, one bar per payment request, coloured by status. Click a bar for the reason and the rule that decided it. The repo uses the Bryntum trial package (`@bryntum/scheduler` aliased to `@bryntum/scheduler-trial`), which is for evaluation only. Swap in a licensed copy for production.

## Deploy on Render

1. Push this repo to GitHub.
2. In Render choose New, then Blueprint, and pick the repo. `render.yaml` sets everything up.
3. Add the env vars when asked: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and optionally `OPENAI_API_KEY` and `CHANNEL3_API_KEY`. With none of them the app still runs in mock mode.
4. Open the Render URL. Use `POST /api/reset` to reset the demo data.

Data lives in a JSON file, so a free instance resets on redeploy.

## Demo caveats

The owner dashboard has no login and `/api/state` includes the agent keys. That is fine for a sandbox demo. Add auth before real money.

## Stack

Next.js 15, React 19, AG Grid Community 33, Bryntum Scheduler, Channel3, PayPal REST (Orders, Payouts), MCP TypeScript SDK, OpenAI API. Design tokens in `app/tokens.css`.
