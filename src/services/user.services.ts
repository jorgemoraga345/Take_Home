/** @format */

import User from '../models/user.model';
import { AppError } from '../utils';

import { UpdateProfileInput, ChangePasswordInput } from '../validators';

export const getMe = async (id: string) => {
  const user = await User.findById(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}

export const updateProfile = async (
  id: string,
  payload: UpdateProfileInput
) => {
  const { name, email } = payload;

  const user = await User.findByIdAndUpdate(
    id,
    { name, email },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}

export const changePassword = async (
  id: string,
  payload: ChangePasswordInput
) => {
  const { currentPassword, newPassword } = payload;

  const user = await User.findById(id);

  if (!user || !(await user.matchPassword(currentPassword))) {
    throw new AppError('Invalid current password', 401);
  }

  user.password = newPassword;
  await user.save();

  return { message: 'Password changed successfully' };
}

