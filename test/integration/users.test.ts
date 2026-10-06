import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { api } from '../helpers/app';
import { clearDatabase } from '../helpers/db';
import { userFactory } from '../helpers/factories';

describe('user profile integration', () => {
  beforeEach(clearDatabase);
  afterEach(clearDatabase);

  it('requires authentication and returns only public profile fields', async () => {
    await api().get('/api/v1/users/me').expect(401);

    const credentials = userFactory();
    const agent = api();
    await agent.post('/api/v1/auth/register').send(credentials).expect(201);

    const profile = await agent.get('/api/v1/users/me').expect(200);
    expect(profile.body.data).toMatchObject({ email: credentials.email, name: credentials.name });
    expect(profile.body.data).not.toHaveProperty('passwordHash');
  });
});
