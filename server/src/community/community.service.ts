import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Store, User } from '../store/types.js';
import { STORE } from '../tokens.js';

export type DoorStatus = 'ouverte' | 'fermee';
export type TaskStatus = 'a_faire' | 'en_cours' | 'termine';

/** What the user chose to tell about themselves. Everything else is computed from real activity. */
interface ProfileDoc {
  userId: string;
  login: string;
  city: string;
  country: string;
  bio: string;
  doorStatus: DoorStatus;
}

export interface UserCommunityProfile extends ProfileDoc {
  tech: string[];
  /** Real number of confirmed helps (one proof each). */
  confirmedCount: number;
  points: number;
  badges: string[];
}

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
  /** Logins that asked to join, waiting for the author. */
  requests: string[];
  tasks: ProjectTask[];
  createdAt: string;
}

export interface ReportItem {
  id: string;
  targetType: 'fiche' | 'projet' | 'utilisateur';
  targetId: string;
  reason: 'pas_clair' | 'doublon' | 'inapproprie';
  details?: string;
  reportedBy: string;
  createdAt: string;
}

/** One confirmed help: a published sheet, signed by the helper. */
export interface ProofDoc {
  id: string;
  helper: string;
  solutionId: string;
  title: string;
  tech: string[];
  /** true when the requester's program ran green in the room (exit code 0). */
  testPassed: boolean;
  at: string;
}

export interface ReplayFile {
  path: string;
  before: string;
  after: string;
}

export interface Passport {
  login: string;
  city: string;
  country: string;
  tech: string[];
  confirmedCount: number;
  proofs: ProofDoc[];
  /** SHA-256 of the canonical JSON of login, city, country, tech, confirmedCount and proofs. Anyone can recompute it. */
  hash: string;
}

const POINTS_PER_PROOF = 3;

const cleanList = (value: unknown, max: number): string[] =>
  Array.isArray(value) ? [...new Set(value.map((v) => String(v).trim()).filter(Boolean))].slice(0, max) : [];

const cleanUrl = (value: unknown): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^https?:\/\/\S{3,300}$/i.test(text) ? text : undefined;
};

@Injectable()
export class CommunityService {
  constructor(@Inject(STORE) private readonly store: Store) {}

  private async proofsOf(login: string): Promise<ProofDoc[]> {
    return (await this.store.listDocs<ProofDoc>('proof', 1000)).filter((p) => p.helper.toLowerCase() === login.toLowerCase());
  }

  private async toProfile(doc: ProfileDoc): Promise<UserCommunityProfile> {
    const [tech, proofs] = await Promise.all([this.store.getHelperTech(doc.userId), this.proofsOf(doc.login)]);
    const confirmedCount = proofs.length;
    return {
      ...doc,
      tech,
      confirmedCount,
      points: confirmedCount * POINTS_PER_PROOF,
      badges: confirmedCount > 0 ? ['Confirmé'] : [],
    };
  }

  private async docFor(user: Pick<User, 'id' | 'login'>): Promise<ProfileDoc> {
    return (
      (await this.store.getDoc<ProfileDoc>('profile', user.id)) ?? {
        userId: user.id,
        login: user.login,
        city: '',
        country: '',
        bio: '',
        doorStatus: 'fermee',
      }
    );
  }

  async getProfile(user: User): Promise<UserCommunityProfile> {
    return this.toProfile(await this.docFor(user));
  }

  async updateProfile(
    user: User,
    updates: { city?: unknown; country?: unknown; bio?: unknown; doorStatus?: unknown; tech?: unknown },
  ): Promise<UserCommunityProfile> {
    const doc = await this.docFor(user);
    if (typeof updates.city === 'string') doc.city = updates.city.trim().slice(0, 60);
    if (typeof updates.country === 'string') doc.country = updates.country.trim().slice(0, 60);
    if (typeof updates.bio === 'string') doc.bio = updates.bio.trim().slice(0, 280);
    if (updates.doorStatus === 'ouverte' || updates.doorStatus === 'fermee') doc.doorStatus = updates.doorStatus;
    doc.login = user.login;
    await this.store.putDoc('profile', user.id, doc);
    if (updates.tech !== undefined) await this.store.setHelperTech(user.id, cleanList(updates.tech, 20));
    return this.toProfile(doc);
  }

  /** Real people with an open door and at least one technology. Nobody is invented. */
  async getNeighbors(user: User): Promise<UserCommunityProfile[]> {
    const ids = (await this.store.listHelperIds()).filter((id) => id !== user.id);
    const profiles: UserCommunityProfile[] = [];
    for (const id of ids) {
      const doc = await this.store.getDoc<ProfileDoc>('profile', id);
      if (doc?.doorStatus === 'ouverte') profiles.push(await this.toProfile(doc));
    }
    return profiles.sort((a, b) => b.confirmedCount - a.confirmedCount);
  }

  async isDoorOpen(login: string): Promise<boolean> {
    const user = await this.store.findUserByLogin(login);
    if (!user) return false;
    return (await this.docFor(user)).doorStatus === 'ouverte';
  }

  // --- Passeport -----------------------------------------------------------

  async recordProof(proof: Omit<ProofDoc, 'id' | 'at'>): Promise<ProofDoc> {
    const doc: ProofDoc = { ...proof, id: randomUUID(), at: new Date().toISOString() };
    await this.store.putDoc('proof', doc.id, doc);
    return doc;
  }

  async getPassport(login: string): Promise<Passport | null> {
    const user = await this.store.findUserByLogin(login);
    if (!user) return null;
    const profile = await this.getProfile(user);
    const proofs = (await this.proofsOf(user.login)).sort((a, b) => b.at.localeCompare(a.at));
    const body = {
      login: user.login,
      city: profile.city,
      country: profile.country,
      tech: profile.tech,
      confirmedCount: proofs.length,
      proofs,
    };
    return { ...body, hash: passportHash(body) };
  }

  /** The « avant / après » of a fiche, only when the requester agreed to publish it. */
  async saveReplay(solutionId: string, files: ReplayFile[]): Promise<void> {
    if (files.length > 0) await this.store.putDoc('replay', solutionId, { solutionId, files });
  }

  async getReplay(solutionId: string): Promise<{ solutionId: string; files: ReplayFile[] } | null> {
    return this.store.getDoc('replay', solutionId);
  }

  /** Ids of the sheets whose test ran green: only these get the « Confirmé » badge. */
  async confirmedSolutionIds(): Promise<string[]> {
    return (await this.store.listDocs<ProofDoc>('proof', 1000)).filter((p) => p.testPassed).map((p) => p.solutionId);
  }

  /** Real counters for the home page: nothing is invented, zero stays zero. */
  async stats(): Promise<{ fiches: number; aides: number; confirmees: number; aidants: number }> {
    const [solutions, proofs, helperIds] = await Promise.all([
      this.store.listSolutions(1000),
      this.store.listDocs<ProofDoc>('proof', 1000),
      this.store.listHelperIds(),
    ]);
    let aidants = 0;
    for (const id of helperIds) if ((await this.store.getDoc<ProfileDoc>('profile', id))?.doorStatus === 'ouverte') aidants += 1;
    return { fiches: solutions.length, aides: proofs.length, confirmees: proofs.filter((p) => p.testPassed).length, aidants };
  }

  /** What the public map shows: where doors are open (city and country only, no names) and the latest confirmed helps. */
  async network(): Promise<{ places: { city: string; country: string }[]; recent: { helper: string; title: string; city: string; country: string; at: string }[] }> {
    const [helperIds, proofs] = await Promise.all([this.store.listHelperIds(), this.store.listDocs<ProofDoc>('proof', 200)]);
    const places: { city: string; country: string }[] = [];
    for (const id of helperIds) {
      const profile = await this.store.getDoc<ProfileDoc>('profile', id);
      if (profile?.doorStatus === 'ouverte' && (profile.city || profile.country)) places.push({ city: profile.city, country: profile.country });
    }
    const recent: { helper: string; title: string; city: string; country: string; at: string }[] = [];
    for (const proof of [...proofs].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)) {
      const owner = (await this.store.findUserByLogin(proof.helper))?.id;
      const profile = owner ? await this.store.getDoc<ProfileDoc>('profile', owner) : undefined;
      recent.push({ helper: proof.helper, title: proof.title, city: profile?.city ?? '', country: profile?.country ?? '', at: proof.at });
    }
    return { places: places.slice(0, 200), recent };
  }

  // --- Projets -------------------------------------------------------------

  getProjects(): Promise<CommunityProject[]> {
    return this.store.listDocs<CommunityProject>('project', 100);
  }

  async createProject(
    user: User,
    data: { title?: unknown; description?: unknown; tech?: unknown; neededRoles?: unknown; repoUrl?: unknown; demoUrl?: unknown },
  ): Promise<CommunityProject | null> {
    const title = typeof data.title === 'string' ? data.title.trim().slice(0, 80) : '';
    const description = typeof data.description === 'string' ? data.description.trim().slice(0, 600) : '';
    if (title.length < 3 || description.length < 10) return null;
    const profile = await this.docFor(user);
    const project: CommunityProject = {
      id: randomUUID(),
      title,
      description,
      author: user.login,
      country: profile.country,
      city: profile.city,
      repoUrl: cleanUrl(data.repoUrl),
      demoUrl: cleanUrl(data.demoUrl),
      tech: cleanList(data.tech, 8),
      neededRoles: cleanList(data.neededRoles, 6),
      members: [user.login],
      requests: [],
      tasks: [],
      createdAt: new Date().toISOString(),
    };
    await this.store.putDoc('project', project.id, project);
    return project;
  }

  /** « Demander à rejoindre » : the author decides. */
  async requestToJoin(projectId: string, login: string): Promise<'ok' | 'inconnu' | 'deja-membre'> {
    const project = await this.store.getDoc<CommunityProject>('project', projectId);
    if (!project) return 'inconnu';
    if (project.members.includes(login)) return 'deja-membre';
    if (!project.requests.includes(login)) project.requests.push(login);
    await this.store.putDoc('project', projectId, project);
    return 'ok';
  }

  async answerJoin(projectId: string, author: string, login: string, accept: boolean): Promise<boolean> {
    const project = await this.store.getDoc<CommunityProject>('project', projectId);
    if (!project || project.author !== author) return false;
    project.requests = project.requests.filter((l) => l !== login);
    if (accept && !project.members.includes(login)) project.members.push(login);
    await this.store.putDoc('project', projectId, project);
    return true;
  }

  async addTask(projectId: string, login: string, title: string, assignee?: string): Promise<ProjectTask | null> {
    const project = await this.store.getDoc<CommunityProject>('project', projectId);
    const clean = title.trim().slice(0, 120);
    if (!project || !project.members.includes(login) || !clean) return null;
    const task: ProjectTask = {
      id: randomUUID(),
      title: clean,
      status: 'a_faire',
      assignee: assignee && project.members.includes(assignee) ? assignee : undefined,
    };
    project.tasks.push(task);
    await this.store.putDoc('project', projectId, project);
    return task;
  }

  async updateTaskStatus(projectId: string, login: string, taskId: string, status: TaskStatus): Promise<boolean> {
    const project = await this.store.getDoc<CommunityProject>('project', projectId);
    const task = project?.tasks.find((t) => t.id === taskId);
    if (!project || !task || !project.members.includes(login)) return false;
    task.status = status;
    await this.store.putDoc('project', projectId, project);
    return true;
  }

  // --- Signalements --------------------------------------------------------

  async report(item: Omit<ReportItem, 'id' | 'createdAt'>): Promise<ReportItem> {
    const report: ReportItem = { ...item, id: randomUUID(), createdAt: new Date().toISOString() };
    await this.store.putDoc('report', report.id, report);
    return report;
  }
}

/** Canonical JSON (sorted keys) so that anyone can recompute the hash from the public passport. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export const passportHash = (body: unknown): string => createHash('sha256').update(canonical(body)).digest('hex');
