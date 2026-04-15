import { buildApp } from './app.js';
import { loadConfig } from './config.js';

async function start() {
  const config = loadConfig();
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`API server running on http://localhost:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
