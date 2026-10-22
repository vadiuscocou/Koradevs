import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hashPassword, passwordProblem, verifyPassword } from '../src/auth/password.js';
import { testApp } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof testApp>>;

describe('mots de passe', () => {
  it('hashes with a random salt and verifies only the right password', async () => {
    const a = await hashPassword('un mot de passe solide');
    const b = await hashPassword('un mot de passe solide');
    expect(a).toMatch(/^scrypt\$32768\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain('solide');
    expect(await verifyPassword('un mot de passe solide', a)).toBe(true);
    expect(await verifyPassword('un mot de passe solidE', a)).toBe(false);
    expect(await verifyPassword('x', 'pas-un-hash')).toBe(false);
  });

  it('treats accented text the same however it is typed', async () => {
    const hash = await hashPassword('café-très-sûr');
    expect(await verifyPassword('café-très-sûr', hash)).toBe(true);
  });

  it('refuses weak passwords', () => {
    expect(passwordProblem('court')).toContain('8 caractères');
    expect(passwordProblem('password')).toContain('courant');
    expect(passwordProblem('aaaaaaaaaa')).toContain('simple');
    expect(passwordProblem('awa-diop', { login: 'Awa-Diop' })).toContain('pseudo');
    expect(passwordProblem('x'.repeat(129))).toContain('trop long');
    expect(passwordProblem('une phrase de passe correcte')).toBeNull();
  });
});

describe('Créer un compte et se connecter', () => {
  let ctx: Ctx | undefined;
  const http = () => request(ctx!.app.getHttpServer());
  const good = { email: 'awa@example.com', login: 'Awa', password: 'une phrase de passe correcte' };

  afterEach(async () => {
    await ctx?.app.close();
    ctx = undefined;
  });

  it('creates an account, opens a session, and never stores the password', async () => {
    ctx = await testApp();
    const res = await http().post('/auth/signup').send(good).expect(201);
    expect(res.body.token).toMatch(/^sos_/);
    expect(res.body.user).toMatchObject({ login: 'Awa', provider: 'password' });
    expect((await http().get('/me').set('Authorization', `Bearer ${res.body.token}`).expect(200)).body.login).toBe('Awa');

    const stored = await ctx.store.findCredential('awa@example.com');
    expect(stored!.passwordHash).toMatch(/^scrypt\$/);
    expect(stored!.passwordHash).not.toContain(good.password);
  });

  it('validates what it receives, with clear messages', async () => {
    ctx = await testApp();
    const send = (body: object) => http().post('/auth/signup').send({ ...good, ...body });
    expect((await send({ email: 'pas-un-email' }).expect(400)).body.message).toContain('e-mail');
    expect((await send({ login: 'a' }).expect(400)).body.message).toContain('Pseudo invalide');
    expect((await send({ login: 'mon pseudo!' }).expect(400)).body.message).toContain('Pseudo invalide');
    expect((await send({ login: 'admin' }).expect(400)).body.message).toContain('réservé');
    expect((await send({ password: 'court' }).expect(400)).body.message).toContain('8 caractères');
    expect((await send({ password: 'password' }).expect(400)).body.message).toContain('courant');
    await http().post('/auth/signup').send({ email: good.email }).expect(400);
  });

  it('refuses an e-mail or a pseudo that is already taken, whatever the case', async () => {
    ctx = await testApp();
    await http().post('/auth/signup').send(good).expect(201);
    expect((await http().post('/auth/signup').send({ ...good, login: 'Autre' }).expect(409)).body.message).toContain('e-mail');
    expect((await http().post('/auth/signup').send({ ...good, email: 'AWA@EXAMPLE.COM', login: 'Autre' }).expect(409)).body.message).toContain('e-mail');
    expect((await http().post('/auth/signup').send({ ...good, email: 'autre@example.com', login: 'AWA' }).expect(409)).body.message).toContain('pseudo');
    // A demo-mode pseudo counts too.
    await http().post('/auth/dev').send({ login: 'koffi' }).expect(200);
    await http().post('/auth/signup').send({ ...good, email: 'k@example.com', login: 'Koffi' }).expect(409);
  });

  it('logs in with the right password, the e-mail in any case, and says nothing about which part is wrong', async () => {
    ctx = await testApp();
    await http().post('/auth/signup').send(good).expect(201);
    const ok = await http().post('/auth/login').send({ email: ' Awa@Example.com ', password: good.password }).expect(200);
    expect(ok.body.user.login).toBe('Awa');

    const wrongPassword = await http().post('/auth/login').send({ email: good.email, password: 'mauvais mot de passe' }).expect(401);
    const unknownEmail = await http().post('/auth/login').send({ email: 'personne@example.com', password: good.password }).expect(401);
    expect(wrongPassword.body.message).toBe('E-mail ou mot de passe incorrect.');
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });

  it('slows down guessing: 8 wrong passwords block that address for 15 minutes, then it clears', async () => {
    ctx = await testApp();
    await http().post('/auth/signup').send(good).expect(201);
    for (let i = 0; i < 8; i++) await http().post('/auth/login').send({ email: good.email, password: `essai numero ${i}` }).expect(401);

    const blocked = await http().post('/auth/login').send({ email: good.email, password: good.password }).expect(429);
    expect(blocked.body.message).toContain('Réessaie');

    ctx.advance(16);
    await http().post('/auth/login').send({ email: good.email, password: good.password }).expect(200);
  }, 30_000);

  it('can be turned off', async () => {
    ctx = await testApp({ passwordAuth: false });
    await http().post('/auth/signup').send(good).expect(403);
    await http().post('/auth/login').send({ email: good.email, password: good.password }).expect(403);
    expect((await http().get('/auth/config').expect(200)).body.passwordAuth).toBe(false);
  });
});

describe('Continuer avec Google, et pseudos uniques', () => {
  let ctx: Ctx | undefined;
  const http = () => request(ctx!.app.getHttpServer());
  const config = { googleClientId: 'google-client-test', googleClientSecret: 'google-secret-test', githubClientSecret: 'secret-test', webUrl: 'http://sos.test' };

  afterEach(async () => {
    await ctx?.app.close();
    ctx = undefined;
  });

  const start = async (provider: 'google' | 'github') => {
    const res = await http().get(`/auth/${provider}/login`).expect(302);
    return { url: new URL(res.headers.location as string), cookie: String(res.headers['set-cookie']?.[0]).split(';')[0]! };
  };
  const hashOf = (location: string) => new URLSearchParams(new URL(location).hash.split('?')[1]);

  it('is announced only when configured, and sends to Google with the right parameters', async () => {
    ctx = await testApp();
    expect((await http().get('/auth/config')).body.googleWeb).toBe(false);
    await http().get('/auth/google/login').expect(503);
    await ctx.app.close();

    ctx = await testApp(config);
    expect((await http().get('/auth/config')).body.googleWeb).toBe(true);
    const { url } = await start('google');
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('google-client-test');
    expect(url.searchParams.get('redirect_uri')).toBe('http://sos.test/api/auth/google/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
  });

  it('creates the account on first visit and finds it again on the next, with a pseudo made from the name', async () => {
    ctx = await testApp(config);
    const first = await start('google');
    const back = await http().get('/auth/google/callback').query({ code: 'code-g-awa', state: first.url.searchParams.get('state')! }).set('Cookie', first.cookie).expect(302);
    const token = hashOf(back.headers.location as string).get('token')!;
    const me = await http().get('/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body).toMatchObject({ login: 'Awa-Diop', provider: 'google', name: 'Awa Diop', avatarUrl: 'https://lh3.example/awa.png' });

    const second = await start('google');
    const again = await http().get('/auth/google/callback').query({ code: 'code-g-awa', state: second.url.searchParams.get('state')! }).set('Cookie', second.cookie).expect(302);
    const token2 = hashOf(again.headers.location as string).get('token')!;
    expect((await http().get('/me').set('Authorization', `Bearer ${token2}`)).body.id).toBe(me.body.id);
  });

  it('gives a different pseudo when the wanted one is taken', async () => {
    ctx = await testApp(config);
    await http().post('/auth/signup').send({ email: 'a@example.com', login: 'Awa-Diop', password: 'une phrase de passe correcte' }).expect(201);
    const { url, cookie } = await start('google');
    const back = await http().get('/auth/google/callback').query({ code: 'code-g-awa', state: url.searchParams.get('state')! }).set('Cookie', cookie).expect(302);
    const token = hashOf(back.headers.location as string).get('token')!;
    expect((await http().get('/me').set('Authorization', `Bearer ${token}`)).body.login).toBe('Awa-Diop-2');
  });

  it('gives a GitHub newcomer a free pseudo too, and refuses a state started for another provider', async () => {
    ctx = await testApp(config);
    await http().post('/auth/dev').send({ login: 'awa' }).expect(200);
    const gh = await start('github');
    const back = await http().get('/auth/github/callback').query({ code: 'code-awa', state: gh.url.searchParams.get('state')! }).set('Cookie', gh.cookie).expect(302);
    const token = hashOf(back.headers.location as string).get('token')!;
    expect((await http().get('/me').set('Authorization', `Bearer ${token}`)).body).toMatchObject({ login: 'awa-2', provider: 'github' });

    // The state of a GitHub login cannot be replayed at the Google callback.
    const other = await start('github');
    const replay = await http().get('/auth/google/callback').query({ code: 'code-g-awa', state: other.url.searchParams.get('state')! }).set('Cookie', other.cookie).expect(302);
    const params = hashOf(replay.headers.location as string);
    expect(params.get('erreur')).toContain('Google');
    expect(params.get('token')).toBeNull();
  });

  it('refuses a code Google rejects', async () => {
    ctx = await testApp(config);
    const { url, cookie } = await start('google');
    const back = await http().get('/auth/google/callback').query({ code: 'mauvais', state: url.searchParams.get('state')! }).set('Cookie', cookie).expect(302);
    expect(hashOf(back.headers.location as string).get('erreur')).toContain('Google a refusé');
  });
});
