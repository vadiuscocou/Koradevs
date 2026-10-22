import type { SosRequest } from '@sos/shared';
import { createApp } from '../src/app.js';
import { GithubApiError, type GithubClient } from '../src/auth/github.js';
import { loadConfig, type AppConfig } from '../src/config.js';
import { MemoryStore } from '../src/store/memory.js';
import type { PushSender } from '../src/tokens.js';

export function payload(overrides: Partial<SosRequest> = {}): SosRequest {
  return {
    version: 1,
    command: 'npm start',
    exitCode: 1,
    output: "TypeError: Cannot read properties of undefined (reading 'toUpperCase')\n    at greet (users.js:2:31)",
    tech: ['JavaScript'],
    env: { os: 'linux 6.1', arch: 'x64', node: 'v22.0.0' },
    files: [{ path: 'users.js', reason: 'trace', line: 2, size: 64, secretsMasked: 0, content: 'export const greet = (user) =>\n  `Bonjour ${user.name.toUpperCase()} !`;\n' }],
    secretsMasked: 0,
    createdAt: '2026-10-08T10:00:00.000Z',
    ...overrides,
  };
}

export const fakeGithub: GithubClient = {
  async getUser(token) {
    if (token === 'gh-awa') return { id: 101, login: 'awa', name: 'Awa Diop', avatar_url: 'https://avatars.example/awa' };
    throw new GithubApiError(401);
  },
  async exchangeCode({ code, clientSecret }) {
    if (clientSecret !== 'secret-test') throw new GithubApiError(401);
    if (code === 'code-awa') return 'gh-awa';
    throw new GithubApiError(401);
  },
};

export async function testApp(config: Partial<AppConfig> = {}, extras: { pushSender?: PushSender } = {}) {
  const clock = { now: new Date('2026-10-08T10:00:00.000Z') };
  const store = new MemoryStore();
  const app = await createApp(
    {
      config: { ...loadConfig({ NODE_ENV: 'test', GITHUB_CLIENT_ID: 'client-test' }), ...config },
      store,
      github: fakeGithub,
      clock: () => clock.now,
      pushSender: extras.pushSender ?? (async () => undefined),
    },
    false,
  );
  await app.init();
  const advance = (minutes: number) => {
    clock.now = new Date(clock.now.getTime() + minutes * 60_000);
  };
  return { app, store, clock, advance };
}
