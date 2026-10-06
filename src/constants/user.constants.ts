export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const

export const ALL_USER_ROLES = Object.values(USER_ROLES);

export const ADMIN_REGISTRATION_SECRET_KEY = process.env.ADMIN_REGISTRATION_SECRET_KEY ?? 'admin-registration-secret-key';
