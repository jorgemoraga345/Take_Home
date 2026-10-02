# User Stories — Example Ecomerce API

| | |
| --- | --- |
| **Last updated** | 2026-10-01 |
| **Related** | [`spec.md`](spec.md) · [`backlog.md`](backlog.md) · [`profOfWork.md`](profOfWork.md) · [`product.md`](product.md) |

## 1. Standard format

Every story uses this template. Copy it for new stories.

```markdown
### US-000 — Short title
**As a** <persona>
**I want** <capability>
**So that** <business value>

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | M | TKT-000 | TC-000 |

**Acceptance criteria** (Given / When / Then, one scenario per rule)

**Notes / constraints** (optional)
```

Quality checklist for a story (INVEST): **I**ndependent · **N**egotiable · **V**aluable ·
**E**stimable · **S**mall (fits in one PR) · **T**estable (every criterion can fail).

**Definition of Ready:** persona and value are clear, acceptance criteria are written,
dependencies are listed, test cases exist in `profOfWork.md`, API changes are described.

## 2. Personas

| Persona | Description |
| --- | --- |
| **Shopper** | Registered customer using the storefront |
| **Visitor** | Anonymous person browsing the catalog |
| **Store Admin** | Staff member who manages catalog, orders and wallets |
| **Developer** | Engineer working on this repository |
| **Operator** | Person running and monitoring the deployed API |
| **Integration** | External system (payment provider, carrier, exchange-rate API) |

## 3. Story map

| Epic | Stories |
| --- | --- |
| Accounts | US-001, US-002, US-003 |
| Catalog | US-004, US-005, US-006, US-014, US-015 |
| Cart and orders | US-007, US-008, US-009, US-010, US-013, US-016 |
| Wallet and payments | US-011, US-012, US-017 |
| Reporting | US-018 |
| Platform | US-020 … US-029 |

---

## 4. Accounts

### US-001 — Register and log in
**As a** Shopper
**I want** to create an account and log in with my email and password
**So that** I can buy and see my order history

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | S | TKT-006, TKT-013 | TC-003, TC-004, TC-023, TC-049 … TC-051 |

```gherkin
Scenario: Successful registration
  Given no account exists for "ana@example.com"
  When I POST /auth/register with a valid name, email and a password of 8+ characters
  Then I receive 201 and a session cookie
  And the response never contains my password or the token

Scenario: Duplicate email (case-insensitive)
  Given an account exists for "ana@example.com"
  When I register with "ANA@example.com"
  Then I receive 409 CONFLICT

Scenario: Wrong credentials
  When I log in with a wrong password
  Then I receive 401 with the same message as for an unknown email

Scenario: Invalid input
  When I register with an invalid email or a short password
  Then I receive 400 with a message per invalid field
```

### US-002 — Keep my session safe
**As a** Shopper
**I want** my session to be protected and to end when I log out
**So that** nobody can reuse my login

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P0 | M | TKT-006 | TC-023 … TC-028 |

```gherkin
Scenario: Cookie flags
  When I log in
  Then the cookie is httpOnly and sameSite=lax, and secure in production
  And its lifetime equals the token lifetime

Scenario: Logout
  Given I am logged in
  When I POST /auth/logout
  Then I receive 204 and the cookie is cleared
  And GET /users/me with the old cookie returns 401

Scenario: Role check
  Given I am logged in as a regular user
  When I call an admin endpoint
  Then I receive 403, not 401

Scenario: Tokens stay out of logs
  When an invalid or expired token is presented
  Then the server logs the failure reason without the token value
```

### US-003 — Admins are created only by operators
**As a** Store Admin owner
**I want** admin accounts to be created only through a trusted script
**So that** no customer can promote themselves

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P0 | S | TKT-007 | TC-029, TC-030 |

```gherkin
Scenario: Public registration cannot create an admin
  When I POST /auth/register with role "admin" and any secret_key
  Then the created account has role "user" (or the request is rejected with 400)

Scenario: Operator creates an admin
  Given DATABASE_URL points to the target database
  When the operator runs the create-admin script and enters a password at the prompt
  Then an account with role "admin" exists
  And the password is not visible in shell history or process arguments
```

---

## 5. Catalog

### US-004 — Browse and search products
**As a** Visitor
**I want** to list, filter, sort and paginate products
**So that** I can find what I want quickly

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | M | TKT-001, TKT-008 | TC-007 … TC-010, TC-031 … TC-036 |

```gherkin
Scenario: Default listing
  When I GET /products
  Then I receive up to 10 products, newest first, with the total count

Scenario: Search is literal and case-insensitive
  When I search for "50%"
  Then only products whose name contains the text "50%" are returned

Scenario: Filters combine
  When I filter by category "accessories", brand "Battle Axe" and maxPrice 20000
  Then every returned product matches all three filters

Scenario: Limits are enforced
  When I request limit=1000
  Then I receive 400 (or the value is capped at 100 as documented)

Scenario: Unknown sort field
  When I request sort=password
  Then I receive 400
```

### US-005 — Manage the catalog
**As a** Store Admin
**I want** to create, update and delete products and variants
**So that** the storefront shows the real inventory

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | S | TKT-001, TKT-009 | TC-011 … TC-014, TC-037 … TC-040 |

```gherkin
Scenario: Create
  Given I am an admin
  When I POST a valid product with 2 variants
  Then I receive 201, a Location header and the product with generated id and timestamps

Scenario: Update without id in the body
  When I PUT /products/{id} with only {"price": 9990}
  Then the price changes and the other fields are unchanged

Scenario: Replace variants
  When I PUT new variants
  Then the old variants are gone and the new ones are stored atomically

Scenario: Not found vs malformed
  When I GET /products/not-a-uuid
  Then I receive 400
  When I GET a well-formed id that does not exist
  Then I receive 404

Scenario: Customers cannot write
  Given I am a regular user
  When I POST /products
  Then I receive 403
```

### US-006 — Organise products in categories
**As a** Store Admin
**I want** managed categories
**So that** the catalog is consistent and navigable

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P2 | M | TKT-020 | TC-052 … TC-055 |

```gherkin
Scenario: Delete a category that is in use
  Given a category has products
  When I delete it
  Then I receive 409 and nothing is deleted

Scenario: Public list
  When anyone GETs /categories
  Then the response is cacheable for 60 seconds
```

### US-014 — Upload product images
**As a** Store Admin
**I want** to upload product pictures
**So that** I do not depend on external image hosting

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P3 | M | TKT-025 | TC-085, TC-086 |

```gherkin
Scenario: Allowed file
  When I request an upload URL for a 2 MB webp
  Then I receive a signed URL that expires within minutes

Scenario: Rejected file
  When I request an upload URL for an 8 MB file or an application/pdf
  Then I receive 400 and no URL is issued
```

### US-015 — See prices in another currency
**As a** Shopper
**I want** to see an approximate price in USD
**So that** I can compare with international stores

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P2 | M | TKT-030 | TC-087 … TC-092 |

```gherkin
Scenario: Display price
  When I GET /products?currency=USD
  Then each product has displayPrice with amount, currency, rate and asOf
  And the BRL price is unchanged

Scenario: Upstream is down with a cached rate
  Then displayPrice is returned with stale=true

Scenario: Upstream is down without a cached rate
  Then displayPrice is omitted and the response is still 200
```

---

## 6. Cart and orders

### US-007 — View my cart
**As a** Shopper
**I want** to see my cart with totals
**So that** I know what I am about to pay

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | S | TKT-021 | TC-056, TC-057 |

```gherkin
Scenario: Empty cart
  Given I never added anything
  When I GET /cart
  Then I receive 200 with no items and subtotal 0

Scenario: Price changed since added
  Given a product price changed after I added it
  When I GET /cart
  Then the line is flagged priceChanged=true and uses the current price
```

### US-008 — Change my cart
**As a** Shopper
**I want** to add, change and remove items
**So that** I can shape my purchase

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | M | TKT-021 | TC-058 … TC-062 |

```gherkin
Scenario: Add within stock
  When I add 2 units of a product with 5 in stock
  Then the cart contains 2 units

Scenario: Add beyond stock
  When I add 6 units of a product with 5 in stock
  Then I receive 409 INSUFFICIENT_STOCK and the cart is unchanged

Scenario: Limits
  When I add a 51st different line item or a quantity of 100
  Then I receive 400
```

### US-009 — Check out
**As a** Shopper
**I want** to turn my cart into an order
**So that** the store can ship it

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | L | TKT-022 | TC-063 … TC-070 |

```gherkin
Scenario: Successful checkout
  Given a cart totalling R$ 250,00 (25000 centavos)
  When I POST /orders
  Then an order with status "pending" is created with name and price snapshots
  And stock is decremented and my cart is empty
  And shipping is R$ 19,90 (1990 centavos)

Scenario: Free shipping
  Given a cart totalling R$ 320,00 (32000 centavos)
  Then shipping is 0

Scenario: Last unit race
  Given 1 unit left and two shoppers check out at the same instant
  Then exactly one order is created and the other receives 409 INSUFFICIENT_STOCK

Scenario: Atomicity
  Given the checkout fails halfway (for example a DB error injected in a test)
  Then no order exists and stock is unchanged
```

### US-010 — See and cancel my orders
**As a** Shopper
**I want** my order history and the ability to cancel before shipping
**So that** I stay in control

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | M | TKT-022 | TC-071, TC-072 |

```gherkin
Scenario: Privacy
  When I GET an order that belongs to another user
  Then I receive 404

Scenario: Cancel
  Given my order is "paid"
  When I POST /orders/{id}/cancel
  Then its status is "cancelled" and the stock is restored

Scenario: Too late
  Given my order is "shipped"
  When I cancel it
  Then I receive 409 INVALID_STATE_TRANSITION
```

### US-013 — Manage orders
**As a** Store Admin
**I want** to filter orders and move them through their lifecycle
**So that** fulfilment is traceable

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P2 | M | TKT-024 | TC-081 … TC-084 |

```gherkin
Scenario: Valid transition
  Given an order is "paid"
  When I set it to "shipped"
  Then it is saved and a status-history row records who and when

Scenario: Invalid transition
  Given an order is "delivered"
  When I set it to "pending"
  Then I receive 409 INVALID_STATE_TRANSITION
```

### US-016 — Know the shipping cost
**As a** Shopper
**I want** to get shipping quotes for my state and postal code
**So that** I can choose a carrier

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P2 | M | TKT-031 | TC-093 … TC-096 |

```gherkin
Scenario: Quote available
  When I POST /shipping/quote with state (UF), postal code (CEP) and weight
  Then I receive a list of options with price and etaDays

Scenario: Carrier down
  Given the carrier does not answer within the timeout
  Then I receive the configured flat rate, or 503 UPSTREAM_UNAVAILABLE when none is configured
```

---

## 7. Wallet and payments

### US-011 — See my wallet
**As a** Shopper
**I want** to see my store-credit balance and movements
**So that** I trust the numbers

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P2 | M | TKT-023 | TC-073 … TC-075 |

```gherkin
Scenario: Balance equals ledger
  When I GET /wallet
  Then balance equals the sum of my ledger rows
```

### US-012 — Pay with store credit
**As a** Shopper
**I want** to pay an order with my wallet balance
**So that** I can use my credit

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P2 | L | TKT-023 | TC-076 … TC-080 |

```gherkin
Scenario: Enough funds
  Given balance 20000 and an order of 15000 centavos
  When I pay with the wallet
  Then balance is 5000 and the order is "paid"

Scenario: Not enough funds
  Given balance 10000 and an order of 15000 centavos
  Then I receive 409 INSUFFICIENT_FUNDS and nothing changes

Scenario: Idempotent credit
  When an admin repeats a credit request with the same Idempotency-Key
  Then the first result is returned and only one ledger row exists

Scenario: Concurrency
  When 50 debit requests run in parallel
  Then the balance never goes below zero
```

### US-017 — Receive payment notifications
**As an** Integration (payment provider)
**I want** to notify the API about payment results
**So that** orders are marked paid automatically

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P2 | M | TKT-032 | TC-097 … TC-102 |

```gherkin
Scenario: Valid signature
  When a payment.succeeded event arrives with a valid HMAC and a fresh timestamp
  Then the order becomes "paid" and the event is stored

Scenario: Replay
  When the same event_id arrives again
  Then I receive 200 and nothing else changes

Scenario: Bad signature or stale timestamp
  Then I receive 401 and nothing is stored
```

---

## 8. Reporting

### US-018 — Export orders
**As a** Store Admin
**I want** to download orders as JSON lines
**So that** accounting can import them

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P3 | S | TKT-033 | TC-103, TC-104 |

```gherkin
Scenario: Export
  When I GET /admin/orders/export for a 30-day range
  Then I receive application/x-ndjson with one order per line

Scenario: Range required
  When I omit the range or request more than 92 days
  Then I receive 400
```

---

## 9. Platform stories

### US-020 — Run on PostgreSQL / Supabase
**As a** Developer
**I want** the API to use PostgreSQL hosted on Supabase
**So that** relational features (orders, wallet) can be built safely

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P0 | L | TKT-001, TKT-044 | TC-001 … TC-016, TC-109 |

```gherkin
Scenario: Setup from the README
  Given a clean clone and Docker
  When I follow the README
  Then the API runs against a local Supabase database with seeded data

Scenario: Same contract
  When the storefront calls the existing endpoints
  Then it works unchanged, except that ids are UUIDs
```

### US-021 — Fail fast on bad configuration
**As an** Operator
**I want** the app to refuse to start with missing or weak secrets
**So that** I never run an insecure instance by accident

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P0 | S | TKT-002 | TC-017, TC-018 |

```gherkin
Scenario: Missing secret
  Given JWT_SECRET is unset
  When I start the app
  Then it exits with code 1 and names the variable without printing a value
```

### US-022 — Predictable lifecycle and health
**As an** Operator
**I want** a health endpoint and graceful shutdown
**So that** deployments do not drop requests

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | S | TKT-003 | TC-019, TC-020 |

```gherkin
Scenario: Health
  When the DB is reachable, GET /health returns 200 {"status":"ok"}
  When the DB is down, it returns 503 {"status":"degraded"}

Scenario: Shutdown
  When the process receives SIGTERM
  Then in-flight requests finish and the DB pool is closed
```

### US-023 — Trustworthy quality gates
**As a** Developer
**I want** linting, formatting, tests and CI
**So that** regressions are caught before merge

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | M | TKT-004, TKT-005, TKT-012 | TC-021, TC-022, TC-048 |

```gherkin
Scenario: PR checks
  When I open a PR
  Then CI runs typecheck, lint, tests with a Postgres service and build
  And the PR cannot merge if coverage drops below the thresholds
```

### US-024 — Consistent JSON from every endpoint
**As a** Developer of the storefront
**I want** one response and error format
**So that** the client code stays simple

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | M | TKT-010 | TC-041 … TC-044 |

```gherkin
Scenario: Error format
  When any endpoint fails validation
  Then the body is {"success":false,"error":{"code","message","details"},"meta":{"requestId"}}
  And X-Request-Id is present in the response headers

Scenario: No leaks
  When an unexpected error occurs outside development
  Then no stack trace or SQL text is returned
```

### US-025 — Protect the API from abuse
**As an** Operator
**I want** rate limits, secure headers and a strict CORS policy
**So that** brute force and cross-site misuse are reduced

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P1 | S | TKT-011 | TC-045 … TC-047 |

```gherkin
Scenario: Brute force
  When one IP sends 11 login attempts in a minute
  Then the 11th receives 429 with Retry-After

Scenario: CORS
  When a request comes from an origin that is not allowlisted
  Then no Access-Control-Allow-Origin header is returned
```

### US-026 — Discoverable API documentation
**As a** Developer of the storefront
**I want** an OpenAPI document and Swagger UI
**So that** I can integrate without reading the code

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P2 | M | TKT-040 | TC-105 |

```gherkin
Scenario: Docs match validation
  Then every documented request schema is generated from the Zod schema used at runtime
```

### US-027 — Observable requests
**As an** Operator
**I want** structured logs with request ids and redaction
**So that** I can trace issues without leaking secrets

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P2 | S | TKT-041 | TC-106 |

```gherkin
Scenario: Redaction
  When a request contains an Authorization header or a password field
  Then the log line shows "[Redacted]" for them
```

### US-028 — Deployable artifact
**As an** Operator
**I want** a small container image and a pipeline
**So that** deployments are repeatable

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P3 | M | TKT-042 | TC-107 |

```gherkin
Scenario: Image
  Then the image runs as a non-root user, is under 200 MB and passes its HEALTHCHECK
```

### US-029 — Secure Supabase setup
**As an** Operator
**I want** a reviewed Supabase configuration
**So that** the database is not accidentally exposed

| Priority | Estimate | Tickets | Test cases |
| --- | --- | --- | --- |
| P2 | S | TKT-043 | TC-108 |

```gherkin
Scenario: RLS everywhere
  Then a committed query shows zero tables in public without RLS, and CI fails otherwise
```
