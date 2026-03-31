# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

TENMON-ARK is a Japanese AI chat platform (pnpm monorepo). The main application is an Express + Vite dev server (port 3000) that serves both the backend API and the React SPA.

### Running the dev server

```
pnpm dev
```

This starts `tsx watch server/_core/index.ts` with Vite middleware for HMR. Required env vars are read from `.env` at the workspace root (see `.env` for the full list). Key required vars: `VITE_APP_ID`, `JWT_SECRET`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `STRIPE_SECRET_KEY`.

### Database

- The `api/` subpackage uses **SQLite** via `node:sqlite` (Node.js built-in). DB files live under `/opt/tenmon-ark-data/` (default: `kokuzo.sqlite`, `audit.sqlite`, `persona.sqlite`). The directory is auto-created on first run.
- The root `server/` uses **MySQL** via `drizzle-orm/mysql2` + `DATABASE_URL` for the main data layer (users, conversations, subscriptions). Without a real MySQL connection the server still starts but DB-dependent features will fail gracefully.

### Lint / Test / Build

| Command | Notes |
|---------|-------|
| `pnpm check` | TypeScript check (`tsc --noEmit`). Pre-existing errors in `client/widget/widget-core.ts`. |
| `pnpm test` | Vitest. Many tests pass; some fail due to pre-existing issues. |
| `pnpm run build` | Vite + esbuild. **Currently fails** because client code imports server modules (`server/kokuzo/offline/*`). Dev mode (`pnpm dev`) works fine. |
| `pnpm format` | Prettier formatting. |

### Known gotchas

- **`@shared/*` path alias**: Resolved by `tsconfig.json` paths (`@shared/* → shared/*`). The `shared/` directory has its own `package.json` to make ESM resolution work with `tsx`.
- **React version deduplication**: The `web/` and `site/` sub-packages use React 18, while the root uses React 19. `vite.config.ts` includes `resolve.dedupe: ["react", "react-dom"]` and alias overrides to prevent "Invalid Hook Call" errors at runtime.
- **ZeroMQ (optional)**: The trade system binds `tcp://0.0.0.0:5556`. If the port is busy the server logs a warning and continues.
- **OAuth**: Authentication requires Manus OAuth (`OAUTH_SERVER_URL`). Without a real OAuth server, the frontend renders but login-dependent features are inaccessible.
- **`VITE_API_BASE_URL`**: Must be empty string (or omitted) for local dev. The default in `client/src/main.tsx` falls back to a remote VPS; setting it to `""` makes tRPC calls go to the same origin.
