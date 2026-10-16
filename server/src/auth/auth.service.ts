import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { BadGatewayException, ForbiddenException, Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { PublicUser, SessionResponse } from '@sos/shared';
import type { AppConfig } from '../config.js';
import type { Store, User, UserInput } from '../store/types.js';
import { CLOCK, CONFIG, GITHUB, STORE, type Clock } from '../tokens.js';
import { GithubApiError, type GithubClient } from './github.js';

const DAY = 24 * 60 * 60 * 1000;

export const publicUser = (u: User): PublicUser => ({
  id: u.id,
  login: u.login,
  name: u.name,
  avatarUrl: u.avatarUrl,
  provider: u.provider,
});

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(STORE) private readonly store: Store,
    @Inject(GITHUB) private readonly github: GithubClient,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  /** Signs the OAuth state so that only a login started by this server is accepted. */
  private readonly stateKey = randomBytes(32);

  publicConfig(): { githubClientId: string | null; devAuth: boolean; githubWeb: boolean } {
    return { githubClientId: this.config.githubClientId ?? null, devAuth: this.config.devAuth, githubWeb: this.githubWebEnabled() };
  }

  githubWebEnabled(): boolean {
    return !!this.config.githubClientId && !!this.config.githubClientSecret;
  }

  private callbackUrl(): string {
    return `${this.config.webUrl}/api/auth/github/callback`;
  }

  private sign(value: string): string {
    return createHmac('sha256', this.stateKey).update(value).digest('base64url');
  }

  /** Step 1 of the GitHub button. The nonce is also stored in a cookie to bind the login to this browser. */
  startGithubLogin(): { url: string; nonce: string } {
    if (!this.githubWebEnabled()) throw new ServiceUnavailableException('La connexion GitHub n’est pas configurée sur ce serveur.');
    const nonce = randomBytes(16).toString('base64url');
    const issued = String(this.now().getTime());
    const state = `${nonce}.${issued}.${this.sign(`${nonce}.${issued}`)}`;
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', this.config.githubClientId!);
    url.searchParams.set('redirect_uri', this.callbackUrl());
    url.searchParams.set('scope', 'read:user');
    url.searchParams.set('state', state);
    return { url: url.toString(), nonce };
  }

  /** Step 2: GitHub sent the person back with a code. */
  async finishGithubLogin(code: string, state: string, cookieNonce: string | undefined): Promise<SessionResponse> {
    const [nonce, issued, signature] = state.split('.');
    const expected = this.sign(`${nonce}.${issued}`);
    const valid = !!nonce && !!issued && !!signature && signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    const fresh = Number.isFinite(Number(issued)) && this.now().getTime() - Number(issued) < 10 * 60_000;
    if (!valid || !fresh || !cookieNonce || cookieNonce !== nonce) throw new UnauthorizedException('Connexion GitHub expirée ou invalide, recommence.');
    let accessToken: string;
    try {
      accessToken = await this.github.exchangeCode({
        code,
        clientId: this.config.githubClientId!,
        clientSecret: this.config.githubClientSecret!,
        redirectUri: this.callbackUrl(),
      });
    } catch (error) {
      if (error instanceof GithubApiError && error.status < 500) throw new UnauthorizedException('GitHub a refusé la connexion.');
      throw new BadGatewayException('GitHub ne répond pas, réessaie dans un instant.');
    }
    return this.loginWithGithub(accessToken);
  }

  /** The GitHub token is only used to identify the user; it is never stored. */
  async loginWithGithub(accessToken: string): Promise<SessionResponse> {
    let gh;
    try {
      gh = await this.github.getUser(accessToken);
    } catch (error) {
      if (error instanceof GithubApiError && (error.status === 401 || error.status === 403)) {
        throw new UnauthorizedException('GitHub a refusé ce jeton.');
      }
      throw new BadGatewayException('GitHub ne répond pas, réessaie dans un instant.');
    }
    return this.openSession({ provider: 'github', providerId: String(gh.id), login: gh.login, name: gh.name, avatarUrl: gh.avatar_url });
  }

  async loginDev(login: string): Promise<SessionResponse> {
    if (!this.config.devAuth) throw new ForbiddenException('Le mode démo est désactivé sur ce serveur.');
    return this.openSession({ provider: 'dev', providerId: login.toLowerCase(), login, name: null, avatarUrl: null });
  }

  authenticate(token: string): Promise<User | null> {
    return this.store.findUserBySession(hashToken(token), this.now());
  }

  logout(token: string): Promise<void> {
    return this.store.deleteSession(hashToken(token));
  }

  private async openSession(input: UserInput): Promise<SessionResponse> {
    const user = await this.store.upsertUser(input);
    const token = `sos_${randomBytes(32).toString('base64url')}`;
    const expiresAt = new Date(this.now().getTime() + this.config.sessionTtlDays * DAY);
    await this.store.createSession(hashToken(token), user.id, expiresAt);
    return { token, expiresAt: expiresAt.toISOString(), user: publicUser(user) };
  }
}
