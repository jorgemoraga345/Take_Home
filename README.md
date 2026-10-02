# Example Ecomerce API

> ## 👋 Welcome to [NIS](https://nitsg.sharepoint.com/sites/intranet)
>
> You are in the waiting room before coming on board. This project is part of a **Take-Home Coding Challenge**
> so the interviewer can evaluate your technical and problem-solving skills.

REST backend for a small online store, built with **TypeScript + Express 5**.
Today it covers authentication, user profiles and a product catalog. Cart, orders
and wallet are planned (see [`spec/backlog.md`](spec/backlog.md)).

> **Assessment fork.** This repository is used as an engineering take-home.
> The project specification lives in [`spec/`](spec/). Start with
> [`spec/spec.md`](spec/spec.md), then pick your ticket in
> [`spec/backlog.md`](spec/backlog.md).

## Current status

| Area | State |
| --- | --- |
| Auth (register / login, JWT in `httpOnly` cookie) | Working |
| Users (`/me`, profile, change password) | Working |
| Products (CRUD, search, pagination) | Working |
| Cart, Orders, Wallet | Empty placeholder files only |
| Database | **MongoDB (Mongoose)** — migration to PostgreSQL / Supabase is ticket `TKT-001` |
| Tests, lint, CI | Not set up yet |

Baseline commit audited: `4750227` ("feat: product module").

## Requirements

- Node.js 22 LTS or newer
- pnpm 9+ (`corepack enable` is enough). The repo ships both `pnpm-lock.yaml` and
  `package-lock.json`; **use pnpm only**.
- Docker (for a local database)

## Quick start (baseline, MongoDB)

```bash
# 1. Install dependencies
pnpm install

# 2. Start a throwaway local MongoDB
docker run -d --name mongo-dev -p 27017:27017 mongo:7

# 3. Create your .env (there is no .env.example yet; creating one is part of TKT-001)
cat > .env <<'EOF'
NODE_ENV=development
PORT=1337
MONGODB_URI=mongodb://localhost:27017/e-commerce-backend
JWT_SECRET=replace-with-a-long-random-string
ADMIN_REGISTRATION_SECRET_KEY=replace-with-another-random-string
DEV_ORIGINS=http://localhost:3000,http://localhost:5173
PROD_ORIGINS=
EOF

# 4. Run in watch mode
pnpm dev
```

The API listens on `http://localhost:1337` and is mounted under `/api/v1`.

```bash
curl http://localhost:1337/api/v1
# {"message":"Welcome to the API","version":"1.0.0","status":"success"}
```

> Never reuse real credentials, company databases or production secrets for this
> exercise. Use local containers or a throwaway cloud project.

### Production-style run

```bash
pnpm build           # compiles to ./build
node build/index.js  # there is no "start" script yet
```

## Environment variables (baseline)

| Variable | Required | Default in code | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | no | _unset_ | `production` hides stack traces and enables `secure` cookies |
| `PORT` | no | `1337` | |
| `MONGODB_URI` | no | `mongodb://localhost:27017/e-commerce-backend` | Replaced by `DATABASE_URL` in `TKT-001` |
| `JWT_SECRET` | **yes** | `jwt-secret` | The insecure default is a known defect (`TKT-002`) |
| `ADMIN_REGISTRATION_SECRET_KEY` | **yes** | `admin-registration-secret-key` | Same defect |
| `DEV_ORIGINS` | no | _unset_ | Comma-separated CORS origins when not in production |
| `PROD_ORIGINS` | no | _unset_ | Comma-separated CORS origins in production |

## Smoke test with curl

```bash
BASE=http://localhost:1337/api/v1

# Register a regular user (stores the session cookie in cookies.txt)
curl -i -c cookies.txt -X POST $BASE/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ana Perez","email":"ana@example.com","password":"secret123"}'

# Who am I?
curl -b cookies.txt $BASE/users/me

# Register an admin (needs ADMIN_REGISTRATION_SECRET_KEY from your .env)
curl -c admin.txt -X POST $BASE/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Admin","email":"admin@example.com","password":"secret123","role":"admin","secret_key":"<ADMIN_REGISTRATION_SECRET_KEY>"}'

# Create a product (admin only)
curl -b admin.txt -X POST $BASE/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Wool Beanie","description":"Warm and soft","price":12990,"images":["https://example.com/beanie.jpg"],"brand":"Battle Axe","category":"accessories","stock":25}'

# List products
curl "$BASE/products?limit=10&skip=0&search=wool"
```

## API overview (baseline)

All routes are prefixed with `/api/v1`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | public | Welcome / version |
| POST | `/auth/register` | public | Create account, sets `access_token` cookie |
| POST | `/auth/login` | public | Log in, sets `access_token` cookie |
| GET | `/users/me` | user | Current user |
| PUT | `/users/profile` | user | Update `name` / `email` |
| PUT | `/users/change-password` | user | Change password |
| GET | `/products` | public | List. Query: `limit`, `skip`, `search`, `sort`, `category`, `brand` |
| GET | `/products/:id` | public | Product detail |
| POST | `/products` | admin | Create product |
| PUT | `/products/:id` | admin | Update product |
| DELETE | `/products/:id` | admin | Delete product |

Current success shape: `{ "success": true, "message": "...", "data": ... }`.
The target contract is defined in [`spec/spec.md`](spec/spec.md#6-api-and-json-conventions).

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | `nodemon` + `ts-node` on `src/index.ts` |
| `pnpm build` | `tsc` into `./build` |
| `pnpm lint` / `pnpm format` | Declared, but ESLint is **not installed or configured** yet (`TKT-005`) |

The expected final script set (`start`, `typecheck`, `test`, `db:*`, ...) is listed in
[`spec/spec.md`](spec/spec.md#4-expected-project-structure).

## Project layout

```text
src/
  config/        logger, DB connection
  constants/     app + role constants
  controllers/   request parsing and responses
  middlewares/   auth, errors, security
  models/        Mongoose models (removed by TKT-001)
  routes/        route tables
  services/      business logic
  types/         TypeScript types
  utils/         JWT, AppError, Zod error formatting
  validators/    Zod schemas
```

The layout expected after the first ticket is in [`spec/spec.md`](spec/spec.md#4-expected-project-structure).

## Contributing workflow

1. Branch from `main`: `feat/TKT-001-postgres-migration`
2. Small, atomic commits using Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`)
3. Rebase on `main` before opening a PR; do not merge `main` into your branch
4. Open a PR using the template, link the ticket, attach the evidence listed in
   [`spec/profOfWork.md`](spec/profOfWork.md)
5. Reviews: reply to every comment, push fixes as new commits, then squash only if asked

Definition of Done: [`spec/product.md`](spec/product.md).

## License

The upstream repository declares no license. Treat this fork as private, internal
assessment material and do not redistribute it.
