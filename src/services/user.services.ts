import bcrypt from 'bcryptjs';
import { AppError } from '../utils';
import { ChangePasswordInput, UpdateProfileInput } from '../validators';
import {
  findUserById,
  updateUserPasswordHash,
  updateUserProfile,
  UserProfileUpdate,
  UserRecord,
} from '../repositories/user.repository';

/** User fields that are safe to return from the API. */
export type PublicUser = Omit<UserRecord, 'passwordHash'>;

/** Checks whether a database error is a PostgreSQL unique constraint violation. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

/** Removes the password hash before returning a user to an API caller. */
function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** Gets the current user's public profile by UUID. */
export async function getMe(id: string): Promise<PublicUser> {
  const user = await findUserById(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return toPublicUser(user);
}

/** Updates the current user's profile and returns the public user fields. */
export async function updateProfile(
  id: string,
  payload: UpdateProfileInput,
): Promise<PublicUser> {
  const changes: UserProfileUpdate = {};

  if (payload.name !== undefined) {
    changes.name = payload.name;
  }
  if (payload.email !== undefined) {
    changes.email = payload.email;
  }

  const hasChanges = Object.keys(changes).length > 0;

  let user: UserRecord | undefined;
  try {
    user = hasChanges
      ? await updateUserProfile(id, changes)
      : await findUserById(id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('User already exists', 400);
    }
    throw error;
  }

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return toPublicUser(user);
}

/** Verifies the current password and stores a hash of the new password. */
export async function changePassword(
  id: string,
  payload: ChangePasswordInput,
): Promise<{ message: string }> {
  const user = await findUserById(id);

  if (!user || !(await bcrypt.compare(payload.currentPassword, user.passwordHash))) {
    throw new AppError('Invalid current password', 401);
  }

  const passwordHash = await bcrypt.hash(payload.newPassword, 10);
  const updatedUser = await updateUserPasswordHash(id, passwordHash);

  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  return { message: 'Password changed successfully' };
}