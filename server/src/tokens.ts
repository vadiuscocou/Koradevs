export const CONFIG = 'SOS_CONFIG';
export const STORE = 'SOS_STORE';
export const GITHUB = 'SOS_GITHUB';
export const CLOCK = 'SOS_CLOCK';

export const PUSH_SENDER = 'SOS_PUSH_SENDER';

export type Clock = () => Date;

/** Sends one Web Push message. Replaced by a fake in tests. */
export type PushSender = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; url: string },
  vapid: { publicKey: string; privateKey: string; subject: string },
) => Promise<void>;
