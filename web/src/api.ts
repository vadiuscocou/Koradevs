import type { ClientMessage, PublicUser, ServerMessage, SessionResponse } from '@sos/shared';

const TOKEN_KEY = 'sos.token';

export const savedToken = () => localStorage.getItem(TOKEN_KEY);
export const forgetToken = () => localStorage.removeItem(TOKEN_KEY);

async function call<T>(method: string, route: string, body?: unknown, token?: string | null): Promise<T> {
  const response = await fetch(`/api${route}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : `Erreur ${response.status}`);
  return data as T;
}

export async function loginDev(login: string): Promise<SessionResponse> {
  const session = await call<SessionResponse>('POST', '/auth/dev', { login });
  localStorage.setItem(TOKEN_KEY, session.token);
  return session;
}

export const me = (token: string) => call<PublicUser>('GET', '/me', undefined, token);
export const myProfile = (token: string) => call<{ stats: { resolvedCount: number, averageResolutionTime: number }, tech: string[] }>('GET', '/me/profile', undefined, token);
export const logout = (token: string) => call<void>('POST', '/auth/logout', undefined, token).finally(forgetToken);

export function connectRadar(token: string, onMessage: (m: ServerMessage) => void, onClose: () => void) {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  const send = (m: ClientMessage) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m));
  ws.onopen = () => send({ type: 'auth', token });
  ws.onmessage = (event) => onMessage(JSON.parse(String(event.data)) as ServerMessage);
  ws.onclose = onClose;
  return { send, close: () => ws.close() };
}
