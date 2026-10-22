export interface AppConfig {
  port: number;
  databaseUrl: string | undefined;
  githubClientId: string | undefined;
  /** Secret of the GitHub OAuth App, only needed for the GitHub button of the website. */
  githubClientSecret: string | undefined;
  /** « Continuer avec Google » : OAuth client of the Google Cloud project. */
  googleClientId: string | undefined;
  googleClientSecret: string | undefined;
  /** Sign up and log in with an e-mail and a password. */
  passwordAuth: boolean;
  /** Allows `sos login --dev <pseudo>` without GitHub. Never enable in production. */
  devAuth: boolean;
  /** The code of a request is erased after this delay (24 h maximum). */
  requestTtlHours: number;
  maxRequestsPerHour: number;
  sessionTtlDays: number;
  /** Radar: after this delay without a helper, close techs are alerted too. */
  widenAfterSeconds: number;
  /** Radar: after this delay, every available helper sees the request (public queue). */
  publicAfterSeconds: number;
  /** How often the Radar re-checks open requests (0 = never, tests call tick()). */
  radarTickMs: number;
  /** Web interface, used to link to the Salle SOS from the terminal. */
  webUrl: string;
  /** Serves the built web interface (web/dist) and the API under /api: one single address to deploy. */
  serveWeb: boolean;
  /** Lets the server run on its in-memory store in production (team tests: data is lost on restart). */
  allowMemory: boolean;
}

function numberFrom(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (value === undefined || value === '' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const production = env.NODE_ENV === 'production';
  return {
    port: numberFrom(env.PORT, 4000, 1, 65535),
    databaseUrl: env.DATABASE_URL || undefined,
    githubClientId: env.GITHUB_CLIENT_ID || undefined,
    githubClientSecret: env.GITHUB_CLIENT_SECRET || undefined,
    googleClientId: env.GOOGLE_CLIENT_ID || undefined,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET || undefined,
    passwordAuth: env.SOS_PASSWORD_AUTH !== '0',
    devAuth: env.SOS_DEV_AUTH !== undefined && env.SOS_DEV_AUTH !== '' ? env.SOS_DEV_AUTH === '1' : !production,
    requestTtlHours: numberFrom(env.SOS_REQUEST_TTL_HOURS, 24, 1, 24),
    maxRequestsPerHour: numberFrom(env.SOS_MAX_REQUESTS_PER_HOUR, 3, 1, 1000),
    sessionTtlDays: 30,
    widenAfterSeconds: numberFrom(env.SOS_WIDEN_AFTER_SECONDS, 120, 0, 3600),
    publicAfterSeconds: numberFrom(env.SOS_PUBLIC_AFTER_SECONDS, 300, 0, 86400),
    radarTickMs: numberFrom(env.SOS_RADAR_TICK_MS, 3000, 0, 60000),
    webUrl: (env.SOS_WEB_URL || 'http://localhost:5173').replace(/\/+$/, ''),
    serveWeb: env.SOS_SERVE_WEB === '1',
    allowMemory: env.SOS_ALLOW_MEMORY === '1',
  };
}
