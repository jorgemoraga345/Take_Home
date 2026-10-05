-- 0000_init_users_products.sql
-- Creates users, products and product_variants.
-- Requires extension: citext. UUID generation uses PostgreSQL's built-in gen_random_uuid().
-- Irreversible: none. Rollback = drop tables and enum in reverse dependency order.
-- updated_at is defaulted on insert and maintained by the application on updates.
CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM ('user', 'admin');
--> statement-breakpoint
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" citext NOT NULL,
  "password_hash" text NOT NULL,
  "role" "user_role" DEFAULT 'user' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "price" integer NOT NULL,
  "images" text[] DEFAULT '{}'::text[] NOT NULL,
  "brand" text NOT NULL,
  "category" text NOT NULL,
  "stock" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "products_price_non_negative" CHECK ("price" >= 0),
  CONSTRAINT "products_stock_non_negative" CHECK ("stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "color" text NOT NULL,
  "size" text NOT NULL,
  "quantity" integer NOT NULL,
  CONSTRAINT "product_variants_quantity_non_negative" CHECK ("quantity" >= 0),
  CONSTRAINT "product_variants_product_color_size_unique" UNIQUE("product_id", "color", "size"),
  CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");
--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand");
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;
