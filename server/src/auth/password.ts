import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** scrypt, memory-hard: 32 MiB per hash. The cost is stored with each hash so that it can be raised later. */
const COST = { N: 32768, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const maxmem = (n: number, r: number) => 256 * n * r;

const normalize = (password: string) => password.normalize('NFKC');

/** `scrypt$N$r$p$salt$hash` (base64url). Never reversible, different every time thanks to the random salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(normalize(password), salt, KEY_LENGTH, { ...COST, maxmem: maxmem(COST.N, COST.r) });
  return `scrypt$${COST.N}$${COST.r}$${COST.p}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scrypt(normalize(password), Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: maxmem(Number(n), Number(r)),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A hash of nothing in particular, checked when the e-mail is unknown so that both cases take the same time. */
let dummy: Promise<string> | undefined;
export const dummyHash = (): Promise<string> => (dummy ??= hashPassword(randomBytes(12).toString('hex')));

const COMMON = new Set([
  'password',
  'password1',
  'motdepasse',
  'azertyuiop',
  'azerty123',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyuiop',
  'qwerty123',
  'iloveyou',
  'abcd1234',
  'koradevs',
]);

/** Returns a message in French when the password is not acceptable, otherwise null. */
export function passwordProblem(password: string, context: { email?: string; login?: string } = {}): string | null {
  if (password.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.';
  if (password.length > 128) return 'Le mot de passe est trop long (128 caractères au maximum).';
  const lowered = password.toLowerCase();
  if (COMMON.has(lowered)) return 'Ce mot de passe est trop courant : choisis-en un autre.';
  if (/^(.)\1+$/.test(password)) return 'Ce mot de passe est trop simple : évite de répéter le même caractère.';
  if (context.login && lowered === context.login.toLowerCase()) return 'Le mot de passe ne doit pas être ton pseudo.';
  if (context.email && lowered === context.email.toLowerCase()) return 'Le mot de passe ne doit pas être ton adresse e-mail.';
  return null;
}

/** Names that would look official or collide with the website's own pages. */
const RESERVED = new Set(['admin', 'administrateur', 'root', 'support', 'koradevs', 'systalink', 'moderateur', 'api', 'null', 'undefined', 'moi', 'sos']);
export const isReservedLogin = (login: string): boolean => RESERVED.has(login.toLowerCase());
