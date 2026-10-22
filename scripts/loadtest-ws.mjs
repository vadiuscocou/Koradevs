// Test de charge du temps réel : N paires demandeur/aidant font une demande, la prennent, entrent
// dans la salle et s'écrivent. Mesure les délais et affiche un résumé.
//
//   node scripts/loadtest-ws.mjs http://localhost:4000 25
//
// Il faut un serveur avec le mode démo (SOS_DEV_AUTH=1). Les pseudos créés commencent par « charge- ».
import { createRequire } from 'node:module';

const require = createRequire(new URL('../server/package.json', import.meta.url));
const WebSocket = require('ws');

const base = (process.argv[2] ?? 'http://localhost:4000').replace(/\/+$/, '');
const pairs = Number(process.argv[3] ?? 20);
const wsUrl = `${base.replace(/^http/, 'ws')}/ws`;
const apiPrefix = process.env.SOS_API_PREFIX ?? (base.includes('localhost:4000') ? '' : '/api');

const call = async (method, path, body, token) => {
  const response = await fetch(`${base}${apiPrefix}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status}`);
  return response.status === 204 ? undefined : response.json();
};

const connect = (token) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const waiters = [];
    const inbox = [];
    ws.on('message', (data) => {
      const message = JSON.parse(String(data));
      const index = waiters.findIndex((w) => w.type === message.type && w.match(message));
      if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
      else inbox.push(message);
    });
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
    ws.on('error', reject);
    const client = {
      send: (m) => ws.send(JSON.stringify(m)),
      next: (type, ms = 20000, match = () => true) => {
        const found = inbox.findIndex((m) => m.type === type && match(m));
        if (found >= 0) return Promise.resolve(inbox.splice(found, 1)[0]);
        return new Promise((res, rej) => {
          const timer = setTimeout(() => rej(new Error(`pas de « ${type} »`)), ms);
          waiters.push({ type, match, resolve: (m) => (clearTimeout(timer), res(m)) });
        });
      },
      close: () => ws.close(),
    };
    client.next('bienvenue').then(() => resolve(client), reject);
  });

const payload = () => ({
  version: 1,
  command: 'charge',
  exitCode: 1,
  output: "TypeError: Cannot read properties of undefined (reading 'x')\n    at f (a.js:1:1)",
  tech: ['JavaScript'],
  env: { os: 'charge', arch: 'x64', node: 'v22' },
  files: [{ path: 'a.js', reason: 'ajout', size: 10, secretsMasked: 0, content: 'export const f = (u) => u.x;' }],
  secretsMasked: 0,
  createdAt: new Date().toISOString(),
});

const stamp = Date.now().toString(36);
const times = { accept: [], message: [] };
const failures = [];

async function pair(i) {
  const asker = await call('POST', '/auth/dev', { login: `charge-d-${stamp}-${i}` });
  const helper = await call('POST', '/auth/dev', { login: `charge-a-${stamp}-${i}` });
  const h = await connect(helper.token);
  const d = await connect(asker.token);
  try {
    h.send({ type: 'disponible', tech: ['JavaScript'] });
    const { id } = await call('POST', '/requests', payload(), asker.token);
    d.send({ type: 'suivre', requestId: id });
    const alert = await h.next('alerte', 20000, (m) => m.alert.requestId === id);
    const t0 = performance.now();
    h.send({ type: 'accepter', requestId: alert.alert.requestId });
    await d.next('acceptee');
    times.accept.push(performance.now() - t0);

    h.send({ type: 'rejoindre', requestId: alert.alert.requestId, client: 'web' });
    d.send({ type: 'rejoindre', requestId: alert.alert.requestId, client: 'web' });
    await h.next('salle');
    await d.next('salle');
    const t1 = performance.now();
    h.send({ type: 'message', requestId: alert.alert.requestId, text: 'bonjour' });
    await d.next('message');
    times.message.push(performance.now() - t1);
    await call('POST', `/requests/${id}/close`, undefined, asker.token);
  } catch (error) {
    failures.push(`paire ${i} : ${error.message}`);
  } finally {
    h.close();
    d.close();
  }
}

const percentile = (list, p) => (list.length ? [...list].sort((a, b) => a - b)[Math.min(list.length - 1, Math.floor((p / 100) * list.length))] : NaN);
const ms = (n) => (Number.isFinite(n) ? `${n.toFixed(0)} ms` : '—');

console.log(`Charge : ${pairs} paires (${pairs * 2} connexions temps réel) sur ${base}`);
const started = performance.now();
await Promise.all(Array.from({ length: pairs }, (_, i) => pair(i)));
const total = (performance.now() - started) / 1000;

console.log(`Terminé en ${total.toFixed(1)} s, ${pairs - failures.length}/${pairs} paires réussies.`);
for (const [name, list] of Object.entries(times)) {
  console.log(`  ${name === 'accept' ? 'Prise de la demande → aidant annoncé au demandeur' : 'Message de chat → reçu par l’autre'} : médiane ${ms(percentile(list, 50))}, p95 ${ms(percentile(list, 95))}, max ${ms(Math.max(...list))}`);
}
if (failures.length) console.log(`Échecs :\n  ${failures.slice(0, 5).join('\n  ')}`);
process.exit(failures.length ? 1 : 0);
