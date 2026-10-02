/** @format */

import User from '../models/user.model';
import { AppError, generateToken } from '../utils';
import { LoginUserInput, RegisterUserInput } from '../validators';

export const registerUser = async (payload: RegisterUserInput) => {
	const { name, email, password, role } = payload;

	const existingUser = await User.findOne({ email });

	if (existingUser) {
		throw new AppError('User already exists', 400);
	}

	const user = await User.create({
		name,
		email,
		password,
		role
	});

	if (!user) {
		throw new AppError('User registration failed', 500);
	}

	const token = generateToken(user._id, user.role);
	return token;
};

export const loginUser = async (payload: LoginUserInput) => {
	const { email, password } = payload;

	const user = await User.findOne({ email });

	if (!user || !(await user.matchPassword(password))) {
		throw new AppError('Invalid email or password', 401);
	}

	const token = generateToken(user._id, user.role);


	return token;
};
