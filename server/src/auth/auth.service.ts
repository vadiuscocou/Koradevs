import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { PublicUser, SessionResponse } from '@sos/shared';
import type { AppConfig } from '../config.js';
import type { Provider, Store, User, UserInput } from '../store/types.js';
import { CLOCK, CONFIG, GITHUB, GOOGLE, STORE, type Clock } from '../tokens.js';
import { GithubApiError, type GithubClient } from './github.js';
import { GoogleApiError, type GoogleClient } from './google.js';
import { dummyHash, hashPassword, isReservedLogin, passwordProblem, verifyPassword } from './password.js';

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export type OAuthProvider = 'github' | 'google';

/** Who the provider says the person is. */
interface Identity {
  providerId: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

export const publicUser = (u: User): PublicUser => ({
  id: u.id,
  login: u.login,
  name: u.name,
  avatarUrl: u.avatarUrl,
  provider: u.provider,
});

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/** « Awa Diop » → « Awa-Diop », a login the rest of the site accepts. */
export function loginFrom(text: string): string {
  const cleaned = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  return cleaned.length >= 2 ? cleaned : `dev-${cleaned || randomBytes(2).toString('hex')}`;
}

@Injectable()
export class AuthService {
  /** Wrong-password counters, in memory: slows down guessing without locking real users out for long. */
  private readonly failures = new Map<string, { count: number; until: number }>();
  /** Signs the OAuth state so that only a login started by this server is accepted. */
  private readonly stateKey = randomBytes(32);

  constructor(
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(STORE) private readonly store: Store,
    @Inject(GITHUB) private readonly github: GithubClient,
    @Inject(GOOGLE) private readonly google: GoogleClient,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  publicConfig(): { githubClientId: string | null; devAuth: boolean; githubWeb: boolean; googleWeb: boolean; passwordAuth: boolean } {
    return {
      githubClientId: this.config.githubClientId ?? null,
      devAuth: this.config.devAuth,
      githubWeb: this.oauthEnabled('github'),
      googleWeb: this.oauthEnabled('google'),
      passwordAuth: this.config.passwordAuth,
    };
  }

  // --- E-mail and password ---------------------------------------------------

  async signup(input: { email: string; login: string; password: string }): Promise<SessionResponse> {
    if (!this.config.passwordAuth) throw new ForbiddenException('La création de compte par e-mail est désactivée sur ce serveur.');
    const email = input.email.trim().toLowerCase();
    if (isReservedLogin(input.login)) throw new BadRequestException('Ce pseudo est réservé : choisis-en un autre.');
    const problem = passwordProblem(input.password, { email, login: input.login });
    if (problem) throw new BadRequestException(problem);

    const result = await this.store.createPasswordUser({ login: input.login, email, passwordHash: await hashPassword(input.password) });
    if ('conflict' in result) {
      throw new ConflictException(result.conflict === 'email' ? 'Cette adresse e-mail a déjà un compte : connecte-toi.' : 'Ce pseudo est déjà pris : choisis-en un autre.');
    }
    return this.newSession(result.user);
  }

  async login(input: { email: string; password: string }, ip: string): Promise<SessionResponse> {
    if (!this.config.passwordAuth) throw new ForbiddenException('La connexion par e-mail est désactivée sur ce serveur.');
    const email = input.email.trim().toLowerCase();
    this.assertNotThrottled(ip, email);

    const credential = await this.store.findCredential(email);
    // Same work whether the e-mail exists or not: the answer must not tell, not even by its delay.
    const ok = await verifyPassword(input.password, credential?.passwordHash ?? (await dummyHash()));
    const user = ok && credential ? await this.store.getUser(credential.userId) : null;
    if (!user) {
      this.recordFailure(ip, email);
      throw new UnauthorizedException('E-mail ou mot de passe incorrect.');
    }
    this.failures.delete(`${ip}|${email}`);
    return this.newSession(user);
  }

  private assertNotThrottled(ip: string, email: string): void {
    const now = this.now().getTime();
    for (const [key, limit] of [[`${ip}|${email}`, 8], [email, 30]] as const) {
      const entry = this.failures.get(key);
      if (entry && entry.until > now && entry.count >= limit) {
        const minutes = Math.max(1, Math.ceil((entry.until - now) / MINUTE));
        throw new HttpException(`Trop d’essais. Réessaie dans ${minutes} minute${minutes > 1 ? 's' : ''}.`, HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }

  private recordFailure(ip: string, email: string): void {
    const now = this.now().getTime();
    for (const key of [`${ip}|${email}`, email]) {
      const entry = this.failures.get(key);
      this.failures.set(key, entry && entry.until > now ? { count: entry.count + 1, until: now + 15 * MINUTE } : { count: 1, until: now + 15 * MINUTE });
    }
    if (this.failures.size > 5000) for (const [key, entry] of this.failures) if (entry.until <= now) this.failures.delete(key);
  }

  // --- GitHub and Google (OAuth web flow) -----------------------------------------

  oauthEnabled(provider: OAuthProvider): boolean {
    return provider === 'github'
      ? !!this.config.githubClientId && !!this.config.githubClientSecret
      : !!this.config.googleClientId && !!this.config.googleClientSecret;
  }

  private callbackUrl(provider: OAuthProvider): string {
    return `${this.config.webUrl}/api/auth/${provider}/callback`;
  }

  private sign(value: string): string {
    return createHmac('sha256', this.stateKey).update(value).digest('base64url');
  }

  /** Step 1. The nonce is also stored in a cookie, which binds the login to the browser that started it. */
  startOAuth(provider: OAuthProvider): { url: string; nonce: string } {
    if (!this.oauthEnabled(provider)) throw new ServiceUnavailableException(`La connexion ${provider === 'github' ? 'GitHub' : 'Google'} n’est pas configurée sur ce serveur.`);
    const nonce = randomBytes(16).toString('base64url');
    const issued = String(this.now().getTime());
    const state = `${provider}.${nonce}.${issued}.${this.sign(`${provider}.${nonce}.${issued}`)}`;
    const url = new URL(provider === 'github' ? 'https://github.com/login/oauth/authorize' : 'https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', (provider === 'github' ? this.config.githubClientId : this.config.googleClientId)!);
    url.searchParams.set('redirect_uri', this.callbackUrl(provider));
    url.searchParams.set('state', state);
    if (provider === 'github') {
      url.searchParams.set('scope', 'read:user');
    } else {
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'openid email profile');
      url.searchParams.set('prompt', 'select_account');
    }
    return { url: url.toString(), nonce };
  }

  /** Step 2: the provider sent the person back with a code. */
  async finishOAuth(provider: OAuthProvider, code: string, state: string, cookieNonce: string | undefined): Promise<SessionResponse> {
    const label = provider === 'github' ? 'GitHub' : 'Google';
    const [stateProvider, nonce, issued, signature] = state.split('.');
    const expected = this.sign(`${stateProvider}.${nonce}.${issued}`);
    const valid =
      stateProvider === provider && !!nonce && !!issued && !!signature && signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    const fresh = Number.isFinite(Number(issued)) && this.now().getTime() - Number(issued) < 10 * MINUTE;
    if (!valid || !fresh || !cookieNonce || cookieNonce !== nonce) throw new UnauthorizedException(`Connexion ${label} expirée ou invalide, recommence.`);
    if (!this.oauthEnabled(provider)) throw new ServiceUnavailableException(`La connexion ${label} n’est pas configurée sur ce serveur.`);

    try {
      const exchange = {
        code,
        clientId: (provider === 'github' ? this.config.githubClientId : this.config.googleClientId)!,
        clientSecret: (provider === 'github' ? this.config.githubClientSecret : this.config.googleClientSecret)!,
        redirectUri: this.callbackUrl(provider),
      };
      const identity = provider === 'github' ? await this.githubIdentity(await this.github.exchangeCode(exchange)) : await this.googleIdentity(await this.google.exchangeCode(exchange));
      return await this.oauthSession(provider, identity);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const status = error instanceof GithubApiError || error instanceof GoogleApiError ? error.status : 502;
      if (status < 500) throw new UnauthorizedException(`${label} a refusé la connexion.`);
      throw new BadGatewayException(`${label} ne répond pas, réessaie dans un instant.`);
    }
  }

  /** The GitHub token is only used to identify the user; it is never stored. Also used by `sos login`. */
  async loginWithGithub(accessToken: string): Promise<SessionResponse> {
    try {
      return await this.oauthSession('github', await this.githubIdentity(accessToken));
    } catch (error) {
      if (error instanceof GithubApiError && (error.status === 401 || error.status === 403)) throw new UnauthorizedException('GitHub a refusé ce jeton.');
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException('GitHub ne répond pas, réessaie dans un instant.');
    }
  }

  private async githubIdentity(accessToken: string): Promise<Identity> {
    const gh = await this.github.getUser(accessToken);
    return { providerId: String(gh.id), login: gh.login, name: gh.name, avatarUrl: gh.avatar_url };
  }

  private async googleIdentity(accessToken: string): Promise<Identity> {
    const g = await this.google.getUser(accessToken);
    if (!g.sub) throw new GoogleApiError(401);
    const base = g.name?.trim() || g.email?.split('@')[0] || 'dev';
    return { providerId: g.sub, login: loginFrom(base), name: g.name ?? null, avatarUrl: g.picture ?? null };
  }

  /**
   * First visit: a new account with a login nobody else has. Later visits: the same account, its login unchanged
   * (a login is how the rest of the site names a person, so it never changes under their feet).
   */
  private async oauthSession(provider: Provider, identity: Identity): Promise<SessionResponse> {
    const existing = await this.store.findUserByProvider(provider, identity.providerId);
    const login = existing?.login ?? (await this.uniqueLogin(identity.login));
    return this.newSession(await this.store.upsertUser({ provider, providerId: identity.providerId, login, name: identity.name, avatarUrl: identity.avatarUrl }));
  }

  private async uniqueLogin(wanted: string): Promise<string> {
    const base = loginFrom(wanted);
    let candidate = base;
    for (let i = 2; (await this.store.findUserByLogin(candidate)) || isReservedLogin(candidate); i++) candidate = `${base.slice(0, 34)}-${i}`;
    return candidate;
  }

  // --- Demo mode and sessions -----------------------------------------------------

  async loginDev(login: string): Promise<SessionResponse> {
    if (!this.config.devAuth) throw new ForbiddenException('Le mode démo est désactivé sur ce serveur.');
    return this.newSession(await this.store.upsertUser({ provider: 'dev', providerId: login.toLowerCase(), login, name: null, avatarUrl: null } satisfies UserInput));
  }

  authenticate(token: string): Promise<User | null> {
    return this.store.findUserBySession(hashToken(token), this.now());
  }

  logout(token: string): Promise<void> {
    return this.store.deleteSession(hashToken(token));
  }

  private async newSession(user: User): Promise<SessionResponse> {
    const token = `sos_${randomBytes(32).toString('base64url')}`;
    const expiresAt = new Date(this.now().getTime() + this.config.sessionTtlDays * DAY);
    await this.store.createSession(hashToken(token), user.id, expiresAt);
    return { token, expiresAt: expiresAt.toISOString(), user: publicUser(user) };
  }
}
