import { Body, Controller, Get, HttpCode, Inject, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { User } from '../store/types.js';
import { parseBody } from '../validation.js';
import { AuthGuard, CurrentUser, type AuthedRequest } from './auth.guard.js';
import { AuthService, publicUser, type OAuthProvider } from './auth.service.js';
import type { AppConfig } from '../config.js';
import { CONFIG } from '../tokens.js';

const COOKIE = 'sos_oauth';
const cookie = (value: string, maxAge: number, secure: boolean) =>
  `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
const readCookie = (header: string | undefined, name: string) =>
  header?.split(';').map((c) => c.trim().split('=')).find(([k]) => k === name)?.[1];

const GithubLoginSchema = z.object({ accessToken: z.string().min(1).max(500) });
const EMAIL = z.string().trim().toLowerCase().max(254).email('Adresse e-mail invalide.');
const SignupSchema = z.object({
  email: EMAIL,
  login: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{1,38}$/, 'Pseudo invalide : 2 à 39 caractères, lettres, chiffres et tirets.'),
  password: z.string().max(128, 'Le mot de passe est trop long (128 caractères au maximum).'),
});
const LoginSchema = z.object({ email: EMAIL, password: z.string().min(1, 'Mot de passe manquant.').max(128) });
const DevLoginSchema = z.object({
  login: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/, 'pseudo invalide (lettres, chiffres et tirets, 39 caractères maximum)'),
});

@Controller()
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject('SOS_STORE') private readonly store: import('../store/types.js').Store,
    @Inject(CONFIG) private readonly appConfig: AppConfig,
  ) {}

  private get secureCookies(): boolean {
    return this.appConfig.webUrl.startsWith('https://');
  }

  @Get('auth/config')
  config() {
    return this.auth.publicConfig();
  }

  /** « Continuer avec GitHub » / « Continuer avec Google » : redirects to the provider. */
  @Get('auth/github/login')
  githubLogin(@Res() res: Response): void {
    this.startOAuth('github', res);
  }

  @Get('auth/google/login')
  googleLogin(@Res() res: Response): void {
    this.startOAuth('google', res);
  }

  /** The provider sends the person back here; we then send them to the website with the session token in the URL fragment. */
  @Get('auth/github/callback')
  githubCallback(@Query('code') code: string | undefined, @Query('state') state: string | undefined, @Req() req: Request, @Res() res: Response): Promise<void> {
    return this.finishOAuth('github', code, state, req, res);
  }

  @Get('auth/google/callback')
  googleCallback(@Query('code') code: string | undefined, @Query('state') state: string | undefined, @Req() req: Request, @Res() res: Response): Promise<void> {
    return this.finishOAuth('google', code, state, req, res);
  }

  private startOAuth(provider: OAuthProvider, res: Response): void {
    const { url, nonce } = this.auth.startOAuth(provider);
    res.setHeader('Set-Cookie', cookie(nonce, 600, this.secureCookies));
    res.redirect(302, url);
  }

  private async finishOAuth(provider: OAuthProvider, code: unknown, state: unknown, req: Request, res: Response): Promise<void> {
    const label = provider === 'github' ? 'GitHub' : 'Google';
    res.setHeader('Set-Cookie', cookie('', 0, this.secureCookies));
    const back = (params: Record<string, string>) => res.redirect(302, `${this.appConfig.webUrl}/#/connexion?${new URLSearchParams(params)}`);
    if (typeof code !== 'string' || typeof state !== 'string' || !code || !state) return back({ erreur: `Connexion ${label} annulée.` });
    try {
      const session = await this.auth.finishOAuth(provider, code, state, readCookie(req.headers.cookie, COOKIE));
      return back({ token: session.token });
    } catch (error) {
      return back({ erreur: error instanceof Error ? error.message : `Connexion ${label} impossible.` });
    }
  }

  /** Create an account with an e-mail and a password. */
  @Post('auth/signup')
  @HttpCode(201)
  signup(@Body() body: unknown) {
    return this.auth.signup(parseBody(SignupSchema, body, true));
  }

  @Post('auth/login')
  @HttpCode(200)
  login(@Body() body: unknown, @Req() req: Request) {
    return this.auth.login(parseBody(LoginSchema, body, true), req.ip ?? 'inconnu');
  }

  @Post('auth/github')
  @HttpCode(200)
  github(@Body() body: unknown) {
    return this.auth.loginWithGithub(parseBody(GithubLoginSchema, body).accessToken);
  }

  @Post('auth/dev')
  @HttpCode(200)
  dev(@Body() body: unknown) {
    return this.auth.loginDev(parseBody(DevLoginSchema, body).login);
  }

  @Post('auth/logout')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async logout(@Req() request: AuthedRequest): Promise<void> {
    await this.auth.logout(request.token);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User) {
    return publicUser(user);
  }

  @Get('me/profile')
  @UseGuards(AuthGuard)
  async myProfile(@CurrentUser() user: User) {
    const stats = await this.store.getHelperStats(user.id);
    const tech = await this.store.getHelperTech(user.id);
    return {
      stats: {
        resolvedCount: stats.resolvedCount,
        averageResolutionTime: stats.avgResolutionTimeMs,
      },
      tech,
    };
  }
}
