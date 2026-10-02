/** @format */

import { Express, NextFunction, Request, Response } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import productRoutes from './product.routes';

const basePath = '/api/v1';

const routes = (app: Express) => {
	app.get(`${basePath}`, (req: Request, res: Response, next: NextFunction) => {
		res.status(200).json({
			message: 'Welcome to the API',
			version: process.env.npm_package_version ,
			status: 'success',
		});
	});

	// Auth routes
	app.use(`${basePath}/auth`, authRoutes);

	// User routes
	app.use(`${basePath}/users`, userRoutes);

	// Product routes
	app.use(`${basePath}/products`, productRoutes);
};

export default routes;
