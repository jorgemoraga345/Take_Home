import 'dotenv/config';

import bcrypt from 'bcryptjs';
import { and, eq, inArray } from 'drizzle-orm';
import { close, db } from '../src/db/client';
import { products, users } from '../src/db/schema';

const seededProductNames = Array.from(
  { length: 20 },
  (_, index) => `Seed Product ${String(index + 1).padStart(2, '0')}`,
);

/** Creates a development administrator and replaces this script's 20 sample products. */
async function seed(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set before seeding.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.transaction(async (transaction) => {
    const [existingAdmin] = await transaction.select().from(users).where(eq(users.email, email)).limit(1);

    if (!existingAdmin) {
      await transaction.insert(users).values({
        name: 'Seed Administrator',
        email,
        passwordHash,
        role: 'admin',
      });
    } else if (existingAdmin.role !== 'admin') {
      throw new Error('SEED_ADMIN_EMAIL belongs to a non-admin account.');
    }

    await transaction
      .delete(products)
      .where(and(eq(products.brand, 'Seed Script'), inArray(products.name, seededProductNames)));

    await transaction.insert(products).values(
      seededProductNames.map((name, index) => ({
        name,
        description: `Sample catalog product ${index + 1}`,
        price: 12990 + index * 500,
        images: [`https://example.com/seed-product-${index + 1}.jpg`],
        brand: 'Seed Script',
        category: index % 2 === 0 ? 'accessories' : 'outdoor',
        stock: 10 + index,
      })),
    );
  });

  console.info('Seed complete: one administrator and 20 sample products are ready.');
}

seed()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error.';
    console.error(`Database seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await close();
  });
