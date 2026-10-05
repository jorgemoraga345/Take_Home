import { and, count, desc, eq, ilike, inArray, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { productVariants, products } from '../db/schema';

type ProductInsert = typeof products.$inferInsert;
type ProductVariantInsert = typeof productVariants.$inferInsert;

/** Persisted product row inferred from the Drizzle products table. */
export type ProductRecord = typeof products.$inferSelect;

/** Persisted product variant inferred from the Drizzle product_variants table. */
export type ProductVariantRecord = typeof productVariants.$inferSelect;

/** Product fields returned by the API with variants nested in the product. */
export type ProductWithVariants = ProductRecord & {
  variants: Array<Pick<ProductVariantRecord, 'color' | 'size' | 'quantity'>>;
};

/** Product variant fields accepted when creating or updating a product. */
export type ProductVariantInput = Pick<ProductVariantInsert, 'color' | 'size' | 'quantity'>;

/** Product fields accepted when creating a product. */
export type CreateProductRecord = Pick<
  ProductInsert,
  'name' | 'description' | 'price' | 'images' | 'brand' | 'category' | 'stock'
> & {
  variants?: ProductVariantInput[];
};

/** Product fields accepted when updating a product. */
export type UpdateProductRecord = Partial<
  Pick<ProductInsert, 'name' | 'description' | 'price' | 'images' | 'brand' | 'category' | 'stock'>
> & {
  variants?: ProductVariantInput[];
};

/** Allowed product fields for descending sort order. */
export type ProductSortField = 'createdAt' | 'price' | 'name' | 'stock';

/** Validated product-list query values. */
export type ProductListQuery = {
  limit: number;
  skip: number;
  search?: string;
  sort: ProductSortField;
  category?: string;
  brand?: string;
};

/** Escapes SQL LIKE wildcards so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/** Maps each product to its variants without exposing the database foreign key. */
function attachVariants(
  productRows: ProductRecord[],
  variantRows: ProductVariantRecord[],
): ProductWithVariants[] {
  const variantsByProduct = new Map<
    string,
    Array<Pick<ProductVariantRecord, 'color' | 'size' | 'quantity'>>
  >();

  for (const variant of variantRows) {
    const current = variantsByProduct.get(variant.productId) ?? [];
    current.push({
      color: variant.color,
      size: variant.size,
      quantity: variant.quantity,
    });
    variantsByProduct.set(variant.productId, current);
  }

  return productRows.map((product) => ({
    ...product,
    variants: variantsByProduct.get(product.id) ?? [],
  }));
}

/** Builds parameterized case-insensitive filters for product listing. */
function buildProductFilters(query: ProductListQuery): SQL | undefined {
  const filters: SQL[] = [];

  if (query.search) {
    filters.push(ilike(products.name, `%${escapeLike(query.search)}%`));
  }
  if (query.category) {
    filters.push(ilike(products.category, `%${escapeLike(query.category)}%`));
  }
  if (query.brand) {
    filters.push(ilike(products.brand, `%${escapeLike(query.brand)}%`));
  }

  return filters.length > 0 ? and(...filters) : undefined;
}

/** Builds a descending sort expression for an allowed product field. */
function buildProductOrderBy(sort: ProductSortField): SQL {
  switch (sort) {
    case 'price':
      return desc(products.price);
    case 'name':
      return desc(products.name);
    case 'stock':
      return desc(products.stock);
    case 'createdAt':
    default:
      return desc(products.createdAt);
  }
}

/** Creates a product and its variants atomically. */
export async function createProduct(
  input: CreateProductRecord,
): Promise<ProductWithVariants> {
  return db.transaction(async (transaction) => {
    const { variants = [], ...productInput } = input;
    const [product] = await transaction.insert(products).values(productInput).returning();

    if (!product) {
      throw new Error('Product insert did not return a row.');
    }

    if (variants.length > 0) {
      await transaction.insert(productVariants).values(
        variants.map((variant) => ({
          ...variant,
          productId: product.id,
        })),
      );
    }

    return {
      ...product,
      variants,
    };
  });
}

/** Lists products with their variants and the total number matching the filters. */
export async function findProducts(
  query: ProductListQuery,
): Promise<{ products: ProductWithVariants[]; total: number }> {
  const where = buildProductFilters(query);

  const [productRows, countRows] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(buildProductOrderBy(query.sort))
      .limit(query.limit)
      .offset(query.skip),
    db.select({ total: count() }).from(products).where(where),
  ]);

  const productIds = productRows.map((product) => product.id);
  const variantRows =
    productIds.length > 0
      ? await db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.productId, productIds))
      : [];

  return {
    products: attachVariants(productRows, variantRows),
    total: countRows[0]?.total ?? 0,
  };
}

/** Finds one product by UUID and includes its variants. */
export async function findProductById(id: string): Promise<ProductWithVariants | undefined> {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);

  if (!product) {
    return undefined;
  }

  const variantRows = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id));

  return attachVariants([product], variantRows)[0];
}

/** Updates a product and optionally replaces its variants in one transaction. */
export async function updateProduct(
  id: string,
  changes: UpdateProductRecord,
): Promise<ProductWithVariants | undefined> {
  return db.transaction(async (transaction) => {
    const { variants, ...productChanges } = changes;
    const [product] = await transaction
      .update(products)
      .set({ ...productChanges, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (!product) {
      return undefined;
    }

    if (variants !== undefined) {
      await transaction.delete(productVariants).where(eq(productVariants.productId, id));

      if (variants.length > 0) {
        await transaction.insert(productVariants).values(
          variants.map((variant) => ({
            ...variant,
            productId: id,
          })),
        );
      }
    }

    const variantRows = await transaction
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id));

    return attachVariants([product], variantRows)[0];
  });
}

/** Deletes a product and returns it with its variants before the cascade removes them. */
export async function deleteProduct(id: string): Promise<ProductWithVariants | undefined> {
  return db.transaction(async (transaction) => {
    const [product] = await transaction
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      return undefined;
    }

    const variantRows = await transaction
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id));

    await transaction.delete(products).where(eq(products.id, id));

    return attachVariants([product], variantRows)[0];
  });
}
