# LocusPoint

LocusPoint is a web application for film and television location scouts. It gives a scout one place to build a personal library of scouted locations (photos, contacts, notes, availability, and map position), break a production down into scenes, and match scenes to candidate locations for presentation to directors and production teams.

Photos and geospatial data are the two foundations of the product. Photos are stored in S3-compatible object storage and analyzed with Google Vision for keyword suggestions; addresses are geocoded and visualized with Google Maps; scene text is run through a custom BERT keyword-generation microservice.

The project began as a Sheridan College CS capstone and is now a solo product build heading toward a closed alpha with professional scouts in Ontario.

**Status: pre-alpha.** Authentication and per-user authorization are in progress. See [Current status](#current-status) before running anything against real data.

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | MUI v7, `@dnd-kit` for drag-and-drop ordering, Recharts |
| Data | PostgreSQL 16 via Prisma 6 (`prisma-client-js` generator) |
| Validation | Zod |
| Object storage | Garage (S3-compatible); private bucket, photos served through presigned URLs |
| Auth | better-auth with Prisma adapter (email/password) |
| External services | Google Vision (photo labels), Google Maps JS API, Nominatim (geocoding) |
| NLP | Custom BERT model served by a FastAPI container (`keyword-generation/`) |
| Testing | Vitest (unit + integration against real Postgres/Garage), Playwright (E2E) |
| Local infra | Docker Compose |

## Architecture

Four layers, with dependencies pointing inward:

```
UI (pages, components)
  → Actions (server actions — security boundary; extract userId from session)
    → Services (pure business logic; take userId as a parameter; return Result<T>)
      → Infrastructure (Prisma, object storage over the S3 API, Google APIs, keyword service)
```

- `userId` is always derived server-side from the session, never accepted from client input.
- Middleware provides route-level protection; each server action calls `auth.api.getSession()` to establish identity.
- Services accept an optional `options` object (`{ db?: PrismaClient, geocoder?, ... }`) so tests can inject the test database and fake external dependencies without a DI container.
- Services return a `Result<T>` discriminated union for reads and writes alike.

```
location-scouting-web-application/
├── prisma/                 # schema.prisma + migrations
├── keyword-generation/     # BERT FastAPI service (model weights not committed)
├── src/
│   ├── app/                # routes, incl. api/auth/[...all] and (protected)/(public) groups
│   ├── actions/            # server actions
│   ├── services/           # business logic
│   ├── schemas/            # Zod schemas + inferred types
│   ├── components/
│   ├── lib/                # prisma singleton, auth config/client
│   └── test/               # Vitest setup + integration tests
├── docker-compose.yml
└── .env.example
```

---

## Local setup

### Prerequisites

- Node.js 24.21+ and npm
- Docker Desktop (or Docker Engine + Compose v2)
- A Google Cloud project with the Vision API and Maps JavaScript API enabled

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
```

Fill in the values described in [Environment variables](#environment-variables). At minimum you need `BETTER_AUTH_SECRET`. Without `GOOGLE_VISION_API` photo uploads still work, they just don't suggest keywords; to get labels without a key, use the [external service mocks](location-scouting-web-application/mocks/README.md).

### 3. Start infrastructure

```bash
docker compose up -d
```

| Service | Container | Port(s) | Purpose |
|---|---|---|---|
| `db` | `location-scouting-db` | 5432 | Development database (persistent volume) |
| `db-test` | `location-scouting-db-test` | 5434 | Test database (no volume — disposable) |
| `garage` | `location-scouting-garage` | 3900 (S3 API) | Photo storage (Garage, S3-compatible); config in `garage/garage.toml` |
| `keyword-generation` | `keyword-generation` | 8080 | BERT scene-keyword service |
| `external-mocks` (profile `mocks`) | `location-scouting-external-mocks` | 8089 | Optional WireMock stand-in for Vision, keyword generation and Nominatim — see [`mocks/README.md`](location-scouting-web-application/mocks/README.md) |

The `keyword-generation` image needs the model checkpoint present under `keyword-generation/models/` before it will build. The weights are not in the repo. If you don't have them, start everything else and the app will run without scene keyword suggestions:

```bash
docker compose up -d db db-test garage
```

Garage creates the photo bucket and its access key on first start, from the `OBJECT_STORE_*` values in `.env`; there is no manual bucket step. See the [app README](location-scouting-web-application/README.md#object-storage-garage) for resetting it and for moving older photos into their owners' storage prefixes.

### 4. Migrate both databases

```bash
npx prisma migrate dev        # dev DB; also runs prisma generate
npm run test:db:push          # applies the same migrations to the test DB (port 5434)
```

Run both after every schema change. `test:db:push` uses `migrate deploy`, so it only applies migrations that `migrate dev` has already created.

### 5. Run the app

```bash
npm run dev
```

The app runs at http://localhost:3000. Create an account through the sign-up page — there are no seeded users.

---

## Environment variables

`location-scouting-web-application/.env.example` contains the following; copy it to `.env`. Never commit `.env`.

```dotenv
# ─── Database ──────────────────────────────────────────────
# Development database (docker service: db)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/location_scouting?schema=public"
# Test database (docker service: db-test). WARNING: every table in this
# database is truncated before each test. Never point this at real data.
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5434/location_scouting_test?schema=public"

# ─── Object storage (Garage, docker service: garage) ───────
# The bucket is private. The server mints a short-lived presigned URL for every photo it sends to a client.
# Where the server reaches storage:
OBJECT_STORE_ENDPOINT=http://localhost:3900
# Where browsers and apps reach storage. Photo URLs are signed for this host, so it must be reachable from the client
# (e.g. your machine's LAN IP when testing on a phone or emulator). Same as above in local development.
OBJECT_STORE_PUBLIC_ENDPOINT=http://localhost:3900
# Must match s3_region in garage/garage.toml
OBJECT_STORE_REGION=garage
# docker compose creates this key and bucket on Garage's first start. The secret needs 16+ characters, and changing it
# later stops Garage from starting until its volume is reset (see README).
OBJECT_STORE_BUCKET=location-photos
OBJECT_STORE_ACCESS_KEY_ID=GKlocaldevaccesskey
OBJECT_STORE_SECRET_ACCESS_KEY=local-dev-secret-change-me
# Garage's node-to-node secret: 32 random bytes as hex (openssl rand -hex 32)
GARAGE_RPC_SECRET=8c4d0e2f6a1b3c5d7e9f0a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d
# How long a photo URL stays valid, in seconds (60 to 86400). Optional, defaults to an hour.
# PHOTO_URL_TTL_SECONDS=3600

# ─── Auth (better-auth) ────────────────────────────────────
# 32+ random bytes, base64. Generate with either:
#   openssl rand -base64 32
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
BETTER_AUTH_SECRET=
# Public base URL of the app; used for callbacks and redirects
BETTER_AUTH_URL=http://localhost:3000

# ─── Google ────────────────────────────────────────────────
# Server-side only. Vision API key for photo label detection (keyword suggestions from photos).
# Optional: without it, labels are skipped and uploads still work. Do NOT prefix with NEXT_PUBLIC_.
GOOGLE_VISION_API=
# Shipped to the browser. Restrict this key by HTTP referrer in GCP.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# ─── Scene keyword generation (BERT / FastAPI) ─────────────
# Leave blank to disable scene keyword suggestions; the app degrades gracefully.
KEYWORD_GENERATION_API_URL=http://localhost:8080/

# ─── External service mocks (optional) ─────────────────────
# Point the external services at the WireMock container instead of the real APIs:
#   docker compose --profile mocks up -d external-mocks
# then uncomment the lines below. See mocks/README.md for the canned responses and the outage variants.
# GOOGLE_VISION_API_URL=http://localhost:8089
# KEYWORD_GENERATION_API_URL=http://localhost:8089/keywords
# NOMINATIM_API_URL=http://localhost:8089
```

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Matches `db` in `docker-compose.yml` |
| `TEST_DATABASE_URL` | For tests | Matches `db-test`; truncated per test |
| `OBJECT_STORE_*` | Yes | Defaults match the compose file, which creates the key and bucket. The server won't start if any are missing or invalid |
| `GARAGE_RPC_SECRET` | For `docker compose` | 32 random bytes as hex; the compose file has a dev default |
| `PHOTO_URL_TTL_SECONDS` | No | Lifetime of photo URLs handed to clients; defaults to an hour |
| `BETTER_AUTH_SECRET` | Yes | Signs sessions; rotating it invalidates all sessions |
| `BETTER_AUTH_URL` | Yes | Omitting it produces a better-auth warning and broken redirects |
| `GOOGLE_VISION_API` | No | Without it, photo label detection is skipped; uploads still work |
| `GOOGLE_VISION_API_URL` | No | Vision base URL; defaults to Google. Point at the mock server to run without a key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | For maps | Map components render blank without it |
| `KEYWORD_GENERATION_API_URL` | No | Unset → keyword generation is skipped with a warning |
| `NOMINATIM_API_URL` | No | Geocoding base URL; defaults to OpenStreetMap's Nominatim. Point at the mock server for offline, deterministic coordinates |

Geocoding uses Nominatim (OpenStreetMap) and needs no key. It is rate-limited to roughly one request per second.

---

## Testing

### Philosophy

- Service layer is built test-first.
- Managed dependencies (Postgres, Garage) are tested for real against dedicated test resources — no mocks.
- Unmanaged dependencies (geocoder, keyword generator, Vision label detector) are replaced with fakes injected through the service `options` parameter. Anything that isn't injected goes to a WireMock container the test run starts itself, so tests never call Google Vision (or spend credits), the BERT service or Nominatim, even with real keys in `.env`. Set `EXTERNAL_SERVICE_MOCKS=off` to test against the real services — see [`mocks/README.md`](location-scouting-web-application/mocks/README.md).
- Behaviour is verified through committed tests, not by running the dev server and eyeballing it.
- Test code favours explicit, per-test setup (DAMP over DRY) for isolation and readability.

### Unit and integration tests (Vitest)

Requirements: Docker running. The integration tests start their own Postgres, Garage and WireMock containers (testcontainers) and apply the migrations themselves.

```bash
npm test                 # watch mode
npx vitest run           # single run (CI-style)
npx vitest run src/test/locationService.test.ts   # one file
```

Configuration (`vitest.config.ts`):

- Three projects: `unit` (`src/test/unit`, node), `components` (`src/test/components`, jsdom + Testing Library; server actions are mocked per file), and `integration` (`src/test/integration`, node, real Postgres/Garage via testcontainers). Run one with `npm run test:unit`, `npm run test:components` or `npm run test:integration`.
- `setupFiles: ['./src/test/setup.ts']`
- `fileParallelism: false` — test files share one database and truncate it between tests; running files in parallel causes deadlocks and cross-test interference.
- `@` aliases to `./src`.

What `src/test/setup.ts` does:

1. Loads `.env` via `dotenv/config` (must be the first import).
2. Re-exports as `prisma` the `PrismaClient` bound to `TEST_DATABASE_URL` (created in `src/test/testDatabase.ts`, which the E2E fixtures use too).
3. `beforeAll`: connects. (Garage creates the test bucket when its container starts.)
4. `beforeEach`: truncates every table in the `public` schema except `_prisma_migrations` (with `CASCADE`), and empties the Garage test bucket.
5. `afterAll`: disconnects.

Tests pass the test client into services explicitly:

```ts
import { prisma } from '@/test/setup'

const result = await createProject(input, { db: prisma })
```

Fire-and-forget side effects (e.g. background geocoding) are asserted by polling with `vi.waitFor`.

### End-to-end tests (Playwright)

Requirements: full stack running (`docker compose up -d`, `npm run dev`) with `BETTER_AUTH_*` set.

```bash
npx playwright install   # first run only — downloads browsers
npx playwright test
npx playwright test --ui # interactive runner
```

Auth strategy: each test signs up its own fresh user (email built from `randomUUID()`) in `beforeEach`. There are no seeded accounts and no shared `storageState`. Because all data is scoped by `userId`, per-test users give full isolation and let tests run in parallel against the development database without stepping on each other.

---

## Admin: resetting a tester's password

Alpha testers can't reset their own password yet (self-service reset is LS-150, email is LS-183). The sign-in page tells them to contact the operator, who resets it with a script. The contact text is `PASSWORD_HELP_CONTACT` in `src/lib/alphaSupport.ts`.

**Procedure**

1. **Verify the requester out-of-band first.** Confirm it's really the tester, for example by calling a phone number you already have for them. Don't act on the request message alone.
2. Run the reset from `location-scouting-web-application/`. It uses `DATABASE_URL` and `BETTER_AUTH_*` from `.env`, so point those at the database the tester uses.

   ```bash
   npm run admin:reset-password -- --email tester@example.com
   ```

   This generates a strong temporary password and prints it to stdout, once. The confirmation goes to stderr. To choose the password yourself, add `--password '<temporary password>'` (8 to 128 characters). It won't be printed back, but it will stay in your shell history, so prefer the generated one.
3. **Send the temporary password over a different channel from the request** if you can (e.g. they emailed, so text it). Ask the tester to change it after they sign in.

The script sets the password through Better Auth's own hashing and account APIs (`auth.$context`), never by writing a hash into the database, and signs the tester out of every session. An unknown email exits with code 1 and changes nothing. The logic lives in `src/maintenance/passwordReset.ts`, and `scripts/reset-password.ts` is the command-line wrapper.

When LS-150 ships, remove the sign-in note and keep the script for support.

---

## Current status

- **Authentication/authorization in progress.** better-auth is being wired up; `userId` scoping on `Location` and `Project` is being enforced. Until complete, do not treat the app as multi-tenant-safe.
- **Photos are analyzed with Vision as they're uploaded.** `addPhotosToLocation` stores each photo (`storePhotos`, object storage only) and then runs label detection (`visionService`), adding the labels to the location's keywords. Detection is best-effort: a missing key or a Vision error means no labels, but the upload still succeeds. It runs within the upload request; moving it to a background job is a possible follow-up.
- **Photos are private.** The bucket accepts no unsigned requests. Clients get short-lived presigned URLs, minted only for photos they own (`photoService.withPhotoUrls`), and each user's photos are stored under `users/<userId>/`. See [the photo access decision](location-scouting-web-application/docs/decisions/photo-access.md), which also covers look book sharing and edge caching.
- **Soft delete** of a location currently removes its photos; it should only set `status` and `deletedAt`, leaving photos for the 30-day purge.

---

## Troubleshooting

- **Port 5432 already in use** — a local Postgres install is running. Stop it or remap the `db` port in `docker-compose.yml` and update `DATABASE_URL`.
- **Types don't reflect a schema change** — run `npx prisma generate`. In WebStorm, File → Invalidate Caches if the IDE still shows stale types.
- **`EPERM` / file lock errors when moving or renaming folders on Windows** — stop `npm run dev` and any lingering `node` processes before refactoring.
- **Prisma import errors** — the generator must be `prisma-client-js` with no custom `output` path.
- **better-auth "set a valid base URL" warning** — `BETTER_AUTH_URL` is missing from `.env`.
