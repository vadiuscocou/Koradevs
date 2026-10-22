import { Body, Controller, Delete, Get, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import type { User } from '../store/types.js';
import { parseBody } from '../validation.js';
import { PushService } from './push.service.js';

const SubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000).startsWith('https://'),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
});

@Controller('push')
export class PushController {
  constructor(@Inject(PushService) private readonly push: PushService) {}

  /** Public key the browser needs to subscribe. */
  @Get('key')
  async key() {
    return { publicKey: await this.push.publicKey() };
  }

  @Get('status')
  @UseGuards(AuthGuard)
  async status(@CurrentUser() user: User) {
    return { subscribed: await this.push.isSubscribed(user.id) };
  }

  @Post('subscribe')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async subscribe(@CurrentUser() user: User, @Body() body: unknown): Promise<void> {
    await this.push.subscribe(user.id, parseBody(SubscriptionSchema, body));
  }

  @Delete('subscribe')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async unsubscribe(@CurrentUser() user: User, @Body() body: unknown): Promise<void> {
    await this.push.unsubscribe(user.id, parseBody(z.object({ endpoint: z.string().max(1000) }), body).endpoint);
  }
}
