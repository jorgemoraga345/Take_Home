/** @format */

import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/connectDB';
import logger from './config/logger';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import routes from './routes';

import { errorHandler, notFound, securityMiddleware } from './middlewares';
import { PORT } from './constants';

const app = express();

app.use(morgan('dev'));
dotenv.config();

// security middleware (cors, xss, mongo sanitize)
securityMiddleware(app);

// setting up body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// setting up compression
app.use(compression());

// setting up cookie parser
app.use(cookieParser());

app.listen(PORT, async () => {
	logger.info(`App is running at port ${PORT} & url http://localhost:${PORT} is live. PID ${process.pid}`);

	await connectDB();

	routes(app);

	// error handler
	app.use(notFound);
	app.use(errorHandler);
});
