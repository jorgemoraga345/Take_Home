/** @format */

import * as dotenv from 'dotenv';

dotenv.config();

export const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/e-commerce-backend';
export const JWT_SECRET = process.env.JWT_SECRET ?? 'jwt-secret';

export const PROD_ORIGINS = process.env.PROD_ORIGINS?.split(',');
export const DEV_ORIGINS = process.env.DEV_ORIGINS?.split(',');
export const NODE_ENV = process.env.NODE_ENV;
export const IS_PROD = process.env.NODE_ENV === 'production';

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 1337;
