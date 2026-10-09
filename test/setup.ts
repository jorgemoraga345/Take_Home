import { afterAll, beforeAll } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { close, db } from '../src/db/client';

beforeAll(async () => {
  await migrate(db, { migrationsFolder: './drizzle' });
});

afterAll(async () => {
  await close();
});
