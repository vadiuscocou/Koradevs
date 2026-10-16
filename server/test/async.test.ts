import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { AddressInfo } from 'node:net';
import { payload, testApp } from './helpers.js';
import { Client } from './ws-client.js';

type Ctx = Awaited<ReturnType<typeof testApp>>;

describe('Demande sans aidant en ligne : reprise plus tard', () => {
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

  it('keeps the request open, then shows who took it when the requester comes back', async () => {
    const koffi = await login('koffi');
    const awa = await login('awa');
    const id = (await http().post('/requests').set(as(koffi)).send(payload()).expect(201)).body.id as string;

    // Nobody is online: the request just waits, with its error line, and no helper yet.
    const waiting = (await http().get('/requests').set(as(koffi)).expect(200)).body;
    expect(waiting).toMatchObject([{ id, status: 'ouverte', helper: null }]);
    expect(waiting[0].errorSummary).toContain('Cannot read properties of undefined');

    // The requester is offline when a helper arrives later and takes it.
    const helper = await connect(awa);
    helper.send({ type: 'disponible', tech: ['JavaScript'] });
    await helper.next('alerte');
    helper.send({ type: 'accepter', requestId: id });
    await helper.next('prise');

    // Back later: the list tells who is waiting, and the room is still there with the helper.
    const back = (await http().get('/requests').set(as(koffi)).expect(200)).body;
    expect(back).toMatchObject([{ id, status: 'acceptee', helper: 'awa' }]);
    expect((await http().get(`/requests/${id}`).set(as(koffi)).expect(200)).body.helper).toBe('awa');

    helper.send({ type: 'rejoindre', requestId: id, client: 'web' });
    await helper.next('salle');
    helper.send({ type: 'message', requestId: id, text: 'Regarde la ligne 2.' });

    const requester = await connect(koffi);
    requester.send({ type: 'rejoindre', requestId: id, client: 'web' });
    const { salle } = await requester.next('salle');
    expect(salle.chat.map((m) => m.text)).toContain('Regarde la ligne 2.');
  });

  it('tells a requester who follows an open request as soon as a helper takes it', async () => {
    const koffi = await login('koffi');
    const awa = await login('awa');
    const id = (await http().post('/requests').set(as(koffi)).send(payload()).expect(201)).body.id as string;

    const requester = await connect(koffi);
    requester.send({ type: 'suivre', requestId: id });

    const helper = await connect(awa);
    helper.send({ type: 'disponible', tech: ['JavaScript'] });
    await helper.next('alerte');
    helper.send({ type: 'accepter', requestId: id });
    expect(await requester.next('acceptee')).toMatchObject({ requestId: id, helper: { login: 'awa' } });
  });
});
