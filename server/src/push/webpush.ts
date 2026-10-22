import { createCipheriv, createECDH, createPrivateKey, hkdfSync, randomBytes, sign } from 'node:crypto';

/**
 * Web Push without any dependency: VAPID (RFC 8292) to prove who sends, and message encryption
 * `aes128gcm` (RFC 8291 / RFC 8188) so that only the user's browser can read the notification.
 * Only Node's own `crypto` is used, which keeps the project free of reciprocal licences.
 */

const b64u = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64url');
const info = (text: string): Buffer => Buffer.from(`${text}\0`, 'utf8');

export interface VapidKeys {
  /** Uncompressed P-256 public key (65 bytes), base64url. This is what the browser subscribes with. */
  publicKey: string;
  /** Raw P-256 private key (32 bytes), base64url. */
  privateKey: string;
}

export function generateVapidKeys(): VapidKeys {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(ecdh.getPrivateKey()) };
}

/** `Authorization` header: a short-lived signed token (ES256) naming the push service we talk to. */
export function vapidAuthorization(endpoint: string, vapid: VapidKeys & { subject: string }, now = Date.now()): string {
  const publicKey = Buffer.from(vapid.publicKey, 'base64url');
  const key = createPrivateKey({
    format: 'jwk',
    key: { kty: 'EC', crv: 'P-256', x: b64u(publicKey.subarray(1, 33)), y: b64u(publicKey.subarray(33, 65)), d: vapid.privateKey },
  });
  const header = b64u(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(Buffer.from(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject })));
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${header}.${claims}.${b64u(signature)}, k=${vapid.publicKey}`;
}

/** RFC 8291 §3: encrypts `payload` for the browser identified by its public key and auth secret. */
export function encryptPayload(payload: Buffer, userPublicKey: string, authSecret: string): Buffer {
  const uaPublic = Buffer.from(userPublicKey, 'base64url');
  const auth = Buffer.from(authSecret, 'base64url');
  if (uaPublic.length !== 65 || uaPublic[0] !== 4 || auth.length !== 16) throw new Error('Abonnement push invalide.');

  const server = createECDH('prime256v1');
  server.generateKeys();
  const serverPublic = server.getPublicKey();
  const sharedSecret = server.computeSecret(uaPublic);

  const ikm = Buffer.from(hkdfSync('sha256', sharedSecret, auth, Buffer.concat([info('WebPush: info'), uaPublic, serverPublic]), 32));
  const salt = randomBytes(16);
  const contentKey = Buffer.from(hkdfSync('sha256', ikm, salt, info('Content-Encoding: aes128gcm'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, info('Content-Encoding: nonce'), 12));

  // One single record: the message followed by the 0x02 « last record » delimiter.
  const cipher = createCipheriv('aes-128-gcm', contentKey, nonce);
  const encrypted = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(16 + 4 + 1);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(serverPublic.length, 20);
  return Buffer.concat([header, serverPublic, encrypted]);
}

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Sends one notification. Throws an error carrying `statusCode` when the push service refuses (410 = gone). */
export async function sendWebPush(target: PushTarget, message: unknown, vapid: VapidKeys & { subject: string }): Promise<void> {
  const body = encryptPayload(Buffer.from(JSON.stringify(message), 'utf8'), target.keys.p256dh, target.keys.auth);
  if (body.length > 4096) throw new Error('Notification trop longue.');
  const response = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidAuthorization(target.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(60 * 60 * 24),
      Urgency: 'high',
    },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw Object.assign(new Error(`Service push : ${response.status}`), { statusCode: response.status });
}
