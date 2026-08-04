# ForkableTypescriptPostgreReactNodejsLearning

A small, fully-tested full-stack reference app — built the way an SDET would build it, with a real test pyramid instead of an afterthought. Fork it, run it, break it, and use it as a template for your own TypeScript + React + Node.js + PostgreSQL projects.

**Stack:** React 18 · TypeScript · Node.js / Express · PostgreSQL

The sample domain is a small **Tasks** CRUD app (create / list / complete / delete), kept intentionally simple so the focus stays on structure and testing, not business logic.

## Repository layout

```
.
├── backend/          Express + TypeScript REST API, backed by PostgreSQL
│   ├── src/           app.ts (Express app factory), controllers, routes, db pool
│   ├── migrations/     SQL migrations
│   └── tests/
│       ├── unit/        Controller logic, pg fully mocked — no DB required
│       └── integration/ Full HTTP stack via supertest against a real Postgres DB
├── frontend/         React + TypeScript UI (Vite)
│   └── src/tests/     Component tests (Vitest + React Testing Library)
├── e2e/              Playwright end-to-end tests driving a real browser against
│                      the real frontend + backend + database
└── .github/workflows/ci.yml   CI pipeline running every layer above
```

## Why this structure

- **`createApp(pool)` / `createTasksController(pool)`** — the pool is injected rather than imported as a singleton. That one decision is what makes the controller unit-testable with a mocked `pg.Pool` and the API integration-testable with a real one, using the exact same code path.
- **Three independent test layers**, each catching different classes of bugs:
  | Layer | Tool | What it catches |
  |---|---|---|
  | Unit | Jest (backend), Vitest (frontend) | Logic errors, edge cases, branching, in milliseconds |
  | Integration | Jest + supertest + real Postgres | SQL correctness, HTTP status codes, serialization |
  | E2E | Playwright | Real browser rendering, real network calls, real user flows |

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 16 (or use the included `docker-compose.yml` if you have Docker)

## Setup

```bash
# 1. Start Postgres (dev DB on 5432, an isolated test DB on 5433)
docker compose up -d

# If you're not using Docker, create both databases yourself and apply the
# migration to each:
#   createdb forkable_learning
#   createdb forkable_learning_test
#   psql -d forkable_learning      -f backend/migrations/001_create_tasks_table.sql
#   psql -d forkable_learning_test -f backend/migrations/001_create_tasks_table.sql

# 2. Backend
cd backend
cp .env.example .env   # adjust credentials if needed
npm install
npm run dev             # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173 (proxies /api to :4000)
```

## Running the tests

```bash
# Backend — unit (mocked pg, no DB needed)
cd backend && npm run test:unit

# Backend — integration (needs the test DB from docker-compose, port 5433
# by default; set TEST_PG* env vars in backend/.env if running Postgres
# elsewhere)
cd backend && npm run test:integration

# Backend — both, plus coverage
cd backend && npm run test:coverage

# Frontend — component tests
cd frontend && npm test

# End-to-end — needs Playwright's browser binaries installed once:
cd e2e
npm install
npx playwright install --with-deps chromium
npm run test:e2e
```

> **Note on E2E in restricted/offline environments:** `npx playwright install`
> downloads browser binaries from Playwright's CDN. If you're running this in
> a network-restricted sandbox (as this repo was originally scaffolded in),
> that download will be blocked and E2E tests won't execute — the test file
> itself still type-checks and Playwright can list/parse the tests without a
> browser. Run `npm run test:e2e` locally or in CI (see `.github/workflows/ci.yml`)
> where the download isn't restricted.

## Continuous Integration

`.github/workflows/ci.yml` runs on every push/PR to `main`:
1. **backend** job — lint, type-check, unit tests, integration tests (against a real `postgres:16-alpine` service container), build
2. **frontend** job — lint, type-check, component tests, build
3. **e2e** job — installs Playwright's browsers and runs the full end-to-end suite against the built app

## API reference

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/:id` | Get a single task |
| POST | `/api/tasks` | Create a task (`{ title, description? }`) |
| PUT | `/api/tasks/:id` | Update a task (`{ title?, description?, is_complete? }`) |
| DELETE | `/api/tasks/:id` | Delete a task |

## License

MIT — see [LICENSE](./LICENSE). Fork away.
