# E-commerce API

REST API for a small online store, built with TypeScript, Express 5, PostgreSQL, Supabase, and Drizzle ORM.
The API currently supports authentication, user profiles, and product catalog operations. Cart, orders, and wallet remain planned modules.

Project requirements and ticket acceptance criteria are documented in [`spec/`](spec/).

## Requirements

- Node.js 22 or newer
- pnpm 9 or newer
- Docker Desktop (for local Supabase)
- Supabase CLI (included as a development dependency)

Use pnpm as the package manager. Do not commit `.env` or real credentials.

## Local setup with Supabase

```powershell
pnpm install
Copy-Item .env.example .env
pnpm exec supabase start
pnpm db:migrate
pnpm dev
```

The local API listens on `http://localhost:1337` and its routes use the `/api/v1` prefix. Supabase prints its local PostgreSQL URL when it starts; the example `.env` uses `postgresql://postgres:postgres@127.0.0.1:54322/postgres` with `DATABASE_SSL=false`.

### Integration test database

Integration tests require a dedicated PostgreSQL database configured through `TEST_DATABASE_URL`. The example uses `postgres_test`; create it once in the local Supabase PostgreSQL container before running the tests. In PowerShell:

```powershell
$dbContainer = docker ps --filter "name=supabase_db" --format "{{.Names}}" | Select-Object -First 1
docker exec $dbContainer psql -U postgres -d postgres -c "CREATE DATABASE postgres_test;"
pnpm test
```

The tests apply the migrations and clear application tables in `TEST_DATABASE_URL`. Never point it at a production database or a database containing data you need.

## Hosted Supabase setup

1. Create a Supabase project and open **Connect** to get its PostgreSQL connection details.
2. For `pnpm db:migrate`, set `DATABASE_URL` to the project's direct connection string (or a session pooler that supports session advisory locks) and set `DATABASE_SSL=true`.
3. Run migrations from a trusted environment.
4. For the deployed API, use a pooled connection string compatible with the selected Supabase pooler. The postgres.js client sets `prepare: false` for transaction-pooler compatibility.

Keep database URLs and passwords in environment variables or a secret manager. Never log or commit them. Local Supabase does not require SSL; hosted Supabase does.

## Environment variables

Copy `.env.example` to `.env` and replace the placeholders. Main settings:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection used by the API and Drizzle Kit |
| `DATABASE_SSL` | Set to `false` locally and `true` for hosted Supabase |
| `DATABASE_POOL_MAX` | Maximum postgres.js connections |
| `TEST_DATABASE_URL` | Dedicated database used by integration tests |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `ADMIN_REGISTRATION_SECRET_KEY` | Secret required for public admin registration |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Credentials for the local seed administrator |
| `DEV_ORIGINS`, `PROD_ORIGINS` | Allowed CORS origins |

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the API in watch mode |
| `pnpm build` | Compile TypeScript to `build/` |
| `pnpm typecheck` | Check types without emitting files |
| `pnpm test` | Run integration tests with Vitest and Supertest |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm db:generate` | Generate a Drizzle SQL migration from schema changes |
| `pnpm db:migrate` | Apply committed migrations |
| `pnpm db:seed` | Create one administrator and 20 sample products |

The seed script requires `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. It replaces only the sample products it owns, identified by their names and the `Seed Script` brand.

## API overview

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Public | Register a user |
| `POST` | `/api/v1/auth/login` | Public | Log in |
| `GET` | `/api/v1/users/me` | User | Get the current profile |
| `PUT` | `/api/v1/users/profile` | User | Update the profile |
| `PUT` | `/api/v1/users/change-password` | User | Change the password |
| `GET` | `/api/v1/products` | Public | List and filter products |
| `GET` | `/api/v1/products/:id` | Public | Get a product |
| `POST` | `/api/v1/products` | Admin | Create a product |
| `PUT` | `/api/v1/products/:id` | Admin | Update a product |
| `DELETE` | `/api/v1/products/:id` | Admin | Delete a product |

Successful responses retain the existing `{ success, message, data }` shape. Product listing returns `{ products, total }` inside `data`.

## Project layout

```text
src/
  app.ts          Express app factory for the server and tests
  server.ts       Database connection, HTTP listener, and shutdown
  db/             postgres.js client and Drizzle schema
  repositories/   PostgreSQL data access
  services/       Authentication, users, and products
  routes/         HTTP route tables
test/             Vitest integration tests against PostgreSQL
drizzle/          Committed SQL migrations
supabase/         Local Supabase configuration
```

## Git workflow

Use a ticket branch, keep commits small, and follow Conventional Commits. See [`spec/spec.md`](spec/spec.md) and [`spec/profOfWork.md`](spec/profOfWork.md) for the project workflow and evidence requirements.
