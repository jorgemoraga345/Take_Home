/** @format */

import { z } from 'zod';

export const updateProfileValidator = z.object({
	name: z.string({
		required_error: 'Name is required',
		invalid_type_error: 'Name must be a string',
	}).min(3, {
		message: 'Name must be at least 3 character long',
	}).min(1).optional(),
	email: z.string({
		required_error: 'Email is required',
		invalid_type_error: 'Email must be a string',
	}).email().optional(),
});

export const changePasswordValidator = z.object({
	currentPassword: z.string({
		required_error: 'Current password is required',
		invalid_type_error: 'Current password must be a string',
	}).min(6),
	newPassword: z.string({
		required_error: 'New password is required',
		invalid_type_error: 'New password must be a string',
	}).min(6),
});

export type UpdateProfileInput = z.infer<typeof updateProfileValidator>;
export type ChangePasswordInput = z.infer<typeof changePasswordValidator>;
