import { createDecipheriv, createECDH, createPublicKey, hkdfSync, randomBytes, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encryptPayload, generateVapidKeys, vapidAuthorization } from '../src/push/webpush.js';

const info = (text: string) => Buffer.from(`${text}\0`, 'utf8');

/** What a browser does with a push message (RFC 8291 §4), written independently of the encryption code. */
function decryptAsBrowser(body: Buffer, browser: ReturnType<typeof createECDH>, authSecret: Buffer): string {
  const salt = body.subarray(0, 16);
  const recordSize = body.readUInt32BE(16);
  const keyLength = body[20]!;
  const serverPublic = body.subarray(21, 21 + keyLength);
  const record = body.subarray(21 + keyLength);
  expect(recordSize).toBe(4096);

  const secret = browser.computeSecret(serverPublic);
  const ikm = Buffer.from(hkdfSync('sha256', secret, authSecret, Buffer.concat([info('WebPush: info'), browser.getPublicKey(), serverPublic]), 32));
  const key = Buffer.from(hkdfSync('sha256', ikm, salt, info('Content-Encoding: aes128gcm'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, info('Content-Encoding: nonce'), 12));
  const decipher = createDecipheriv('aes-128-gcm', key, nonce);
  decipher.setAuthTag(record.subarray(record.length - 16));
  const padded = Buffer.concat([decipher.update(record.subarray(0, record.length - 16)), decipher.final()]);
  expect(padded[padded.length - 1]).toBe(2); // « last record » delimiter
  return padded.subarray(0, padded.length - 1).toString('utf8');
}

describe('Web Push sans dépendance', () => {
  it('encrypts a message that only the subscribed browser can read', () => {
    const browser = createECDH('prime256v1');
    browser.generateKeys();
    const auth = randomBytes(16);
    const message = JSON.stringify({ title: '@awa t’attend dans la salle', body: 'TypeError : é à ç 🚀' });

    const body = encryptPayload(Buffer.from(message), browser.getPublicKey().toString('base64url'), auth.toString('base64url'));
    expect(decryptAsBrowser(body, browser, auth)).toBe(message);

    // Another browser (or a wrong auth secret) cannot read it.
    const stranger = createECDH('prime256v1');
    stranger.generateKeys();
    expect(() => decryptAsBrowser(body, stranger, auth)).toThrow();
    expect(() => decryptAsBrowser(body, browser, randomBytes(16))).toThrow();
  });

  it('never produces the same ciphertext twice', () => {
    const browser = createECDH('prime256v1');
    browser.generateKeys();
    const args = [Buffer.from('même message'), browser.getPublicKey().toString('base64url'), randomBytes(16).toString('base64url')] as const;
    expect(encryptPayload(...args).equals(encryptPayload(...args))).toBe(false);
  });

  it('refuses an invalid subscription', () => {
    expect(() => encryptPayload(Buffer.from('x'), 'abc', 'def')).toThrow('Abonnement push invalide');
  });

  it('signs a VAPID token for the push service, valid for 12 hours', () => {
    const keys = generateVapidKeys();
    const now = Date.now();
    const header = vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', { ...keys, subject: 'mailto:noreply@koradevs.app' }, now);
    const match = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(header);
    expect(match).not.toBeNull();
    const [, head, claims, signature, publicKey] = match!;
    expect(publicKey).toBe(keys.publicKey);
    expect(JSON.parse(Buffer.from(head!, 'base64url').toString())).toEqual({ typ: 'JWT', alg: 'ES256' });
    expect(JSON.parse(Buffer.from(claims!, 'base64url').toString())).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: Math.floor(now / 1000) + 12 * 3600,
      sub: 'mailto:noreply@koradevs.app',
    });

    const raw = Buffer.from(keys.publicKey, 'base64url');
    const key = createPublicKey({
      format: 'jwk',
      key: { kty: 'EC', crv: 'P-256', x: raw.subarray(1, 33).toString('base64url'), y: raw.subarray(33, 65).toString('base64url') },
    });
    expect(verify('sha256', Buffer.from(`${head}.${claims}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature!, 'base64url'))).toBe(true);
    expect(verify('sha256', Buffer.from(`${head}.${claims}x`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature!, 'base64url'))).toBe(false);
  });
});
