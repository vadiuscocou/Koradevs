import type { ClientMessage, PublicUser, ServerMessage, SessionResponse, SolutionHit, SosRequest, CreatedRequest } from '@sos/shared';

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
export const myProfile = (token: string) => call<{ stats: { resolvedCount: number; averageResolutionTime: number }; tech: string[] }>('GET', '/me/profile', undefined, token);
export const logout = (token: string) => call<void>('POST', '/auth/logout', undefined, token).finally(forgetToken);

// --- Solutions ---
export const searchSolutions = (q: string, tech?: string) =>
  call<SolutionHit[]>('GET', `/solutions/search?q=${encodeURIComponent(q)}${tech ? `&tech=${encodeURIComponent(tech)}` : ''}`);

export const getRecentSolutions = () => call<SolutionHit[]>('GET', '/solutions/recent');

// --- Web Request (Appel à l'aide depuis le site) ---
export const createWebRequest = (token: string, payload: SosRequest) =>
  call<CreatedRequest>('POST', '/requests', payload, token);

// --- Community (La Maison, Voisins, Coupe par pays, Projets) ---
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

export interface ProjectTask {
  id: string;
  title: string;
  status: 'a_faire' | 'en_cours' | 'termine';
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
  tasks: ProjectTask[];
  createdAt: string;
}

export const getCommunityProfile = (token: string) => call<CommunityProfile>('GET', '/community/profile', undefined, token);

export const updateCommunityProfile = (token: string, updates: Partial<CommunityProfile>) =>
  call<CommunityProfile>('PUT', '/community/profile', updates, token);

export const getNeighbors = (token: string) => call<CommunityProfile[]>('GET', '/community/neighbors', undefined, token);

export const ringNeighbor = (token: string, targetLogin: string) =>
  call<{ success: boolean; message: string }>('POST', `/community/neighbors/ring/${encodeURIComponent(targetLogin)}`, undefined, token);

export const getCountryStats = () => call<Array<{ country: string; points: number }>>('GET', '/community/countries');

export const getProjects = () => call<CommunityProject[]>('GET', '/community/projects');

export const createProject = (
  token: string,
  project: {
    title: string;
    description: string;
    tech: string[];
    neededRoles: string[];
    repoUrl?: string;
    demoUrl?: string;
    city?: string;
    country?: string;
  },
) => call<CommunityProject>('POST', '/community/projects', project, token);

export const joinProject = (token: string, projectId: string) =>
  call<{ success: boolean; message: string }>('POST', `/community/projects/${encodeURIComponent(projectId)}/join`, undefined, token);

export const addProjectTask = (token: string, projectId: string, title: string, assignee?: string) =>
  call<{ success: boolean; task: ProjectTask }>('POST', `/community/projects/${encodeURIComponent(projectId)}/tasks`, { title, assignee }, token);

export const updateProjectTaskStatus = (token: string, projectId: string, taskId: string, status: 'a_faire' | 'en_cours' | 'termine') =>
  call<{ success: boolean }>('PATCH', `/community/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`, { status }, token);

export const sendReport = (
  token: string,
  report: {
    targetType: 'fiche' | 'projet' | 'utilisateur';
    targetId: string;
    reason: 'pas_clair' | 'doublon' | 'inapproprie';
    details?: string;
  },
) => call<{ success: boolean; message: string }>('POST', '/community/report', report, token);

export function connectRadar(token: string, onMessage: (m: ServerMessage) => void, onClose: () => void) {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  const send = (m: ClientMessage) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m));
  ws.onopen = () => send({ type: 'auth', token });
  ws.onmessage = (event) => onMessage(JSON.parse(String(event.data)) as ServerMessage);
  ws.onclose = onClose;
  return { send, close: () => ws.close() };
}
