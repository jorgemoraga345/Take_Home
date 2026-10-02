/** @format */

import {  PipelineStage } from 'mongoose';
import Product from '../models/product.model';
import { AppError } from '../utils';
import { GetProductsInput, ProductInput, ProductUpdateInput } from '../validators/product.validators';

export const createProduct = async (productInput: ProductInput) => {
	const product = await Product.create(productInput);
	return product;
};


export const getProducts = async (filters: GetProductsInput) => {
	const { limit = 10, skip = 0, search = '', sort = 'createdAt', category = '', brand = '' } = filters;

	const query: PipelineStage[] = [
		{
			$match: {
				name: { $regex: search, $options: 'i' },
				category: { $regex: category, $options: 'i' },
				brand: { $regex: brand, $options: 'i' },
			},
		},
		{
			$sort: {
				[sort]: -1,
			},
		},
		{
			$skip: Number(skip),
		},
		{
			$limit: Number(limit),
		},
	];

	const countQuery : PipelineStage[] = [

		{
			$match: {
				name: { $regex: search, $options: 'i' },
				category: { $regex: category, $options: 'i' },
				brand: { $regex: brand, $options: 'i' },
			},
		},
		{
			$group: {
				_id: null,
				count: { $sum: 1 },
			},
		},

	]


	//promise.all
	const [products, countResult] = await Promise.all([
		Product.aggregate(query),
		Product.aggregate(countQuery),
	]);

	const total = countResult?.length > 0 ? countResult[0]?.count : 0;

	return {
		products,
		total,
	};
};

export const getProductById = async (id: string) => {
	const product = await Product.findById(id);

	if (!product) {
		throw new AppError('Product not found', 404);
	}

	return product;
};

export const updateProduct = async (id: string, productUpdateInput: ProductUpdateInput) => {
	const product = await Product.findByIdAndUpdate(id, productUpdateInput, { new: true });

	if (!product) {
		throw new AppError('Product not found', 404);
	}
	return product;
};

export const deleteProduct = async (id: string) => {
	const product = await Product.findByIdAndDelete(id);

	if (!product) {
		throw new AppError('Product not found', 404);
	}

	return product;
};
