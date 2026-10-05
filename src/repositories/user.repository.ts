import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';

/** Insert type inferred from the Drizzle users table. */
type UserInsert = typeof users.$inferInsert;

/** Persisted user row inferred from the Drizzle users table. */
export type UserRecord = typeof users.$inferSelect;

/** User fields required for creation; the role defaults if omitted. */
export type CreateUserRecord = Pick<UserInsert, 'name' | 'email' | 'passwordHash'> &
  Partial<Pick<UserInsert, 'role'>>;

/** Profile fields that can be updated. */
export type UserProfileUpdate = Partial<Pick<UserInsert, 'name' | 'email'>>;

/** Finds a user by email. The citext column compares without case sensitivity. */
export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

/** Finds a user by UUID. */
export async function findUserById(id: string): Promise<UserRecord | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

/** Creates a user and returns the inserted row. */
export async function createUser(input: CreateUserRecord): Promise<UserRecord | undefined> {
  const [user] = await db.insert(users).values(input).returning();
  return user;
}

/** Updates the specified profile fields and returns the updated row, if it exists. */
export async function updateUserProfile(
  id: string,
  changes: UserProfileUpdate,
): Promise<UserRecord | undefined> {
  const [user] = await db
    .update(users)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  return user;
}

/** Updates the password hash and returns the updated row, if it exists. */
export async function updateUserPasswordHash(
  id: string,
  passwordHash: string,
): Promise<UserRecord | undefined> {
  const [user] = await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  return user;
}