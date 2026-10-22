import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AppConfig } from '../config.js';
import type { Store } from '../store/types.js';
import { CONFIG, PUSH_SENDER, STORE, type PushSender } from '../tokens.js';
import { generateVapidKeys, sendWebPush, type VapidKeys } from './webpush.js';

export interface PushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  /** Where a click on the notification leads (absolute address). */
  url: string;
}

const MAX_SUBSCRIPTIONS = 5;

/** The real sender: Web Push through the browser vendor's push service. */
export const webPushSender: PushSender = (subscription, payload, vapid) => sendWebPush(subscription, payload, vapid);

/**
 * Notifications that reach a closed tab (Web Push): « @awa t’attend dans la salle ».
 * The VAPID keys are created once and kept in the store, so there is nothing to configure.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger('Push');
  private keys: Promise<VapidKeys> | undefined;

  constructor(
    @Inject(STORE) private readonly store: Store,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
  ) {}

  private vapid(): Promise<VapidKeys> {
    this.keys ??= (async () => {
      const saved = await this.store.getDoc<VapidKeys>('config', 'vapid');
      if (saved) return saved;
      const created = generateVapidKeys();
      await this.store.putDoc('config', 'vapid', created);
      return created;
    })();
    return this.keys;
  }

  async publicKey(): Promise<string> {
    return (await this.vapid()).publicKey;
  }

  async subscribe(userId: string, subscription: PushSubscriptionJson): Promise<void> {
    const current = (await this.store.getDoc<{ subscriptions: PushSubscriptionJson[] }>('push', userId))?.subscriptions ?? [];
    const others = current.filter((s) => s.endpoint !== subscription.endpoint);
    await this.store.putDoc('push', userId, { subscriptions: [...others, subscription].slice(-MAX_SUBSCRIPTIONS) });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    const current = (await this.store.getDoc<{ subscriptions: PushSubscriptionJson[] }>('push', userId))?.subscriptions ?? [];
    await this.store.putDoc('push', userId, { subscriptions: current.filter((s) => s.endpoint !== endpoint) });
  }

  async isSubscribed(userId: string): Promise<boolean> {
    return ((await this.store.getDoc<{ subscriptions: PushSubscriptionJson[] }>('push', userId))?.subscriptions ?? []).length > 0;
  }

  /** Sends to every device of the user. Returns how many received it. Expired subscriptions are forgotten. */
  async notify(userId: string, payload: PushPayload): Promise<number> {
    const doc = await this.store.getDoc<{ subscriptions: PushSubscriptionJson[] }>('push', userId);
    if (!doc || doc.subscriptions.length === 0) return 0;
    const keys = await this.vapid();
    const subject = this.config.webUrl.startsWith('https://') ? this.config.webUrl : 'mailto:noreply@koradevs.app';
    const alive: PushSubscriptionJson[] = [];
    let delivered = 0;
    for (const subscription of doc.subscriptions) {
      try {
        await this.sender(subscription, payload, { ...keys, subject });
        alive.push(subscription);
        delivered += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) continue; // the device unsubscribed: forget it
        alive.push(subscription);
        this.logger.warn(`Notification non envoyée (${status ?? 'erreur réseau'}).`);
      }
    }
    if (alive.length !== doc.subscriptions.length) await this.store.putDoc('push', userId, { subscriptions: alive });
    return delivered;
  }
}
