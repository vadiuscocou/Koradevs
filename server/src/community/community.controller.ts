import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import { RadarService } from '../radar/radar.service.js';
import type { User } from '../store/types.js';
import { CommunityService, type TaskStatus } from './community.service.js';

const STATUSES: TaskStatus[] = ['a_faire', 'en_cours', 'termine'];

@Controller('community')
export class CommunityController {
  constructor(
    private readonly community: CommunityService,
    private readonly radar: RadarService,
  ) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  getMyProfile(@CurrentUser() user: User) {
    return this.community.getProfile(user);
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  updateMyProfile(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.community.updateProfile(user, body ?? {});
  }

  @Get('neighbors')
  @UseGuards(AuthGuard)
  getNeighbors(@CurrentUser() user: User) {
    return this.community.getNeighbors(user);
  }

  /** The doorbell: a real notification, only if the neighbour is connected and their door is open. */
  @Post('neighbors/ring/:targetLogin')
  @UseGuards(AuthGuard)
  async ringNeighbor(@CurrentUser() user: User, @Param('targetLogin') targetLogin: string) {
    if (!(await this.community.isDoorOpen(targetLogin))) throw new NotFoundException('Sa porte est fermée.');
    const delivered = this.radar.ring(targetLogin, user.login);
    return {
      success: delivered,
      message: delivered ? `@${targetLogin} a entendu ta sonnette.` : `@${targetLogin} n’est pas connecté en ce moment.`,
    };
  }

  /** Public: the passport and its proofs, with the hash anyone can recompute. */
  @Get('passport/:login')
  async passport(@Param('login') login: string) {
    const passport = await this.community.getPassport(login);
    if (!passport) throw new NotFoundException('Passeport introuvable.');
    return passport;
  }

  @Get('stats')
  stats() {
    return this.community.stats();
  }

  /** Public: the before/after of a fiche (only exists if the requester agreed to publish it). */
  @Get('replay/:solutionId')
  async replay(@Param('solutionId') solutionId: string) {
    const replay = await this.community.getReplay(solutionId);
    if (!replay) throw new NotFoundException('Pas d’avant / après pour cette fiche.');
    return replay;
  }

  @Get('confirmed')
  confirmed() {
    return this.community.confirmedSolutionIds();
  }

  @Get('projects')
  getProjects() {
    return this.community.getProjects();
  }

  @Post('projects')
  @UseGuards(AuthGuard)
  async createProject(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    const project = await this.community.createProject(user, body ?? {});
    if (!project) throw new BadRequestException('Donne un titre (3 lettres minimum) et une description (10 lettres minimum).');
    return project;
  }

  @Post('projects/:id/join')
  @UseGuards(AuthGuard)
  async join(@CurrentUser() user: User, @Param('id') id: string) {
    const result = await this.community.requestToJoin(id, user.login);
    if (result === 'inconnu') throw new NotFoundException('Projet introuvable.');
    if (result === 'deja-membre') return { success: true, message: 'Tu fais déjà partie de ce projet.' };
    return { success: true, message: 'Demande envoyée. L’auteur du projet te répondra.' };
  }

  @Post('projects/:id/requests/:login')
  @UseGuards(AuthGuard)
  async answer(@CurrentUser() user: User, @Param('id') id: string, @Param('login') login: string, @Body() body: { accept?: boolean }) {
    const ok = await this.community.answerJoin(id, user.login, login, body?.accept === true);
    if (!ok) throw new NotFoundException('Seul l’auteur du projet peut répondre.');
    return { success: true };
  }

  @Post('projects/:id/tasks')
  @UseGuards(AuthGuard)
  async addTask(@CurrentUser() user: User, @Param('id') id: string, @Body() body: { title?: string; assignee?: string }) {
    const task = await this.community.addTask(id, user.login, String(body?.title ?? ''), body?.assignee);
    if (!task) throw new BadRequestException('Seuls les membres peuvent ajouter une tâche.');
    return { success: true, task };
  }

  @Patch('projects/:id/tasks/:taskId')
  @UseGuards(AuthGuard)
  async updateTask(@CurrentUser() user: User, @Param('id') id: string, @Param('taskId') taskId: string, @Body() body: { status?: TaskStatus }) {
    if (!body?.status || !STATUSES.includes(body.status)) throw new BadRequestException('Statut inconnu.');
    const success = await this.community.updateTaskStatus(id, user.login, taskId, body.status);
    if (!success) throw new BadRequestException('Seuls les membres peuvent changer une tâche.');
    return { success };
  }

  @Post('report')
  @UseGuards(AuthGuard)
  async report(
    @CurrentUser() user: User,
    @Body() body: { targetType?: 'fiche' | 'projet' | 'utilisateur'; targetId?: string; reason?: 'pas_clair' | 'doublon' | 'inapproprie'; details?: string },
  ) {
    if (!body?.targetType || !body.targetId || !body.reason) throw new BadRequestException('Signalement incomplet.');
    await this.community.report({
      targetType: body.targetType,
      targetId: String(body.targetId).slice(0, 80),
      reason: body.reason,
      details: body.details ? String(body.details).slice(0, 500) : undefined,
      reportedBy: user.login,
    });
    return { success: true, message: 'Merci, un humain va regarder ce signalement.' };
  }
}
