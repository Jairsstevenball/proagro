import { config } from './config.js';
import { app } from './app.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { iniciarCronAlertas } from './services/alertas.js';

const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(`ProAgro API escuchando en http://localhost:${config.port}`);
  if (!config.geminiApiKey) logger.warn('Falta GEMINI_API_KEY: AgroBot responderá con un aviso.');
  iniciarCronAlertas();
});

// Protección contra conexiones lentas (ataque "slowloris")
server.headersTimeout = 15_000;
server.requestTimeout = 60_000;

async function apagar(senal) {
  logger.info(`${senal} recibido, cerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', apagar);
process.on('SIGINT', apagar);
process.on('unhandledRejection', (e) => logger.error({ err: e }, 'promesa sin manejar'));
