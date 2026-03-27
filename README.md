# Global Agent

Global Agent is a Next.js multi-agent workspace with durable, server-side conversation history, routing traceability, and context packing.

## What Is Implemented

- Persistent conversation system of record (`SQLite` via `node:sqlite`)
- Unified timeline for `user/assistant/system/tool` messages
- Routing trace capture per user turn (selected agent, mode, reason, confidence, sources, tools, latency, fallback/errors)
- Conversation context management at scale:
  - recent window
  - rolling summary
  - pinned facts/decisions/preferences
- Tenant-aware and user-scoped APIs (prevents cross-user/cross-tenant reads)
- Sidebar history with search + pinned/recency grouping
- Editable conversation title, agent picker, auto-route toggle, trace panel
- Conversation archive + export endpoint

## Stack

- Next.js 16 (App Router)
- TypeScript (strict)
- Tailwind CSS
- Framer Motion
- SQLite (`node:sqlite`, migration-backed)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. (Optional) configure `.env.local`:

```bash
# SQLite file path (defaults to data/global-agent.sqlite)
DATABASE_URL="data/global-agent.sqlite"

# Context packing controls
CONTEXT_RECENT_TURNS=8
CONTEXT_MAX_CHARS=6000
CONTEXT_SUMMARY_MAX_CHARS=2000
CONTEXT_PINNED_FACTS_LIMIT=20

# Retention hook (0 disables auto-archive by age)
CONVERSATION_RETENTION_DAYS=0

# Optional HR Copilot connection
COPILOT_HR_URL="https://..."

# Option A: direct bearer token
COPILOT_HR_AUTH_TOKEN="<token>"

# Option B: Azure AD client credentials (app registration)
COPILOT_HR_TENANT_ID="<tenant-guid>"
COPILOT_HR_CLIENT_ID="<client-guid>"
COPILOT_HR_CLIENT_SECRET="<client-secret>"
COPILOT_HR_TOKEN_SCOPE="https://api.powerplatform.com/.default"
```

3. Start:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000/user
```

Migrations run automatically on first server access.

## API Surface

All endpoints are user-scoped + tenant-scoped from request cookies/headers.

- `POST /conversations`
- `GET /conversations?limit=&offset=&search=`
- `GET /conversations/:id`
- `PATCH /conversations/:id`
- `GET /conversations/:id/messages?limit=&offset=`
- `POST /conversations/:id/messages`
- `GET /conversations/:id/trace?message_id=...`
- `GET /conversations/:id/export`

## DB Schema and Migrations

- Migration files: `lib/server/migrations/`
- Current migration: `001_conversation_platform.sql`
- Core tables:
  - `conversations`
  - `messages`
  - `trace_events`
  - `conversation_context`
  - `agent_runs` (internal per-agent execution record)
  - `audit_logs`

Indexes included for sidebar/query performance:
- conversation owner/tenant/status/recency
- conversation title search
- message timeline by conversation timestamp
- trace lookup by conversation/message

## Context Packing

Implemented in `lib/server/contextPacking.ts`.

Each turn builds prompt context from:
- rolling summary (`conversation_context.summary_text`)
- pinned facts (`conversation_context.pinned_facts_json`)
- last `N` turns (`CONTEXT_RECENT_TURNS`)

After assistant response, summary + pins are updated incrementally and stored.
Packed context payload details are logged server-side (`[context-builder] ...`) for verification.

## Tests and Checks

Run:

```bash
npm run lint
npm run build
npm run test:conversations
```

`test:conversations` starts the app, executes endpoint CRUD/message/trace/export flows, and verifies auth scoping.

Deployment trigger
