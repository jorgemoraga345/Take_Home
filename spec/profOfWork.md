# Proof of Work — Test Cases and Evidence

| | |
| --- | --- |
| **Last updated** | 2026-10-01 |
| **Related** | [`spec.md`](spec.md) · [`backlog.md`](backlog.md) · [`userStories.md`](userStories.md) · [`product.md`](product.md) |

A ticket is **proven** when (a) its test cases pass and (b) the evidence in [§2](#2-evidence-required-in-every-pr)
is attached to the PR. `Auto` cases must exist as automated tests in `test/`; `Manual` cases are
executed by the engineer and pasted as evidence.

## 1. Test case format

```markdown
### TC-000 — Title
| Ticket | Story | Type | Priority |
| TKT-000 | US-000 | Auto / Manual | P0–P3 |
**Preconditions** …
**Steps** …
**Expected** …
```

Conventions used by the curl examples:

```bash
BASE=http://localhost:1337/api/v1
# cookie jars: user.txt (regular user), admin.txt (admin)
```

Contract note: while only `TKT-001` is merged, responses keep the baseline shape
`{ success, message, data }` and a non-admin on an admin route gets `401`
(this becomes `403` in `TKT-006`; the envelope changes in `TKT-010`).

---

## 2. Evidence required in every PR

| # | Evidence | How |
| --- | --- | --- |
| 1 | **Green CI run** | Link to the GitHub Actions run (typecheck, lint, test, build) |
| 2 | **Test summary** | Paste the `pnpm test` output (passed/failed counts, duration) |
| 3 | **Coverage** | `pnpm test:coverage` summary table (from `TKT-004` on) |
| 4 | **Manual transcript** | The curl commands and responses for every `Manual` test case, with tokens and secrets removed |
| 5 | **Mapping table** | A table in the PR: acceptance criterion → test case → test file / transcript |
| 6 | **Behaviour changes** | Bullet list of anything that differs from the previous behaviour, and why |
| 7 | **Risks and rollback** | What can go wrong in production and how to undo it |
| 8 | **Migration proof** (DB tickets) | Output of `pnpm db:migrate` on an empty local DB and on a hosted Supabase project, plus the generated SQL |
| 9 | **Screenshots** (optional) | Supabase table editor showing created tables with RLS enabled. **Blur keys, URLs and passwords** |

Rules: no secrets in any evidence; no real personal data; no screenshots of the Supabase
dashboard that show connection strings.

---

## 3. Detailed test cases — `TKT-001` (PostgreSQL / Supabase migration)

### TC-001 — Fresh setup works from the README alone
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-020 | Manual | P0 |

**Preconditions:** clean clone, Docker running, no MongoDB, Node 22+, pnpm.

**Steps**
```bash
pnpm install
supabase start
cp .env.example .env          # set a real JWT_SECRET
pnpm db:migrate
pnpm db:seed
pnpm dev
curl -i $BASE
curl "$BASE/products" | head -c 400
```

**Expected:** every command succeeds without extra steps; `GET /api/v1` → `200`; the product list contains
the 20 seeded products; no step requires editing code.

### TC-002 — Migrations are repeatable and run on hosted Supabase
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-020 | Manual | P0 |

**Steps**
1. Run `pnpm db:migrate` twice on the same local database.
2. Reset the local DB (`supabase db reset`), run it again.
3. Create a free Supabase project, set `DATABASE_URL` (pooled string) and `DATABASE_SSL=true`, run `pnpm db:migrate`, then start the API and run TC-003.
4. In the Supabase SQL editor run:
   `select tablename, rowsecurity from pg_tables where schemaname = 'public';`

**Expected:** second run is a no-op without errors; reset + migrate recreates everything; hosted run succeeds;
every application table shows `rowsecurity = true`.

### TC-003 — Register a user
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-001 | Auto | P0 |

**Steps**
```bash
curl -i -c user.txt -X POST $BASE/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Ana Perez","email":"ana@example.com","password":"secret123"}'
```

**Expected:** `201`; `Set-Cookie: access_token=...; HttpOnly`; body has `success: true`; a row exists in `users`
with a **bcrypt hash** (never the plain password); `GET $BASE/users/me` with the cookie returns the user
**without** any password field and with a UUID `id`.

### TC-004 — Login and wrong credentials
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-001 | Auto | P0 |

**Steps:** login with the right password; with a wrong password; with an unknown email; with an invalid email format.

**Expected:** `200` + cookie; `401 Invalid email or password` (identical message for wrong password and unknown email);
`401`; `400` with a validation error.

### TC-005 — Profile and password
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-001 | Auto | P1 |

**Steps:** `PUT /users/profile` with a new name; `PUT /users/change-password` with the wrong current password, then the right one; log in with the new password.

**Expected:** name updated; `401 Invalid current password`; `200`; old password no longer works.

### TC-006 — Admin-only writes
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-005 | Auto | P0 |

**Steps:** `POST /products` with no cookie, with a regular user cookie, with an admin cookie.

**Expected:** `401`; `401` (becomes `403` in TKT-006); `200` (baseline) with the created product.

### TC-007 — Default product listing
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-004 | Auto | P0 |

**Preconditions:** 25 products exist.

**Steps:** `GET /products`.

**Expected:** `200`; `data.products` has 10 items ordered by `createdAt` descending; `data.total = 25`; each product has
`images` array, `variants` array (possibly empty), ISO date strings.

### TC-008 — Search is literal and injection-safe
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-004 | Auto | P0 |

**Preconditions:** products named `Wool Beanie`, `50% Cotton Shirt`, `Beanie (kids)`.

**Steps:**
```bash
curl "$BASE/products?search=beanie"        # case-insensitive
curl "$BASE/products?search=50%25"         # literal percent
curl "$BASE/products?search=.*(a%2B)%2B$"  # regex-looking input
curl "$BASE/products?search=%27%3B%20drop%20table%20products%3B--"
```

**Expected:** 1st returns both beanies; 2nd returns only the cotton shirt; 3rd and 4th return `200` with an empty list;
the products table is intact; response time stays normal.

### TC-009 — Filters and pagination
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-004 | Auto | P1 |

**Steps:** `?category=accessories&brand=Battle Axe`, `?limit=5&skip=5`, `?limit=0`, `?limit=1000`, `?skip=-1`, `?limit=abc`.

**Expected:** filters narrow results and `total` reflects the filtered count; page 2 contains different items from page 1;
the invalid values return `400` with a message naming the field (never `500`, never `NaN` behaviour).

### TC-010 — Sort whitelist
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-004 | Auto | P1 |

**Steps:** `?sort=price`, `?sort=createdAt`, `?sort=password`, `?sort=1;select 1`.

**Expected:** whitelisted fields sort descending; the others return `400`.

### TC-011 — Create product with variants
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-005 | Auto | P0 |

**Steps (admin):**
```bash
curl -b admin.txt -X POST $BASE/products -H 'Content-Type: application/json' -d '{
  "name":"Trail Jacket","description":"Waterproof","price":59990,
  "images":["https://example.com/j1.jpg"],"brand":"Battle Axe","category":"outerwear","stock":10,
  "variants":[{"color":"red","size":"M","quantity":4},{"color":"red","size":"L","quantity":6}]}'
```
Then repeat with: a negative price, a non-integer stock, an empty `images` array, a non-URL image, a duplicated variant (same color+size).

**Expected:** first call succeeds and returns variants **nested** inside the product, with `id`, `createdAt`, `updatedAt`;
rows exist in `products` (1) and `product_variants` (2); each invalid case returns `400` with the offending field;
the duplicated variant is rejected (`400` or `409`) and **no partial product row** remains.

### TC-012 — Partial update
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-005 | Auto | P1 |

**Steps:** `PUT /products/{id}` with `{"id":"{id}","price":49990}` (the baseline validator still requires `id` in the body, see F-10).

**Expected:** `200`; `price` is `49990`; all other fields unchanged; `updatedAt` increased and `createdAt` unchanged.

### TC-013 — Delete product
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-005 | Auto | P1 |

**Steps:** `DELETE /products/{id}` then `GET /products/{id}`.

**Expected:** `200` with the deleted product; `404` afterwards; its variants are gone (`ON DELETE CASCADE`).

### TC-014 — Malformed and unknown ids
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-005 | Auto | P0 |

**Steps:** `GET /products/not-a-uuid`, `GET /products/00000000-0000-4000-8000-000000000000`, same for `PUT` and `DELETE`.

**Expected:** `400` for malformed (never `500`); `404 Product not found` for unknown.

### TC-015 — Duplicate email, including a race
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-001 | Auto | P0 |

**Steps:** register the same email twice; then fire 5 registrations of the same new email **in parallel**.

**Expected:** second sequential call → `400 User already exists`; in the parallel case exactly one `201` and four `400`,
never a `500`, and exactly one row in `users`.

### TC-016 — Repository hygiene
| Ticket | Story | Type | Priority |
| --- | --- | --- | --- |
| TKT-001 | US-020 | Manual | P0 |

**Steps**
```bash
grep -ril mongo src package.json              # expect no output
git check-ignore -v test/setup.ts             # expect no output (not ignored)
git ls-files test | head                       # expect tracked test files
test -f .env.example && echo ok
grep -rn "DATABASE_URL" src | grep -v "config/env\|db/client"   # expect nothing logging it
```
Start the app with `LOG_LEVEL=debug` and read the logs.

**Expected:** no Mongo references in `src/` or `package.json`; `test/` is tracked; `.env.example` exists and lists every variable the code reads;
the connection string and password never appear in logs; `README.md` documents the Postgres/Supabase setup only.

---

## 4. Test case catalogue — all other tickets

`Auto` = automated test required. `Manual` = transcript in the PR. One line per case; the expected result is
the acceptance criterion of the ticket in [`backlog.md`](backlog.md).

### Foundations

| ID | Ticket | Type | Scenario | Expected |
| --- | --- | --- | --- | --- |
| TC-017 | 002 | Auto | Start without `JWT_SECRET`, or with fewer than 32 characters | Exit code 1; message names the variable; value never printed |
| TC-018 | 002 | Auto | `NODE_ENV=production` with empty or `*` in `PROD_ORIGINS`; `.env.example` vs schema | Startup fails; a test asserts `.env.example` and the schema list the same keys |
| TC-019 | 003 | Auto | Stop the DB and start the app; fire a request during boot | Exit 1 with a clear log; no request ever sees a 404 from the unregistered routes |
| TC-020 | 003 | Auto/Manual | `GET /health` with DB up and down; send `SIGTERM` during a slow request | `200 ok` / `503 degraded`; the slow request completes; pool closed; exit 0 |
| TC-021 | 004 | Auto | Lower a test temporarily so coverage drops below the threshold | CI job fails |
| TC-022 | 005 | Auto | Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` on a clean clone | All pass; only `pnpm-lock.yaml` exists; formatting is clean (`prettier --check .`) |

### Hardening

| ID | Ticket | Type | Scenario | Expected |
| --- | --- | --- | --- | --- |
| TC-023 | 006 | Auto | Inspect `Set-Cookie` after login | `HttpOnly; SameSite=Lax`; `Secure` in production; `Max-Age` equals the JWT lifetime |
| TC-024 | 006 | Auto | Read register/login bodies | No token anywhere in the body |
| TC-025 | 006 | Auto | `POST /auth/logout` then `GET /users/me` | `204`; cookie cleared; `401` |
| TC-026 | 006 | Auto | Call `/users/me` with `Authorization: Bearer`, with cookie, with both (different users) | Bearer works; the cookie wins when both are present |
| TC-027 | 006 | Auto | No token / malformed / expired / regular user on admin route | `401` / `401` / `401` / `403` |
| TC-028 | 006 | Auto | Capture logs while sending an invalid token | The token value never appears in the logs |
| TC-029 | 007 | Auto | Register with `role:"admin"` and a correct and an incorrect `secret_key` | Resulting account is `user` (or `400`); never `admin` |
| TC-030 | 007 | Manual | Run the create-admin script, type a password at the prompt | Admin exists; password not in shell history or `ps` output |
| TC-031 | 008 | Auto | `limit=0`, `limit=101`, `limit=abc` | `400` with field error |
| TC-032 | 008 | Auto | `offset` and the deprecated `skip` alias | Same page; alias returns a `Deprecation` header or log |
| TC-033 | 008 | Auto | `minPrice`, `maxPrice`, `inStock` combinations, `minPrice > maxPrice` | Correct filtering; the last one returns `400` |
| TC-034 | 008 | Auto | `order=asc` / `desc` / invalid | Correct ordering; invalid → `400` |
| TC-035 | 008 | Auto | Several invalid params in one request | One `400` listing every invalid field |
| TC-036 | 008 | Manual | Seed 10,000 products, time `search=jack` | Under 100 ms locally; `EXPLAIN` attached |
| TC-037 | 009 | Auto | `PUT /products/:id` with `{ "price": 1 }` and no `id` | `200`; only price changed |
| TC-038 | 009 | Auto | `POST /products` | `201` plus `Location: /api/v1/products/{id}` |
| TC-039 | 009 | Auto | `PUT` with `{}` and with an unknown field | `400` in both cases |
| TC-040 | 009 | Auto | Replace variants with an invalid second variant | `400`; the original variants remain (transaction rolled back) |
| TC-041 | 010 | Auto | Every endpoint, success path | Matches the success envelope; contract test parses it with Zod |
| TC-042 | 010 | Auto | Validation, 401, 403, 404, 409, 429, 500 | Error envelope with the stable `code` for each |
| TC-043 | 010 | Auto | Send `X-Request-Id: abc`; send none | Echoed in header and `meta.requestId`; generated when absent |
| TC-044 | 010 | Auto | Force a 500 with `NODE_ENV=production` and `test` | No stack or SQL text in the body |
| TC-045 | 011 | Auto | Inspect response headers | `helmet` headers present; no `X-Powered-By` |
| TC-046 | 011 | Auto | 11 logins within a minute from one IP | 11th is `429 RATE_LIMITED` with `Retry-After`; resets after the window |
| TC-047 | 011 | Auto | Preflight from an allowed and a disallowed origin | Allowed gets CORS headers with credentials; disallowed gets none |
| TC-048 | 012 | Manual | `pnpm audit --prod`; search for removed deps | No high/critical; `chalk`, `colors`, `express-async-handler` gone |
| TC-049 | 013 | Auto | Register `" Ana@Example.com "` then log in with `ana@example.com` | Stored trimmed; login works case-insensitively |
| TC-050 | 013 | Auto | Register `ANA@example.com` when `ana@example.com` exists | `409 CONFLICT` |
| TC-051 | 013 | Auto | Update my profile email to another user's email | `409 CONFLICT`, never `500` |

### Commerce

| ID | Ticket | Type | Scenario | Expected |
| --- | --- | --- | --- | --- |
| TC-052 | 020 | Auto | Admin creates a category; duplicate name or slug | `201`; duplicate → `409` |
| TC-053 | 020 | Auto | Rename a category | Products show the new name |
| TC-054 | 020 | Auto | Delete a category that has products | `409`; nothing deleted |
| TC-055 | 020 | Auto | `GET /categories` headers | `Cache-Control: public, max-age=60` |
| TC-056 | 021 | Auto | `GET /cart` for a new user | `200`, empty, subtotal `0` |
| TC-057 | 021 | Auto | Change a price after adding the item | Line flagged `priceChanged: true` with the new price |
| TC-058 | 021 | Auto | Add 2 units, stock 5 | Cart has 2 units |
| TC-059 | 021 | Auto | Add 6 units, stock 5 | `409 INSUFFICIENT_STOCK`; cart unchanged |
| TC-060 | 021 | Auto | `PATCH` quantity up/down/to 0 | Updated; 0 is rejected or removes the line (documented) |
| TC-061 | 021 | Auto | Remove one item; clear cart | Items removed |
| TC-062 | 021 | Auto | 51st line item; quantity 100; two parallel adds beyond stock | `400`; `400`; stock never exceeded |
| TC-063 | 022 | Auto | Checkout an R$ 250,00 (`25000`) cart | Order `pending`; snapshots stored; stock decremented; shipping `1990` |
| TC-064 | 022 | Auto | Checkout an R$ 320,00 (`32000`) cart | Shipping `0` |
| TC-065 | 022 | Auto | Order totals arithmetic | `total = subtotal + shipping`, all integers |
| TC-066 | 022 | Auto | Two parallel checkouts for the last unit | Exactly one `201`; the other `409 INSUFFICIENT_STOCK` |
| TC-067 | 022 | Auto | Force a failure midway (inject an error in the order-items insert) | No order, stock and cart unchanged |
| TC-068 | 022 | Auto | Change product price/name after ordering | Order items keep the snapshot |
| TC-069 | 022 | Auto | Cart after successful checkout | Empty |
| TC-070 | 022 | Auto | Checkout with an empty cart | `400` or `409` (documented) |
| TC-071 | 022 | Auto | Read another user's order | `404` |
| TC-072 | 022 | Auto | Cancel `pending`/`paid`/`shipped` orders | First two restore stock; `shipped` → `409 INVALID_STATE_TRANSITION` |
| TC-073 | 023 | Auto | `GET /wallet` for a new user | Balance `0`, empty ledger |
| TC-074 | 023 | Auto | Ledger pagination | Newest first, `meta.total` correct |
| TC-075 | 023 | Auto | After many operations | `balance == sum(ledger.amount)` |
| TC-076 | 023 | Auto | Balance `20000`, pay a `15000` order | Balance `5000`; order `paid` |
| TC-077 | 023 | Auto | Balance `10000`, pay `15000` | `409 INSUFFICIENT_FUNDS`; nothing changed |
| TC-078 | 023 | Auto | Credit twice with the same `Idempotency-Key` | One ledger row; same response both times |
| TC-079 | 023 | Auto | 50 parallel debits against a small balance | Balance never negative; ledger consistent |
| TC-080 | 023 | Auto | Try `UPDATE`/`DELETE` on `wallet_transactions` as the API role | Blocked |
| TC-081 | 024 | Auto | Admin lists orders by `status`, `userId`, date range | Correct filtering and pagination; regular user gets `403` |
| TC-082 | 024 | Auto | `paid → shipped` | Saved; history row written |
| TC-083 | 024 | Auto | `delivered → pending` | `409 INVALID_STATE_TRANSITION` |
| TC-084 | 024 | Auto | Read `order_status_history` | Who, when, from, to are present |
| TC-085 | 025 | Auto | Upload URL for a 2 MB webp | Signed URL issued |
| TC-086 | 025 | Auto | 8 MB file, `application/pdf`, 9th image | `400` each; no URL issued |

### Connectors

| ID | Ticket | Type | Scenario | Expected |
| --- | --- | --- | --- | --- |
| TC-087 | 030 | Auto | `GET /products?currency=USD` with the fake connector | `displayPrice` with `amount`, `currency`, `rate`, `asOf`; BRL price unchanged |
| TC-088 | 030 | Auto | Upstream returns 503 twice then 200 | Two retries with backoff, then success |
| TC-089 | 030 | Auto | Upstream hangs | Request aborted at 3 s; response still `200` |
| TC-090 | 030 | Auto | Upstream down, cached rate exists | `displayPrice.stale = true` |
| TC-091 | 030 | Auto | Upstream down, no cache | `displayPrice` omitted; `200` |
| TC-092 | 030 | Auto | Upstream returns an unexpected shape | Logged; treated as upstream failure; `200` |
| TC-093 | 031 | Auto | `POST /shipping/quote` | Options with `carrier`, `service`, `price`, `etaDays` |
| TC-094 | 031 | Auto | Mock carrier determinism | Same input → same output |
| TC-095 | 031 | Auto | Carrier timeout with a flat rate configured | Flat-rate option returned |
| TC-096 | 031 | Auto | Carrier timeout with no flat rate | `503 UPSTREAM_UNAVAILABLE`, safe message |
| TC-097 | 032 | Auto | `payment.succeeded` with a valid signature | Order `paid`; event stored |
| TC-098 | 032 | Auto | Altered body or wrong secret | `401`; nothing stored |
| TC-099 | 032 | Auto | Timestamp older than 5 minutes | `401` |
| TC-100 | 032 | Auto | Replay of the same `event_id` | `200`; no side effects |
| TC-101 | 032 | Auto | `payment.failed` | Order stays `pending`; reason recorded |
| TC-102 | 032 | Auto | Unknown order id; malformed JSON | `202` logged; `400` |
| TC-103 | 033 | Auto | Export a 30-day range | `application/x-ndjson`, one JSON object per line |
| TC-104 | 033 | Manual | No range; 100 days; 100k rows | `400`; `400`; memory stays flat (attach a measurement) |

### Operations

| ID | Ticket | Type | Scenario | Expected |
| --- | --- | --- | --- | --- |
| TC-105 | 040 | Auto | Validate `/openapi.json` with an OpenAPI validator; compare schemas with Zod | Valid; generated from Zod |
| TC-106 | 041 | Auto | Request with `Authorization`, cookie and `password` body field | Logged as `[Redacted]`; JSON log line per request |
| TC-107 | 042 | Manual | `docker build`, run, inspect | Non-root; under 200 MB; `HEALTHCHECK` healthy |
| TC-108 | 043 | Auto | Run the "tables without RLS" query | Zero rows; CI fails otherwise |
| TC-109 | 044 | Manual | Run the ETL twice on a sample dump | Same counts the second time; `rejected.json` lists invalid rows; mapping file written |

---

## 5. Git proof (for the assessment)

These checks apply to the whole submission, not to a single ticket.

| # | Check | Evidence |
| --- | --- | --- |
| G-1 | Work happened on a feature branch, never on `main` | Branch name in the PR |
| G-2 | Commits are atomic and use Conventional Commits | `git log --oneline main..HEAD` pasted in the PR |
| G-3 | The branch was rebased onto the latest `main` (linear history, no merge commits) | `git log --graph --oneline` pasted |
| G-4 | A conflict with a newer `main` commit was resolved correctly | Short note in the PR describing what conflicted and how it was resolved |
| G-5 | Review comments were answered individually, fixes pushed as new commits | PR conversation |
| G-6 | No secrets or `.env` committed, `.gitignore` correct | `git ls-files \| grep -i env` shows only `.env.example` |
