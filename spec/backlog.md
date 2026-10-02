# Backlog . Example Ecomerce API

| | |
| --- | --- |
| **Last updated** | 2026-10-01 |
| **Baseline commit** | `4750227` |
| **Related** | [`spec.md`](spec.md) · [`userStories.md`](userStories.md) · [`profOfWork.md`](profOfWork.md) · [`product.md`](product.md) |

How to read this file: tickets are grouped by epic and ordered by priority inside each epic.
Every ticket links to user stories (`US-xxx`), test cases (`TC-xxx`) and the QA criteria in
[`product.md`](product.md). Copy a ticket into a GitHub Issue as-is.

**Sizes** (ideal engineer-hours): `S` ≤ 2h · `M` 2–5h · `L` 5–10h.
**Priority:** `P0` blocker · `P1` high · `P2` normal · `P3` nice to have.

## Index

| ID | Title | Epic | Priority | Size | Depends on |
| --- | --- | --- | --- | --- | --- |
| **TKT-001** | **Migrate persistence from MongoDB to PostgreSQL on Supabase** | Foundations | **P0** | L | . |
| TKT-002 | Typed env validation, remove insecure secret defaults | Foundations | P0 | S | 001 |
| TKT-003 | Fix startup race, graceful shutdown, health endpoint | Foundations | P1 | S | 001 |
| TKT-004 | Raise test coverage and enforce gates in CI | Foundations | P1 | M | 001, 005 |
| TKT-005 | Tooling: ESLint, Prettier, scripts, pnpm only, CI | Foundations | P1 | S | . |
| TKT-006 | Fix session/token handling | Hardening | P0 | M | 001 |
| TKT-007 | Close admin self-registration hole | Hardening | P0 | S | 001 |
| TKT-008 | Product list contract: pagination, sort whitelist, filters | Hardening | P1 | M | 001 |
| TKT-009 | Fix product update validation and status codes | Hardening | P1 | S | 001 |
| TKT-010 | Standard response and error envelope | Hardening | P1 | M | 001 |
| TKT-011 | Security middleware: helmet, rate limit, body limit, CORS | Hardening | P1 | S | 002 |
| TKT-012 | Dependency cleanup and vulnerability fixes | Hardening | P1 | S | 001 |
| TKT-013 | Normalize emails and map conflicts to 409 | Hardening | P2 | S | 001, 010 |
| TKT-020 | Categories | Commerce | P2 | M | 001 |
| TKT-021 | Shopping cart | Commerce | P1 | M | 001, 010 |
| TKT-022 | Checkout and orders | Commerce | P1 | L | 021 |
| TKT-023 | Wallet (store credit) | Commerce | P2 | L | 022 |
| TKT-024 | Admin order management | Commerce | P2 | M | 022 |
| TKT-025 | Product image upload with Supabase Storage | Commerce | P3 | M | 001 |
| TKT-030 | Exchange-rate connector and `?currency=` display | Connectors | P2 | M | 010 |
| TKT-031 | Shipping quote connector | Connectors | P2 | M | 022 |
| TKT-032 | Payment webhook receiver (HMAC + idempotency) | Connectors | P2 | M | 022 |
| TKT-033 | Streaming JSON export of orders | Connectors | P3 | S | 024 |
| TKT-040 | OpenAPI from Zod and Swagger UI | Operations | P2 | M | 010 |
| TKT-041 | Structured logging with request ids and redaction | Operations | P2 | S | 010 |
| TKT-042 | Dockerfile and deploy pipeline | Operations | P3 | M | 005 |
| TKT-043 | Supabase security review (RLS, roles, network) | Operations | P2 | S | 001 |
| TKT-044 | Stretch: Mongo → Postgres data ETL script | Stretch | P3 | M | 001 |

---

## Audit findings (baseline `4750227`)

Found by reading all of `src/`, running `tsc --noEmit` (passes) and `npm audit --omit=dev`
(8 vulnerabilities: 2 low, 3 moderate, 3 high, as of 2026-10-01). Severity: **H** high, **M** medium, **L** low.

| ID | Sev | Finding | Where | Ticket |
| --- | --- | --- | --- | --- |
| F-01 | H | Anyone can register as `admin` by sending `role: "admin"` plus a secret whose **default value is public** (`admin-registration-secret-key`) | `validators/auth.validators.ts`, `constants/user.constants.ts` | 007, 002 |
| F-02 | H | `JWT_SECRET` falls back to `'jwt-secret'` when unset: forgeable tokens | `constants/app.constants.ts` | 002 |
| F-03 | H | Product search builds `$regex` from raw query params (regex injection / ReDoS) and `sort` accepts any field name | `services/product.services.ts` | 001, 008 |
| F-04 | H | Access token is written to logs on auth failure | `middlewares/auth.middleware.ts` | 006 |
| F-05 | M | Token is returned in the JSON body as well as in the cookie; JWT lives 30 days while the cookie lives 24 h; cookie has no `sameSite` | `controllers/auth.controller.ts`, `utils/jwt.util.ts` | 006 |
| F-06 | M | Full DB URI (with credentials) is logged on connect | `config/connectDB.ts` | 001 |
| F-07 | M | Non-admin gets `401` instead of `403` | `middlewares/auth.middleware.ts` | 006 |
| F-08 | M | Error handler returns the stack trace unless `NODE_ENV === 'production'`; `NODE_ENV` is unset by default | `middlewares/error.middleware.ts` | 010 |
| F-09 | M | Routes are registered inside the `listen` callback after an un-awaited DB connect: requests during boot can hit `notFound`; `app` is not exported so it cannot be tested | `index.ts` | 001, 003 |
| F-10 | M | `PUT /products/:id` validator requires an `id` field in the body even though the id is in the URL | `validators/product.validators.ts` | 009 |
| F-11 | M | Duplicate email on profile update is not checked (unique index error → `500`); emails are case-sensitive, so `A@x.com` and `a@x.com` are two accounts | `services/user.services.ts`, `models/user.model.ts` | 013 |
| F-12 | M | Malformed ids cause a Mongoose `CastError` and a `500` | all `findById` calls | 001, 009 |
| F-13 | M | `.gitignore` contains `test`, so a `test/` directory would never be committed | `.gitignore` | 001 |
| F-14 | M | No limit on `limit`; non-numeric `skip`/`limit` become `NaN` | `validators/product.validators.ts` | 008 |
| F-15 | L | `security.middleware.ts` comment promises "xss, mongo sanitize" but only CORS is applied; `express-mongo-sanitize` is unused; no `helmet`, no rate limit, no body size limit | `middlewares/security.middleware.ts` | 011 |
| F-16 | L | CORS `origin` is `undefined` when `DEV_ORIGINS`/`PROD_ORIGINS` are unset (permissive fallback) while `credentials: true` | `middlewares/security.middleware.ts` | 002, 011 |
| F-17 | L | `POST /products` returns `200` (should be `201`); controller docs say `/api/...` but routes are `/api/v1/...`; login and register format validation errors differently | controllers | 009, 010 |
| F-18 | L | Declared scripts `lint` and `format` do nothing useful: ESLint is not installed or configured; Prettier uses tabs while `.editorconfig` says spaces; `insertPragma` adds `/** @format */` everywhere | `package.json`, `.prettierrc`, `.editorconfig` | 005 |
| F-19 | L | Two lockfiles (`package-lock.json`, `pnpm-lock.yaml`); no `start` script; no `engines`; no `.nvmrc` | repo root | 005 |
| F-20 | L | Unused or redundant deps: `chalk`, `colors`, `express-mongo-sanitize`, `@types/mongoose` (deprecated); `express-async-handler` unnecessary on Express 5 | `package.json` | 012 |
| F-21 | L | Typo `USER_ROELS`; `models/index.ts` uses `export *` on default exports so it exports nothing for Product/User | `constants/user.constants.ts`, `models/index.ts` | 001, 005 |
| F-22 | L | Product keeps `stock` and per-variant `quantity` with no consistency rule | `models/product.model.ts` | 020 |
| F-23 | L | `cart`, `order`, `wallet` controllers/services/routes/types/models are **empty files**, while the repo description advertises them | many | 021–023 |
| F-24 | L | `morgan('dev')` registered before `dotenv.config()`; `process.env.npm_package_version` is only set when started via `npm`/`pnpm` | `index.ts`, `routes/index.ts` | 003 |
| F-25 | L | `SIGINT` handler lives inside `connectDB`; the HTTP server is never closed; `SIGTERM` is ignored | `config/connectDB.ts` | 003 |

---

# Epic 0 . Foundations

## TKT-001 . Migrate persistence from MongoDB to PostgreSQL on Supabase  `FIRST EXERCISE`

| | |
| --- | --- |
| **Type** | Technical / migration |
| **Priority** | P0 |
| **Size** | L (time-box: 4–6 hours) |
| **Stories** | US-020 |
| **Test cases** | TC-001 … TC-016 |
| **Findings closed** | F-03, F-06, F-09 (minimal), F-12, F-13, F-21 |

### Context

The API stores users and products in MongoDB through Mongoose. The business decided to standardise on PostgreSQL
hosted on Supabase. Cart, orders and wallet (relational by nature) are next, so the base must change first.
The storefront must keep working: **same endpoints, same request and response shapes**, with the single
exception that ids become UUID strings.

### Scope

1. **Database and tooling**
   - Initialise Supabase locally (`supabase init`, `supabase start`) and commit `supabase/config.toml`.
   - Add Drizzle ORM, `postgres` (postgres.js) and `drizzle-kit`. Define the schema from
     [`spec.md` §5](spec.md#5-data-model-target) in `src/db/schema/`.
   - Generate and commit SQL migrations in `drizzle/`. They must apply cleanly on an empty local
     database **and** on a fresh hosted Supabase project.
   - Enable RLS on every created table (no permissive policies) via migration.
2. **Data access**
   - Create `src/db/client.ts` (pooled client, `DATABASE_URL`, optional SSL, `close()` for shutdown).
   - Create `src/repositories/user.repository.ts` and `product.repository.ts`. Services must stop importing models.
   - Move password hashing out of the Mongoose hook into the service layer.
   - Product `variants` are stored in `product_variants` but still returned nested in the product JSON,
     exactly as today.
   - Product listing keeps `limit`, `skip`, `search`, `sort`, `category`, `brand` and the response
     `{ products, total }` inside `data`. Search uses parameterised, case-insensitive matching with `%`/`_`
     escaped. `sort` is restricted to a whitelist (`createdAt`, `price`, `name`, `stock`) and keeps descending order as
     today; an unknown value returns `400`. `limit` is capped at 100 and `skip` must be a non-negative integer.
   - Malformed id → `400`; unknown id → `404`. Unique email violation → the same `400 User already exists` as today
     (the status changes to `409` in TKT-013).
3. **Application structure (minimum needed to test)**
   - Split `src/app.ts` (builds and exports the app, no `listen`) from `src/server.ts` (listens). Remove `src/index.ts`.
     Connect to the DB **before** starting to listen and register routes synchronously.
   - Never log the connection string.
4. **Cleanup**
   - Remove `mongoose`, `@types/mongoose`, `express-mongo-sanitize`, `src/models/` and `Document` in types.
   - Replace `MONGODB_URI` with `DATABASE_URL` everywhere.
   - Fix `.gitignore` so `test/` is tracked.
5. **Tests**
   - Add Vitest + Supertest with the layout from [`spec.md` §4](spec.md#4-expected-project-structure).
   - At least **12 integration tests** against a real Postgres (`TEST_DATABASE_URL`) covering the cases in
     `profOfWork.md` TC-001 … TC-016 that are marked `Auto`.
6. **Docs and config**
   - Create `.env.example` as specified in `spec.md` §4.
   - Update `README.md` quick start for Supabase (local and hosted) and delete the MongoDB instructions.
   - Add `scripts/seed.ts` (1 admin, 20 products) and the `db:*` scripts.

### Acceptance criteria

```gherkin
Scenario: Fresh local setup works from the README alone
  Given a clean clone, Docker running and no MongoDB installed
  When I follow the README: pnpm install, supabase start, copy .env.example to .env, pnpm db:migrate, pnpm db:seed, pnpm dev
  Then GET /api/v1 returns 200
  And GET /api/v1/products returns the 20 seeded products

Scenario: Hosted Supabase works
  Given a new Supabase project and its pooled connection string in DATABASE_URL with DATABASE_SSL=true
  When I run pnpm db:migrate and start the API
  Then register, login, create product and list products succeed

Scenario: API contract is preserved
  Given the baseline response shapes listed in README
  When I call every existing endpoint
  Then keys, nesting and status codes are identical, except that ids are UUID strings

Scenario: Search is safe
  When I call GET /api/v1/products?search=.*(a+)+$ or sort=password
  Then the API returns 200 with matching rows (literal search) or 400 for the invalid sort, never 500

Scenario: Nothing Mongo remains
  Then `grep -ri mongo src package.json` returns nothing (docs may mention the migration)
  And pnpm typecheck, pnpm lint (if configured) and pnpm test pass
```

Additional requirements:

- [ ] PR description lists every behaviour change (ids, validation hardening) and the rollback plan.
- [ ] Migration files have header comments per `spec.md` §8.
- [ ] Prepared-statement / pooler decision is documented in the README.
- [ ] No credentials in the repo or in logs.

### Out of scope

Data export from existing Mongo databases (see TKT-044), response envelope changes (TKT-010), new endpoints.

---

## TKT-002 . Typed env validation, remove insecure secret defaults

**Priority** P0 · **Size** S · **Stories** US-021 · **Tests** TC-017, TC-018 · **Closes** F-02, F-16

**Description.** Create `src/config/env.ts` that parses `process.env` with Zod and exports a typed config.
Only this file reads `process.env`. Remove defaults for `JWT_SECRET` and `ADMIN_REGISTRATION_SECRET_KEY`.

**Acceptance criteria**

- Starting the app without `JWT_SECRET`, or with one shorter than 32 characters, exits with code 1 and a message naming the variable (never printing its value).
- `PORT` is coerced to a number; `DATABASE_SSL` to a boolean; `DEV_ORIGINS`/`PROD_ORIGINS` to string arrays.
- In `production`, `PROD_ORIGINS` is required and must not contain `*`.
- `.env.example` and the Zod schema list exactly the same variables (a test asserts it).
- No other file in `src/` references `process.env`.

## TKT-003 . Fix startup race, graceful shutdown, health endpoint

**Priority** P1 · **Size** S · **Stories** US-022 · **Tests** TC-019, TC-020 · **Closes** F-09, F-24, F-25

**Description.** Make the server lifecycle deterministic.

**Acceptance criteria**

- Routes and error handlers are registered when `app` is built, not in a callback.
- `server.ts` connects to the DB first, then listens; on connection failure it logs the reason and exits with code 1.
- `SIGTERM` and `SIGINT` stop accepting connections, wait up to 10 s for in-flight requests, close the DB pool and exit 0.
- `GET /health` returns `200 { "status": "ok" }` when the DB answers `select 1`, otherwise `503 { "status": "degraded" }`. It needs no auth.
- Version in `/api/v1` comes from `package.json`, not from `npm_package_version`.

## TKT-004 . Raise test coverage and enforce gates in CI

**Priority** P1 · **Size** M · **Stories** US-023 · **Tests** TC-021

**Description.** After the minimal harness from TKT-001, bring the suite to the standard in
[`product.md` §4](product.md#4-quality-gates).

**Acceptance criteria**

- Coverage ≥ 80% lines and ≥ 70% branches overall; ≥ 90% lines on `services/` and `utils/`.
- Every endpoint has tests for: success, validation error, unauthenticated, forbidden (where relevant), not found.
- The CI job fails when coverage drops below the thresholds.
- Tests run in under 60 s on CI and never touch a non-test database (a guard throws if `DATABASE_URL` and `TEST_DATABASE_URL` point to the same database name).

## TKT-005 . Tooling: ESLint, Prettier, scripts, pnpm only, CI

**Priority** P1 · **Size** S · **Stories** US-023 · **Tests** TC-022 · **Closes** F-18, F-19, F-21

**Acceptance criteria**

- ESLint flat config with `typescript-eslint` (type-aware), `no-explicit-any` as error, `no-console` as error.
- `.prettierrc` aligned with `.editorconfig` (spaces, 2, printWidth 100, no `insertPragma`); the whole repo is formatted in **one** dedicated `style:` commit.
- Scripts exactly as in [`spec.md` §4](spec.md#required-packagejson-scripts-final-state); `package-lock.json` deleted; `engines.node` and `.nvmrc` set.
- `.github/workflows/ci.yml` runs install (frozen lockfile), typecheck, lint, test with a Postgres service container, and build, on every PR.
- `.github/PULL_REQUEST_TEMPLATE.md` added.
- `USER_ROELS` renamed to `USER_ROLES`.

---

# Epic 1 . Security and correctness hardening

## TKT-006 . Fix session and token handling

**Priority** P0 · **Size** M · **Stories** US-001, US-002 · **Tests** TC-023 … TC-028 · **Closes** F-04, F-05, F-07

**Acceptance criteria**

- Register/login responses never include the token in the body. The cookie `access_token` is `httpOnly`, `sameSite=lax`, `secure` in production, and its `maxAge` equals the JWT lifetime (`JWT_EXPIRES_IN`, default 1 day).
- `POST /auth/logout` clears the cookie and returns `204`.
- `protect` also accepts `Authorization: Bearer <token>` (cookie wins if both exist).
- Tokens (valid or not) never appear in logs; auth failures log the reason and request id only.
- Missing/invalid/expired token → `401`; valid token with insufficient role → `403`.
- Each case has an integration test.

## TKT-007 . Close admin self-registration hole

**Priority** P0 · **Size** S · **Stories** US-003 · **Tests** TC-029, TC-030 · **Closes** F-01

**Acceptance criteria**

- `POST /auth/register` ignores or rejects `role` and `secret_key`; every public registration creates a `user`.
- `scripts/create-admin.ts` (`pnpm admin:create --email ... `) creates or promotes an admin, prompting for the password (not as a CLI arg) and requiring `DATABASE_URL`.
- `ADMIN_REGISTRATION_SECRET_KEY` is removed from code and from `.env.example`.
- Tests prove a registration with `role: "admin"` yields a normal user (or `400`, but the choice is documented).

## TKT-008 . Product list contract: pagination, sort whitelist, filters

**Priority** P1 · **Size** M · **Stories** US-004 · **Tests** TC-031 … TC-036 · **Closes** F-14 (F-03 residuals)

**Acceptance criteria**

- Query params: `limit` (1–100, default 10), `offset` (≥ 0, default 0; `skip` kept as a deprecated alias for one release), `search`, `category`, `brand`, `minPrice`, `maxPrice`, `inStock=true|false`, `sort` (whitelist), `order=asc|desc` (default `desc`).
- Invalid values return `400` with per-field errors.
- Response includes `meta.total`, `meta.limit`, `meta.offset` (shape final after TKT-010).
- Query plan for `search` on 10,000 products stays under 100 ms locally (add a `pg_trgm` index if needed and document it).

## TKT-009 . Fix product update validation and status codes

**Priority** P1 · **Size** S · **Stories** US-005 · **Tests** TC-037 … TC-040 · **Closes** F-10, F-12 (residual), F-17 (part)

**Acceptance criteria**

- `PUT /products/:id` does not require `id` in the body; extra or unknown fields are rejected.
- `POST /products` returns `201` and a `Location` header with the new resource URL.
- `PUT` with an empty body returns `400`.
- Updating `variants` replaces the set atomically (transaction).
- Controller doc comments show the real `/api/v1/...` paths.

## TKT-010 . Standard response and error envelope

**Priority** P1 · **Size** M · **Stories** US-024 · **Tests** TC-041 … TC-044 · **Closes** F-08, F-17

**Acceptance criteria**

- All endpoints use the envelope in [`spec.md` §6](spec.md#6-api-and-json-conventions) with stable error codes.
- One shared formatter for Zod errors (`details` is `{ field: message }`); login and register stop differing.
- Stack traces never leave the server when `NODE_ENV !== 'development'`.
- `meta.requestId` is generated per request (or taken from `X-Request-Id`) and echoed in the `X-Request-Id` header.
- A contract test parses every endpoint's response with a Zod schema.
- A short `CHANGELOG.md` entry lists the breaking changes for the storefront team.

## TKT-011 . Security middleware: helmet, rate limit, body limit, CORS

**Priority** P1 · **Size** S · **Stories** US-025 · **Tests** TC-045 … TC-047 · **Closes** F-15, F-16

**Acceptance criteria**

- `helmet` enabled; `express.json({ limit: '100kb' })`.
- `/auth/login` and `/auth/register`: 10 requests per minute per IP, then `429 RATE_LIMITED` with `Retry-After`.
- CORS uses the validated allowlist; credentials only for listed origins; unknown origin gets no CORS headers.
- Tests cover the limiter and the CORS cases.

## TKT-012 . Dependency cleanup and vulnerability fixes

**Priority** P1 · **Size** S · **Stories** US-023 · **Tests** TC-048 · **Closes** F-20

**Acceptance criteria**

- Remove `chalk`, `colors`, `express-async-handler` (Express 5 handles async errors), and anything made unused by TKT-001.
- `pnpm audit --prod` reports no high or critical vulnerabilities; remaining moderate/low ones are listed in the PR with a reason.
- Dependabot or Renovate configured weekly.

## TKT-013 . Normalize emails and map conflicts to 409

**Priority** P2 · **Size** S · **Stories** US-001 · **Tests** TC-049 … TC-051 · **Closes** F-11

**Acceptance criteria**

- Emails are trimmed; uniqueness is case-insensitive (`citext`).
- Register with an existing email and profile update to another user's email both return `409 CONFLICT` (no `500`).
- Login is case-insensitive on email.

---

# Epic 2 . Commerce

## TKT-020 . Categories

**Priority** P2 · **Size** M · **Stories** US-006 · **Tests** TC-052 … TC-055 · **Closes** F-22 (part)

**Description.** Replace the free-text `products.category` with a `categories` table (name, slug, optional parent).

**Acceptance criteria**

- Admin can create, rename and delete categories; deleting one with products returns `409`.
- Products reference `category_id`; the product JSON still exposes `category` as the category **name** (and `categoryId`).
- Data migration maps existing distinct strings to categories.
- `GET /categories` is public and cached with `Cache-Control: public, max-age=60`.
- If a product has variants, `stock` is derived as the sum of variant quantities (document and test the rule).

## TKT-021 . Shopping cart

**Priority** P1 · **Size** M · **Stories** US-007, US-008 · **Tests** TC-056 … TC-062 · **Closes** F-23 (part)

**Acceptance criteria**

- Endpoints under `/cart` (authenticated): `GET`, `POST /items`, `PATCH /items/:id`, `DELETE /items/:id`, `DELETE /` (clear).
- One cart per user, created lazily. Max 50 line items. Quantity is an integer 1–99.
- Adding more than available stock returns `409 INSUFFICIENT_STOCK`.
- Cart response contains unit price, line total, cart subtotal and flags items whose price or stock changed since they were added.
- Cart repository calls are covered by integration tests including concurrent adds.

## TKT-022 . Checkout and orders

**Priority** P1 · **Size** L · **Stories** US-009, US-010 · **Tests** TC-063 … TC-072

**Acceptance criteria**

- `POST /orders` converts the caller's cart into an order inside **one transaction**: re-validates prices and stock, decrements stock atomically, snapshots names and unit prices, empties the cart.
- Concurrent checkouts for the last unit: exactly one succeeds, the other gets `409 INSUFFICIENT_STOCK`. A test proves it (two parallel requests).
- `GET /orders` (own, paginated) and `GET /orders/:id` (own only; other users get `404`).
- Status lifecycle per [`spec.md` §5](spec.md#5-data-model-target); `POST /orders/:id/cancel` restores stock for `pending` and `paid` orders.
- Money fields are integers in BRL centavos; free shipping above R$ 299,00 (`29900`), else a flat R$ 19,90 (`1990`) until TKT-031.
- Deleting a product referenced by orders is blocked with `409`.

## TKT-023 . Wallet (store credit)

**Priority** P2 · **Size** L · **Stories** US-011, US-012 · **Tests** TC-073 … TC-080

**Acceptance criteria**

- `GET /wallet` (own balance + paginated ledger); `POST /admin/wallets/:userId/credit` (admin, requires `Idempotency-Key`).
- `POST /orders/:id/pay-with-wallet` debits the balance and marks the order `paid` atomically; insufficient funds → `409 INSUFFICIENT_FUNDS`.
- Ledger is append-only (no UPDATE/DELETE grants or triggers that block them); balance equals the sum of ledger rows (a test asserts it).
- Repeating a request with the same `Idempotency-Key` returns the original result and creates no extra ledger row.
- 50 concurrent debits never drive the balance below zero.

## TKT-024 . Admin order management

**Priority** P2 · **Size** M · **Stories** US-013 · **Tests** TC-081 … TC-084

**Acceptance criteria**

- `GET /admin/orders` with filters (`status`, `userId`, `from`, `to`), pagination and sort.
- `PATCH /admin/orders/:id/status` enforces valid transitions (`409 INVALID_STATE_TRANSITION` otherwise).
- Every status change writes an `order_status_history` row (who, when, from, to).

## TKT-025 . Product image upload with Supabase Storage

**Priority** P3 · **Size** M · **Stories** US-014 · **Tests** TC-085, TC-086

**Acceptance criteria**

- Admin requests a signed upload URL (`POST /products/:id/images/upload-url`); the API validates type (`image/jpeg|png|webp`) and size (≤ 5 MB) before issuing it.
- A bucket policy lets only the API create objects; public read for product images.
- Max 8 images per product; deleting a product removes its objects.
- Any Supabase key used here is server-only, loaded via validated env, and never logged.

---

# Epic 3 . Connectors

## TKT-030 . Exchange-rate connector and `?currency=` display

**Priority** P2 · **Size** M · **Stories** US-015 · **Tests** TC-087 … TC-092

**Description.** The storefront shows "price in USD". Implement a connector to a public exchange-rate API
(for example `economia.awesomeapi.com.br` or `open.er-api.com`; verify availability and terms first).

**Acceptance criteria**

- `ExchangeRateConnector` interface with an HTTP adapter and an in-memory fake for tests; service code depends only on the interface.
- `GET /products?currency=USD` and `GET /products/:id?currency=USD` add `displayPrice: { amount, currency, rate, asOf }`; prices are never stored in USD.
- Timeout 3 s, up to 2 retries with exponential backoff and jitter, retry only on network errors/5xx/429.
- Rates are cached in memory for 15 minutes; if the upstream is down and a cached rate exists, serve it flagged `stale: true`; otherwise omit `displayPrice` and still return `200`.
- Response from the vendor is validated with Zod; unexpected shapes are logged and treated as upstream failure.
- Tests use the fake and a mocked HTTP layer; CI never calls the real API.

## TKT-031 . Shipping quote connector

**Priority** P2 · **Size** M · **Stories** US-016 · **Tests** TC-093 … TC-096

**Acceptance criteria**

- `POST /shipping/quote` with destination state (UF), postal code (CEP) and cart/order weight returns options `{ carrier, service, price, etaDays }`.
- Connector interface with a deterministic **mock carrier** (shipped in `test/` and a local stub server script) and a real-HTTP adapter pointing at a configurable URL.
- Orders store the chosen quote; quote validity is 15 minutes.
- Upstream failures return `503 UPSTREAM_UNAVAILABLE` with a safe message; a flat-rate fallback is configurable.

## TKT-032 . Payment webhook receiver (HMAC + idempotency)

**Priority** P2 · **Size** M · **Stories** US-017 · **Tests** TC-097 … TC-102

**Acceptance criteria**

- `POST /webhooks/payments` verifies an HMAC-SHA256 signature of the **raw body** using `PAYMENT_WEBHOOK_SECRET` with a constant-time comparison and a timestamp tolerance of 5 minutes.
- Events are stored (`payment_events`) with a unique `event_id`; replays return `200` without side effects.
- `payment.succeeded` marks the order `paid`; `payment.failed` leaves it `pending` and records the reason.
- Bad signature → `401`; unknown order → `202` and logged; malformed JSON → `400`.

## TKT-033 . Streaming JSON export of orders

**Priority** P3 · **Size** S · **Stories** US-018 · **Tests** TC-103, TC-104

**Acceptance criteria**

- `GET /admin/orders/export?from=&to=` streams `application/x-ndjson`, one order per line, using a DB cursor (memory stays flat for 100k rows).
- Admin only; the range is mandatory and limited to 92 days.

---

# Epic 4 . Operations

## TKT-040 . OpenAPI from Zod and Swagger UI

**Priority** P2 · **Size** M · **Stories** US-026 · **Tests** TC-105

**Acceptance criteria**

- `GET /openapi.json` generated from the same Zod schemas used for validation (no hand-written duplicate).
- Swagger UI at `/docs`, disabled when `NODE_ENV=production` unless `ENABLE_DOCS=true`.
- A CI step fails if the generated document is invalid.

## TKT-041 . Structured logging with request ids and redaction

**Priority** P2 · **Size** S · **Stories** US-027 · **Tests** TC-106

**Acceptance criteria**

- One JSON log line per request (`method`, `path`, `status`, `durationMs`, `requestId`, `userId` when known).
- `pino` redaction for `authorization`, `cookie`, `password`, `token`, `DATABASE_URL`.
- `pino-pretty` only in development.

## TKT-042 . Dockerfile and deploy pipeline

**Priority** P3 · **Size** M · **Stories** US-028 · **Tests** TC-107

**Acceptance criteria**

- Multi-stage Dockerfile, non-root user, image under 200 MB, `HEALTHCHECK` using `/health`.
- GitHub Actions job builds the image on PRs and pushes on tags; deployment target documented in the README.

## TKT-043 . Supabase security review

**Priority** P2 · **Size** S · **Stories** US-029 · **Tests** TC-108

**Acceptance criteria**

- Written checklist in `docs/supabase-security.md`: RLS enabled on all tables, no tables exposed through the auto REST API, a dedicated least-privilege DB role for the API, network restrictions, backups, and secrets rotation steps.
- A SQL query (committed) lists tables without RLS; CI or a script fails if any exist.

## TKT-044 . Stretch: Mongo → Postgres data ETL script

**Priority** P3 · **Size** M · **Stories** US-020 · **Tests** TC-109

**Acceptance criteria**

- `scripts/migrate-mongo-to-pg.ts` reads a MongoDB dump or connection and inserts users and products into Postgres, generating UUIDs and writing an `old_id → new_id` mapping file.
- Idempotent (re-running does not duplicate), reports counts, rejects invalid rows into a `rejected.json`.

---

## Suggested assessment path

| Stage | Tickets | What it reveals |
| --- | --- | --- |
| 1. Core | **TKT-001** | TypeScript, SQL/ORM, JSON contracts, tests, docs, git hygiene |
| 2. Judgment | Pick two of TKT-006, 007, 010 | Security thinking, API design, PR communication |
| 3. Features | One of TKT-021, TKT-030, TKT-032 | Integration skills, error handling, concurrency, design |
| 4. Review | Live code review of their PR | Responding to feedback, rebase and conflict handling |
