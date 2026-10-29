import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { testApp } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof testApp>>;

describe('Salons, commentaires et abonnements', () => {
  let ctx: Ctx;
  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = async (pseudo: string) => (await http().post('/auth/dev').send({ login: pseudo }).expect(200)).body.token as string;
  const pause = () => new Promise((r) => setTimeout(r, 650));

  beforeEach(async () => {
    ctx = await testApp({ radarTickMs: 0 });
  });
  afterEach(async () => {
    await ctx.app.close();
  });

  it('needs an account and only knows the fixed rooms', async () => {
    await http().get('/spaces').expect(401);
    const awa = await login('awa');
    const rooms = (await http().get('/spaces').set(as(awa)).expect(200)).body as { id: string }[];
    expect(rooms.map((r) => r.id)).toContain('javascript');
    await http().get('/spaces/inconnu/messages').set(as(awa)).expect(404);
  });

  it('shares messages in a room, in order, and masks pasted secrets', async () => {
    const awa = await login('awa');
    const koffi = await login('koffi');
    await http().post('/spaces/javascript/messages').set(as(awa)).send({ text: 'Salut tout le monde' }).expect(201);
    await pause();
    const secret = 'ghp_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';
    await http().post('/spaces/javascript/messages').set(as(koffi)).send({ text: `mon token ${secret}` }).expect(201);
    const list = (await http().get('/spaces/javascript/messages').set(as(awa)).expect(200)).body as { author: string; text: string; at: string }[];
    expect(list.map((m) => m.author)).toEqual(['awa', 'koffi']);
    expect(list[1]!.text).not.toContain(secret);
    expect((await http().get('/spaces/python/messages').set(as(awa)).expect(200)).body).toEqual([]);
    const after = (await http().get('/spaces/javascript/messages').query({ after: list[0]!.at }).set(as(awa)).expect(200)).body as unknown[];
    expect(after).toHaveLength(1);
  });

  it('refuses empty and too fast messages', async () => {
    const awa = await login('awa');
    await http().post('/spaces/general/messages').set(as(awa)).send({ text: '   ' }).expect(400);
    await http().post('/spaces/general/messages').set(as(awa)).send({ text: 'un' }).expect(201);
    await http().post('/spaces/general/messages').set(as(awa)).send({ text: 'deux' }).expect(400);
  });

  it('lets people comment on a fiche and mark it useful once', async () => {
    const awa = await login('awa');
    const koffi = await login('koffi');
    await http().post('/spaces/fiche/sol1/comments').set(as(awa)).send({ text: 'Merci, ça marche' }).expect(201);
    expect((await http().post('/spaces/fiche/sol1/utile').set(as(awa)).expect(200)).body).toEqual({ count: 1, mine: true });
    expect((await http().post('/spaces/fiche/sol1/utile').set(as(koffi)).expect(200)).body).toEqual({ count: 2, mine: true });
    expect((await http().post('/spaces/fiche/sol1/utile').set(as(koffi)).expect(200)).body).toEqual({ count: 1, mine: false });
    const fiche = (await http().get('/spaces/fiche/sol1').set(as(awa)).expect(200)).body;
    expect(fiche).toMatchObject({ count: 1, mine: true });
    expect(fiche.comments).toHaveLength(1);
    expect(fiche.comments[0]).toMatchObject({ author: 'awa', text: 'Merci, ça marche' });
  });

  it('follows and unfollows a developer, but not yourself or a stranger', async () => {
    const awa = await login('awa');
    await login('koffi');
    expect((await http().post('/spaces/follow/koffi').set(as(awa)).expect(200)).body).toEqual({ following: true });
    expect((await http().get('/spaces/following').set(as(awa)).expect(200)).body).toEqual({ following: ['koffi'] });
    expect((await http().post('/spaces/follow/koffi').set(as(awa)).expect(200)).body).toEqual({ following: false });
    await http().post('/spaces/follow/awa').set(as(awa)).expect(404);
    await http().post('/spaces/follow/personne').set(as(awa)).expect(404);
    expect((await http().get('/spaces/feed').set(as(awa)).expect(200)).body).toEqual([]);
  });
});
