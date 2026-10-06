import type { Agent } from 'supertest';
import { api } from './app';
import { userFactory } from './factories';

/** Registers and authenticates a regular user through the public API. */
export async function loginAsUser(): Promise<{ agent: Agent; user: ReturnType<typeof userFactory> }> {
  const user = userFactory();
  const agent = api();
  const response = await agent.post('/api/v1/auth/register').send(user);

  if (response.status !== 201) {
    throw new Error(`Test user registration failed with status ${response.status}.`);
  }

  return { agent, user };
}

/** Registers and authenticates an administrator using the configured test secret. */
export async function loginAsAdmin(): Promise<{ agent: Agent; user: ReturnType<typeof userFactory> }> {
  const user = userFactory({ email: `admin-${Date.now()}-${Math.random()}@example.com` });
  const agent = api();
  const response = await agent.post('/api/v1/auth/register').send({
    ...user,
    role: 'admin',
    secret_key: process.env.ADMIN_REGISTRATION_SECRET_KEY ?? 'admin-registration-secret-key',
  });

  if (response.status !== 201) {
    throw new Error(`Test admin registration failed with status ${response.status}.`);
  }

  return { agent, user };
}
