import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { maskSecrets } from '@sos/shared';
import { loadConfig } from '../src/config.js';
import { payload, testApp } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof testApp>>;

describe('API SOS Dev', () => {
  let ctx: Ctx;
  let app: NestExpressApplication;

  const http = () => request(app.getHttpServer());
  const login = async (pseudo = 'koffi') => {
    const res = await http().post('/auth/dev').send({ login: pseudo }).expect(200);
    return res.body.token as string;
  };

  beforeEach(async () => {
    ctx = await testApp();
    app = ctx.app;
  });
  afterEach(async () => {
    await app.close();
  });

  it('reports its health and public auth config', async () => {
    await http().get('/health').expect(200, { ok: true, store: 'memoire' });
    await http().get('/auth/config').expect(200, { githubClientId: 'client-test', devAuth: true, githubWeb: false, googleWeb: false, passwordAuth: true });
  });

  describe('connexion', () => {
    it('logs in with GitHub without storing the GitHub token, and keeps the same account', async () => {
      const first = await http().post('/auth/github').send({ accessToken: 'gh-awa' }).expect(200);
      expect(first.body.token).toMatch(/^sos_[\w-]{43}$/);
      expect(first.body.user).toMatchObject({ login: 'awa', name: 'Awa Diop', provider: 'github' });
      const second = await http().post('/auth/github').send({ accessToken: 'gh-awa' }).expect(200);
      expect(second.body.user.id).toBe(first.body.user.id);
      const me = await http().get('/me').set('Authorization', `Bearer ${second.body.token}`).expect(200);
      expect(me.body.login).toBe('awa');
    });

    it('rejects a token GitHub refuses', async () => {
      await http().post('/auth/github').send({ accessToken: 'bad' }).expect(401);
      await http().post('/auth/github').send({}).expect(400);
    });

    it('never offers the demo mode in production, whatever the environment says', () => {
      expect(loadConfig({ NODE_ENV: 'production', SOS_DEV_AUTH: '1' }).devAuth).toBe(false);
      expect(loadConfig({ NODE_ENV: 'production' }).devAuth).toBe(false);
      expect(loadConfig({ NODE_ENV: 'development', SOS_DEV_AUTH: '1' }).devAuth).toBe(true);
      expect(loadConfig({ NODE_ENV: 'development', SOS_DEV_AUTH: '0' }).devAuth).toBe(false);
    });

    it('supports the demo mode only when enabled', async () => {
      await http().post('/auth/dev').send({ login: 'pas un pseudo!' }).expect(400);
      const off = await testApp({ devAuth: false });
      await request(off.app.getHttpServer()).post('/auth/dev').send({ login: 'koffi' }).expect(403);
      await off.app.close();
    });

    it('requires a valid session and supports logout', async () => {
      const unauth = await http().get('/me').expect(401);
      expect(unauth.body.message).toContain('sos login');
      await http().get('/me').set('Authorization', 'Bearer sos_inconnu').expect(401);
      const token = await login();
      await http().post('/auth/logout').set('Authorization', `Bearer ${token}`).expect(204);
      await http().get('/me').set('Authorization', `Bearer ${token}`).expect(401);
    });
  });

  describe('demandes', () => {
    it('stores a request and lets its author read it back', async () => {
      const token = await login();
      const created = await http().post('/requests').set('Authorization', `Bearer ${token}`).send(payload()).expect(201);
      expect(created.body).toMatchObject({ status: 'ouverte', tech: ['JavaScript'], command: 'npm start', files: 1, secondPassMasked: 0 });
      expect(new Date(created.body.expiresAt).getTime() - new Date(created.body.createdAt).getTime()).toBe(24 * 3600_000);

      const detail = await http().get(`/requests/${created.body.id}`).set('Authorization', `Bearer ${token}`).expect(200);
      expect(detail.body.request.files[0].path).toBe('users.js');
      const list = await http().get('/requests').set('Authorization', `Bearer ${token}`).expect(200);
      expect(list.body.map((r: { id: string }) => r.id)).toEqual([created.body.id]);
    });

    it('masks secrets a second time on the server', async () => {
      const token = await login();
      const leaked = `ghp_${'a1B2c3D4e5'.repeat(3)}abcdef`;
      const res = await http()
        .post('/requests')
        .set('Authorization', `Bearer ${token}`)
        .send(payload({ output: `fatal: auth failed with ${leaked}`, files: [{ path: 'config.js', reason: 'ajout', size: 60, secretsMasked: 0, content: `export const token = '${leaked}';\n` }] }))
        .expect(201);
      expect(res.body.secondPassMasked).toBe(2);
      const detail = await http().get(`/requests/${res.body.id}`).set('Authorization', `Bearer ${token}`).expect(200);
      expect(JSON.stringify(detail.body)).not.toContain(leaked);
      expect(detail.body.request.files[0].secretsMasked).toBe(1);
    });

    it('does not count placeholders from the CLI as new secrets', async () => {
      const token = await login();
      const masked = maskSecrets("const API_KEY = 'demo_9fK2xQ7LmP4vT8sW1zR6aB3';\nconst url = 'postgres://admin:motdepasse@localhost:5432/app';\n");
      expect(masked.findings.length).toBeGreaterThan(0);
      const res = await http()
        .post('/requests')
        .set('Authorization', `Bearer ${token}`)
        .send(payload({ output: masked.text, files: [{ path: 'index.js', reason: 'trace', size: 80, secretsMasked: 2, content: masked.text }], secretsMasked: 4 }))
        .expect(201);
      expect(res.body.secondPassMasked).toBe(0);
      expect(res.body.secretsMasked).toBe(4);
    });

    it('refuses invalid requests, sensitive files and paths outside the project', async () => {
      const token = await login();
      const auth = { Authorization: `Bearer ${token}` };
      const invalid = await http().post('/requests').set(auth).send({ version: 2 }).expect(400);
      expect(invalid.body.issues.length).toBeGreaterThan(0);
      const file = { reason: 'ajout', size: 10, secretsMasked: 0, content: 'X=1' } as const;
      const env = await http().post('/requests').set(auth).send(payload({ files: [{ ...file, path: 'config/.env.local' }] })).expect(400);
      expect(env.body.message).toContain('fichier sensible');
      await http().post('/requests').set(auth).send(payload({ files: [{ ...file, path: '../../etc/passwd' }] })).expect(400);
      await http().post('/requests').set(auth).send(payload({ files: [{ ...file, path: '/etc/passwd' }] })).expect(400);
      const big = 'x'.repeat(120 * 1024);
      await http()
        .post('/requests')
        .set(auth)
        .send(payload({ files: [{ ...file, path: 'a.txt', content: big }, { ...file, path: 'b.txt', content: big }] }))
        .expect(413);
    });

    it('limits each user to 3 requests per hour', async () => {
      const token = await login();
      const send = () => http().post('/requests').set('Authorization', `Bearer ${token}`).send(payload());
      for (let i = 0; i < 3; i++) await send().expect(201);
      const limited = await send().expect(429);
      expect(limited.body.message).toContain('3 demandes par heure');
      const other = await login('awa');
      await http().post('/requests').set('Authorization', `Bearer ${other}`).send(payload()).expect(201);
      ctx.advance(61);
      await send().expect(201);
    });

    it("hides other people's requests", async () => {
      const owner = await login('awa');
      const intruder = await login('koffi');
      const created = await http().post('/requests').set('Authorization', `Bearer ${owner}`).send(payload()).expect(201);
      await http().get(`/requests/${created.body.id}`).set('Authorization', `Bearer ${intruder}`).expect(403);
      await http().get('/requests/00000000-0000-4000-8000-000000000000').set('Authorization', `Bearer ${intruder}`).expect(404);
      await http().get('/requests/pas-un-id').set('Authorization', `Bearer ${intruder}`).expect(404);
      const list = await http().get('/requests').set('Authorization', `Bearer ${intruder}`).expect(200);
      expect(list.body).toEqual([]);
    });

    it('erases the code after 24 hours', async () => {
      const token = await login();
      const created = await http().post('/requests').set('Authorization', `Bearer ${token}`).send(payload()).expect(201);
      ctx.advance(24 * 60 + 1);
      await http().get(`/requests/${created.body.id}`).set('Authorization', `Bearer ${token}`).expect(404);
      expect(await ctx.store.purgeExpired(ctx.clock.now)).toEqual({ requests: 1, sessions: 0 });
    });
  });
});
