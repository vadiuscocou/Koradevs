import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import type { User } from '../store/types.js';
import { SpacesService } from './spaces.service.js';

const textOf = (body: { text?: unknown }): string => (typeof body?.text === 'string' ? body.text : '');
const TOO_FAST = 'Doucement, un message à la fois.';

function checked<T>(result: T | 'trop-vite' | null): T {
  if (result === 'trop-vite') throw new BadRequestException(TOO_FAST);
  if (!result) throw new BadRequestException('Écris quelque chose.');
  return result;
}

@Controller('spaces')
@UseGuards(AuthGuard)
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  list() {
    return this.spaces.list();
  }

  @Get('following')
  async following(@CurrentUser() user: User) {
    return { following: await this.spaces.following(user.login) };
  }

  @Get('feed')
  feed(@CurrentUser() user: User) {
    return this.spaces.feed(user.login);
  }

  @Post('follow/:login')
  @HttpCode(200)
  async follow(@CurrentUser() user: User, @Param('login') login: string) {
    const result = await this.spaces.toggleFollow(user, login);
    if (!result) throw new NotFoundException('Impossible de suivre cette personne.');
    return result;
  }

  @Get('fiche/:solutionId')
  async fiche(@CurrentUser() user: User, @Param('solutionId') solutionId: string) {
    const [comments, votes] = await Promise.all([this.spaces.comments(solutionId), this.spaces.votes(solutionId, user.login)]);
    return { comments, ...votes };
  }

  @Post('fiche/:solutionId/utile')
  @HttpCode(200)
  vote(@CurrentUser() user: User, @Param('solutionId') solutionId: string) {
    return this.spaces.toggleVote(user, solutionId);
  }

  @Post('fiche/:solutionId/comments')
  async comment(@CurrentUser() user: User, @Param('solutionId') solutionId: string, @Body() body: { text?: unknown }) {
    return checked(await this.spaces.comment(user, solutionId, textOf(body)));
  }

  @Get(':id/messages')
  async messages(@Param('id') id: string, @Query('after') after?: string) {
    if (!this.spaces.has(id)) throw new NotFoundException('Salon introuvable.');
    return this.spaces.messages(id, after);
  }

  @Post(':id/messages')
  async post(@CurrentUser() user: User, @Param('id') id: string, @Body() body: { text?: unknown }) {
    if (!this.spaces.has(id)) throw new NotFoundException('Salon introuvable.');
    return checked(await this.spaces.post(user, id, textOf(body)));
  }
}
