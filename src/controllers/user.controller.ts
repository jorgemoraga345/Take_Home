/** @format */

import asyncHandler from 'express-async-handler';
import { Request, Response, NextFunction } from 'express';

import * as userService from '../services/user.services';

import { changePasswordValidator, updateProfileValidator } from '../validators';

import { formatZodErrors } from '../utils';

/**
 * @desc Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */

export const updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const { id: user_id } = req.user;

	const parsed = updateProfileValidator.safeParse(req.body);

	if (!parsed.success) {
		res.status(400).json({
			message: 'Validation failed',
			errors: formatZodErrors(parsed.error),
		});
		return;
	}

	const { name, email } = parsed.data;

	const updatedUser = await userService.updateProfile(user_id, { name, email });

	res.status(200).json({
		success: true,
		message: 'Profile updated successfully',
		data: updatedUser,
	});
});

/**
 * @desc Change user password
 * @route PUT /api/users/change-password
 * @access Private
 */

export const changePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const { id: user_id } = req.user;
	const parsed = changePasswordValidator.safeParse(req.body);

	if (!parsed.success) {
		res.status(400).json({
			message: 'Validation failed',
			errors: formatZodErrors(parsed.error),
		});
		return;
	}

	const { currentPassword, newPassword } = parsed.data;

	await userService.changePassword(user_id, { currentPassword, newPassword });

	res.status(200).json({
		success: true,
		message: 'Password changed successfully',
	});
});

/**
 * @desc Get current user profile
 * @route GET /api/users/me
 * @access Private
 */
export const getMe = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const { id: user_id } = req.user;

	const user = await userService.getMe(user_id);

	res.status(200).json({
		success: true,
		message: 'User fetched successfully',
		data: user,
	});
});
