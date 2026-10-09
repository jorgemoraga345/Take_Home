import bcrypt from 'bcryptjs';
import { AppError, generateToken } from '../utils';
import { LoginUserInput, RegisterUserInput } from '../validators';
import { createUser, findUserByEmail } from '../repositories/user.repository';
import { isUniqueViolation } from '../utils/db-error.util';

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
