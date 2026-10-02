export const USER_ROELS = {
  USER: 'user',
  ADMIN: 'admin',
} as const

export const ALL_USER_ROLES = Object.values(USER_ROELS);

export const ADMIN_REGISTRATION_SECRET_KEY = process.env.ADMIN_REGISTRATION_SECRET_KEY ?? 'admin-registration-secret-key';