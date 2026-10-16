import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { testApp } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof testApp>>;

describe('Connexion GitHub depuis le site', () => {
  let ctx: Ctx;
  const http = () => request(ctx.app.getHttpServer());

  /** Starts the flow like a browser: returns the state GitHub would send back and the cookie to replay. */
  const start = async () => {
    const res = await http().get('/auth/github/login').expect(302);
    const url = new URL(res.headers.location as string);
    const cookie = String(res.headers['set-cookie']?.[0]).split(';')[0]!;
    return { url, state: url.searchParams.get('state')!, cookie };
  };

  beforeEach(async () => {
    ctx = await testApp({ githubClientSecret: 'secret-test', webUrl: 'http://sos.test' });
  });
  afterEach(async () => {
    await ctx.app.close();
  });

  it('is announced by /auth/config only when the secret is set', async () => {
    expect((await http().get('/auth/config').expect(200)).body.githubWeb).toBe(true);
    const off = await testApp();
    expect((await request(off.app.getHttpServer()).get('/auth/config')).body.githubWeb).toBe(false);
    await request(off.app.getHttpServer()).get('/auth/github/login').expect(503);
    await off.app.close();
  });

  it('sends the person to GitHub with the right parameters and a protective cookie', async () => {
    const { url, cookie } = await start();
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-test');
    expect(url.searchParams.get('redirect_uri')).toBe('http://sos.test/api/auth/github/callback');
    expect(url.searchParams.get('scope')).toBe('read:user');
    expect(cookie).toMatch(/^sos_oauth=[\w-]+$/);
  });

  it('logs in on return, and gives the session token in the URL fragment only', async () => {
    const { state, cookie } = await start();
    const res = await http().get('/auth/github/callback').query({ code: 'code-awa', state }).set('Cookie', cookie).expect(302);
    const back = new URL(res.headers.location as string);
    expect(back.origin).toBe('http://sos.test');
    expect(back.search).toBe('');
    const token = new URLSearchParams(back.hash.split('?')[1]).get('token')!;
    expect(token).toMatch(/^sos_/);
    const me = await http().get('/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body).toMatchObject({ login: 'awa', provider: 'github' });
  });

  it('refuses a forged state, a missing cookie, another browser, or a code GitHub rejects', async () => {
    const { state, cookie } = await start();
    const other = await start();
    const attempts = [
      { query: { code: 'code-awa', state: 'faux.123.abc' }, cookie },
      { query: { code: 'code-awa', state }, cookie: undefined },
      { query: { code: 'code-awa', state }, cookie: other.cookie },
      { query: { code: 'mauvais', state }, cookie },
      { query: { state }, cookie },
    ];
    for (const a of attempts) {
      const req = http().get('/auth/github/callback').query(a.query);
      const res = await (a.cookie ? req.set('Cookie', a.cookie) : req).expect(302);
      const hash = new URL(res.headers.location as string).hash;
      expect(hash).toContain('erreur=');
      expect(hash).not.toContain('token=');
    }
  });

  it('rejects an expired state', async () => {
    const { state, cookie } = await start();
    ctx.clock.now = new Date(ctx.clock.now.getTime() + 11 * 60_000);
    const res = await http().get('/auth/github/callback').query({ code: 'code-awa', state }).set('Cookie', cookie).expect(302);
    expect(new URL(res.headers.location as string).hash).toContain('erreur=');
  });

  it('limits login attempts per address and adds security headers', async () => {
    const res = await http().get('/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-powered-by']).toBeUndefined();
    let last = 0;
    for (let i = 0; i < 70; i++) last = (await http().get('/auth/config')).status;
    expect(last).toBe(429);
  });
});
