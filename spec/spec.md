# Battle Axe Ecomerce API

| | |
| --- | --- |
| **Status** | Draft v1 . ready for the assessment |
| **Last updated** | 2025-04-11 |
| **Baseline commit** | `4750227` ("feat: product module") |
| **Owner** | Product Owner (see [§12](#12-product-owner-notes)) |
| **Related docs** | [`backlog.md`](backlog.md) · [`userStories.md`](userStories.md) · [`profOfWork.md`](profOfWork.md) · [`product.md`](product.md) |

## Table of contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [Tech stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Expected project structure](#4-expected-project-structure)
5. [Data model (target)](#5-data-model-target)
6. [API and JSON conventions](#6-api-and-json-conventions)
7. [Configuration and environment](#7-configuration-and-environment)
8. [Code conventions and commenting](#8-code-conventions-and-commenting)
9. [Git workflow](#9-git-workflow)
10. [Testing strategy](#10-testing-strategy)
11. [Security baseline](#11-security-baseline)
12. [Product Owner notes](#12-product-owner-notes)
13. [Out of scope](#13-out-of-scope)
14. [Glossary](#14-glossary)

---

## 1. Purpose and scope

"Battle Axe Ecomerce" is a small online store selling outdoor and lifestyle goods in Brazil.
This repository is its **backend API**. The storefront (a separate React app, not in
this repo) consumes it over JSON.

The code was inherited from an starter: auth, users and products work,
while cart, orders and wallet are empty placeholder files.

Your job is organised in
five phases (0 to 4):

| Phase | Goal | Tickets |
| --- | --- | --- |
| 0 | Foundationals: Move to PostgreSQL on Supabase, make the project testable and safe to run | `TKT-001` … `TKT-005` |
| 1  | Hardening: Fix security and correctness defects found in the audit | `TKT-006` … `TKT-013` |
| 2 | Commerce: Categories, cart, orders, wallet, image upload | `TKT-020` … `TKT-025` |
| 3 | Connectors: Exchange rate, shipping quote, payment webhooks, exports | `TKT-030` … `TKT-033` |
| 4 | Operations: OpenAPI, logging, containerisation, Supabase review | `TKT-040` … `TKT-043` |

**The first deliverable is `TKT-001`: migrate persistence from MongoDB to PostgreSQL,
hosted on Supabase, without changing the public API contract.**

## 2. Tech stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Node.js 22 LTS+ |  |
| Language | TypeScript 5.x, `strict: true` |  |
| HTTP framework | Express 5 |  |
| Validation | Zod |  |
| Database | PostgreSQL 15+ on **Supabase** |  |
| DB access | Drizzle ORM + `postgres` (postgres.js) driver |  |
| Auth | Own JWT (HS256) in `httpOnly` cookie, `bcryptjs` for passwords |  |
| Logging | `pino` (+ `pino-pretty` in dev) |  |
| Tests | Vitest + Supertest |  |
| Lint / format | ESLint (flat config) + Prettier |  |
| Package manager | pnpm |  |
| CI | GitHub Actions |  |
| Local DB | Supabase CLI (`supabase start`) |  |

Deviations from the stack require a short written justification in the PR description.

### Supabase usage rules

- Supabase is the **hosting** for Postgres. The API connects with a standard
  `DATABASE_URL`; it does not use `supabase-js`, the anon key or the `service_role` key.
- Never commit or log connection strings, passwords or keys.
- Every table in `public` is enabled for **Row Level Security (RLS)** with no
  permissive policies. The API connects with a privileged role and bypasses RLS, and
  this prevents tables from being exposed through Supabase's auto-generated REST API.
- Use the **pooled** connection string for the deployed API. If the transaction pooler is
  used, disable prepared statements in the driver (`prepare: false`). Check the current
  options in the Supabase dashboard (Connect) before choosing, as they change over time.
- Hosted connections require TLS (`ssl: 'require'`). Local Supabase does not.

## 3. Architecture

A modular monolith with strict layers. No microservices.

```text
HTTP request
   │
   ▼
routes ──► middlewares (auth, rate limit, validation) ──► controllers
                                                              │ parsed, typed input
                                                              ▼
                                                          services      ◄── connectors (3rd-party APIs)
                                                              │ domain objects
                                                              ▼
                                                        repositories
                                                              │ SQL via Drizzle
                                                              ▼
                                                  PostgreSQL (Supabase)
```

### Layer rules

| Layer | Responsibility | Must not |
| --- | --- | --- |
| `routes` | Map method + path to middlewares and a controller | Contain logic |
| `controllers` | Validate input with Zod, call one service, shape the HTTP response | Touch the DB, hold business rules |
| `services` | Business rules, transactions, orchestration | Import `express`, write SQL, read `process.env` |
| `repositories` | All SQL / Drizzle queries; return plain typed objects | Know about HTTP, throw `AppError` for business cases |
| `connectors` | Wrap external HTTP APIs behind an interface (timeouts, retries, mapping) | Leak vendor payloads into services |
| `middlewares` | Cross-cutting HTTP concerns | Contain domain logic |
| `config` | Typed, validated environment; logger | Be imported by `repositories` for anything but the DB client |

Dependency direction is one-way: `routes → controllers → services → repositories → db`.
Services receive repositories and connectors by import or constructor; keep them
swappable so unit tests can use fakes.

### Error handling

- Business and HTTP errors are `AppError` (message, `statusCode`, machine-readable `code`).
- Controllers never catch to format responses; the central `errorHandler` does it.
- Unknown errors become `500 INTERNAL_ERROR` with no stack trace in production.
- Database constraint violations are translated in repositories/services
  (for example Postgres `23505` → `409 CONFLICT`), never leaked as raw driver errors.

### Transactions

Anything that changes more than one row (checkout, wallet payment, stock updates)
runs in a single DB transaction. Stock decrement uses a conditional update or row lock;
overselling must be impossible under concurrent requests.

## 4. Expected project structure

Legend: **NEW** = the engineer must create it · **CHANGED** = exists, must be modified ·
**REMOVED** = must be deleted · unmarked = keep.

```text
.
├── .editorconfig
├── .env                              # Real Runtime Variables
├── .env.example                      # Runtime Variables Example
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md      
│   └── workflows/
│       └── ci.yml                     
├── .gitignore                         
├── .nvmrc                            
├── .prettierignore
├── .prettierrc                       
├── README.md                         # for Postgres/Supabase
├── drizzle/                          # generated SQL migrations, committed
├── drizzle.config.ts                 # Drizzle + `postgres` driver
├── eslint.config.mjs                 # flat config
├── package.json                      # install scripts below, engines, no unused deps
├── pnpm-lock.yaml
├── package-lock.json                 # REMOVED (TKT-005)
├── tsconfig.json                     # path for tests, noUncheckedIndexedAccess optional
├── vitest.config.ts                  # Vitest + Supertest
├── scripts/
│   ├── seed.ts                       # 1 admin, 20 products
│   └── create-admin.ts               # 
├── spec/                             # these documents
├── supabase/
│   └── config.toml                   # from `supabase init`
├── src/
│   ├── app.ts                        # builds and exports the Express app, never calls listen()
│   ├── server.ts                     # loads env, listens, graceful shutdown (replaces index.ts)
│   ├── config/
│   │   ├── env.ts                    # Zod-validated env, fails fast
│   │   └── logger.ts
│   ├── constants/
│   │   ├── app.constants.ts          # CHANGED no secrets with defaults
│   │   └── user.constants.ts         # CHANGED fix USER_ROELS typo → USER_ROLES
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── product.controller.ts
│   │   ├── cart.controller.ts        # Phase 2 (currently empty)
│   │   ├── order.controller.ts       # Phase 2 (currently empty)
│   │   └── wallet.controller.ts      # Phase 2 (currently empty)
│   ├── db/
│   │   ├── client.ts                 # postgres.js + Drizzle instance, close()
│   │   └── schema/
│   │       ├── index.ts              # Drizzle schema
│   │       ├── users.ts              # users + user_roles
│   │       └── products.ts           # products + product_variants
│   ├── repositories/                 
│   │   ├── user.repository.ts
│   │   └── product.repository.ts
│   ├── connectors/                   
│   │   ├── exchange-rate.connector.ts
│   │   └── shipping.connector.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── security.middleware.ts    # helmet, rate limit
│   │   └── validate.middleware.ts    # optional Zod helper
│   ├── routes/
│   ├── services/
│   ├── types/                        # CHANGED no more `extends Document`
│   ├── utils/
│   └── validators/
└── test/                             # must be tracked by git
    ├── setup.ts                      # global setup: migrate test DB, close pool
    ├── helpers/
    │   ├── app.ts                    # supertest agent factory
    │   ├── auth.ts                   # createUser(), loginAs()
    │   ├── db.ts                     # truncate tables between tests
    │   └── factories.ts              # product/user builders
    ├── unit/
    │   ├── jwt.util.test.ts
    │   └── format-zod-errors.test.ts
    └── integration/
        ├── auth.test.ts
        ├── users.test.ts
        └── products.test.ts
```

### Required `package.json` scripts (final state)

| Script | Command (suggested) |
| --- | --- |
| `dev` | `tsx watch src/server.ts` (or keep `nodemon` + `ts-node`) |
| `build` | `tsc -p tsconfig.build.json` |
| `start` | `node build/server.js` |
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint .` |
| `format` | `prettier --write .` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `test:coverage` | `vitest run --coverage` |
| `db:generate` | `drizzle-kit generate` |
| `db:migrate` | `drizzle-kit migrate` |
| `db:seed` | `tsx scripts/seed.ts` |

### Required `.env.example`

The engineer creates this file. Every variable consumed by the code must be listed, with a
comment, a safe placeholder and no real credentials.

```dotenv
# ─── App ──────────────────────────────────────────────
NODE_ENV=development            # development | test | production
PORT=1337

# ─── Database (Supabase Postgres) ─────────────────────
# Local (supabase start):  postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Hosted: copy the pooled connection string from the Supabase dashboard (Connect)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DATABASE_SSL=false              # true for hosted Supabase
DATABASE_POOL_MAX=10
# Separate database used by `pnpm test`. Never point this at a shared database.
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres_test

# ─── Auth ─────────────────────────────────────────────
# Generate with: openssl rand -base64 48   (minimum 32 characters)
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=1d
# Only used by scripts/create-admin.ts after TKT-007
ADMIN_REGISTRATION_SECRET_KEY=change-me-too

# ─── CORS ─────────────────────────────────────────────
DEV_ORIGINS=http://localhost:3000,http://localhost:5173
PROD_ORIGINS=https://shop.example.com

# ─── Phase 3 connectors (leave commented until implemented) ──
# EXCHANGE_RATE_API_URL=
# EXCHANGE_RATE_TIMEOUT_MS=3000
# SHIPPING_API_URL=
# PAYMENT_WEBHOOK_SECRET=
```

## 5. Data model (target)

Conventions: `snake_case` tables and columns, plural table names, `uuid` primary keys
(`gen_random_uuid()`), `timestamptz` for all timestamps, `created_at` / `updated_at` on
every table, foreign keys with explicit `ON DELETE` behaviour, CHECK constraints for
invariants (non-negative money and stock).

### Phase 0 schema (required by TKT-001)

```text
users
  id             uuid PK default gen_random_uuid()
  name           text        NOT NULL
  email          citext      NOT NULL UNIQUE      -- case-insensitive (extension: citext)
  password_hash  text        NOT NULL
  role           user_role   NOT NULL default 'user'   -- enum: 'user' | 'admin'
  created_at     timestamptz NOT NULL default now()
  updated_at     timestamptz NOT NULL default now()

products
  id             uuid PK default gen_random_uuid()
  name           text        NOT NULL
  description    text        NOT NULL
  price          integer     NOT NULL CHECK (price >= 0)   -- BRL centavos (R$ 129,90 = 12990), taxes included
  images         text[]      NOT NULL default '{}'
  brand          text        NOT NULL
  category       text        NOT NULL                       -- becomes FK in TKT-020
  stock          integer     NOT NULL CHECK (stock >= 0)
  created_at     timestamptz NOT NULL default now()
  updated_at     timestamptz NOT NULL default now()
  INDEX (created_at DESC), INDEX (category), INDEX (brand)

product_variants
  id             uuid PK default gen_random_uuid()
  product_id     uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE
  color          text        NOT NULL
  size           text        NOT NULL
  quantity       integer     NOT NULL CHECK (quantity >= 0)
  UNIQUE (product_id, color, size)
```

`updated_at` must be maintained (trigger or application code; document the choice).

### Later phases (informative, designed by the engineer in the matching ticket)

```text
categories(id, name UNIQUE, slug UNIQUE, parent_id NULL)
carts(id, user_id UNIQUE → users, created_at, updated_at)
cart_items(id, cart_id → carts, product_id → products, variant_id NULL, quantity CHECK > 0, UNIQUE(cart_id, product_id, variant_id))
orders(id, user_id → users, status order_status, subtotal, shipping_cost, total, currency 'BRL', created_at, updated_at)
order_items(id, order_id → orders, product_id, variant_id NULL, name_snapshot, unit_price_snapshot, quantity)
wallets(id, user_id UNIQUE → users, balance integer CHECK >= 0)   -- BRL centavos
wallet_transactions(id, wallet_id → wallets, type, amount, order_id NULL, idempotency_key UNIQUE, created_at)   -- append-only ledger
```

Order status lifecycle: `pending → paid → shipped → delivered`, plus `cancelled`
from `pending` or `paid`. Invalid transitions return `409`.

## 6. API and JSON conventions

Base path `/api/v1`. All bodies are `application/json; charset=utf-8`.

> `TKT-001` must **preserve** the current contract (see README). The envelope below is
> introduced by `TKT-010`. Until then, keep the existing `{ success, message, data }` shape.

### Target response envelope

Success:

```json
{
  "success": true,
  "data": { "id": "6f1c0e0e-6b0a-4f0e-9a43-0d6e9e3b2f11", "name": "Wool Beanie" },
  "meta": { "requestId": "c0a8a3f2-..." }
}
```

List with pagination:

```json
{
  "success": true,
  "data": [{ "id": "...", "name": "Wool Beanie", "price": 12990 }],
  "meta": { "total": 134, "limit": 10, "offset": 0, "requestId": "..." }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": { "price": "Price must be a non-negative integer" }
  },
  "meta": { "requestId": "..." }
}
```

### Rules

| Topic | Rule |
| --- | --- |
| Keys | `camelCase` in JSON, `snake_case` only in the database |
| Ids | UUID v4 strings. (Mongo ObjectIds disappear; the storefront team is informed in `TKT-001`) |
| Dates | ISO 8601 UTC strings, e.g. `2026-10-01T14:30:00.000Z` |
| Money | Integer amount in **BRL centavos** (R$ 129,90 → `12990`). Never floats. Field names `price`, `total`, ... plus `currency: "BRL"` where relevant |
| Booleans / nulls | Real `true`/`false`; `null` for "no value", never empty strings |
| Pagination | `limit` (default 10, max 100) and `offset`; response `meta.total` |
| Sorting | `sort` from a documented whitelist; `order=asc|desc`. Unknown value → `400` |
| Never in a response | `password_hash`, JWTs in the body, stack traces in production, internal SQL errors |
| Status codes | `200` ok · `201` created · `204` no content · `400` validation · `401` not authenticated · `403` authenticated but not allowed · `404` not found · `409` conflict · `422` only for semantic business rule errors · `429` rate limited · `500` unexpected |

### Stable error codes

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`RATE_LIMITED`, `INSUFFICIENT_STOCK`, `INSUFFICIENT_FUNDS`, `INVALID_STATE_TRANSITION`,
`UPSTREAM_UNAVAILABLE`, `INTERNAL_ERROR`.

## 7. Configuration and environment

- All configuration is read **once** in `src/config/env.ts`, validated with Zod and
  exported as a typed object. No other file reads `process.env`.
- Missing or weak secrets stop the process at startup with a clear message. No
  fallback values for secrets, ever.
- Three runtime modes: `development`, `test`, `production`. `NODE_ENV=test` is set by Vitest.
- Secrets live in the environment (local `.env`, CI secrets, hosting provider). `.env` is gitignored;
  `.env.example` is committed.

| Environment | Database | Purpose |
| --- | --- | --- |
| Local | `supabase start` (Docker) | Development |
| CI | `postgres` service container | Automated tests |
| Staging | Hosted Supabase project (free tier is fine) | Manual QA and demos |
| Production | Hosted Supabase project | Real traffic (future) |

## 8. Code conventions and commenting

### Style

- Prettier decides formatting: 2 spaces, single quotes, semicolons, trailing commas, `printWidth` 100.
  `.editorconfig` and `.prettierrc` must agree.
- Files: `kebab-case`, suffixed by role (`product.service.ts`, `user.repository.ts`).
  Pick one suffix style and apply it everywhere (the repo mixes `.services.ts` and `.service`).
- Identifiers: `camelCase` values, `PascalCase` types and classes, `UPPER_SNAKE_CASE` constants.
- Named exports only (no default exports) in new code.
- No `any`. Use `unknown` plus narrowing, or Zod-inferred types. A justified `any` carries a comment.
- No dead code, no commented-out code, no `console.log` (use the logger).
- Functions do one thing and stay under ~40 lines; split otherwise.
- Prefer early returns over nested `if`.

### How to comment

Comments explain **why** and **contracts**, not what the next line already says.

**1. TSDoc on every exported function, class and type.** Describe behaviour, params, errors.

```ts
/**
 * Creates a product together with its variants in a single transaction.
 *
 * @param input - Validated payload from `productInputSchema`.
 * @returns The persisted product, including generated `id` and timestamps.
 * @throws {AppError} `409 CONFLICT` if a variant with the same color and size is repeated.
 */
export async function createProduct(input: ProductInput): Promise<Product> {
  // ...
}
```

**2. Inline comments say why.**

```ts
// ✅ Good: explains a non-obvious decision
// Escape % and _ so a user searching for "50%" doesn't turn into a wildcard match.
const pattern = `%${escapeLike(search)}%`;

// ❌ Bad: restates the code
// Add 1 to counter
counter += 1;
```

**3. Route handlers document the HTTP contract and use the real path.**

```ts
/**
 * @route   GET /api/v1/products
 * @access  Public
 * @query   limit (1-100, default 10), offset (>= 0), search, category, brand, sort, order
 * @returns 200 { success, data: Product[], meta: { total, limit, offset } }
 */
```

(The current code documents `/api/products`, which is wrong.)

**4. TODOs always reference a ticket and never ship untracked.**

```ts
// TODO(TKT-021): reserve stock when the item is added to the cart.
```

**5. Migrations start with a header and explain irreversible steps.**

```sql
-- 0001_init_users_products.sql
-- Creates users, products and product_variants.
-- Requires extensions: citext, pgcrypto (for gen_random_uuid on older PG).
-- Irreversible: none. Rollback = drop tables in reverse order.
```

**6. Security- and money-related code carries a comment naming the invariant.**

```ts
// Invariant: balance never goes below zero. Enforced by the CHECK constraint AND this
// conditional update, so concurrent payments cannot both succeed.
```

**7. Tests are documentation.** Test names read as behaviour:
`it('returns 409 when the email is already registered')`, not `it('test register 2')`.

**8. Do not** leave banner comments, author tags, change logs in file headers, or the
`/** @format */` pragma (remove `insertPragma` from Prettier).

## 9. Git workflow

- Default branch `main` is always deployable. No direct pushes.
- Branch names: `feat/TKT-001-postgres-migration`, `fix/TKT-006-token-in-body`, `chore/TKT-005-tooling`.
- **Conventional Commits**: `feat(products): add pagination meta`. One logical change per
  commit; the history must tell the story and every commit should build.
- Rebase onto `main` before opening the PR and again before merge. Resolve conflicts
  yourself and mention them in the PR if they were non-trivial.
- A PR contains one ticket, links it, lists what changed and how it was verified,
  and has the evidence required by [`profOfWork.md`](profOfWork.md).
- Reviewer comments are answered one by one. Fixes are new commits during review
  (`fixup!` is fine); squash at merge time when asked.
- Never commit `.env`, dumps with real data, or credentials. If one leaks, rotate it first, then clean history.

PR template (`.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
## What and why
## Ticket
TKT-___
## How I verified it
- [ ] pnpm typecheck && pnpm lint && pnpm test
- [ ] Manual checks (list curl commands or screenshots)
## Notes for the reviewer
Risks, trade-offs, follow-ups, deviations from the spec.
```

## 10. Testing strategy

| Level | Tooling | What | Target |
| --- | --- | --- | --- |
| Unit | Vitest | Pure functions (utils, validators, services with fake repositories) | Fast, no I/O |
| Integration | Vitest + Supertest + real Postgres | HTTP → controller → service → repository → DB | Every endpoint: happy path, validation error, auth error, not found |
| Contract | Vitest | JSON shape of responses (Zod `parse` on the response) | Guards the storefront contract |
| Manual QA | curl / Postman / the checklist in `profOfWork.md` | Exploratory | Before each release |

Rules:

- Integration tests use `TEST_DATABASE_URL`, run migrations once in global setup, and
  truncate tables between tests. They never touch a non-test database (guard against it).
- Tests are independent and order-agnostic; no shared mutable fixtures.
- External HTTP (connectors) is mocked at the connector boundary, never hit in CI.
- Coverage gates are defined in [`product.md`](product.md#4-quality-gates).

## 11. Security baseline

1. No secrets in the repo or logs (connection strings and tokens included).
2. No default secret values; the app refuses to start without strong ones.
3. Passwords: `bcryptjs`, cost ≥ 10 (12 preferred), minimum length 8 for new passwords.
4. Sessions: JWT in an `httpOnly`, `sameSite=lax`, `secure` (production) cookie; expiry of the token and the cookie match;
   the token is never returned in a response body or written to logs.
5. Authorization: `401` when unauthenticated, `403` when the role is insufficient.
6. Admin accounts cannot be created through the public register endpoint.
7. All SQL is parameterised. User input never builds SQL, regexes or sort fields.
8. Rate limiting on `/auth/*`; request body size limit; `helmet` headers.
9. CORS allowlist from configuration; never `*` with credentials.
10. Dependencies: `pnpm audit` has no high or critical findings at merge time.

## 12. Product Owner notes

> Fictional context written for this assessment.

**Product Owner:** Mariana Souza. **Team:** 3 developers, 1 designer, part-time QA.
**Store:** Example Ecomerce, a boutique selling about 300 SKUs (outerwear, accessories, camping gear).

**Business rules**

- Prices are in **BRL**, stored as integer centavos, **taxes included** (tax calculation is out of scope). There is no multi-currency checkout;
  other currencies are display-only (Phase 3).
- Free shipping above **R$ 299,00** (`29900`); otherwise the shipping quote comes from a carrier connector.
- A cart holds up to **50 line items**. Carts do not reserve stock in v1; stock is verified and
  decremented at checkout.
- A product has up to **8 images** (URLs). Variants are color + size combinations with their own quantity.
- The **wallet** is store credit only: not withdrawable, one per user, top-ups by an admin,
  every movement is a ledger row, and balances are never edited directly.
- Customers mostly pay with **PIX** and credit cards through an external payment provider; the API only receives payment webhooks (Phase 3).
- Orders are never deleted; they can be cancelled. Prices are snapshotted into order items.
- Expected load: ~20 requests/second at peak (sales events such as Black Friday), 5k registered users in year one.

**Priorities, in the order I care about them**

1. Move to Postgres/Supabase safely (`TKT-001`). The storefront must not notice, except for id format.
2. Security defects before features. I do not want to launch with admin self-registration or tokens in logs.
3. A test suite I can trust, so the team can refactor.
4. Cart → checkout → orders. Wallet after that.
5. Connectors (exchange rate for the "see price in USD" button, shipping quotes, payment webhooks).

**Guidance for the engineer**

- Readable beats clever. Three developers will maintain this.
- Keep PRs small. One ticket per PR; reviews should take under 30 minutes.
- If a requirement is ambiguous, write your assumption in the PR and keep going. Do not block.
- If you find a bug that is not in the backlog, open a short issue and mention it in the PR.
- Tell me about any breaking change to the API contract before you ship it.

**Open questions (assume the stated default)**

| Question | Default assumption |
| --- | --- |
| Do we need guest checkout? | No, login required |
| Soft delete products? | Hard delete is fine until orders exist; after `TKT-022`, deletion of products referenced by orders must be blocked or soft |
| Do we keep existing Mongo data? | No production data exists; a data ETL is a stretch ticket (`TKT-044`) |
| Email verification / password reset? | Not in this scope |

## 13. Out of scope

Payment processing (only webhooks in Phase 3), email delivery, multi-tenant stores, multi-currency checkout,
invoices (NF-e / electronic tax documents), admin UI, refunds, inventory purchasing, recommendation engines,
Supabase Auth, GraphQL, microservices.

## 14. Glossary

| Term | Meaning |
| --- | --- |
| BRL | Brazilian real, stored as integer centavos (R$ 1,00 = `100`) |
| NF-e | Nota Fiscal Eletrônica, Brazilian electronic invoice (out of scope) |
| RLS | Postgres Row Level Security |
| Connector | Module that wraps an external API behind an interface |
| Ledger | Append-only table of money movements |
| DoD | Definition of Done, see [`product.md`](product.md) |
