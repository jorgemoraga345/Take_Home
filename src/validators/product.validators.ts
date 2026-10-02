/** @format */

import { z } from 'zod';

export const productInputValidator = z.object({
	name: z.string().min(1, 'Product name is required'),
	description: z.string().min(1, 'Description is required'),
	price: z.number().min(0, 'Price must be a positive number'),
	images: z
		.array(z.string().url({ message: 'Each image must be a valid URL' }))
		.nonempty('At least one image is required'),
	brand: z.string().min(1, 'Brand is required'),
	category: z.string().min(1, 'Category is required'),
	stock: z.number().int().min(0, 'Stock must be a non-negative integer'),
	variants: z
		.array(
			z.object({
				color: z.string().min(1, 'Color is required'),
				size: z.string().min(1, 'Size is required'),
				quantity: z.number().int().min(0, 'Quantity must be a non-negative integer'),
			}),
		)
		.optional(),
});

export const productUpdateValidator = productInputValidator.partial().extend({
  id: z.string().min(1, 'Product ID is required'),
});

export const getProductsValidator = z.object({
  limit: z.string().optional(),
  skip: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
});

export type ProductInput = z.infer<typeof productInputValidator>;

export type ProductUpdateInput = z.infer<typeof productUpdateValidator>;

export type GetProductsInput = z.infer<typeof getProductsValidator>;