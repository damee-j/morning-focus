# Morning Focus

## Overview

Morning Focus is a daily evening reflection and next-morning planning assistant. The core loop is: evening reflection → AI feedback → decide tomorrow's #1 task → AI estimates duration → auto-schedule to Google Calendar or Lark Calendar. The app is built as a full-stack web application (designed with a mobile-first, iOS-like aesthetic) using React on the frontend and Express on the backend, with PostgreSQL for persistence and Anthropic Claude for AI-powered feedback.

The UI is entirely in Korean, targeting Korean-speaking users who want a calm nighttime routine to prepare for productive mornings.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for all server state; no global state manager
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives, styled with Tailwind CSS
- **Design System**: Dark "Calm Nighttime" theme — deep navy background with warm amber primary and cyan accent colors. Uses CSS custom properties for theming. Both display and body fonts use Plus Jakarta Sans.
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`
- **Pages**: Home (`/`), Reflect (`/reflect`), Plan (`/plan/:id`), Schedule (`/schedule/:id`), History (`/history`), Settings (`/settings`)
- **Testing conventions**: All interactive and key display elements should have `data-testid` attributes

### Backend
- **Framework**: Express.js running on Node with TypeScript (via tsx)
- **API Design**: REST API under `/api/*`. Route definitions and Zod validation schemas are shared between client and server in `shared/routes.ts`. The `api` object defines method, path, input schemas, and response schemas for each endpoint.
- **AI Integration**: Anthropic Claude (claude-sonnet-4-5) via `@anthropic-ai/sdk`. Used for generating reflection feedback, follow-up questions, and task duration suggestions. API key and base URL come from environment variables (`AI_INTEGRATIONS_ANTHROPIC_API_KEY`, `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`).
- **Calendar Integration**: Google Calendar via `googleapis` npm package (access tokens obtained through Replit's connector system). Lark Calendar via Lark Open API (`server/services/larkCalendar.ts`) with manual OAuth2 flow, token refresh, freebusy query, and event creation. Provider selection is stored in `user_settings.calendar_provider`. Requires `LARK_APP_ID` and `LARK_APP_SECRET` secrets for Lark integration.
- **Scheduler Service**: `server/services/scheduler.ts` handles finding free time slots in a user's calendar and building schedule preview blocks. It merges busy slots and finds gaps within the user's schedulable hours window.
- **Chat Integration**: A built-in chat system exists under `server/replit_integrations/chat/` with conversation and message CRUD, plus Anthropic-powered responses.
- **Batch Processing**: `server/replit_integrations/batch/` provides utilities for concurrent API calls with rate limiting and retry logic.

### Database
- **Database**: PostgreSQL (required, accessed via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation bridging
- **Schema location**: `shared/schema.ts` (main domain tables) and `shared/models/chat.ts` (chat tables)
- **Key tables**:
  - `user_settings` — notification time, calendar provider (google/lark), schedulable hours window, language (ko/en), Lark credentials (larkAppId/larkAppSecret), googleDisabled flag
  - `reflections` — daily evening reflection entries with text, AI feedback, top task, duration, completion status
  - `scheduled_blocks` — calendar event blocks linked to reflections
  - `lark_tokens` — Lark OAuth2 access/refresh tokens with expiry tracking
  - `conversations` / `messages` — chat system tables
- **Migrations**: Use `drizzle-kit push` (`npm run db:push`) to sync schema to database. Migration files output to `./migrations/`.
- **Storage pattern**: `server/storage.ts` defines an `IStorage` interface and a concrete implementation using Drizzle, keeping database access centralized.

### Build & Deploy
- **Dev**: `npm run dev` — runs Express + Vite dev server with HMR
- **Build**: `npm run build` — Vite builds the client to `dist/public/`, esbuild bundles the server to `dist/index.cjs`
- **Production**: `npm start` — serves the built client as static files from Express
- **Type checking**: `npm run check` (tsc with noEmit)

### Shared Code Pattern
The `shared/` directory is imported by both client and server. It contains:
- Database schema definitions (Drizzle tables + Zod schemas)
- API route contracts (`shared/routes.ts`) with paths, methods, input/output Zod schemas
- Type exports used across the stack

This ensures type safety and validation consistency between frontend and backend.

## External Dependencies

### Required Services
- **PostgreSQL** — Primary database. Must be provisioned and `DATABASE_URL` environment variable set.
- **Anthropic Claude API** — Powers AI feedback on reflections and task planning. Requires `AI_INTEGRATIONS_ANTHROPIC_API_KEY` and `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` environment variables.
- **Google Calendar API** — Calendar integration for auto-scheduling tasks. Accessed via Replit's connector system using `REPLIT_CONNECTORS_HOSTNAME` and Replit identity tokens (`REPL_IDENTITY` or `WEB_REPL_RENEWAL`).
- **Lark Calendar API** — Alternative calendar integration. Users input their Lark App ID and App Secret through the Settings page UI. Credentials stored in `user_settings` table (secret masked in API responses). Falls back to `LARK_APP_ID`/`LARK_APP_SECRET` environment variables if DB credentials not set.

### Key NPM Packages
- `drizzle-orm` + `drizzle-kit` — Database ORM and migration tooling
- `@anthropic-ai/sdk` — Anthropic Claude client
- `googleapis` — Google Calendar API client
- `express` + `express-session` — HTTP server
- `connect-pg-simple` — PostgreSQL session store
- `zod` + `drizzle-zod` — Runtime validation
- `@tanstack/react-query` — Client-side data fetching
- `wouter` — Client-side routing
- `shadcn/ui` ecosystem (Radix UI, Tailwind CSS, class-variance-authority, lucide-react)
- `p-limit` + `p-retry` — Batch processing utilities for AI calls