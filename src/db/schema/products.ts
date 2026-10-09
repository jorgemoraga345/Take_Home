import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(),
  images: text('images').array().notNull().default([]),
  brand: text('brand').notNull(),
  category: text('category').notNull(),
  stock: integer('stock').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check('products_price_non_negative', sql`${table.price} >= 0`),
  check('products_stock_non_negative', sql`${table.stock} >= 0`),
  index('products_created_at_idx').on(table.createdAt.desc()),
  index('products_category_idx').on(table.category),
  index('products_brand_idx').on(table.brand),
]).enableRLS();

export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  color: text('color').notNull(),
  size: text('size').notNull(),
  quantity: integer('quantity').notNull(),
}, (table) => [
  check('product_variants_quantity_non_negative', sql`${table.quantity} >= 0`),
  unique('product_variants_product_color_size_unique').on(table.productId, table.color, table.size),
]).enableRLS();
