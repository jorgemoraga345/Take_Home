import { count, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/client';
import { productVariants, products } from '../../src/db/schema';
import { api } from '../helpers/app';
import { loginAsAdmin, loginAsUser } from '../helpers/auth';
import { clearDatabase } from '../helpers/db';
import { productFactory } from '../helpers/factories';

describe('product integration', () => {
  beforeEach(clearDatabase);
  afterEach(clearDatabase);

  it('TC-006 protects product writes from anonymous and regular users', async () => {
    const payload = productFactory();
    await api().post('/api/v1/products').send(payload).expect(401);

    const { agent: userAgent } = await loginAsUser();
    await userAgent.post('/api/v1/products').send(payload).expect(401);

    const { agent: adminAgent } = await loginAsAdmin();
    const created = await adminAgent.post('/api/v1/products').send(payload).expect(200);
    expect(created.body.data.name).toBe(payload.name);
  });

  it('TC-007 lists 25 products with default pagination and nested variants', async () => {
    const { agent } = await loginAsAdmin();
    for (let index = 0; index < 25; index += 1) {
      await agent.post('/api/v1/products').send(productFactory({ name: `Catalog Item ${index}` })).expect(200);
    }

    const response = await api().get('/api/v1/products').expect(200);
    expect(response.body.data.products).toHaveLength(10);
    expect(response.body.data.total).toBe(25);
    expect(response.body.data.products[0].images).toEqual(expect.any(Array));
    expect(response.body.data.products[0].variants).toEqual(expect.any(Array));
    expect(response.body.data.products[0].createdAt).toMatch(/^\d{4}-\d\d-\d\dT/);
    const dates = response.body.data.products.map((product: { createdAt: string }) => Date.parse(product.createdAt));
    expect(dates).toEqual([...dates].sort((a: number, b: number) => b - a));
  });

  it('TC-008 searches literally and case-insensitively, including wildcard-like input', async () => {
    const { agent } = await loginAsAdmin();
    await agent.post('/api/v1/products').send(productFactory({ name: 'Wool Beanie' })).expect(200);
    await agent.post('/api/v1/products').send(productFactory({ name: '50% Cotton Shirt' })).expect(200);
    await agent.post('/api/v1/products').send(productFactory({ name: 'Beanie (kids)' })).expect(200);

    const caseInsensitive = await api().get('/api/v1/products?search=wOoL').expect(200);
    expect(caseInsensitive.body.data.products.map((p: { name: string }) => p.name)).toEqual(['Wool Beanie']);

    const percent = await api().get('/api/v1/products?search=50%25').expect(200);
    expect(percent.body.data.products.map((p: { name: string }) => p.name)).toEqual(['50% Cotton Shirt']);

    const sqlText = await api().get('/api/v1/products?search=%27%3B%20DROP%20TABLE%20products%3B--').expect(200);
    expect(sqlText.body.data.total).toBe(0);
    const intactTable = await db.select({ value: count() }).from(products);
    expect(intactTable[0].value).toBe(3);
  });

  it('TC-009 applies category, brand, pagination, and rejects invalid limits and offsets', async () => {
    const { agent } = await loginAsAdmin();
    for (let index = 0; index < 7; index += 1) {
      await agent.post('/api/v1/products').send(productFactory({ category: index < 3 ? 'accessories' : 'shoes' })).expect(200);
    }

    const filtered = await api().get('/api/v1/products?category=accessories&brand=Battle%20Axe').expect(200);
    expect(filtered.body.data.total).toBe(3);

    const page = await api().get('/api/v1/products?limit=2&skip=2').expect(200);
    expect(page.body.data.products).toHaveLength(2);
    expect(page.body.data.total).toBe(7);

    for (const query of ['limit=0', 'limit=1000', 'limit=abc', 'skip=-1']) {
      const response = await api().get(`/api/v1/products?${query}`).expect(400);
      expect(response.body.message).toMatch(query.startsWith('limit') ? /limit/i : /skip/i);
    }
  });

  it('TC-010 sorts allowed fields descending and rejects unknown sort keys', async () => {
    const { agent } = await loginAsAdmin();
    await agent.post('/api/v1/products').send(productFactory({ name: 'Alpha', price: 100 })).expect(200);
    await agent.post('/api/v1/products').send(productFactory({ name: 'Zulu', price: 900 })).expect(200);

    const byPrice = await api().get('/api/v1/products?sort=price').expect(200);
    expect(byPrice.body.data.products.map((product: { price: number }) => product.price)).toEqual([900, 100]);
    const byName = await api().get('/api/v1/products?sort=name').expect(200);
    expect(byName.body.data.products.map((product: { name: string }) => product.name)).toEqual(['Zulu', 'Alpha']);

    await api().get('/api/v1/products?sort=password').expect(400);
    await api().get('/api/v1/products?sort=1%3Bselect%201').expect(400);
  });

  it('TC-011 creates product variants atomically and rejects invalid or duplicate variants', async () => {
    const { agent } = await loginAsAdmin();
    const payload = productFactory({ variants: [{ color: 'red', size: 'M', quantity: 2 }] });
    const created = await agent.post('/api/v1/products').send(payload).expect(200);
    expect(created.body.data.variants).toEqual(payload.variants);

    const countBefore = await db.select({ value: count() }).from(products);
    const duplicate = productFactory({
      variants: [
        { color: 'blue', size: 'S', quantity: 1 },
        { color: 'blue', size: 'S', quantity: 2 },
      ],
    });
    const duplicateResponse = await agent.post('/api/v1/products').send(duplicate);
    expect(duplicateResponse.status, duplicateResponse.text).toBe(400);

    const invalids = [
      { ...productFactory(), price: -1 },
      { ...productFactory(), stock: 1.5 },
      { ...productFactory(), images: [] },
      { ...productFactory(), images: ['invalid-url'] },
    ];
    for (const invalid of invalids) await agent.post('/api/v1/products').send(invalid).expect(400);

    const countAfter = await db.select({ value: count() }).from(products);
    expect(countAfter[0].value).toBe(countBefore[0].value);
  });

  it('TC-012 updates one field and advances updatedAt without changing createdAt', async () => {
    const { agent } = await loginAsAdmin();
    const created = await agent.post('/api/v1/products').send(productFactory()).expect(200);
    const old = created.body.data;
    await new Promise((resolve) => setTimeout(resolve, 10));

    const response = await agent.put(`/api/v1/products/${old.id}`).send({ id: old.id, price: 49990 }).expect(200);
    expect(response.body.data.price).toBe(49990);
    expect(response.body.data.name).toBe(old.name);
    expect(response.body.data.createdAt).toBe(old.createdAt);
    expect(Date.parse(response.body.data.updatedAt)).toBeGreaterThan(Date.parse(old.updatedAt));
  });

  it('TC-013 deletes a product and cascades its variants', async () => {
    const { agent } = await loginAsAdmin();
    const created = await agent.post('/api/v1/products').send(productFactory({
      variants: [{ color: 'green', size: 'L', quantity: 4 }],
    })).expect(200);
    const id = created.body.data.id;

    const deleted = await agent.delete(`/api/v1/products/${id}`).expect(200);
    expect(deleted.body.data.id).toBe(id);
    await api().get(`/api/v1/products/${id}`).expect(404);
    expect(await db.select().from(productVariants).where(eq(productVariants.productId, id))).toHaveLength(0);
  });

  it('TC-014 distinguishes malformed product UUIDs from unknown valid UUIDs for GET, PUT, and DELETE', async () => {
    const { agent } = await loginAsAdmin();
    const malformed = 'not-a-uuid';
    const unknown = '00000000-0000-4000-8000-000000000000';

    await api().get(`/api/v1/products/${malformed}`).expect(400);
    await agent.put(`/api/v1/products/${malformed}`).send({ id: malformed }).expect(400);
    await agent.delete(`/api/v1/products/${malformed}`).expect(400);

    await api().get(`/api/v1/products/${unknown}`).expect(404);
    await agent.put(`/api/v1/products/${unknown}`).send({ id: unknown, price: 2 }).expect(404);
    await agent.delete(`/api/v1/products/${unknown}`).expect(404);
  });
});
