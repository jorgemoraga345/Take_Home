/** @format */

import { Document } from 'mongoose';
import { ALL_USER_ROLES } from '../constants';

export type IUserRole = (typeof ALL_USER_ROLES)[number];

export interface IUser extends Document {
	_id: string;
	name: string;
	email: string;
	password: string;
	role: IUserRole;
	matchPassword(enteredPassword: string): Promise<boolean>;
	resetPasswordToken: string;
	resetPasswordExpire: Date;
}


