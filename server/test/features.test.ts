import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { AddressInfo } from 'node:net';
import * as Y from 'yjs';
import type { PushSender } from '../src/tokens.js';
import { payload, testApp } from './helpers.js';
import { Client } from './ws-client.js';

type Ctx = Awaited<ReturnType<typeof testApp>>;

describe('Exécution, avant/après et notifications', () => {
  let ctx: Ctx | undefined;
  let url = '';
  const clients: Client[] = [];
  const http = () => request(ctx!.app.getHttpServer());
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

  const start = async (extras: Parameters<typeof testApp>[1] = {}) => {
    ctx = await testApp({ radarTickMs: 0 }, extras);
    await ctx.app.listen(0, '127.0.0.1');
    url = `ws://127.0.0.1:${(ctx.app.getHttpServer().address() as AddressInfo).port}/ws`;
  };

  /** koffi asks, awa helps. Both are in the room. */
  const inRoom = async () => {
    const koffi = await login('koffi');
    const awa = await login('awa');
    const id = (await http().post('/requests').set(as(koffi)).send(payload()).expect(201)).body.id as string;
    const helper = await connect(awa);
    helper.send({ type: 'disponible', tech: ['JavaScript'] });
    await helper.next('alerte');
    helper.send({ type: 'accepter', requestId: id });
    await helper.next('prise');
    helper.send({ type: 'rejoindre', requestId: id, client: 'web' });
    const helperRoom = (await helper.next('salle')).salle;
    const requester = await connect(koffi);
    requester.send({ type: 'rejoindre', requestId: id, client: 'web' });
    const requesterRoom = (await requester.next('salle')).salle;
    return { id, koffi, awa, helper, requester, helperRoom, requesterRoom };
  };

  afterEach(async () => {
    clients.splice(0).forEach((c) => c.close());
    await ctx?.app.close();
    ctx = undefined;
  });

  describe('exécution dans le navigateur', () => {
    it('shares the result with both people and masks secrets in the output', async () => {
      await start();
      const { id, helper, requester } = await inRoom();
      helper.send({ type: 'resultat', requestId: id, ok: false, output: 'TypeError: boom\nclé = ghp_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8', path: 'users.js' });
      const seen = await requester.next('resultat');
      expect(seen).toMatchObject({ by: 'awa', role: 'aidant', ok: false, path: 'users.js' });
      expect(seen.output).toContain('TypeError: boom');
      expect(seen.output).not.toContain('ghp_a1B2');
      await helper.next('resultat');
    });

    it('counts only a green run by the requester as a confirmed test', async () => {
      await start();
      const { id, koffi, awa, helper, requester } = await inRoom();
      helper.send({ type: 'resultat', requestId: id, ok: true, output: 'ok', path: 'users.js' });
      await requester.next('resultat');
      const fiche = { error: 'e', cause: 'c', fix: 'f' };
      helper.send({ type: 'valider-fiche', requestId: id, ...fiche });
      requester.send({ type: 'valider-fiche', requestId: id, ...fiche });
      await helper.next('salle-fermee');
      expect((await http().get('/community/passport/awa').expect(200)).body.proofs[0].testPassed).toBe(false);
      void koffi;
      void awa;
    });

    it('confirms the test when the requester ran the code successfully, and remembers it for a late joiner', async () => {
      await start();
      const { id, koffi, helper, requester } = await inRoom();
      requester.send({ type: 'resultat', requestId: id, ok: true, output: 'BONJOUR AWA', path: 'users.js' });
      await helper.next('resultat');

      const again = await connect(koffi);
      again.send({ type: 'rejoindre', requestId: id, client: 'web' });
      const { salle } = await again.next('salle');
      expect(salle.testOk).toBe(true);
      expect(salle.lastRun).toMatchObject({ by: 'koffi', ok: true, output: 'BONJOUR AWA' });

      const fiche = { error: 'e', cause: 'c', fix: 'f' };
      helper.send({ type: 'valider-fiche', requestId: id, ...fiche });
      requester.send({ type: 'valider-fiche', requestId: id, ...fiche });
      await helper.next('salle-fermee');
      expect((await http().get('/community/passport/awa').expect(200)).body.proofs[0].testPassed).toBe(true);
    });
  });

  describe('avant / après d’une fiche', () => {
    const edit = (room: { doc: string }, requestId: string, client: Client) => {
      const doc = new Y.Doc();
      Y.applyUpdate(doc, Buffer.from(room.doc, 'base64'));
      doc.on('update', (u: Uint8Array) => client.send({ type: 'yjs', requestId, update: Buffer.from(u).toString('base64') }));
      const text = doc.getText('users.js');
      text.insert(0, '// corrigé\n');
      return doc;
    };

    it('publishes the changed code only when the requester agrees, with secrets masked', async () => {
      await start();
      const { id, helper, requester, helperRoom } = await inRoom();
      edit(helperRoom, id, helper);
      await requester.next('yjs');
      const fiche = { error: 'e', cause: 'c', fix: 'f' };
      helper.send({ type: 'valider-fiche', requestId: id, ...fiche });
      requester.send({ type: 'valider-fiche', requestId: id, ...fiche, includeDiff: true });
      await helper.next('salle-fermee');

      const proof = (await http().get('/community/passport/awa').expect(200)).body.proofs[0];
      const replay = (await http().get(`/community/replay/${proof.solutionId}`).expect(200)).body;
      expect(replay.files).toHaveLength(1);
      expect(replay.files[0].path).toBe('users.js');
      expect(replay.files[0].after).toBe(`// corrigé\n${replay.files[0].before}`);
    });

    it('publishes nothing by default', async () => {
      await start();
      const { id, helper, requester, helperRoom } = await inRoom();
      edit(helperRoom, id, helper);
      await requester.next('yjs');
      const fiche = { error: 'e', cause: 'c', fix: 'f' };
      helper.send({ type: 'valider-fiche', requestId: id, ...fiche });
      requester.send({ type: 'valider-fiche', requestId: id, ...fiche });
      await helper.next('salle-fermee');
      const proof = (await http().get('/community/passport/awa').expect(200)).body.proofs[0];
      await http().get(`/community/replay/${proof.solutionId}`).expect(404);
    });
  });

  describe('notifications Web Push', () => {
    const subscription = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p'.repeat(30), auth: 'a'.repeat(16) } };

    it('serves a public key and stores subscriptions per user', async () => {
      await start();
      const key = (await http().get('/push/key').expect(200)).body.publicKey as string;
      expect(key.length).toBeGreaterThan(40);
      expect((await http().get('/push/key')).body.publicKey).toBe(key);
      const koffi = await login('koffi');
      await http().get('/push/status').set(as(koffi)).expect(200, { subscribed: false });
      await http().post('/push/subscribe').set(as(koffi)).send({ endpoint: 'http://pas-https', keys: subscription.keys }).expect(400);
      await http().post('/push/subscribe').set(as(koffi)).send(subscription).expect(204);
      await http().get('/push/status').set(as(koffi)).expect(200, { subscribed: true });
      await http().delete('/push/subscribe').set(as(koffi)).send({ endpoint: subscription.endpoint }).expect(204);
      await http().get('/push/status').set(as(koffi)).expect(200, { subscribed: false });
      await http().post('/push/subscribe').send(subscription).expect(401);
    });

    it('notifies a requester who closed the page when a helper takes the request, not one who is watching', async () => {
      const sent: Array<{ endpoint: string; title: string; url: string }> = [];
      const sender: PushSender = async (sub, message) => {
        sent.push({ endpoint: sub.endpoint, title: message.title, url: message.url });
      };
      await start({ pushSender: sender });
      const koffi = await login('koffi');
      const awa = await login('awa');
      await http().post('/push/subscribe').set(as(koffi)).send(subscription).expect(204);

      // Page closed: nobody follows the request.
      const first = (await http().post('/requests').set(as(koffi)).send(payload()).expect(201)).body.id as string;
      const helper = await connect(awa);
      helper.send({ type: 'disponible', tech: ['JavaScript'] });
      await helper.next('alerte');
      helper.send({ type: 'accepter', requestId: first });
      await helper.next('prise');
      await new Promise((r) => setTimeout(r, 100));
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ endpoint: subscription.endpoint, title: '@awa t’attend dans la salle' });
      expect(sent[0]!.url).toContain(`/#/salle/${first}`);

      // Page open and following: the live message is enough.
      const second = (await http().post('/requests').set(as(koffi)).send(payload()).expect(201)).body.id as string;
      const watcher = await connect(koffi);
      watcher.send({ type: 'suivre', requestId: second });
      await helper.next('alerte', (m) => m.alert.requestId === second);
      helper.send({ type: 'accepter', requestId: second });
      await watcher.next('acceptee');
      await new Promise((r) => setTimeout(r, 100));
      expect(sent).toHaveLength(1);
    });

    it('forgets a device the push service says is gone', async () => {
      const gone: PushSender = async () => {
        throw Object.assign(new Error('gone'), { statusCode: 410 });
      };
      await start({ pushSender: gone });
      const koffi = await login('koffi');
      const awa = await login('awa');
      await http().post('/push/subscribe').set(as(koffi)).send(subscription).expect(204);
      await http().post('/requests').set(as(koffi)).send(payload()).expect(201);
      const helper = await connect(awa);
      helper.send({ type: 'disponible', tech: ['JavaScript'] });
      const alert = await helper.next('alerte');
      helper.send({ type: 'accepter', requestId: alert.alert.requestId });
      await helper.next('prise');
      await new Promise((r) => setTimeout(r, 150));
      await http().get('/push/status').set(as(koffi)).expect(200, { subscribed: false });
    });
  });
});
