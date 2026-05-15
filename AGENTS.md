# 🤖 Agent Instructions (AGENTS.md)

This file contains high-signal, repo-specific context to help AI agents work effectively in this codebase.

## 🏗 Architecture & Routing
- **Tech Stack**: React 19 (Frontend) + Fastify (Backend) + Prisma/PostgreSQL + Redis (Cache/Rate-Limiting) + BullMQ (Background Jobs).
- **Prefix Stripping**: `nginx` (production) and `vite.config.ts` (dev) act as reverse proxies and **strip** the `/api` prefix. The frontend requests `/api/sessions`, but the Fastify backend receives `/sessions`. 
- **Production Build**: Docker Compose handles the production orchestration (`nginx` -> `api` -> `db` + `redis`). The backend, DB, and Redis do not expose ports to the host in production.
- **Path Aliases**: The frontend uses `@/` mapped to `frontend/src/` (configured in `vite.config.ts` and `tsconfig.app.json`). Always use absolute `@/` imports instead of deep relative paths (`../../..`).

## 🛠 Local Development (Strict Commands)
**Do not run `npm run dev` directly in subfolders.** The root `.env` must be injected properly. Always use the root `Makefile`:
- `make db-up`: Starts local Postgres and Redis containers.
- `make dev`: Loads `.env` variables and concurrently starts the Vite frontend (port 5173) and Fastify backend (port 3001).
- `make db-migrate`: Runs Prisma migrations with the correct env injection.

## 💻 Frontend Quirks (React / Vite)
- **Code Splitting & Lazy Loading**: `App.tsx` uses `React.lazy()` for all protected routes to avoid Vite 500kB chunk warnings. Never revert views back to static imports.
- **Offline / PWA Sync**: Mutating API calls are intercepted by Axios (`src/api/client.ts`) when offline and pushed to `useOfflineStore`. When back online, `useOfflineSync` replays them **serially** (to avoid race conditions) and automatically discards unrecoverable 4xx errors.
- **PWA Updates**: The Service Worker is set to `prompt` mode. UI updates are handled by the `<ReloadPrompt />` component. Do not change it back to `autoUpdate`.
- **Theming is strict**: `useUIStore` (Zustand) is the *only* source of truth for the `data-theme` and `data-accent` attributes on `<html>`. Do not manually mutate DOM attributes for themes.
- **Data Fetching Patterns**: Historic/Global data uses direct API calls + local state (e.g., `sessionsApi.listAll()`), but current-week active data uses reactive hooks (`useSessions`). Don't mix them up.

## ⚙️ Backend Quirks (Fastify)
- **Background Jobs (BullMQ)**: Heavy operations (sending verification emails, large JSON imports) MUST be pushed to `backgroundQueue` (`src/services/queue.ts`). Avoid synchronous long-running tasks in HTTP endpoints. A Bull Board UI is available at `/api/admin/queues` for monitoring.
- **AI Integration**: Keys for Anthropic, OpenAI, etc., are **not** in `.env`. They are stored *per user* in the `UserSettings` table. The backend acts as a proxy to protect them (`/ai/analyze`).
- **Redis Caching**: The heavy `GET /sessions` endpoint caches full histories in Redis (compressed via `@fastify/compress`). If you mutate a session, you MUST call `invalidateSessionsCache(sub)` to clear the stale data.
- **Error Handling**: Use Zod for validation. `fastify.setErrorHandler` globally catches Zod validation issues and Prisma duplicates (`P2002`), returning a clean `{ error: string }` JSON. Do not manually format validation errors in individual routes.
- **Composite DB Keys**: `WorkoutSession` uses `[userId, weekNumber, dayId]`. `NutritionDay` and `BodyWeight` use `[userId, date]`. Use Prisma's `upsert` with these exact where-clauses for daily/weekly records.
