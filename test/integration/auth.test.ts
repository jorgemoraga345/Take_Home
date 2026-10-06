import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/client';
import { users } from '../../src/db/schema';
import { api } from '../helpers/app';
import { clearDatabase } from '../helpers/db';
import { userFactory } from '../helpers/factories';

describe('authentication and profile integration', () => {
  beforeEach(clearDatabase);
  afterEach(clearDatabase);

  it('TC-003 registers a UUID user with a bcrypt hash and a private profile response', async () => {
    const payload = userFactory();
    const agent = api();
    const response = await agent.post('/api/v1/auth/register').send(payload);

    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']?.[0]).toMatch(/HttpOnly/i);
    expect(response.body.data).toBeTypeOf('string');

    const [stored] = await db.select().from(users).where(eq(users.email, payload.email));
    expect(stored?.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(stored?.passwordHash).not.toBe(payload.password);
    expect(await bcrypt.compare(payload.password, stored!.passwordHash)).toBe(true);

    const profile = await agent.get('/api/v1/users/me');
    expect(profile.status).toBe(200);
    expect(profile.body.data).toMatchObject({ id: stored?.id, name: payload.name, email: payload.email });
    expect(profile.body.data).not.toHaveProperty('passwordHash');
    expect(profile.body.data).not.toHaveProperty('password');
  });

  it('TC-004 accepts valid credentials and rejects wrong, unknown, and malformed credentials', async () => {
    const payload = userFactory();
    await api().post('/api/v1/auth/register').send(payload).expect(201);

    await api().post('/api/v1/auth/login').send(payload).expect(200);
    const wrongPassword = await api().post('/api/v1/auth/login').send({ ...payload, password: 'Wrong-password-123' });
    const unknownEmail = await api().post('/api/v1/auth/login').send({ ...payload, email: 'unknown@example.com' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe('Invalid email or password');
    expect(unknownEmail.body.message).toBe('Invalid email or password');

    const malformed = await api().post('/api/v1/auth/login').send({ email: 'not-an-email', password: payload.password });
    expect(malformed.status).toBe(400);
  });

  it('TC-005 updates the profile and password, rejecting a wrong current password', async () => {
    const payload = userFactory();
    const agent = api();
    await agent.post('/api/v1/auth/register').send(payload).expect(201);

    const updatedName = await agent.put('/api/v1/users/profile').send({ name: 'Updated Integration User' });
    expect(updatedName.status).toBe(200);
    expect(updatedName.body.data.name).toBe('Updated Integration User');

    const wrongPassword = await agent.put('/api/v1/users/change-password').send({
      currentPassword: 'Wrong-password-123',
      newPassword: 'New-password-123',
    });
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.message).toBe('Invalid current password');

    await agent.put('/api/v1/users/change-password').send({
      currentPassword: payload.password,
      newPassword: 'New-password-123',
    }).expect(200);

    await api().post('/api/v1/auth/login').send({ email: payload.email, password: 'New-password-123' }).expect(200);
    await api().post('/api/v1/auth/login').send(payload).expect(401);
  });

  it('TC-015 rejects sequential and concurrent duplicate email registrations without creating duplicates', async () => {
    const payload = userFactory();
    await api().post('/api/v1/auth/register').send(payload).expect(201);
    await api().post('/api/v1/auth/register').send(payload).expect(400);

    const racePayload = userFactory();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => api().post('/api/v1/auth/register').send(racePayload)),
    );
    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 400).length, JSON.stringify(responses.map((r) => ({ status: r.status, body: r.body })))).toBe(4);

    const rows = await db.select().from(users).where(eq(users.email, racePayload.email));
    expect(rows).toHaveLength(1);
  });
});
