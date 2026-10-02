/** @format */

import { Request, Response, NextFunction } from 'express';
import {AppError} from '../utils';

const notFound = (req: Request, res: Response, next: NextFunction) => {
	const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
	next(error);
};

const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
	const statusCode = error instanceof AppError ? error.statusCode : res.statusCode === 200 ? 500 : res.statusCode;

	res.status(statusCode);
	res.json({
		message: error.message,
		stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack,
	});
};

export { notFound, errorHandler };
