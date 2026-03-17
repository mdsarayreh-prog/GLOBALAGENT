# Global Agent

Global Agent is a production-ready enterprise orchestration workspace built with Next.js App Router, TypeScript, Tailwind CSS, and Framer Motion.

## Features

- Enterprise app shell with governed multi-agent orchestration UX
- Domain-oriented agent registry with enterprise copy and capabilities
- Per-thread conversation state (`id`, `title`, `createdAt`, `agentId`, `messages`)
- Streaming-ready response pipeline with routing metadata propagation
- Auto-route + mention-directed routing + manual specialist lock modes
- Trace observability panel with confidence, context signals, sources, tools, fallback/error
- In-chat governance indicators (routed/direct labels, approved source badges, retry/reroute)
- Workflow-oriented quick starts, templates, and action chips
- Dark modern operations aesthetic with responsive desktop/mobile behavior

## Stack

- Next.js 16 (App Router)
- TypeScript (strict)
- Tailwind CSS
- Framer Motion
- Lucide React icons

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

## Routes

- `/user`: user workspace (Global Agent only, auto-routing enabled)
- `/admin`: admin control dashboard (requires Azure/Entra-authenticated admin role, group, or user mapping)
- `/admin/workspace`: full admin orchestration workspace
- `/`: redirects to `/user`

## Project Structure

```text
app/
  layout.tsx
  page.tsx
  api/chat/route.ts
components/
  Chat.tsx
  Sidebar.tsx
  TopBar.tsx
  AgentPicker.tsx
  MessageBubble.tsx
  Composer.tsx
  TracePanel.tsx
  WorkflowPanel.tsx
  ui/
    ActionChip.tsx
    StatusBadge.tsx
lib/
  agents.ts
  routing.ts
  mockStream.ts
  chatTransport.ts
  ui-tokens.ts
  utils.ts
types/
  chat.ts
```

## Add a New Agent

1. Open `lib/agents.ts`.
2. Add a new entry in `AGENT_REGISTRY` with:
   - `id`
   - `name`
   - `description`
   - `avatar`
   - `systemPrompt`
   - `capabilities`
   - `enabled`
   - `placeholder`
   - `greeting`
   - `accentClass`
3. Update `AgentId` union in `types/chat.ts` to include the new `id`.
4. (Optional) Add routing keywords for the new agent in `lib/routing.ts`.

## Routing (v1 rules-based)

- File: `lib/routing.ts`
- Behavior:
  - `Auto-route OFF`: always uses the selected agent.
  - `Auto-route ON` + selected agent is `global`: runs keyword matching and may delegate to `hr`, `it`, `ops`, `supply`, or `academy`.
  - `Auto-route ON` + selected agent is specialist: keeps selected specialist.
- Each decision returns trace metadata:
  - selected agent
  - resolved agent
  - reason
  - mock latency

## Streaming Design

- UI currently uses mock chunk streaming via `lib/mockStream.ts`.
- Transport abstraction in `lib/chatTransport.ts` is ready to switch from `mock` to API mode.
- API placeholder route (`app/api/chat/route.ts`) streams SSE-style chunks.

## Product-Grade Upgrade Summary

### Design system
- Centralized enterprise tokens in `lib/ui-tokens.ts`:
  - spacing rhythm `4/8/12/16/24/32`
  - typography presets for title/subtitle/body/meta
  - radius standards (`14px/16px/18px`)
  - shadow hierarchy (subtle/medium)
  - layout constants (sidebar/trace widths, content max widths)
  - state/tone system and motion timing/easing
- Global styling in `app/globals.css` was upgraded for an operational dark aesthetic with consistent focus, scrollbars, shimmer, and caret animations.

### Layout and shell architecture
- Refactored shell in `components/Chat.tsx` to emphasize the central conversation workspace and unify sidebar/main visual language.
- Sidebar uses a darker, enterprise-consistent panel style instead of disconnected gray surfaces.
- Trace panel is slimmer by default, collapsible, and now carries real governance value.
- Top bar was simplified around intent: selected agent, route mode, trace toggle, and workspace state.

### Business copy and product clarity
- Agent language in `lib/agents.ts` now reflects enterprise outcomes and departmental responsibilities (policy, onboarding, incident triage, procurement, training, execution planning).
- Global Agent is now positioned as **Global Orchestrator** with explicit delegation and governance framing.
- Composer and workflow microcopy now emphasize outcomes, owners, SLAs, risk, and execution.

### Routing transparency and governance
- `RouteDecision` model in `types/chat.ts` expanded with:
  - `decisionType`
  - `confidence`
  - `contextSignals`
  - `sourcesUsed`
  - `toolsCalled`
  - `fallbackState`
  - optional `error`
- Routing engine in `lib/routing.ts` now supports:
  - mention-directed routing via `@agent`
  - confidence/context scoring
  - source/tool attribution
  - explicit fallback states
- In-chat assistant metadata now surfaces routed/direct outcomes and approved-source indicators.

### Trace observability
- `components/TracePanel.tsx` now shows:
  - selected/resolved agent
  - confidence
  - decision explanation
  - context signals
  - approved sources
  - tools called
  - fallback/error state
- Result: the panel communicates enterprise trust and auditability rather than decorative data.

### Chat experience
- `components/MessageBubble.tsx` now includes:
  - in-chat routing feedback labels (delegated/direct/mention/manual)
  - source badges
  - action affordances: copy, retry, reroute
  - grouping and metadata readability improvements
- Streaming still works as before, with smooth rendering and typing/caret cues.

### Workflow entry points
- Added `components/WorkflowPanel.tsx` with:
  - quick-start business cards
  - pinned operational templates
  - department-oriented shortcuts
- Composer now supports:
  - quick action chips (`Draft`, `Summarize`, `Analyze`, `Create Request`, `Check Inventory`)
  - specialist mentions (`@HR`, `@IT`, etc.)
  - attachment action (mocked v1)

### Reusable component structure
- Added reusable UI primitives:
  - `components/ui/StatusBadge.tsx`
  - `components/ui/ActionChip.tsx`
- Existing components were refactored to consume shared primitives/tokens instead of isolated styling.

## Notes

- No external API keys are required for v1.
- Attach button is intentionally mocked.

## Azure SSO Authorization

This app is compatible with Azure App Service Authentication / Microsoft Entra ID.

- In Azure, App Service Authentication injects identity headers such as `X-MS-CLIENT-PRINCIPAL`.
- The app reads those headers in `lib/access.ts`.
- `/admin` access is granted when the signed-in user matches one of these configuration values:
  - `ADMIN_ROLE_NAMES`: comma-separated Entra app role values
  - `ADMIN_GROUP_IDS`: comma-separated Entra group object IDs
  - `ADMIN_USER_IDS`: comma-separated Entra user object IDs
  - `ALLOWED_TENANT_IDS`: optional comma-separated tenant IDs allowed to evaluate as signed-in users

Example:

```bash
ADMIN_ROLE_NAMES=GlobalAgent.Admin
ADMIN_GROUP_IDS=11111111-1111-1111-1111-111111111111
ADMIN_USER_IDS=
ALLOWED_TENANT_IDS=22222222-2222-2222-2222-222222222222
```

## Local Development Auth

- In development only, the existing `/dev/admin-login` and `/dev/admin-logout` routes still work as a local shortcut.
- In Azure production, admin access should come from Microsoft Entra ID through App Service Authentication, not from the development cookie.
