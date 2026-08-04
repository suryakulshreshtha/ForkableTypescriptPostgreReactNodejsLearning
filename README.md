# ForkableTypescriptPostgreReactNodejsLearning

A small, fully-tested full-stack reference app — built the way an SDET would build it, with a real test pyramid instead of an afterthought. Fork it, run it, break it, and use it as a template for your own TypeScript + React + Node.js + PostgreSQL projects.

**Stack:** React 18 · TypeScript · Node.js / Express · PostgreSQL

## The sample domain: a mindful-practice app

The example app is a small **meditation practice platform** — a meditation library, session logging with streak tracking, retreat events with real capacity enforcement, and community testimonials. It's modeled loosely on the *shape* of meditation/personal-growth platforms in general (library + session tracking + ticketed events + testimonials), chosen because that domain gives us richer, more realistic business logic to test than a plain to-do list — day-boundary streak math, race-condition-safe capacity limits, and category filtering.

> **Not affiliated with any specific company, teacher, or brand.** All meditation titles, retreat names, and testimonial content in the seed data are invented for this example — nothing here reproduces real course material or real people's stories.

## Repository layout

```
.
├── backend/          Express + TypeScript REST API, backed by PostgreSQL
│   ├── src/
│   │   ├── controllers/  meditations, sessions, retreats, testimonials
│   │   ├── routes/
│   │   ├── utils/streak.ts   pure streak-calculation function (see below)
│   │   └── app.ts        Express app factory
│   ├── migrations/     SQL migration for the practice-platform schema
│   └── tests/
│       ├── unit/         Controller logic + streak.ts — pg fully mocked, no DB required
│       └── integration/  Full HTTP stack via supertest against a real Postgres DB
├── frontend/         React + TypeScript UI (Vite)
│   └── src/
│       ├── components/    MeditationLibrary, LogSessionForm, StreakDashboard,
│       │                  RetreatsList, TestimonialsList
│       └── tests/         Component tests (Vitest + React Testing Library)
├── e2e/              Playwright end-to-end tests driving a real browser against
│                      the real frontend + backend + database
└── .github/workflows/ci.yml   CI pipeline running every layer above
```

## Why this structure

- **`createApp(pool)` / `create<X>Controller(pool)`** — the pool is injected rather than imported as a singleton. That one decision is what makes controllers unit-testable with a mocked `pg.Pool` and integration-testable with a real one, using the exact same code path.
- **The streak calculation is a pure function** (`backend/src/utils/streak.ts`), deliberately extracted from any DB/HTTP concern. It takes a list of timestamps and an explicit `asOf` date — never the live clock — so its ~12 edge-case tests (grace periods, month/year boundaries, duplicate same-day sessions, gaps) are 100% deterministic regardless of when the suite runs.
- **Retreat registration is capacity-safe under concurrency.** Registration is a single atomic `UPDATE retreats SET registered_count = registered_count + 1 WHERE registered_count < capacity`, not a separate read-then-write. The integration suite proves this by firing 10 concurrent registration requests at a 5-seat retreat and asserting exactly 5 succeed and the database never exceeds capacity.
- **Three independent test layers**, each catching different classes of bugs:

  | Layer | Tool | What it catches |
  |---|---|---|
  | Unit | Jest (backend), Vitest (frontend) | Logic errors, edge cases, branching, in milliseconds |
  | Integration | Jest + supertest + real Postgres | SQL correctness, HTTP status codes, concurrency/race conditions |
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
#   psql -d forkable_learning      -f backend/migrations/001_create_practice_platform_tables.sql
#   psql -d forkable_learning_test -f backend/migrations/001_create_practice_platform_tables.sql

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
| GET | `/api/meditations?category=` | List meditations, optionally filtered by category (`sitting`\|`standing`\|`walking`\|`lying`) |
| GET | `/api/meditations/:id` | Get a single meditation |
| POST | `/api/meditations` | Create a meditation |
| PUT | `/api/meditations/:id` | Update a meditation |
| DELETE | `/api/meditations/:id` | Delete a meditation |
| POST | `/api/sessions` | Log a completed practice session (`meditation_id`, `practiced_by`, `duration_minutes`, `coherence_rating?`) |
| GET | `/api/sessions/user/:practicedBy` | List a user's logged sessions |
| GET | `/api/sessions/user/:practicedBy/streak` | Current streak, total sessions, total minutes for a user |
| GET | `/api/retreats` | List retreats, ordered by start date |
| GET | `/api/retreats/:id` | Get a single retreat |
| POST | `/api/retreats` | Create a retreat |
| POST | `/api/retreats/:id/register` | Register one attendee (409 if at capacity) |
| GET | `/api/testimonials` | List testimonials, newest first |
| POST | `/api/testimonials` | Submit a testimonial |

## License

MIT — see [LICENSE](./LICENSE). Fork away.
