import type {
  ClientMessage,
  PublicUser,
  ServerMessage,
  SessionResponse,
  SolutionHit,
  SosRequest,
  CreatedRequest,
  SalleState,
} from '@sos/shared';
import * as Y from 'yjs';

const TOKEN_KEY = 'sos.token';
const DEMO_LOGIN_KEY = 'kd.demo.login';
const DEMO_PROJECTS_KEY = 'kd.demo.projects';
const DEMO_PROFILE_KEY = 'kd.demo.profile';

export const savedToken = () => localStorage.getItem(TOKEN_KEY);
export const forgetToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DEMO_LOGIN_KEY);
};

// ============================================================================
// Données de Démonstration (utilisées en fallback quand l'API est absente sur Vercel)
// ============================================================================

const SEED_SOLUTIONS_DEMO: SolutionHit[] = [
  {
    id: '5e3d0001-0000-4000-8000-000000000001',
    title: 'Cannot read properties of undefined : un objet attendu est absent',
    error: "TypeError: Cannot read properties of undefined (reading 'x')",
    cause: "On lit une propriété sur une valeur undefined : élément introuvable dans un tableau (find), donnée d'API pas encore chargée, ou paramètre oublié.",
    fix: "Remonter la trace jusqu'à l'endroit où la valeur est créée. Vérifier le résultat de find/get avant de l'utiliser (if (!user) …) ou utiliser le chaînage optionnel user?.name.",
    tech: ['JavaScript', 'TypeScript', 'React'],
    score: 0.95,
  },
  {
    id: '5e3d0001-0000-4000-8000-000000000002',
    title: 'Cannot find module : dépendance manquante ou extension ESM oubliée',
    error: "Error: Cannot find module 'express' or './utils'",
    cause: 'Le paquet n’est pas installé (node_modules absent), ou un import relatif pointe vers un fichier sans son extension .js requise en Node ESM.',
    fix: 'Lancer npm install. Pour un import relatif en ESM, ajouter l’extension complète (import { x } from "./utils.js").',
    tech: ['JavaScript', 'TypeScript', 'Node.js'],
    score: 0.92,
  },
  {
    id: '5e3d0001-0000-4000-8000-000000000003',
    title: 'EADDRINUSE : le port est déjà utilisé',
    error: 'Error: listen EADDRINUSE: address already in use :::3000',
    cause: 'Un autre programme (souvent une ancienne instance de serveur fantôme) écoute déjà sur ce port.',
    fix: 'Arrêter l’ancien processus (lsof -i :3000 puis kill <pid>) ou changer la variable PORT dans votre .env.',
    tech: ['JavaScript', 'Express', 'NestJS'],
    score: 0.88,
  },
  {
    id: '5e3d0001-0000-4000-8000-000000000004',
    title: 'Bloqué par CORS : le serveur n’autorise pas l’origine du front',
    error: "Access to fetch has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present",
    cause: 'Le front et l’API sont sur des domaines différents et le serveur n’active pas les en-têtes CORS.',
    fix: 'Ajouter app.enableCors({ origin: "*" }) côté NestJS/Express, ou configurer le proxy Vite pour rediriger /api.',
    tech: ['TypeScript', 'React', 'Express', 'NestJS'],
    score: 0.85,
  },
  {
    id: '5e3d0001-0000-4000-8000-000000000005',
    title: 'Too many re-renders : boucle infinie dans useEffect/onClick React',
    error: 'Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.',
    cause: 'Un setter d’état React est invoqué directement pendant le cycle de rendu au lieu d’être dans un callback ou un hook.',
    fix: 'Remplacer onClick={setCount(1)} par onClick={() => setCount(1)}, et vérifier le tableau de dépendances de useEffect.',
    tech: ['React', 'TypeScript', 'JavaScript'],
    score: 0.82,
  },
];

const INITIAL_PROJECTS_DEMO: CommunityProject[] = [
  {
    id: 'proj-1',
    title: 'AfriCode Hub',
    description: 'Plateforme communautaire pour connecter les étudiants et écoles tech d’Afrique de l’Ouest et partager des défis de code.',
    author: 'awa',
    country: 'Sénégal',
    city: 'Dakar',
    repoUrl: 'https://github.com/koradevs/africode-hub',
    demoUrl: 'https://africode-demo.org',
    tech: ['React', 'TypeScript', 'Node.js'],
    neededRoles: ['Dev Frontend React', 'UI/UX Designer', 'Dev Backend'],
    members: ['awa', 'moussa'],
    tasks: [
      { id: 't-1', title: 'Intégrer le système d’authentification sécurisé', status: 'termine', assignee: 'awa' },
      { id: 't-2', title: 'Créer la vitrine des projets open-source africains', status: 'en_cours', assignee: 'moussa' },
      { id: 't-3', title: 'Rédiger la documentation et le guide de contribution', status: 'a_faire' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'proj-2',
    title: 'KoraPay Mobile',
    description: 'Micro-passerelle de paiement et facturation locale pour freelances et créateurs numériques sans carte internationale.',
    author: 'koffi',
    country: 'Bénin',
    city: 'Cotonou',
    repoUrl: 'https://github.com/koradevs/korapay-lib',
    tech: ['Flutter', 'Python', 'Docker'],
    neededRoles: ['Dev Mobile Flutter', 'Expert Sécurité API'],
    members: ['koffi'],
    tasks: [
      { id: 't-4', title: 'Spécification de l’API REST de webhook', status: 'termine', assignee: 'koffi' },
      { id: 't-5', title: 'Chiffrement de bout en bout des clés marchands', status: 'en_cours', assignee: 'koffi' },
      { id: 't-6', title: 'Application mobile de test pour les artisans', status: 'a_faire' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

function getStoredProjects(): CommunityProject[] {
  try {
    const raw = localStorage.getItem(DEMO_PROJECTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return INITIAL_PROJECTS_DEMO;
}

function saveStoredProjects(projects: CommunityProject[]) {
  localStorage.setItem(DEMO_PROJECTS_KEY, JSON.stringify(projects));
}

function getStoredProfile(login: string): CommunityProfile {
  try {
    const raw = localStorage.getItem(DEMO_PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.login === login) return p;
    }
  } catch {
    // ignore
  }
  return {
    userId: `u-${login}`,
    login,
    city: 'Cotonou',
    country: 'Bénin',
    bio: 'Développeur passionné sur KoraDevs.',
    doorStatus: 'ouverte',
    tech: ['TypeScript', 'React', 'Node.js'],
    points: 45,
    badges: ['Confirmé', 'Passeport Vérifié', 'Secouriste du Code'],
    confirmedCount: 3,
  };
}

function saveStoredProfile(profile: CommunityProfile) {
  localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(profile));
}

// ============================================================================
// Client HTTP avec Fallback Automatique
// ============================================================================

async function call<T>(method: string, route: string, body?: unknown, token?: string | null): Promise<T> {
  try {
    const response = await fetch(`/api${route}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) return undefined as T;

    // Si le serveur répond avec un statut d'erreur (ex: 405 Method Not Allowed sur Vercel, ou 404, 502)
    if (!response.ok) {
      throw new Error(`Erreur ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  } catch (err) {
    // En cas d'erreur réseau, 405 sur Vercel ou serveur non lancé : fallback gracieux
    return fallbackCall<T>(method, route, body);
  }
}

function fallbackCall<T>(method: string, route: string, body?: unknown): T {
  const currentLogin = localStorage.getItem(DEMO_LOGIN_KEY) || 'awa';

  // 1. Authentification
  if (route === '/auth/dev' && method === 'POST') {
    const login = (body as { login?: string })?.login?.trim() || currentLogin;
    localStorage.setItem(DEMO_LOGIN_KEY, login);
    const session: SessionResponse = {
      token: `demo-token-${login}`,
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      user: {
        id: `user-${login}`,
        login,
        name: login,
        avatarUrl: null,
        provider: 'dev',
      },
    };
    localStorage.setItem(TOKEN_KEY, session.token);
    return session as T;
  }

  if (route === '/me' && method === 'GET') {
    return {
      id: `user-${currentLogin}`,
      login: currentLogin,
      name: currentLogin,
      avatarUrl: null,
      provider: 'dev',
    } as T;
  }

  if (route === '/me/profile' && method === 'GET') {
    return {
      stats: { resolvedCount: 3, averageResolutionTime: 360 },
      tech: ['TypeScript', 'React', 'Node.js'],
    } as T;
  }

  if (route === '/auth/logout' && method === 'POST') {
    forgetToken();
    return undefined as T;
  }

  // 2. Solutions
  if (route.startsWith('/solutions/search')) {
    const url = new URL(`http://dummy${route}`);
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const tech = url.searchParams.get('tech');

    const results = SEED_SOLUTIONS_DEMO.filter((s) => {
      const matchQ = !q || s.title.toLowerCase().includes(q) || s.error.toLowerCase().includes(q) || s.cause.toLowerCase().includes(q);
      const matchTech = !tech || s.tech.some((t) => t.toLowerCase() === tech.toLowerCase());
      return matchQ && matchTech;
    });
    return results as T;
  }

  if (route === '/solutions/recent') {
    return SEED_SOLUTIONS_DEMO as T;
  }

  // 3. Demande d'aide Web
  if (route === '/requests' && method === 'POST') {
    const payload = (body as SosRequest) || {};
    const created: CreatedRequest = {
      id: `demo-salle-${Date.now()}`,
      status: 'ouverte',
      tech: payload.tech || ['TypeScript'],
      command: payload.command || 'npm test',
      exitCode: 1,
      files: payload.files?.length || 1,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      secretsMasked: 1,
      secondPassMasked: 0,
    };
    return created as T;
  }

  // 4. Communauté
  if (route === '/community/profile') {
    if (method === 'GET') {
      return getStoredProfile(currentLogin) as T;
    }
    if (method === 'PUT') {
      const updates = (body as Partial<CommunityProfile>) || {};
      const updated = { ...getStoredProfile(currentLogin), ...updates };
      saveStoredProfile(updated);
      return updated as T;
    }
  }

  if (route === '/community/neighbors') {
    const neighbors: CommunityProfile[] = [
      {
        userId: 'u-koffi',
        login: 'koffi',
        city: 'Cotonou',
        country: 'Bénin',
        bio: 'Dev Python & Flutter. Toujours partant pour déboguer.',
        doorStatus: 'ouverte',
        tech: ['Python', 'Docker', 'PostgreSQL'],
        points: 38,
        badges: ['Confirmé', 'Expert Python'],
        confirmedCount: 7,
      },
      {
        userId: 'u-fatou',
        login: 'fatou',
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        bio: 'DevOps & Rust. Porte ouverte le soir pour du live coding.',
        doorStatus: 'ouverte',
        tech: ['Rust', 'Docker', 'TypeScript'],
        points: 25,
        badges: ['Confirmé', 'As du Debug'],
        confirmedCount: 5,
      },
      {
        userId: 'u-moussa',
        login: 'moussa',
        city: 'Dakar',
        country: 'Sénégal',
        bio: 'Frontend React & Next.js.',
        doorStatus: 'fermee',
        tech: ['React', 'Next.js', 'Tailwind'],
        points: 18,
        badges: ['Confirmé'],
        confirmedCount: 3,
      },
    ].filter((n) => n.login !== currentLogin);
    return neighbors as T;
  }

  if (route.startsWith('/community/neighbors/ring/')) {
    const target = decodeURIComponent(route.split('/').pop() || 'voisin');
    return { success: true, message: `🔔 Ding-dong ! Tu as sonné chez @${target}.` } as T;
  }

  if (route === '/community/countries') {
    return [
      { country: 'Bénin', points: 34 },
      { country: 'Sénégal', points: 28 },
      { country: "Côte d'Ivoire", points: 21 },
      { country: 'Togo', points: 14 },
    ] as T;
  }

  if (route === '/community/projects') {
    const list = getStoredProjects();
    if (method === 'GET') {
      return list as T;
    }
    if (method === 'POST') {
      const p = body as Partial<CommunityProject>;
      const newProj: CommunityProject = {
        id: `proj-${Date.now()}`,
        title: p.title || 'Nouveau projet',
        description: p.description || '',
        author: currentLogin,
        country: p.country || 'Bénin',
        city: p.city || 'Cotonou',
        repoUrl: p.repoUrl,
        demoUrl: p.demoUrl,
        tech: p.tech || ['TypeScript'],
        neededRoles: p.neededRoles || ['Développeur'],
        members: [currentLogin],
        tasks: [],
        createdAt: new Date().toISOString(),
      };
      const updatedList = [newProj, ...list];
      saveStoredProjects(updatedList);
      return newProj as T;
    }
  }

  if (route.includes('/join') && method === 'POST') {
    const projId = route.split('/')[3];
    const list = getStoredProjects();
    const target = list.find((p) => p.id === projId);
    if (target && !target.members.includes(currentLogin)) {
      target.members.push(currentLogin);
      saveStoredProjects(list);
    }
    return { success: true, message: 'Tu as rejoint le projet !' } as T;
  }

  if (route.includes('/tasks')) {
    const parts = route.split('/');
    const projId = parts[3];
    const list = getStoredProjects();
    const proj = list.find((p) => p.id === projId);

    if (method === 'POST' && proj) {
      const taskBody = body as { title?: string; assignee?: string };
      const newTask: ProjectTask = {
        id: `t-${Date.now()}`,
        title: taskBody.title || 'Nouvelle tâche',
        status: 'a_faire',
        assignee: taskBody.assignee,
      };
      proj.tasks.push(newTask);
      saveStoredProjects(list);
      return { success: true, task: newTask } as T;
    }

    if (method === 'PATCH' && proj) {
      const taskId = parts[5];
      const task = proj.tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = (body as { status: 'a_faire' | 'en_cours' | 'termine' }).status;
        saveStoredProjects(list);
      }
      return { success: true } as T;
    }
  }

  if (route === '/community/report') {
    return { success: true, message: 'Signalement pris en compte.' } as T;
  }

  return {} as T;
}

// ============================================================================
// Méthodes d'API Publiques
// ============================================================================

export async function loginDev(login: string): Promise<SessionResponse> {
  const session = await call<SessionResponse>('POST', '/auth/dev', { login });
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(DEMO_LOGIN_KEY, login);
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

// --- Community ---
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

// ============================================================================
// Radar & WebSocket (avec Simulateur de Salle CodeFlash si hors-ligne / Vercel)
// ============================================================================

function createDemoSalleState(requestId: string, currentLogin: string): SalleState {
  const doc = new Y.Doc();
  const text = doc.getText('src/server.ts');
  text.insert(
    0,
    `// ⚡ CodeFlash — Session collaborative en direct
import express from 'express';
// Erreur identifiée : l'extension ESM manquait
import { getUser } from './user.js';

const app = express();

app.get('/api/me', (req, res) => {
  const user = getUser();
  res.json({ user, status: 'ok' });
});

export default app;
`,
  );
  const update = Y.encodeStateAsUpdate(doc);
  const docBase64 = btoa(Array.from(update, (b) => String.fromCharCode(b)).join(''));

  const user: PublicUser = {
    id: `u-${currentLogin}`,
    login: currentLogin,
    name: currentLogin,
    avatarUrl: null,
    provider: 'dev',
  };

  const helper: PublicUser = {
    id: 'u-koffi',
    login: 'koffi',
    name: 'Koffi',
    avatarUrl: null,
    provider: 'dev',
  };

  return {
    requestId,
    role: 'demandeur',
    requester: user,
    helper,
    command: 'npm run start',
    tech: ['TypeScript', 'Node.js'],
    errorSummary: "Error [ERR_MODULE_NOT_FOUND]: Cannot find module './user' imported from src/server.ts",
    files: [{ path: 'src/server.ts', line: 4 }],
    doc: docBase64,
    chat: [
      {
        id: 1,
        from: 'koffi',
        role: 'aidant',
        text: 'Salut ! Je suis dans la salle CodeFlash avec toi. Ajoutons l’extension .js pour régler l’import ESM.',
        at: '10:02',
      },
    ],
    terminal: `> ts-node-esm src/server.ts\nError [ERR_MODULE_NOT_FOUND]: Cannot find module './user' imported from src/server.ts\n  at finalizeResolution (node:internal/modules/esm/resolve:265:11)`,
    running: false,
    lastExitCode: 1,
    members: [
      { login: currentLogin, role: 'demandeur', client: 'web' },
      { login: 'koffi', role: 'aidant', client: 'web' },
    ],
    url: `${location.origin}/#/salle/${requestId}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
}

export function connectRadar(token: string, onMessage: (m: ServerMessage) => void, onClose: () => void) {
  let isDemoActive = false;
  const currentLogin = localStorage.getItem(DEMO_LOGIN_KEY) || 'awa';

  const triggerDemoWelcome = () => {
    isDemoActive = true;
    setTimeout(() => {
      onMessage({
        type: 'bienvenue',
        user: {
          id: `u-${currentLogin}`,
          login: currentLogin,
          name: currentLogin,
          avatarUrl: null,
          provider: 'dev',
        },
      });
    }, 100);
  };

  let ws: WebSocket | null = null;

  try {
    const isVercel = location.hostname.endsWith('vercel.app');
    // Sur Vercel CDN, les WebSockets /ws n'existent pas sur le serveur statique
    if (isVercel) {
      triggerDemoWelcome();
    } else {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      ws.onopen = () => ws?.send(JSON.stringify({ type: 'auth', token }));
      ws.onmessage = (event) => onMessage(JSON.parse(String(event.data)) as ServerMessage);
      ws.onerror = () => {
        if (!isDemoActive) triggerDemoWelcome();
      };
      ws.onclose = () => {
        if (!isDemoActive) triggerDemoWelcome();
      };
    }
  } catch {
    triggerDemoWelcome();
  }

  const send = (m: ClientMessage) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(m));
      return;
    }

    // Gestion interactive en mode autonome / démo
    if (m.type === 'rejoindre') {
      const demoSalle = createDemoSalleState(m.requestId, currentLogin);
      setTimeout(() => onMessage({ type: 'salle', salle: demoSalle }), 150);
    } else if (m.type === 'message') {
      onMessage({
        type: 'message',
        requestId: m.requestId,
        message: {
          id: Date.now(),
          from: currentLogin,
          role: 'demandeur',
          text: m.text,
          at: new Date().toLocaleTimeString().slice(0, 5),
        },
      });
      // Réponse automatique de l'aidant
      setTimeout(() => {
        onMessage({
          type: 'message',
          requestId: m.requestId,
          message: {
            id: Date.now() + 1,
            from: 'koffi',
            role: 'aidant',
            text: 'Super ! La correction est en place. On peut valider la fiche solution.',
            at: new Date().toLocaleTimeString().slice(0, 5),
          },
        });
      }, 1200);
    } else if (m.type === 'valider-fiche') {
      setTimeout(() => {
        onMessage({ type: 'fiche-validee', requestId: m.requestId, by: 'koffi' });
        setTimeout(() => {
          onMessage({ type: 'salle-fermee', requestId: m.requestId, raison: 'resolue', by: currentLogin });
        }, 800);
      }, 500);
    }
  };

  return {
    send,
    close: () => {
      ws?.close();
      onClose();
    },
  };
}
