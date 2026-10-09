import 'dotenv/config';

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set before initializing the database client.');
}

const poolMax = Number(process.env.DATABASE_POOL_MAX ?? 10);
if (!Number.isSafeInteger(poolMax) || poolMax < 1) {
  throw new Error('DATABASE_POOL_MAX must be a positive integer.');
}

const sslSetting = process.env.DATABASE_SSL?.trim().toLowerCase();
if (sslSetting && sslSetting !== 'true' && sslSetting !== 'false') {
  throw new Error('DATABASE_SSL must be either true or false.');
}

// Disable prepared statements to remain compatible with Supabase's transaction pooler.
const client = postgres(databaseUrl, {
  max: poolMax,
  ssl: sslSetting === 'true' ? 'require' : false,
  prepare: false,
});

// Drizzle instance bound to the shared postgres.js pool.
export const db = drizzle(client, { schema });

/**
 * Verifies the database is reachable. Call once at startup so a bad config fails fast.
 *
 * @throws If the connection cannot be established.
 */
export async function connectDatabase(): Promise<void> {
  await client`select 1`;
}

// Closes the connection pool. Call on shutdown and in test teardown.
export async function close(): Promise<void> {
  await client.end();
}
