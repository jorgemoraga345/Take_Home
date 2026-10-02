/** @format */

import mongoose, { Schema, Model } from 'mongoose';
import { IProduct } from '../types/product.types';

const productSchema = new Schema<IProduct>(
	{
		name: { type: String, required: true },
		description: { type: String, required: true },
		price: { type: Number, required: true },
		images: [{ type: String }],
		brand: { type: String, required: true },
		category: { type: String, required: true },
		stock: { type: Number, required: true },
		variants: [
			{
				color: { type: String, required: true },
				size: { type: String, required: true },
				quantity: { type: Number, required: true },
			},
		],
	},
	{
		timestamps: true,
		versionKey: false,
		id: false,
		toJSON: {
			virtuals: true,
		},
		toObject: {
			virtuals: true,
		},
	},
);

const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema);

export default Product;
