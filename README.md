# AgentPurse

**A PayPal wallet for AI agents.** Give every agent a budget and rules in plain words. Small safe buys are paid on their own. Risky buys wait for your yes. Rule breaking buys are blocked. Every decision lands in a ledger with the reason and the PayPal payout id.

Built solo for the **PayPal AI Hackathon 2026**. It runs on the PayPal sandbox.

[**Live demo**](https://agentpurse-k4bu.onrender.com) · [OpenAPI spec](openapi.yaml) · MIT license

![Overview](docs/screenshots/1_overview.jpg)

| | |
|---|---|
| ![Agent run](docs/screenshots/2_agent_live.jpg) | ![Approval](docs/screenshots/4_approval.jpg) |
| An agent shops from the terminal and the dashboard updates live | The $829 desk waits for the owner, with an AI review and the rule checks |
| ![Ledger](docs/screenshots/3_ledger.jpg) | ![Treasurer](docs/screenshots/5_treasurer.jpg) |
| Every decision in an AG Grid ledger | Ask the treasurer. It reads real PayPal data with the PayPal Agent Toolkit |

## Contents

1. [The problem](#the-problem)
2. [What it does](#what-it-does)
3. [Architecture](#architecture)
4. [Life of a spend request](#life-of-a-spend-request)
5. [The rule engine](#the-rule-engine)
6. [How money moves (PayPal integration)](#how-money-moves-paypal-integration)
7. [Multi owner design](#multi-owner-design)
8. [Where AI is used](#where-ai-is-used)
9. [Connect an agent](#connect-an-agent)
10. [Sponsor integrations](#sponsor-integrations)
11. [Data model](#data-model)
12. [API reference](#api-reference)
13. [Security model](#security-model)
14. [Run it locally](#run-it-locally)
15. [Configuration](#configuration)
16. [Deploy on Render](#deploy-on-render)
17. [Tests](#tests)
18. [Known limits and roadmap](#known-limits-and-roadmap)
19. [Repo layout](#repo-layout)

## The problem

AI agents can now find a product, compare prices and decide to buy. The last step is the hard one: **payment**. Handing an agent a credit card means no limits, no questions and no way back. Handing it nothing means a human must click pay every time.

AgentPurse sits between the agent and PayPal. The agent never holds money or card details. It only holds a key that can *ask* the purse to pay. The owner's rules decide what happens.

## What it does

| Feature | Detail |
|---|---|
| **Per agent wallets** | Daily cap, auto approve limit, shop allow list, freeze switch, rotating keys |
| **Plain word rules** | Type "ask me before any buy over 300 dollars". AI turns it into a rule the engine runs. A built in parser is the fallback |
| **Three outcomes** | `paid` (200), `pending` (202), `blocked` (403), each with every check that ran |
| **Real PayPal money** | Fund with Orders v2, pay merchants with Payouts, pull unclaimed payouts back, withdraw with Payments refunds |
| **Human approvals** | Held buys show an AI risk review, the failed checks, product photo and link. One tap to approve and pay |
| **Webhook safety net** | A failed or returned payout puts the money back in the purse on its own |
| **Product search** | Agents compare offers with Channel3. Every offer comes with a rules preview: pays at once, needs a yes, or will be blocked |
| **Ledger and Studio** | AG Grid ledger with filters. AG Studio for your own reports and an AI chart assistant |
| **Timeline** | Bryntum Scheduler, one row per agent, one bar per request |
| **Treasurer chat** | Ask about money in plain words. OpenAI tool calling over the PayPal Agent Toolkit and local purse tools |
| **Weekly digest** | A Render Workflow task builds the recap with parallel steps and retries |
| **MCP server** | Any MCP client (Claude Desktop, Cursor) gets five wallet tools |
| **Private purses** | Log in with PayPal and get your own purse and your own agent keys |

## Architecture

```mermaid
flowchart LR
  subgraph Agents["AI agents"]
    A1["Claude Desktop / Cursor<br/>(MCP client)"]
    A2["Any script or SDK<br/>(REST)"]
    A3["scripts/demo-agent.mjs<br/>(OpenAI shopping agent)"]
  end

  MCP["mcp/server.mjs<br/>MCP server over stdio"]

  subgraph Web["Next.js 15 on Render (web service)"]
    direction TB
    AGENTAPI["/api/agent/*<br/>Bearer agent key"]
    OWNERAPI["/api/* owner routes<br/>session cookie"]
    HOOK["/api/webhooks/paypal"]
    ENGINE["Rule engine<br/>lib/engine.ts"]
    PURSE["Purse service<br/>lib/purse.ts<br/>the only code that moves money"]
    STORE[("JSON store<br/>one purse per owner<br/>lib/db.ts")]
    UI["Owner dashboard<br/>React 19 + AG Grid + AG Studio + Bryntum"]
    TREAS["Treasurer<br/>lib/treasurer.ts"]
    AI["AI layer<br/>lib/ai.ts"]
  end

  subgraph PayPal["PayPal"]
    ORD["Orders v2<br/>fund the purse"]
    PAY["Payouts v1<br/>pay merchants"]
    REF["Payments v2<br/>refund captures"]
    LOGIN["Log in with PayPal<br/>OpenID Connect"]
    WH["Webhooks<br/>PAYMENT.PAYOUTS-ITEM.*"]
    TOOLKIT["PayPal Agent Toolkit<br/>read only tools"]
  end

  C3["Channel3<br/>product search"]
  OAI["OpenAI API"]
  subgraph RenderWF["Render Workflows (separate service)"]
    WF["buildWeeklyDigest<br/>fetchPurse + fetchRecap<br/>then savePurseDigest"]
  end
  GH["GitHub Actions<br/>keepalive ping every 5 min"]

  A1 --> MCP --> AGENTAPI
  A2 --> AGENTAPI
  A3 --> AGENTAPI
  AGENTAPI --> ENGINE --> PURSE
  OWNERAPI --> PURSE
  PURSE <--> STORE
  PURSE --> PAY
  PURSE --> ORD
  PURSE --> REF
  PURSE --> AI --> OAI
  AGENTAPI -- "search" --> C3
  UI --> OWNERAPI
  UI --> TREAS --> OAI
  TREAS --> TOOLKIT
  LOGIN --> OWNERAPI
  WH -- "signed event" --> HOOK --> PURSE
  UI -- "Run on Render Workflows" --> WF
  WF -- "GET /api/state, /api/ledger, /api/summary<br/>POST /api/digest + token" --> Web
  GH --> Web
```

### Design rules

1. **One door for money.** Only `lib/purse.ts` calls PayPal to move money. Every route goes through it.
2. **Rules run before PayPal.** `lib/engine.ts` is a pure function with no network calls. It is unit tested.
3. **Agents can only ask.** An agent key can search, spend, check and ask for a refund. It cannot approve, refund, change rules or read other agents.
4. **Reserve first.** The purse balance drops *before* the PayPal call and is restored if the call fails, so two fast requests cannot overspend.
5. **Works without keys.** With no PayPal, OpenAI or Channel3 keys it runs in mock mode, so a judge can click through everything.

## Life of a spend request

```mermaid
sequenceDiagram
  autonumber
  participant Ag as AI agent
  participant API as /api/agent/spend
  participant Eng as Rule engine
  participant DB as Purse store
  participant PP as PayPal Payouts
  participant AI as OpenAI
  participant Own as Owner dashboard
  participant WH as PayPal webhook

  Ag->>API: POST spend {amount, merchant, item, reason} + Bearer key
  API->>DB: key resolves to an owner and an agent
  API->>Eng: evaluate(purse, agent, request)
  Eng-->>API: decision + every check

  alt decision = auto
    API->>DB: reserve amount (balance - amount)
    API->>PP: POST /v1/payments/payouts (idempotent id = txn id)
    PP-->>API: batch id, then payout item id
    API->>DB: status = paid
    API-->>Ag: 200 paid + PayPal ids
  else decision = ask
    API->>DB: status = pending
    API->>AI: risk note for the owner
    API-->>Ag: 202 pending (poll check_request)
    Own->>API: POST /api/approvals/:id approve
    API->>DB: reserve amount
    API->>PP: payout
    API->>DB: status = paid
  else decision = block or freeze
    API->>DB: status = blocked (freeze also locks the wallet)
    API-->>Ag: 403 blocked + failed rules
  end

  PP-->>WH: PAYMENT.PAYOUTS-ITEM.RETURNED or FAILED (later)
  WH->>DB: money back to the purse, row marked refunded or failed
```

### Request states

```mermaid
stateDiagram-v2
  [*] --> pending: rules say ask
  [*] --> blocked: rules say block or freeze
  [*] --> paid: rules say auto, payout accepted
  [*] --> failed: payout call failed (money restored)
  pending --> paid: owner approves
  pending --> declined: owner declines
  paid --> refunded: owner refund, or webhook RETURNED / CANCELED / REFUNDED
  paid --> failed: webhook FAILED / BLOCKED / DENIED
```

## The rule engine

`lib/engine.ts` is one pure function: `evaluate(purse, agent, request) → { decision, checks, flag }`.

```mermaid
flowchart TD
  R["Spend request"] --> B1{"Wallet frozen?"}
  B1 -- yes --> BLOCK
  B1 -- no --> B2{"Amount between 0.01 and 10,000?"}
  B2 -- no --> BLOCK
  B2 -- yes --> B3{"Amount over purse balance?"}
  B3 -- yes --> BLOCK
  B3 -- no --> B4{"Over daily cap?"}
  B4 -- yes --> ASK
  B4 -- no --> B5{"Over auto approve limit?"}
  B5 -- yes --> ASK
  B5 -- no --> O["Owner rules<br/>for all agents + this agent"]
  O --> OR{"Any rule fires?"}
  OR -- "freeze" --> FREEZE
  OR -- "block" --> BLOCK
  OR -- "ask" --> ASK
  OR -- none --> AUTO

  AUTO["AUTO<br/>pay now"]
  ASK["ASK<br/>owner approves"]
  BLOCK["BLOCK<br/>refuse"]
  FREEZE["FREEZE<br/>block and lock the wallet"]
```

**Order of effect: freeze, then block, then ask, then auto pay.** The engine runs every check (not just the first failure), so the agent and the owner see *all* the reasons.

| Rule kind | Effect | Example in plain words |
|---|---|---|
| `ask_over` | ask | "Ask me before any buy over 300 dollars" |
| `block_over` | block | "Never pay more than 1000 dollars at once" |
| `allow_list_only` | block | "Only pay shops on the allow list" |
| `block_keywords` | block | "No gift cards or crypto" |
| `require_keywords` | ask | "Refundable fares only" |
| `velocity_freeze` | freeze | "Freeze the wallet if spend jumps 3x in an hour" |
| `time_window` | ask | "Ask me outside 9 to 18" (UTC) |

The velocity rule compares the last hour to a baseline of `max($20, 2 x average buy, daily cap / 4)`. It only fires when there are four or more buys in the hour, so one big buy is left to the cap and ask rules.

## How money moves (PayPal integration)

```mermaid
flowchart LR
  Owner(("Owner")) -- "1 Pay with PayPal<br/>JS SDK button" --> O["Orders v2<br/>create + capture"]
  O -- "balance up" --> Purse[("Purse<br/>balance")]
  Purse -- "2 agent buy approved<br/>reserve first" --> P["Payouts v1<br/>to merchant PayPal email"]
  P --> Shop(("Merchant"))
  P -. "3 RETURNED / FAILED<br/>webhook" .-> Purse
  Purse -- "4 owner refund<br/>cancel unclaimed item" --> P
  Purse -- "5 withdraw<br/>refund the funding capture" --> R["Payments v2<br/>captures refund"] --> Owner
```

| Step | PayPal API | Code |
|---|---|---|
| Sign in the owner | Log in with PayPal (OpenID Connect): `/connect`, `/v1/oauth2/token`, `/v1/identity/openidconnect/userinfo` | `lib/paypal-login.ts`, `app/api/auth/paypal/*` |
| Fund the purse | Orders v2: `POST /v2/checkout/orders`, `POST /v2/checkout/orders/{id}/capture` | `createFundingOrder`, `captureFundingOrder` in `lib/paypal.ts` |
| Pay a merchant for an agent | Payouts v1: `POST /v1/payments/payouts` with `sender_batch_id` and `PayPal-Request-Id` set to the request id, so a retry can never pay twice | `payMerchant` |
| Read the payout item | `GET /v1/payments/payouts/{batch}` (short poll for the item id) | `getPayoutBatch` |
| Refund a wrong buy | `POST /v1/payments/payouts-item/{id}/cancel` (works while the payout is **unclaimed**) | `cancelPayoutItem` |
| Withdraw unused funds | Payments v2: `POST /v2/payments/captures/{id}/refund` | `refundCapture` |
| Learn what happened later | Webhooks `PAYMENT.PAYOUTS-ITEM.*`, verified with `POST /v1/notifications/verify-webhook-signature` | `app/api/webhooks/paypal/route.ts` |
| Ask about the money | **PayPal Agent Toolkit** (`@paypal/agent-toolkit/openai`), read only: transactions list, orders get, refunds, disputes | `lib/treasurer.ts` |

**Why unclaimed payouts matter.** Merchant emails default to `<shop>@merchant.agentpurse.dev`. Nobody owns that inbox, so the payout stays `UNCLAIMED` and the owner can pull it back. Pass `merchantEmail` to pay a real sandbox account.

**Webhook mapping.**

| PayPal status | Result in the purse |
|---|---|
| `RETURNED`, `CANCELED`, `REFUNDED` | Row becomes `refunded`, amount goes back to the balance |
| `FAILED`, `BLOCKED`, `DENIED` | Row becomes `failed`, amount goes back to the balance |
| anything else | Payout status is stored, nothing else changes |

Only a `paid` row can give money back, and only once, so a replayed webhook is harmless. In mock mode (no PayPal keys) the endpoint accepts test events. With keys it rejects any call that fails PayPal signature verification.

## Multi owner design

Each PayPal login gets a **private purse** with its own agents, rules, ledger and random agent keys. The shared demo account uses fixed keys so the README snippets work.

```mermaid
flowchart LR
  REQ["Incoming request"] --> W["lib/http.ts handle()"]
  W --> K{"Authorization: Bearer key?"}
  K -- "key matches an agent" --> O1["owner of that agent"]
  K -- no --> S{"Session cookie?"}
  S -- "real PayPal user" --> O2["pp_ + PayPal user id"]
  S -- "demo or none" --> O3["demo"]
  O1 & O2 & O3 --> ALS["AsyncLocalStorage<br/>runAs(owner, fn)"]
  ALS --> STORE[("store.purses[owner]")]
```

- `runAs(owner, fn)` puts the owner in an `AsyncLocalStorage`, so `read()` and `write()` inside the call can only touch that owner's purse. There is no owner argument to forget.
- An agent key is unique to one purse, so the key alone says whose purse to open.
- A webhook finds its owner from the **payout item id** (`ownerForPayoutItem`).
- `middleware.ts` guards `/dashboard/*` with a signed (HMAC SHA-256, Web Crypto) session cookie, so it runs on the Edge runtime too. The cookie has no max age, so closing the browser means connecting PayPal again.
- Private purses are capped at 300. The oldest one is dropped first.

## Where AI is used

| Job | Where | Fallback with no key |
|---|---|---|
| Turn a plain word rule into a structured rule | `parseRule` in `lib/ai.ts` | Regex parser `heuristicRule` |
| Write a risk review on every held or blocked buy | `riskNote` | Rule of thumb: known shop or not, size versus the agent's average |
| Weekly recap in plain words | `weeklySummary` | Template sentence |
| Treasurer chat with tool calling | `lib/treasurer.ts` | Plain balance summary |
| Studio chart assistant | `app/api/ai/responses/route.ts` (server side proxy, so the key never reaches the browser) | Disabled with a clear message |
| The shopping agent itself | `scripts/demo-agent.mjs` | Fixed script |

Prompt safety: the treasurer system prompt says text inside ledger items and merchant names comes from agents and is **data, not instructions**. A refund tool only runs when the owner clearly asks.

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
      "args": ["/path/to/AgentPurse/mcp/server.mjs"],
      "env": {
        "AGENTPURSE_URL": "https://agentpurse-k4bu.onrender.com",
        "AGENT_KEY": "ap_test_shopper_7f3k"
      }
    }
  }
}
```

| Tool | What it does |
|---|---|
| `get_budget` | Daily cap, what is left, auto approve limit, allowed shops, rules. Call it before shopping |
| `search_products` | Channel3 search with a rules preview on every offer |
| `request_spend` | Ask to pay. Returns PAID, WAITING or BLOCKED in words the model understands |
| `check_request` | Poll a request that is waiting for the owner |
| `request_refund` | Ask the owner to refund a paid item |

The tool replies tell the model the right behavior: on BLOCKED, *do not try another shop or split the amount*. On WAITING, *do not retry*, poll instead.

### REST

```bash
curl -X POST https://agentpurse-k4bu.onrender.com/api/agent/spend \
  -H "Authorization: Bearer ap_test_shopper_7f3k" \
  -H "Content-Type: application/json" \
  -d '{"amount": 24.5, "merchant": "Staples", "item": "Printer paper", "reason": "Out of paper"}'
```

Full contract in [`openapi.yaml`](openapi.yaml). You can generate an SDK from it.

### Demo agent

```bash
AGENTPURSE_URL=https://agentpurse-k4bu.onrender.com \
node scripts/demo-agent.mjs "Restock the office: paper, coffee and a standing desk"
```

With `OPENAI_API_KEY` set, OpenAI drives the shopping with tools. Without it, a fixed script runs. The default run pays for paper at an allowed shop, gets the coffee blocked at a shop that is not on the list, and holds the standing desk for owner approval.

Demo keys: Shopper `ap_test_shopper_7f3k`, Trip Planner `ap_test_trip_9d2m`, Ops Bot `ap_test_ops_4h8q`, Gift Agent `ap_test_gift_1x6v` (frozen on purpose).

## Sponsor integrations

| Sponsor | How it is used | Where |
|---|---|---|
| **PayPal** | Orders, Payouts, Payments refunds, Webhooks, Log in with PayPal, Agent Toolkit | `lib/paypal.ts`, `lib/paypal-login.ts`, `lib/treasurer.ts`, `app/api/webhooks/paypal` |
| **Channel3** | Product search and price compare inside the agent loop, with a rules preview per offer. Product photo and link show on approval cards and in the ledger | `lib/channel3.ts`, `app/api/agent/search` |
| **Render** | Web service from a Blueprint. A separate **Render Workflow** runs the weekly digest with parallel tasks and retries. The dashboard starts it with `@renderinc/sdk` | `render.yaml`, `workflows/`, `app/api/digest/run` |
| **AG Grid** | The ledger is an AG Grid table with filters and paging. AG Studio runs reports on the purse data and has an AI chart assistant | `app/dashboard/ledger/page.tsx`, `components/PurseStudio.tsx`, `components/studio/*` |
| **Bryntum** | Scheduler timeline: one row per agent, one bar per request, colored by status, click a bar for the rule that decided it | `components/TimelineScheduler.tsx` |
| **APIMatic** | An OpenAPI 3 spec of the agent API, ready for SDK generation | `openapi.yaml` |
| **OpenAI** | Rule parsing, risk notes, recap, treasurer, Studio assistant | `lib/ai.ts`, `lib/treasurer.ts` |
| **MCP** | Five tool server so any MCP client can use a wallet | `mcp/server.mjs` |

### Render Workflows: weekly digest

```mermaid
flowchart TD
  BTN["Dashboard button<br/>Run on Render Workflows"] -- "render.workflows.startTask" --> T["buildWeeklyDigest<br/>timeout 600 s"]
  T --> P1["fetchPurse<br/>GET /api/state + /api/ledger"]
  T --> P2["fetchRecap<br/>GET /api/summary (AI recap)"]
  P1 --> J["Join: totals, spend by agent,<br/>top spender, frozen wallets"]
  P2 --> J
  J --> S["savePurseDigest<br/>POST /api/digest with x-digest-token"]
  S --> D[("digest.json")] --> UI["Overview shows the latest digest"]
```

Each step is its own task with `maxRetries: 3` and exponential backoff, so Render retries only the step that failed. The two reads run at the same time. The save endpoint compares the shared `DIGEST_TOKEN` with `timingSafeEqual` and the digest is cleaned field by field before it is stored.

Set up the workflow: Render Dashboard, **New, Workflow**, root directory `workflows`, build `npm install && npm run build`, start `npm start`. Workflow env: `AGENTPURSE_URL`, `DIGEST_TOKEN`. Web service env: the same `DIGEST_TOKEN`, `RENDER_API_KEY`, `WORKFLOW_SLUG`.

## Data model

```mermaid
erDiagram
  PURSE ||--o{ AGENT : has
  PURSE ||--o{ RULE : has
  PURSE ||--o{ TXN : records
  PURSE ||--o{ FUNDING : "funded by"
  AGENT ||--o{ TXN : requests
  RULE }o--o| AGENT : "applies to one or all"
  TXN ||--o{ CHECK : "ran"

  PURSE { string owner "demo or pp_userid" number balance }
  AGENT { string id string key number dailyCap number autoApproveLimit string status string shops }
  RULE { string kind json params string text bool on string parsedBy }
  TXN { string id string status string decidedBy number amount string merchant string aiNote json paypal }
  FUNDING { string orderId string captureId number amount number refunded }
  CHECK { string rule bool ok string effect }
```

Everything goes through `read()` and `write()` in `lib/db.ts`. Today the store is one JSON file written atomically (write to `.tmp`, then rename). The two functions are the only seam, so moving to Postgres does not touch any caller.

## API reference

**Agent routes** (header `Authorization: Bearer <agent key>`)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/agent/budget` | Caps, left today, allowed shops, rules |
| GET | `/api/agent/search?q=&maxPrice=&limit=` | Channel3 search with rules preview |
| POST | `/api/agent/spend` | Ask to pay. 200 paid, 202 pending, 403 blocked |
| GET | `/api/agent/requests/:id` | Check a request. Only your own |
| POST | `/api/agent/refund` | Ask the owner for a refund |

**Owner routes** (PayPal login cookie)

| Area | Routes |
|---|---|
| State | `GET /api/state`, `GET /api/summary`, `GET /api/ledger`, `POST /api/reset` |
| Agents | `POST /api/agents`, `PATCH /api/agents/:id` |
| Rules | `GET POST /api/rules`, `POST /api/rules/parse`, `PATCH DELETE /api/rules/:id` |
| Approvals | `GET /api/approvals`, `POST /api/approvals/:id` |
| Money | `POST /api/fund/order`, `POST /api/fund/capture`, `POST /api/fund/withdraw`, `POST /api/ledger/:id/refund` |
| AI | `POST /api/assistant` (treasurer), `POST /api/ai/responses` (Studio) |
| Auth | `GET /api/auth/paypal/start`, `GET /api/auth/paypal/callback`, `GET /api/auth/me`, `GET /api/auth/demo`, `GET /api/auth/logout` |
| Digest | `GET POST /api/digest`, `POST /api/digest/run` |
| PayPal | `POST /api/webhooks/paypal` |

## Security model

| Threat | Defense |
|---|---|
| Agent overspends | Engine runs before PayPal. Caps, limits and rules are server side. Balance is reserved first |
| Agent retries to double pay | Payout `sender_batch_id` and `PayPal-Request-Id` are the request id, so PayPal dedupes |
| Agent works around a block (smaller amounts, other shops) | The tool reply tells it not to. The velocity rule freezes wallets on fast repeat buys. Allow list is enforced by name |
| Agent approves its own buy | Approve, decline and refund are owner routes behind a session. An agent key cannot reach them |
| Agent reads another agent's data | `requests/:id` filters by the calling agent. Keys open only their own purse |
| Prompt injection through merchant or item text | The treasurer treats ledger text as data. The refund tool needs a clear owner request. Studio AI runs on aggregated tables |
| Forged webhook | PayPal `verify-webhook-signature` against `PAYPAL_WEBHOOK_ID` |
| Replayed webhook | Only a `paid` row can give money back, once |
| Forged session | HMAC SHA-256 signed cookie, `httpOnly`, `sameSite=lax`, `secure` in production, 12 hour expiry |
| CSRF on login | Random `state` cookie checked in the callback |
| Digest tampering | Shared token with constant time compare. Payload is whitelisted and size limited |
| URL injection from agents | Product link and image must be `http(s)`, length limited |
| Key leakage to the browser | OpenAI key stays on the server. Studio assistant calls a server proxy |

## Run it locally

```bash
npm install
cp .env.example .env.local     # optional: PayPal sandbox keys, OpenAI key, Channel3 key
ALLOW_DEMO_LOGIN=true npm run dev
```

Open http://localhost:3000 and choose **Continue with the demo account**. With no keys it runs in mock mode: payouts get fake ids, search uses a built in catalog and AI uses the fallbacks.

PayPal sandbox setup:

1. Create an app at developer.paypal.com. Copy the sandbox client id and secret into `.env.local`.
2. Turn on **Log in with PayPal** for the app and add `http://localhost:3000/api/auth/paypal/callback` as a return URL.
3. Make sure Payouts is on for the sandbox business account.
4. Use a sandbox personal account to pay when you add funds.
5. For webhooks add `https://YOUR-URL/api/webhooks/paypal`, pick `PAYMENT.PAYOUTS-ITEM.*`, and put the webhook id in `PAYPAL_WEBHOOK_ID`.

## Configuration

| Variable | Purpose |
|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Sandbox app keys. Empty means mock mode |
| `PAYPAL_ENV` | `sandbox` (default) or `live` |
| `PAYPAL_WEBHOOK_ID` | Needed to verify webhook signatures |
| `OPENAI_API_KEY`, `AI_MODEL` | Rule parsing, notes, recap, treasurer |
| `OPENAI_MODELS` | Models offered in the Studio assistant |
| `CHANNEL3_API_KEY` | Live product search. Empty uses the demo catalog |
| `AG_STUDIO_LICENSE` | AG Studio trial key |
| `ALLOW_DEMO_LOGIN` | `true` shows the shared demo account on the login page |
| `SESSION_SECRET` | Signs the session cookie. Falls back to the PayPal secret |
| `PUBLIC_URL` | Public origin behind a proxy, used for the PayPal return URL |
| `DATA_DIR` | Where `db.json` and `digest.json` live. Default `./data` |
| `DIGEST_TOKEN`, `RENDER_API_KEY`, `WORKFLOW_SLUG` | Weekly digest on Render Workflows |

## Deploy on Render

1. Push the repo to GitHub.
2. In Render choose **New, Blueprint** and pick the repo. `render.yaml` sets up the web service (Node 22, health check `/api/config`).
3. Add the env vars when asked. With none of the keys the app still runs in mock mode.
4. Create the Workflow service for `workflows/` (see [Render Workflows](#render-workflows-weekly-digest)).
5. `.github/workflows/keepalive.yml` pings `/api/config` every 5 minutes so a free instance does not sleep. A paid instance does not need it.

Data lives in a JSON file, so a redeploy resets it. Use `POST /api/reset` to reset the demo purse before a recording.

## Tests

```bash
npm test
```

12 tests cover the rule engine: auto pay, auto approve limit, daily cap, frozen wallet, purse balance, allow list, blocked words, ask versus block rules, **block beats ask**, the velocity freeze, rules for other agents and the time window. They run on Node 22.6+ with no extra dependency.

## Known limits and roadmap

Honest list of what is demo grade today:

- **Storage is a JSON file.** One process, atomic writes. Fine for a demo. The `read()` and `write()` seam is where Postgres goes.
- **Demo purse is shared and public.** Its keys are fixed on purpose so the README works, and `POST /api/reset` resets it. Private purses do not have this problem.
- **The weekly digest is global**, not per owner, because it was built around the demo purse.
- **Sandbox only.** Going live needs Payouts approval from PayPal and proper KYC for the owner.
- **No rate limiting** on agent routes yet.
- **Bryntum is the trial build** (evaluation only). Swap in a licensed copy for production.

Next: Postgres with per owner row level security, hashed agent keys, per agent rate limits, spend analytics by category, and a Slack or email approval flow so the owner can approve from a message.

## Repo layout

```
app/
  page.tsx                 landing page
  connect-paypal/          Log in with PayPal screen
  dashboard/               overview, wallets, rules, approvals, ledger, studio, timeline, assistant, connect
  api/agent/*              agent routes (Bearer key)
  api/...                  owner routes, auth, fund, webhooks, digest, AI proxy
components/                ApprovalCard, FundCard, DigestCard, PurseStudio, TimelineScheduler, ...
lib/
  engine.ts                pure rule engine
  purse.ts                 the only code that moves money
  paypal.ts                PayPal REST client (Orders, Payouts, Payments, Webhooks) with mock mode
  paypal-login.ts          Log in with PayPal (OpenID Connect)
  session.ts               HMAC signed session cookie (Edge safe)
  db.ts                    JSON store, one purse per owner, AsyncLocalStorage scope
  ai.ts                    rule parsing, risk notes, recap
  treasurer.ts             OpenAI tool calling over the PayPal Agent Toolkit
  channel3.ts              product search with a demo catalog fallback
  digest.ts, seed.ts, http.ts, ...
mcp/server.mjs             MCP server (5 tools)
workflows/                 Render Workflow service (buildWeeklyDigest)
scripts/demo-agent.mjs     OpenAI shopping agent
tests/engine.test.mjs      rule engine tests
openapi.yaml               agent API spec
render.yaml                Render Blueprint
```

## Stack

Next.js 15, React 19, TypeScript, AG Grid Community 33, AG Studio, Bryntum Scheduler, PayPal REST and Agent Toolkit, Channel3, Render Web Service and Workflows (`@renderinc/sdk`), Model Context Protocol SDK, OpenAI API.

## License

MIT
