import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import type { User } from '../store/types.js';
import { parseBody } from '../validation.js';
import { AuthGuard, CurrentUser, type AuthedRequest } from './auth.guard.js';
import { AuthService, publicUser } from './auth.service.js';

const GithubLoginSchema = z.object({ accessToken: z.string().min(1).max(500) });
const DevLoginSchema = z.object({
  login: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/, 'pseudo invalide (lettres, chiffres et tirets, 39 caractères maximum)'),
});

@Controller()
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get('auth/config')
  config() {
    return this.auth.publicConfig();
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
  async myProfile(@CurrentUser() user: User, @Inject('SOS_STORE') store: import('../store/types.js').Store) {
    const stats = await store.getHelperStats(user.id);
    const tech = await store.getHelperTech(user.id);
    return {
      stats: {
        resolvedCount: stats.resolvedCount,
        averageResolutionTime: stats.avgResolutionTimeMs,
      },
      tech,
    };
  }
}
