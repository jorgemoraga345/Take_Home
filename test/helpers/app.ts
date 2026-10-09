import request from 'supertest';
import app from '../../src/app';

/** Returns the Express app to Supertest without opening a network port. */
export function api(): request.Agent {
  return request.agent(app);
}
