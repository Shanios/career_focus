import 'dotenv/config';
import { createApp } from './app.js';
import { disconnectPrisma, getPrismaClient } from './lib/prisma.js';

const required = ['NODE_ENV', 'PORT', 'DATABASE_URL', 'CORS_ORIGIN', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(`Configuration error: set the following values in backend/.env: ${missing.join(', ')}`);
  process.exit(1);
}

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Configuration error: PORT must be an integer between 1 and 65535.');
  process.exit(1);
}

const prisma = getPrismaClient();
const app = createApp({ corsOrigin: process.env.CORS_ORIGIN, prisma });
const server = app.listen(port, () => console.log(`API listening on port ${port}`));

function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

