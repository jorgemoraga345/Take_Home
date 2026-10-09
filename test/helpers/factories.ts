import type { ProductInput } from '../../src/validators/product.validators';

let productSequence = 0;

/** Builds a valid product payload with predictable unique fields. */
export function productFactory(overrides: Partial<ProductInput> = {}): ProductInput {
  productSequence += 1;

  return {
    name: `Test Product ${productSequence}`,
    description: 'Integration test product',
    price: 1000 + productSequence,
    images: ['https://example.com/product.jpg'],
    brand: 'Battle Axe',
    category: 'accessories',
    stock: 10,
    ...overrides,
  };
}

/** Builds valid user credentials for API integration tests. */
export function userFactory(overrides: { name?: string; email?: string; password?: string } = {}) {
  return {
    name: overrides.name ?? 'Integration User',
    email: overrides.email ?? `user-${Date.now()}-${Math.random()}@example.com`,
    password: overrides.password ?? 'Test-password-123',
  };
}
