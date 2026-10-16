import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { AddressInfo } from 'node:net';
import { passportHash } from '../src/community/community.service.js';
import { payload, testApp } from './helpers.js';
import { Client } from './ws-client.js';

type Ctx = Awaited<ReturnType<typeof testApp>>;

describe('Communauté, Passeport et projets', () => {
  let ctx: Ctx;
  let url: string;
  const clients: Client[] = [];
  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  const login = async (pseudo: string) => (await http().post('/auth/dev').send({ login: pseudo }).expect(200)).body.token as string;
  const connect = async (token: string) => {
    const c = new Client(url);
    clients.push(c);
    await c.opened;
    c.send({ type: 'auth', token });
    await c.next('bienvenue');
    return c;
  };

  beforeEach(async () => {
    ctx = await testApp({ radarTickMs: 0 });
    await ctx.app.listen(0, '127.0.0.1');
    url = `ws://127.0.0.1:${(ctx.app.getHttpServer().address() as AddressInfo).port}/ws`;
  });
  afterEach(async () => {
    clients.splice(0).forEach((c) => c.close());
    await ctx.app.close();
  });

  it('never invents people, points or countries', async () => {
    const awa = await login('awa');
    expect((await http().get('/community/neighbors').set(as(awa)).expect(200)).body).toEqual([]);
    const profile = (await http().get('/community/profile').set(as(awa)).expect(200)).body;
    expect(profile).toMatchObject({ login: 'awa', city: '', country: '', doorStatus: 'fermee', tech: [], confirmedCount: 0, points: 0, badges: [] });
    await http().get('/community/countries').expect(404);
    expect((await http().get('/community/projects').expect(200)).body).toEqual([]);
  });

  it('lists only real neighbours with an open door and rings them for real', async () => {
    const awa = await login('awa');
    const koffi = await login('koffi');
    await http().put('/community/profile').set(as(awa)).send({ tech: ['JavaScript'], doorStatus: 'ouverte', city: 'Dakar', country: 'Sénégal' }).expect(200);

    const neighbours = (await http().get('/community/neighbors').set(as(koffi)).expect(200)).body;
    expect(neighbours).toMatchObject([{ login: 'awa', city: 'Dakar', tech: ['JavaScript'] }]);

    const offline = await http().post('/community/neighbors/ring/awa').set(as(koffi)).expect(201);
    expect(offline.body.success).toBe(false);

    const awaSocket = await connect(awa);
    const ring = await http().post('/community/neighbors/ring/awa').set(as(koffi)).expect(201);
    expect(ring.body.success).toBe(true);
    expect(await awaSocket.next('sonnette')).toMatchObject({ from: 'koffi' });

    await http().put('/community/profile').set(as(awa)).send({ doorStatus: 'fermee' }).expect(200);
    await http().post('/community/neighbors/ring/awa').set(as(koffi)).expect(404);
    expect((await http().get('/community/neighbors').set(as(koffi))).body).toEqual([]);
  });

  it('turns a validated fiche into a public, recomputable passport proof', async () => {
    const koffi = await login('koffi');
    const awa = await login('awa');
    await http().put('/community/profile').set(as(awa)).send({ tech: ['JavaScript'], doorStatus: 'ouverte', city: 'Dakar', country: 'Sénégal' }).expect(200);

    const id = (await http().post('/requests').set(as(koffi)).send(payload()).expect(201)).body.id as string;
    const helper = await connect(awa);
    helper.send({ type: 'disponible', tech: ['JavaScript'] });
    await helper.next('alerte');
    helper.send({ type: 'accepter', requestId: id });
    await helper.next('prise');
    helper.send({ type: 'rejoindre', requestId: id, client: 'web' });
    await helper.next('salle');

    const requester = await connect(koffi);
    requester.send({ type: 'rejoindre', requestId: id, client: 'web' });
    await requester.next('salle');

    const fiche = { error: 'TypeError: user undefined', cause: 'user absent', fix: 'tester user avant usage' };
    helper.send({ type: 'valider-fiche', requestId: id, ...fiche });
    await requester.next('fiche-validee');
    requester.send({ type: 'valider-fiche', requestId: id, ...fiche, testOk: true });
    await helper.next('salle-fermee', (m) => m.raison === 'resolue');

    const passport = (await http().get('/community/passport/awa').expect(200)).body;
    expect(passport).toMatchObject({ login: 'awa', city: 'Dakar', tech: ['JavaScript'], confirmedCount: 1 });
    expect(passport.proofs).toHaveLength(1);
    expect(passport.proofs[0].testPassed).toBe(true);

    const { hash, ...body } = passport;
    expect(hash).toBe(passportHash(body));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);

    const confirmed = (await http().get('/community/confirmed').expect(200)).body as string[];
    expect(confirmed).toContain(passport.proofs[0].solutionId);

    const profile = (await http().get('/community/profile').set(as(awa)).expect(200)).body;
    expect(profile).toMatchObject({ confirmedCount: 1, points: 3, badges: ['Confirmé'] });
    await http().get('/community/passport/personne').expect(404);
  });

  it('does not mark a sheet as confirmed when the requester never confirmed a test', async () => {
    const koffi = await login('koffi');
    const awa = await login('awa');
    const id = (await http().post('/requests').set(as(koffi)).send(payload()).expect(201)).body.id as string;
    const helper = await connect(awa);
    helper.send({ type: 'disponible', tech: ['JavaScript'] });
    await helper.next('alerte');
    helper.send({ type: 'accepter', requestId: id });
    await helper.next('prise');
    helper.send({ type: 'rejoindre', requestId: id, client: 'web' });
    await helper.next('salle');
    const requester = await connect(koffi);
    requester.send({ type: 'rejoindre', requestId: id, client: 'web' });
    await requester.next('salle');

    const fiche = { error: 'e', cause: 'c', fix: 'f' };
    helper.send({ type: 'valider-fiche', requestId: id, ...fiche });
    requester.send({ type: 'valider-fiche', requestId: id, ...fiche });
    await helper.next('salle-fermee');

    const passport = (await http().get('/community/passport/awa').expect(200)).body;
    expect(passport.proofs[0].testPassed).toBe(false);
    expect((await http().get('/community/confirmed').expect(200)).body).toEqual([]);
  });

  it('lets the author decide who joins a project and only members touch the board', async () => {
    const awa = await login('awa');
    const koffi = await login('koffi');
    await http().post('/community/projects').set(as(awa)).send({ title: 'x', description: 'court' }).expect(400);
    const project = (
      await http()
        .post('/community/projects')
        .set(as(awa))
        .send({ title: 'AfriCode', description: 'Une plateforme pour les écoles tech.', tech: ['React'], neededRoles: ['Designer'], repoUrl: 'javascript:alert(1)' })
        .expect(201)
    ).body;
    expect(project).toMatchObject({ author: 'awa', members: ['awa'], requests: [] });
    expect(project.repoUrl).toBeUndefined();

    await http().post(`/community/projects/${project.id}/tasks`).set(as(koffi)).send({ title: 'Hors équipe' }).expect(400);
    await http().post(`/community/projects/${project.id}/join`).set(as(koffi)).expect(201);
    let current = (await http().get('/community/projects')).body[0];
    expect(current.requests).toEqual(['koffi']);
    expect(current.members).toEqual(['awa']);

    await http().post(`/community/projects/${project.id}/requests/koffi`).set(as(koffi)).send({ accept: true }).expect(404);
    await http().post(`/community/projects/${project.id}/requests/koffi`).set(as(awa)).send({ accept: true }).expect(201);
    current = (await http().get('/community/projects')).body[0];
    expect(current).toMatchObject({ members: ['awa', 'koffi'], requests: [] });

    const task = (await http().post(`/community/projects/${project.id}/tasks`).set(as(koffi)).send({ title: 'Maquette' }).expect(201)).body.task;
    await http().patch(`/community/projects/${project.id}/tasks/${task.id}`).set(as(koffi)).send({ status: 'termine' }).expect(200);
    await http().patch(`/community/projects/${project.id}/tasks/${task.id}`).set(as(koffi)).send({ status: 'nimporte' }).expect(400);
    expect((await http().get('/community/projects')).body[0].tasks[0]).toMatchObject({ title: 'Maquette', status: 'termine' });
  });
});
