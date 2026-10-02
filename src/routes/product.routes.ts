/** @format */

import { Router } from 'express';
import * as productControllers from '../controllers';

import { protect, admin } from '../middlewares';

const router = Router();

router
	.route('/')
	.post(protect, admin, productControllers.createProduct)
	.get(productControllers.getAllProducts);

router
	.route('/:id')
	.get(productControllers.getProductById)
	.put(protect, admin, productControllers.updateProduct)
	.delete(protect, admin, productControllers.deleteProduct);

export default router;
