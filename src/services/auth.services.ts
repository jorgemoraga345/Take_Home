import bcrypt from 'bcryptjs';
import { AppError, generateToken } from '../utils';
import { LoginUserInput, RegisterUserInput } from '../validators';
import { createUser, findUserByEmail } from '../repositories/user.repository';

/** Checks whether a database error is a PostgreSQL unique constraint violation. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

/** Registers a user, stores a bcrypt password hash, and returns an authentication token. */
export async function registerUser(payload: RegisterUserInput): Promise<string> {
  const { name, email, password, role } = payload;

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let user;
  try {
    user = await createUser({
      name,
      email,
      passwordHash,
      ...(role ? { role } : {}),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('User already exists', 400);
    }
    throw error;
  }

  if (!user) {
    throw new AppError('User registration failed', 500);
  }

  return generateToken(user.id, user.role);
}

/** Authenticates a user by email and password, then returns an authentication token. */
export async function loginUser(payload: LoginUserInput): Promise<string> {
  const { email, password } = payload;

  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Invalid email or password', 401);
  }

  return generateToken(user.id, user.role);
}