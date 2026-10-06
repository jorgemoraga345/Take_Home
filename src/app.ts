import 'dotenv/config';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFound, securityMiddleware } from './middlewares';

const app = express();

app.use(morgan('dev'));
securityMiddleware(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(cookieParser());

routes(app);
app.use(notFound);
app.use(errorHandler);

export default app;
