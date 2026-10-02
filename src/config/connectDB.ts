/** @format */

import mongoose from 'mongoose';
import logger from './logger';
import 'colors'; 
import { MONGODB_URI } from '../constants';

const connectDB = async () => {
	mongoose.set('strictQuery', true);

	const mongoParams = {
		uri: MONGODB_URI,
		options: {
			useUnifiedTopology: true,
			useNewUrlParser: true,
			maxPoolSize: 10,
		},
	};

	mongoose.connect(mongoParams.uri, mongoParams.options);

	mongoose.connection.on('connected', function () {
		logger.info(`Mongodb connection is open ${mongoParams.uri}`.cyan.bold);
	});

	mongoose.connection.on('error', function (err) {
		logger.info(`Mongodb connection error ${err}`.yellow.bold);
	});

	mongoose.connection.on('disconnected', function () {
		logger.info('Mongodb connection is disconnected'.red.bold);
	});

	process.on('SIGINT', async function () {
		await mongoose.connection.close();
		logger.info('Mongoose connection disconnected due to application termination'.magenta.bold);
		process.exit(0);
	});
};

export default connectDB;
