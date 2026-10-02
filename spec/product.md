# Product Quality — Definition of Done and QA Acceptance

| | |
| --- | --- |
| **Last updated** | 2026-10-01 |
| **Owner** | Product Owner and QA |
| **Related** | [`spec.md`](spec.md) · [`backlog.md`](backlog.md) · [`userStories.md`](userStories.md) · [`profOfWork.md`](profOfWork.md) |

This document is the contract between engineering, QA and the Product Owner:
what "ready", "done" and "accepted" mean.

## 1. Definitions

| Term | Meaning |
| --- | --- |
| **Ready** | The ticket can start. See [§2](#2-definition-of-ready) |
| **Done** | The engineer finished everything in [§3](#3-definition-of-done) |
| **Accepted** | QA verified [§5](#5-qa-acceptance-criteria) and the Product Owner agrees. Only accepted work is merged |

## 2. Definition of Ready

- [ ] The ticket has a goal, scope, out-of-scope and acceptance criteria in `backlog.md`
- [ ] Linked user stories (`US-xxx`) and test cases (`TC-xxx`) exist
- [ ] Dependencies are merged or explicitly mocked
- [ ] API changes, new env vars and schema changes are described
- [ ] Size is `L` or smaller; otherwise split

## 3. Definition of Done

A ticket is done only when **all** of the following are true.

### Code

- [ ] Implements every acceptance criterion in the ticket; nothing hidden behind TODOs without a ticket id
- [ ] Follows the layer rules and conventions in [`spec.md` §3 and §8](spec.md#3-architecture)
- [ ] No `any` without a justification comment; no `console.log`; no commented-out code
- [ ] TSDoc on exported functions and types; comments explain *why* (see `spec.md` §8)
- [ ] No new `process.env` access outside `src/config/env.ts` (after `TKT-002`)
- [ ] Money is integer BRL centavos; dates are ISO 8601 UTC; JSON keys are `camelCase`
- [ ] No secrets, credentials or personal data in code, tests, fixtures, logs or screenshots

### Tests

- [ ] Every acceptance criterion maps to at least one automated test, or a documented manual transcript
- [ ] Each new endpoint has tests for success, validation error, unauthenticated, forbidden (if relevant), not found
- [ ] Concurrency-sensitive code (stock, wallet) has a parallel-request test
- [ ] Bug fixes include a regression test that fails without the fix
- [ ] Tests are deterministic and independent; external HTTP is mocked

### Database

- [ ] Schema changes are SQL migrations committed in `drizzle/`, header-commented
- [ ] Migration applies on an empty DB and on top of the previous version
- [ ] Constraints (NOT NULL, CHECK, UNIQUE, FK with `ON DELETE`) enforce the invariants
- [ ] RLS is enabled on every new table in `public`
- [ ] Indexes exist for new filters and sorts, backed by an `EXPLAIN` when the table can be large

### Documentation

- [ ] `README.md` and `.env.example` updated if setup, scripts or variables changed
- [ ] API changes reflected in the OpenAPI document (once `TKT-040` exists) and in `CHANGELOG.md` when breaking
- [ ] The PR description follows the template and contains the evidence in [`profOfWork.md` §2](profOfWork.md#2-evidence-required-in-every-pr)

### Process

- [ ] CI is green: typecheck, lint, tests, build
- [ ] Branch rebased on the latest `main`; history is clean (Conventional Commits, atomic)
- [ ] All review comments answered; no unresolved threads
- [ ] One ticket per PR; follow-ups are opened as new tickets

## 4. Quality gates

Enforced by CI from `TKT-004` on. A PR that breaks a gate cannot merge.

| Gate | Threshold |
| --- | --- |
| `tsc --noEmit` | 0 errors |
| ESLint | 0 errors; warnings reviewed |
| Prettier | `prettier --check .` passes |
| Unit + integration tests | 100% passing, no skipped tests without a ticket id |
| Coverage — overall | ≥ 80% lines, ≥ 70% branches |
| Coverage — `services/`, `utils/` | ≥ 90% lines |
| Dependency audit | No high or critical findings in production dependencies |
| Test duration | < 60 s in CI |
| Build | `pnpm build` succeeds and `node build/server.js` boots against a test DB |
| Secrets scan | No secrets detected in the diff |

Performance budget (measured locally on a 10,000-product database, single instance, warm cache):

| Endpoint | p95 latency |
| --- | --- |
| `GET /products` (filters + pagination) | < 150 ms |
| `GET /products/:id` | < 50 ms |
| `POST /auth/login` | < 400 ms (bcrypt dominates) |
| `POST /orders` (10-line cart) | < 300 ms |
| `GET /health` | < 30 ms |

## 5. QA acceptance criteria

QA accepts a ticket when every applicable block below passes.

### 5.1 Functional

- Each Gherkin scenario in the linked user story behaves as written, including the negative paths
- The ticket's test cases in [`profOfWork.md`](profOfWork.md) pass when run from a clean clone
- Setup from the README works without undocumented steps
- Behaviour changes listed in the PR are real and no others exist (spot-check unrelated endpoints)

### 5.2 API and JSON contract

- Responses match [`spec.md` §6](spec.md#6-api-and-json-conventions): keys, types, status codes, error codes
- Ids are UUID strings; dates are ISO 8601 UTC; money is an integer; no `null`/empty-string confusion
- No sensitive field in any response (`password`, `passwordHash`, tokens in bodies, stack traces)
- Pagination: `limit` ≤ 100, `meta.total` correct, stable ordering (ties broken by `id`)
- Unknown fields in a request body are rejected on write endpoints (after `TKT-009`)
- Every error has a stable `error.code` and a human-readable `message` (after `TKT-010`)
- Idempotent endpoints really are idempotent (wallet credit, webhooks)

### 5.3 Security

- Authentication: missing/invalid/expired token → `401`; wrong role → `403`
- No privilege escalation path: a customer cannot create admins, read other users' orders, carts or wallets
- Input handling: SQL/regex injection strings in `search`, `sort`, ids and bodies never cause `500` or data leakage
- Brute force: login and register are rate limited
- Secrets: the app refuses to start without strong secrets; nothing sensitive appears in logs (check them)
- CORS: only allow-listed origins receive CORS headers
- Dependencies: audit clean of high/critical findings
- Supabase: RLS enabled on all tables, no `service_role` key anywhere in the repo or runtime

### 5.4 Data integrity

- Constraints reject invalid data at the DB level (negative price/stock, duplicate email, duplicate variant)
- Multi-row operations are atomic: force a failure midway and verify nothing is partially written
- Concurrency: parallel checkouts and wallet debits never oversell or overdraw
- Order items keep price and name snapshots
- Wallet balance always equals the sum of its ledger

### 5.5 Reliability and operability

- Boots in < 5 s against a healthy DB; exits non-zero with a clear message when the DB or config is bad
- `GET /health` reflects DB state; `SIGTERM` finishes in-flight requests
- Upstream failures (connectors) degrade gracefully per the ticket and never hang a request beyond its timeout
- Logs are structured, include a request id and contain no secrets

### 5.6 Maintainability (reviewed by QA and a second developer)

- Layer boundaries respected; no business logic in controllers, no SQL in services
- Functions are short and named by intent; duplicated logic is extracted
- Comments follow the guide in `spec.md` §8; no stale or misleading comments
- Naming and file layout match [`spec.md` §4](spec.md#4-expected-project-structure)

## 6. QA sign-off matrix per ticket

QA fills in the last column after verifying. `Focus` lists what deserves extra attention.

| Ticket | Focus | Must verify | Result |
| --- | --- | --- | --- |
| TKT-001 | Contract parity, migrations, search safety | TC-001 … TC-016; contract unchanged except UUID ids; no Mongo remnants; RLS on; no secrets in logs; `.gitignore` | ☐ |
| TKT-002 | Fail-fast config | TC-017, TC-018; no `process.env` outside config | ☐ |
| TKT-003 | Lifecycle | TC-019, TC-020; graceful shutdown under load | ☐ |
| TKT-004 | Gates | TC-021; thresholds enforced in CI | ☐ |
| TKT-005 | Tooling | TC-022; single lockfile; one formatting commit | ☐ |
| TKT-006 | Sessions | TC-023 … TC-028; logs inspected manually | ☐ |
| TKT-007 | Admin creation | TC-029, TC-030; try to escalate by hand | ☐ |
| TKT-008 | Listing contract | TC-031 … TC-036; `EXPLAIN` reviewed | ☐ |
| TKT-009 | Product writes | TC-037 … TC-040; rollback behaviour | ☐ |
| TKT-010 | Envelope | TC-041 … TC-044; contract test; breaking-change note | ☐ |
| TKT-011 | Abuse protection | TC-045 … TC-047 | ☐ |
| TKT-012 | Dependencies | TC-048; audit report | ☐ |
| TKT-013 | Emails | TC-049 … TC-051 | ☐ |
| TKT-020 | Categories | TC-052 … TC-055; data migration of existing strings | ☐ |
| TKT-021 | Cart | TC-056 … TC-062; parallel adds | ☐ |
| TKT-022 | Checkout | TC-063 … TC-072; last-unit race; atomicity | ☐ |
| TKT-023 | Wallet | TC-073 … TC-080; ledger invariants; idempotency | ☐ |
| TKT-024 | Admin orders | TC-081 … TC-084; transition table | ☐ |
| TKT-025 | Images | TC-085, TC-086; bucket policy | ☐ |
| TKT-030 | Exchange rate | TC-087 … TC-092; offline behaviour; CI never calls the vendor | ☐ |
| TKT-031 | Shipping | TC-093 … TC-096 | ☐ |
| TKT-032 | Payment webhooks | TC-097 … TC-102; signature on the **raw** body; replay | ☐ |
| TKT-033 | Export | TC-103, TC-104; memory profile | ☐ |
| TKT-040 | OpenAPI | TC-105 | ☐ |
| TKT-041 | Logging | TC-106; manual log review | ☐ |
| TKT-042 | Container | TC-107 | ☐ |
| TKT-043 | Supabase review | TC-108; checklist completeness | ☐ |
| TKT-044 | ETL | TC-109 | ☐ |

## 7. Defect severity

| Severity | Definition | Example | Rule |
| --- | --- | --- | --- |
| **S1 — Critical** | Security breach, data loss or corruption, service down, money wrong | Customer can become admin; stock goes negative; secrets in logs | Blocks merge. Fix immediately |
| **S2 — Major** | Core flow broken without workaround, or contract broken | Checkout fails for valid carts; response shape differs from spec | Blocks merge |
| **S3 — Minor** | Feature works but wrong in an edge case | Wrong error message; missing `Location` header | Fix before release or open a ticket with the PO's agreement |
| **S4 — Trivial** | Cosmetic or documentation | Typo in a comment or README | Fix when convenient |

## 8. Release criteria

A release candidate ships only if:

- [ ] All tickets in the release are **Accepted** (matrix in §6)
- [ ] Zero open S1/S2 defects; S3 defects have an owner and a date
- [ ] CI green on `main`; migrations tested against a copy of staging
- [ ] `CHANGELOG.md` lists breaking changes; the storefront team was informed
- [ ] Rollback plan written (how to revert the app and the migration)
- [ ] Secrets rotated if any were ever exposed in logs or history
- [ ] Smoke test passed on staging: register → login → browse → cart → checkout → order visible

## 9. QA sign-off template

```markdown
## QA sign-off — TKT-000
- Build / commit: <sha>
- Environment: local | CI | staging
- Test cases run: TC-000 … TC-000  → pass / fail (links)
- Exploratory notes:
- Defects found: #123 (S2), #124 (S4)
- Contract check: ✅ / ❌
- Security checks: ✅ / ❌
- Decision: ✅ Accepted · ❌ Rejected · ⚠️ Accepted with follow-ups (#125)
- Signed: <name>, <date>
```
