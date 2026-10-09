import 'dotenv/config';

import app from './app';
import logger from './config/logger';
import { close, connectDatabase } from './db/client';

const port = process.env.PORT ? Number(process.env.PORT) : 1337;

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    const server = app.listen(port, () => {
      logger.info(`API listening on port ${port}`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received; closing HTTP server`);
      server.close(async (error) => {
        if (error) {
          logger.error(error, 'Failed to close HTTP server cleanly');
          process.exitCode = 1;
        }
        await close();
      });
    };

    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    logger.error(error, 'Unable to connect to PostgreSQL; server was not started');
    await close();
    process.exitCode = 1;
  }
}

void startServer();
