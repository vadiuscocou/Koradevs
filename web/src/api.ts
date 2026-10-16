import type { ClientMessage, CreatedRequest, PublicUser, ServerMessage, SessionResponse, SolutionHit, SosRequest } from '@sos/shared';

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
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(' ') : data.message;
    throw new Error(typeof message === 'string' ? message : `Erreur ${response.status}`);
  }
  return data as T;
}

export async function loginDev(login: string): Promise<SessionResponse> {
  const session = await call<SessionResponse>('POST', '/auth/dev', { login });
  localStorage.setItem(TOKEN_KEY, session.token);
  return session;
}

export const authConfig = () => call<{ githubClientId: string | null; devAuth: boolean }>('GET', '/auth/config');
export const me = (token: string) => call<PublicUser>('GET', '/me', undefined, token);
export const logout = (token: string) => call<void>('POST', '/auth/logout', undefined, token).finally(forgetToken);

// --- Fiches -----------------------------------------------------------------

export const searchSolutions = (q: string, tech?: string) =>
  call<SolutionHit[]>('GET', `/solutions/search?q=${encodeURIComponent(q)}${tech ? `&tech=${encodeURIComponent(tech)}` : ''}`);
export const getRecentSolutions = () => call<SolutionHit[]>('GET', '/solutions/recent');
/** Ids of the sheets whose test ran green. Only these get the « Confirmé » badge. */
export const getConfirmedIds = () => call<string[]>('GET', '/community/confirmed');

// --- Appel à l'aide (depuis le site) ---------------------------------------

export const createWebRequest = (token: string, payload: SosRequest) => call<CreatedRequest>('POST', '/requests', payload, token);
export const cancelRequest = (token: string, id: string) => call<void>('POST', `/requests/${encodeURIComponent(id)}/close`, undefined, token);

// --- Communauté -------------------------------------------------------------

export interface CommunityProfile {
  userId: string;
  login: string;
  city: string;
  country: string;
  bio: string;
  doorStatus: 'ouverte' | 'fermee';
  tech: string[];
  points: number;
  badges: string[];
  confirmedCount: number;
}

export type TaskStatus = 'a_faire' | 'en_cours' | 'termine';

export interface ProjectTask {
  id: string;
  title: string;
  status: TaskStatus;
  assignee?: string;
}

export interface CommunityProject {
  id: string;
  title: string;
  description: string;
  author: string;
  country: string;
  city: string;
  repoUrl?: string;
  demoUrl?: string;
  tech: string[];
  neededRoles: string[];
  members: string[];
  requests: string[];
  tasks: ProjectTask[];
  createdAt: string;
}

export interface Proof {
  id: string;
  helper: string;
  solutionId: string;
  title: string;
  tech: string[];
  testPassed: boolean;
  at: string;
}

export interface Passport {
  login: string;
  city: string;
  country: string;
  tech: string[];
  confirmedCount: number;
  proofs: Proof[];
  hash: string;
}

export const getCommunityProfile = (token: string) => call<CommunityProfile>('GET', '/community/profile', undefined, token);
export const updateCommunityProfile = (
  token: string,
  updates: Partial<Pick<CommunityProfile, 'city' | 'country' | 'bio' | 'doorStatus' | 'tech'>>,
) => call<CommunityProfile>('PUT', '/community/profile', updates, token);
export const getNeighbors = (token: string) => call<CommunityProfile[]>('GET', '/community/neighbors', undefined, token);
export const ringNeighbor = (token: string, login: string) =>
  call<{ success: boolean; message: string }>('POST', `/community/neighbors/ring/${encodeURIComponent(login)}`, undefined, token);
export const getPassport = (login: string) => call<Passport>('GET', `/community/passport/${encodeURIComponent(login)}`);

export const getProjects = () => call<CommunityProject[]>('GET', '/community/projects');
export const createProject = (
  token: string,
  project: { title: string; description: string; tech: string[]; neededRoles: string[]; repoUrl?: string; demoUrl?: string },
) => call<CommunityProject>('POST', '/community/projects', project, token);
export const joinProject = (token: string, id: string) =>
  call<{ success: boolean; message: string }>('POST', `/community/projects/${encodeURIComponent(id)}/join`, undefined, token);
export const answerJoin = (token: string, id: string, login: string, accept: boolean) =>
  call<{ success: boolean }>('POST', `/community/projects/${encodeURIComponent(id)}/requests/${encodeURIComponent(login)}`, { accept }, token);
export const addProjectTask = (token: string, id: string, title: string, assignee?: string) =>
  call<{ success: boolean; task: ProjectTask }>('POST', `/community/projects/${encodeURIComponent(id)}/tasks`, { title, assignee }, token);
export const updateProjectTaskStatus = (token: string, id: string, taskId: string, status: TaskStatus) =>
  call<{ success: boolean }>('PATCH', `/community/projects/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}`, { status }, token);

export const sendReport = (
  token: string,
  report: { targetType: 'fiche' | 'projet' | 'utilisateur'; targetId: string; reason: 'pas_clair' | 'doublon' | 'inapproprie'; details?: string },
) => call<{ success: boolean; message: string }>('POST', '/community/report', report, token);

// --- Temps réel -------------------------------------------------------------

export function connectRadar(token: string, onMessage: (m: ServerMessage) => void, onClose: () => void) {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  const send = (m: ClientMessage) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m));
  ws.onopen = () => send({ type: 'auth', token });
  ws.onmessage = (event) => onMessage(JSON.parse(String(event.data)) as ServerMessage);
  ws.onclose = onClose;
  return { send, close: () => ws.close() };
}

export type Radar = ReturnType<typeof connectRadar>;
