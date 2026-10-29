import 'reflect-metadata';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Module, type DynamicModule, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthService } from './auth/auth.service.js';
import { fetchGithubClient, type GithubClient } from './auth/github.js';
import { fetchGoogleClient, type GoogleClient } from './auth/google.js';
import type { AppConfig } from './config.js';
import { HealthController } from './health.controller.js';
import { RadarService } from './radar/radar.service.js';
import { SalleService } from './salle/salle.service.js';
import { PurgeService } from './requests/purge.service.js';
import { RequestsController } from './requests/requests.controller.js';
import { RequestsService } from './requests/requests.service.js';
import { SolutionsController } from './solutions/solutions.controller.js';
import { SolutionsService } from './solutions/solutions.service.js';
import { SpacesController } from './spaces/spaces.controller.js';
import { SpacesService } from './spaces/spaces.service.js';
import { CommunityController } from './community/community.controller.js';
import { CommunityService } from './community/community.service.js';
import { authRateLimit, securityHeaders } from './security.js';
import type { Store } from './store/types.js';
import { PushController } from './push/push.controller.js';
import { PushService, webPushSender } from './push/push.service.js';
import { CLOCK, CONFIG, GITHUB, GOOGLE, PUSH_SENDER, STORE, type Clock, type PushSender } from './tokens.js';

export interface AppDeps {
  config: AppConfig;
  store: Store;
  github?: GithubClient;
  google?: GoogleClient;
  clock?: Clock;
  pushSender?: PushSender;
}

@Module({})
export class AppModule {
  static forRoot(deps: AppDeps): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, AuthController, RequestsController, SolutionsController, CommunityController, SpacesController, PushController],
      providers: [
        { provide: CONFIG, useValue: deps.config },
        { provide: STORE, useValue: deps.store },
        { provide: GITHUB, useValue: deps.github ?? fetchGithubClient },
        { provide: GOOGLE, useValue: deps.google ?? fetchGoogleClient },
        { provide: CLOCK, useValue: deps.clock ?? (() => new Date()) },
        AuthService,
        AuthGuard,
        RequestsService,
        PurgeService,
        RadarService,
        SalleService,
        SolutionsService,
        CommunityService,
        SpacesService,
        PushService,
        { provide: PUSH_SENDER, useValue: deps.pushSender ?? webPushSender },
      ],
    };
  }
}

export async function createApp(deps: AppDeps, logger: LogLevel[] | false = ['error', 'warn', 'log']): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(deps), { bodyParser: false, logger });
  // A request holds up to 200 KB of files, JSON-escaped.
  app.useBodyParser('json', { limit: '1mb' });
  // Behind Render or Nginx: the real client address is the first proxy hop.
  app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(authRateLimit(Number(process.env.SOS_AUTH_RATE_PER_MIN) || 60));
  if (deps.config.serveWeb) serveWeb(app);
  app.enableShutdownHooks();
  return app;
}

const WEB_DIR = fileURLToPath(new URL('../../web/dist/', import.meta.url));

/** One address for everything: the built web app at `/`, the API under `/api` (like the Vite dev proxy). */
function serveWeb(app: NestExpressApplication): void {
  if (!fs.existsSync(WEB_DIR)) throw new Error(`SOS_SERVE_WEB=1 mais ${WEB_DIR} n’existe pas : lance « npm run build » d’abord.`);
  app.use((req: { url: string }, _res: unknown, next: () => void) => {
    if (req.url === '/api' || req.url.startsWith('/api/') || req.url.startsWith('/api?')) req.url = req.url.slice(4) || '/';
    next();
  });
  app.useStaticAssets(WEB_DIR);
}
