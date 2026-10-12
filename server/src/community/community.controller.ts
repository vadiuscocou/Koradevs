import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import type { User } from '../store/types.js';
import { CommunityService } from './community.service.js';

@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  getMyProfile(@CurrentUser() user: User) {
    return this.community.getProfile(user.id, user.login);
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  updateMyProfile(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.community.updateProfile(user.id, user.login, body);
  }

  @Get('neighbors')
  @UseGuards(AuthGuard)
  getNeighbors(@CurrentUser() user: User) {
    return this.community.getNeighbors(user.login);
  }

  @Post('neighbors/ring/:targetLogin')
  @UseGuards(AuthGuard)
  ringNeighbor(@CurrentUser() user: User, @Param('targetLogin') targetLogin: string) {
    return {
      success: true,
      message: `@${user.login} a sonné à la porte de @${targetLogin} ! Une notification amicale lui a été envoyée.`,
    };
  }

  @Get('countries')
  getCountryStats() {
    return this.community.getCountryStats();
  }

  @Get('projects')
  getProjects() {
    return this.community.getProjects();
  }

  @Post('projects')
  @UseGuards(AuthGuard)
  createProject(
    @CurrentUser() user: User,
    @Body()
    body: {
      title: string;
      description: string;
      tech: string[];
      neededRoles: string[];
      repoUrl?: string;
      demoUrl?: string;
      city?: string;
      country?: string;
    },
  ) {
    return this.community.createProject(user.login, body);
  }

  @Post('projects/:id/join')
  @UseGuards(AuthGuard)
  joinProject(@CurrentUser() user: User, @Param('id') id: string) {
    const success = this.community.joinProject(id, user.login);
    return { success, message: `Demande de participation envoyée pour @${user.login} !` };
  }

  @Post('projects/:id/tasks')
  @UseGuards(AuthGuard)
  addTask(@Param('id') id: string, @Body() body: { title: string; assignee?: string }) {
    const task = this.community.addTask(id, body.title, body.assignee);
    return { success: !!task, task };
  }

  @Patch('projects/:id/tasks/:taskId')
  @UseGuards(AuthGuard)
  updateTaskStatus(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: { status: 'a_faire' | 'en_cours' | 'termine' },
  ) {
    const success = this.community.updateTaskStatus(id, taskId, body.status);
    return { success };
  }

  @Post('report')
  @UseGuards(AuthGuard)
  report(
    @CurrentUser() user: User,
    @Body()
    body: {
      targetType: 'fiche' | 'projet' | 'utilisateur';
      targetId: string;
      reason: 'pas_clair' | 'doublon' | 'inapproprie';
      details?: string;
    },
  ) {
    const item = this.community.report({
      ...body,
      reportedBy: user.login,
    });
    return { success: true, message: 'Signalement transmis à l’équipe de modération.', item };
  }
}
