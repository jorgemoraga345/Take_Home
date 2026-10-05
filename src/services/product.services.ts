import { AppError } from '../utils';
import {
  createProduct as insertProduct,
  deleteProduct as removeProduct,
  findProductById,
  findProducts,
  updateProduct as saveProductChanges,
} from '../repositories/product.repository';
import type {
  ProductListQuery,
  ProductSortField,
  ProductWithVariants,
  UpdateProductRecord,
} from '../repositories/product.repository';
import type {
  GetProductsInput,
  ProductInput,
  ProductUpdateInput,
} from '../validators/product.validators';

/** Allowed fields for descending product sorting. */
const SORT_FIELDS: ProductSortField[] = ['createdAt', 'price', 'name', 'stock'];

/** Checks whether a database error is a PostgreSQL unique constraint violation. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

/** Validates and parses a numeric product-list query parameter. */
function parseIntegerQuery(
  value: string | undefined,
  field: 'limit' | 'skip',
  defaultValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  if (!/^\d+$/.test(value)) {
    throw new AppError(`Invalid ${field}: expected a non-negative integer`, 400);
  }

  const parsed = Number(value);
  const isValidLimit = field === 'limit' && parsed >= 1 && parsed <= 100;
  const isValidSkip = field === 'skip' && parsed >= 0;

  if (!Number.isSafeInteger(parsed) || !(isValidLimit || isValidSkip)) {
    const requirement =
      field === 'limit' ? 'an integer between 1 and 100' : 'a non-negative integer';
    throw new AppError(`Invalid ${field}: expected ${requirement}`, 400);
  }

  return parsed;
}

/** Validates a product UUID before sending it to PostgreSQL. */
function assertProductUuid(id: string): void {
  const uuidV4Pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidV4Pattern.test(id)) {
    throw new AppError('Invalid product ID', 400);
  }
}

/** Creates a product and its variants. */
export async function createProduct(
  productInput: ProductInput,
): Promise<ProductWithVariants> {
  try {
    return await insertProduct(productInput);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('Duplicate product variant', 400);
    }
    throw error;
  }
}

/** Lists products using validated filters, pagination, and sorting. */
export async function getProducts(
  filters: GetProductsInput,
): Promise<{ products: ProductWithVariants[]; total: number }> {
  const sort = filters.sort ?? 'createdAt';

  if (!SORT_FIELDS.includes(sort as ProductSortField)) {
    throw new AppError('Invalid sort value', 400);
  }

  const query: ProductListQuery = {
    limit: parseIntegerQuery(filters.limit, 'limit', 10),
    skip: parseIntegerQuery(filters.skip, 'skip', 0),
    sort: sort as ProductSortField,
    search: filters.search ?? '',
    category: filters.category ?? '',
    brand: filters.brand ?? '',
  };

  return findProducts(query);
}

/** Gets a product by UUID or returns a 404 error. */
export async function getProductById(id: string): Promise<ProductWithVariants> {
  assertProductUuid(id);

  const product = await findProductById(id);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return product;
}

/** Updates a product and optionally replaces its variants. */
export async function updateProduct(
  id: string,
  productUpdateInput: ProductUpdateInput,
): Promise<ProductWithVariants> {
  assertProductUuid(id);

  const changes: UpdateProductRecord = {};

  if (productUpdateInput.name !== undefined) changes.name = productUpdateInput.name;
  if (productUpdateInput.description !== undefined) {
    changes.description = productUpdateInput.description;
  }
  if (productUpdateInput.price !== undefined) changes.price = productUpdateInput.price;
  if (productUpdateInput.images !== undefined) changes.images = productUpdateInput.images;
  if (productUpdateInput.brand !== undefined) changes.brand = productUpdateInput.brand;
  if (productUpdateInput.category !== undefined) {
    changes.category = productUpdateInput.category;
  }
  if (productUpdateInput.stock !== undefined) changes.stock = productUpdateInput.stock;
  if (productUpdateInput.variants !== undefined) {
    changes.variants = productUpdateInput.variants;
  }

  try {
    const product = await saveProductChanges(id, changes);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    return product;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (isUniqueViolation(error)) {
      throw new AppError('Duplicate product variant', 400);
    }
    throw error;
  }
}

/** Deletes a product by UUID or returns a 404 error. */
export async function deleteProduct(id: string): Promise<ProductWithVariants> {
  assertProductUuid(id);

  const product = await removeProduct(id);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return product;
}
