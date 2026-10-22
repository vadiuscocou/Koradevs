import { deletePushSubscription, getPushKey, savePushSubscription } from './api.js';

export const pushSupported = (): boolean => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const toKey = (base64: string): Uint8Array => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    /* not available (private mode, insecure address): the site works without it */
  }
}

export async function pushActive(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!(await registration?.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/** Asks permission, subscribes this device and tells the server. */
export async function enablePush(token: string): Promise<'ok' | 'refuse' | 'indisponible'> {
  if (!pushSupported()) return 'indisponible';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'refuse';
  try {
    await registerServiceWorker();
    const registration = await navigator.serviceWorker.ready;
    const { publicKey } = await getPushKey();
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) as BufferSource }));
    await savePushSubscription(token, subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
    return 'ok';
  } catch {
    return 'indisponible';
  }
}

export async function disablePush(token: string): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await deletePushSubscription(token, subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe();
}
