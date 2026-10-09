import 'dotenv/config';
import { defineConfig } from 'vitest/config';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must point to a dedicated PostgreSQL test database.');
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DATABASE_SSL ??= 'false';
process.env.DATABASE_POOL_MAX ??= '2';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'integration-test-secret-at-least-32-characters';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20000,
    hookTimeout: 30000,
    clearMocks: true,
  },
});
