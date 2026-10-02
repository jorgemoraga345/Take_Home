/** @format */

import { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { verifyJwt } from '../utils';
import { IUserRole } from '../types';
import { z } from 'zod';

declare global {
	namespace Express {
		interface Request {
			user: {
				id: string;
				role: IUserRole;
			};
		}
	}
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
	const { access_token } = req.cookies;

	const schema = z.object({
		access_token: z
			.string({
				required_error: 'Session expired, please login again!',
			})
			.min(1, 'Session expired, please login again!'),
	});

	const result = schema.safeParse({ access_token });

	if (!result.success) {
		const errorMessage = result.error.errors[0]?.message || 'Invalid token';
		res.status(401);
		return next(new Error(errorMessage));
	}

	try {
		const decoded = verifyJwt(access_token);

		if (!decoded) {
			res.status(401);
			throw new Error('Session expired, please login again!');
		}

		req.user = {
			id: decoded.id,
			role: decoded.role,
		};

		next();
	} catch (error: any) {
		logger.error(`protect error: ${error.message} for access token: ${access_token}`);
		res.status(401);
		next(new Error(error.message));
	}
};

export const admin = async (req: Request, res: Response, next: NextFunction) => {
	if (req.user.role === 'admin') {
		next();
	} else {
		res.status(401);
		next(new Error('Unauthorized to access this route'));
	}
};
