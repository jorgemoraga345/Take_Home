/** @format */

import cors from 'cors';
import { Application } from 'express';
import { DEV_ORIGINS, IS_PROD, PROD_ORIGINS } from '../constants';

const corsOptions = {
	origin: IS_PROD ? PROD_ORIGINS : DEV_ORIGINS,
	credentials: true,
	methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
	preflightContinue: false,
	optionsSuccessStatus: 204,
	allowedHeaders: [
		'Origin',
		'X-Requested-With',
		'Content-Type',
		'Accept',
		'Authorization',
		'Access-Control-Allow-Headers',
	],
};

export const securityMiddleware = (app: Application) => {

	app.disable('x-powered-by');

	app.use(cors(corsOptions));
};


