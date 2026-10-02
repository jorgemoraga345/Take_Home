/** @format */

import asyncHandler from 'express-async-handler';
import { Request, Response, NextFunction } from 'express';

import * as productServices from '../services';
import { formatZodErrors } from '../utils';
import { getProductsValidator, productInputValidator, productUpdateValidator } from '../validators/product.validators';

/**
 * @desc Get all products
 * @route GET /api/products
 * @access Public
 */
export const getAllProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const parsed = getProductsValidator.safeParse(req.query);

	if (!parsed.success) {
		res.status(400).json({
			message: 'Validation failed',
			errors: formatZodErrors(parsed.error),
		});
		return;
	}

	const products = await productServices.getProducts(parsed.data);

	res.status(200).json({
		success: true,
		message: 'Products fetched successfully',
		data: products,
	});
});

/**
 * @desc Get single product
 * @route GET /api/products/:id
 * @access Public
 */

export const getProductById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const product = await productServices.getProductById(req.params.id);

	res.status(200).json({
		success: true,
		message: 'Product fetched successfully',
		data: product,
	});
});

/**
 * @desc Update product
 * @route PUT /api/products/:id
 * @access Private
 */

export const updateProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const parsed = productUpdateValidator.safeParse(req.body);

	if (!parsed.success) {
		res.status(400).json({
			message: 'Validation failed',
			errors: formatZodErrors(parsed.error),
		});
		return;
	}

	const product = await productServices.updateProduct(req.params.id, parsed.data);

	res.status(200).json({
		success: true,
		message: 'Product updated successfully',
		data: product,
	});
});

/**
 * @desc Delete product
 * @route DELETE /api/products/:id
 * @access Private
 */

export const deleteProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const product = await productServices.deleteProduct(req.params.id);

	res.status(200).json({
		success: true,
		message: 'Product deleted successfully',
		data: product,
	});
});

/**
 * @desc Create product
 * @route POST /api/products
 * @access Private
 */

export const createProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const parsed = productInputValidator.safeParse(req.body);

	if (!parsed.success) {
		res.status(400).json({
			message: 'Validation failed',
			errors: formatZodErrors(parsed.error),
		});
		return;
	}

	const product = await productServices.createProduct(parsed.data);

	res.status(200).json({
		success: true,
		message: 'Product created successfully',
		data: product,
	});
});
