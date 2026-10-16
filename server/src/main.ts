import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import pg from 'pg';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { MemoryStore } from './store/memory.js';
import { migrate } from './store/migrate.js';
import { PgStore } from './store/pg.js';
import { SEED_SOLUTIONS } from './solutions/seed.js';
import type { Store } from './store/types.js';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger('SOS Dev');

  let store: Store;
  if (config.databaseUrl) {
    const pool = new pg.Pool({ connectionString: config.databaseUrl });
    const applied = await migrate(pool);
    if (applied.length) logger.log(`Migrations appliquées : ${applied.join(', ')}`);
    store = new PgStore(pool);
  } else if (process.env.NODE_ENV === 'production' && !config.allowMemory) {
    throw new Error('DATABASE_URL est obligatoire en production.');
  } else {
    logger.warn('DATABASE_URL absent : les données restent en mémoire et disparaissent à l’arrêt.');
    store = new MemoryStore();
  }

  await store.seedSolutions(SEED_SOLUTIONS);

  if (config.devAuth) logger.warn('Mode démo actif : « sos login --dev <pseudo> » est accepté. À désactiver en production.');
  if (!config.githubClientId) logger.warn('GITHUB_CLIENT_ID absent : la connexion GitHub depuis « sos login » est indisponible.');

  const app = await createApp({ config, store });
  await app.listen(config.port);
  logger.log(`API prête sur http://localhost:${config.port} (stockage : ${store.kind})`);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
