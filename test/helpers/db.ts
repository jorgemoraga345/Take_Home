import { sql } from 'drizzle-orm';
import { db } from '../../src/db/client';

/** Removes test rows while preserving the migrated schema. */
export async function clearDatabase(): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE product_variants, products, users RESTART IDENTITY CASCADE`);
}
