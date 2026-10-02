/** @format */

import { Document } from 'mongoose';

export interface IProduct extends Document {
	_id: string;
	name: string;
	description: string;
	price: number;
	images: string[]; // URLs or paths to images
	brand: string;
	category: string;
	stock: number;
  variants?: {
    color: string;
    size: string;
    quantity: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}
