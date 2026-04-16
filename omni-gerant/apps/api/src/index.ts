import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { setupGracefulShutdown } from './lib/shutdown.js';
import { prisma } from '@omni-gerant/db';

async function start() {
  const config = loadConfig();
  const app = await buildApp();

  setupGracefulShutdown(app);

  // Verify DB connection before accepting requests
  try {
    await prisma.$connect();
    app.log.info('Database connected successfully');
  } catch (error) {
    app.log.error(error, 'Failed to connect to database');
    process.exit(1);
  }

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`API server running on ${config.HOST}:${config.PORT} (${config.NODE_ENV})`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
