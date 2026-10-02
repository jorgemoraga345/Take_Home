/** @format */

import asyncHandler from 'express-async-handler';
import { Request, Response, NextFunction } from 'express';

import * as authService from '../services/auth.services';
import { registerUserInputValidator, loginUserInputValidator } from '../validators/auth.validators';
import { formatZodErrors } from '../utils';

/**
 * @desc Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
export const registerUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const parsed = registerUserInputValidator.safeParse(req.body);

	if (!parsed.success) {
		res.status(400).json({
			message: 'Validation failed',
			errors: formatZodErrors(parsed.error),
		});
		return;
	}

	const token = await authService.registerUser(parsed.data);

	res.cookie('access_token', token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 24 * 60 * 60 * 1000,
	});

	res.status(201).json({
		success: true,
		message: 'User registered successfully',
		data: token
	});
});

/**
 * @desc Login a user
 * @route POST /api/auth/login
 * @access Public
 */
export const loginUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const parsed = loginUserInputValidator.safeParse(req.body);

	if (!parsed.success) {
		res.status(400).json({
			message: 'Validation failed',
			errors: parsed.error.flatten().fieldErrors,
		});
		return;
	}

	const token = await authService.loginUser(parsed.data);

	res.cookie('access_token', token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 24 * 60 * 60 * 1000,
	});

	res.status(200).json({
		success: true,
		message: 'User logged in successfully',
		data: token
	});
});
