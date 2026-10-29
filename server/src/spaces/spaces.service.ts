import { Inject, Injectable } from '@nestjs/common';
import { maskSecrets } from '@sos/shared';
import type { Store, User } from '../store/types.js';
import { STORE } from '../tokens.js';

export interface Space {
  id: string;
  name: string;
  topic: string;
}

/** Fixed rooms: a general one, one for bugs, and one per technology. */
export const SPACES: Space[] = [
  { id: 'general', name: 'général', topic: 'Se présenter, discuter, partager ce qu’on construit.' },
  { id: 'bugs', name: 'bugs-en-direct', topic: 'Un bug te résiste ? Décris-le ici, quelqu’un passera.' },
  { id: 'javascript', name: 'javascript', topic: 'JavaScript, TypeScript, Node.' },
  { id: 'react', name: 'react', topic: 'React, Next, interfaces web.' },
  { id: 'python', name: 'python', topic: 'Python, Django, données.' },
  { id: 'php', name: 'php', topic: 'PHP, Laravel, WordPress.' },
  { id: 'java', name: 'java-kotlin', topic: 'Java, Kotlin, Android.' },
  { id: 'sql', name: 'bases-de-donnees', topic: 'PostgreSQL, MySQL, modélisation.' },
  { id: 'devops', name: 'devops', topic: 'Docker, déploiement, serveurs.' },
  { id: 'mobile', name: 'mobile', topic: 'Flutter, React Native, applications.' },
];

export interface SpaceMessage {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface FicheComment extends SpaceMessage {
  solutionId: string;
}

interface FollowDoc {
  following: string[];
}

interface VoteDoc {
  users: string[];
}

const MAX_TEXT = 1000;
const MIN_GAP_MS = 600;

@Injectable()
export class SpacesService {
  private readonly lastPost = new Map<string, number>();

  constructor(@Inject(STORE) private readonly store: Store) {}

  list(): Space[] {
    return SPACES;
  }

  has(spaceId: string): boolean {
    return SPACES.some((s) => s.id === spaceId);
  }

  async messages(spaceId: string, after?: string): Promise<SpaceMessage[]> {
    const all = (await this.store.listDocs<SpaceMessage>(`msg:${spaceId}`, 80)).reverse();
    return after ? all.filter((m) => m.at > after) : all;
  }

  /** The same masking as everywhere: a pasted key never stays readable. */
  private async write(user: User, kind: `msg:${string}` | `comment:${string}`, raw: string): Promise<SpaceMessage | 'trop-vite' | null> {
    const text = maskSecrets(raw.trim().slice(0, MAX_TEXT)).text;
    if (!text) return null;
    const now = Date.now();
    if (now - (this.lastPost.get(user.id) ?? 0) < MIN_GAP_MS) return 'trop-vite';
    this.lastPost.set(user.id, now);
    const message: SpaceMessage = { id: `${now}-${Math.random().toString(36).slice(2, 8)}`, author: user.login, text, at: new Date(now).toISOString() };
    await this.store.putDoc(kind, message.id, message);
    return message;
  }

  post(user: User, spaceId: string, raw: string): Promise<SpaceMessage | 'trop-vite' | null> {
    return this.write(user, `msg:${spaceId}`, raw);
  }

  // --- Fiches: comments and « utile » -----------------------------------------

  async comments(solutionId: string): Promise<SpaceMessage[]> {
    return (await this.store.listDocs<SpaceMessage>(`comment:${solutionId}`, 100)).reverse();
  }

  comment(user: User, solutionId: string, raw: string): Promise<SpaceMessage | 'trop-vite' | null> {
    return this.write(user, `comment:${solutionId}`, raw);
  }

  async votes(solutionId: string, login?: string): Promise<{ count: number; mine: boolean }> {
    const doc = await this.store.getDoc<VoteDoc>('vote', solutionId);
    const users = doc?.users ?? [];
    return { count: users.length, mine: !!login && users.includes(login) };
  }

  /** Toggles this person's vote; anyone can vote once. */
  async toggleVote(user: User, solutionId: string): Promise<{ count: number; mine: boolean }> {
    const doc = await this.store.getDoc<VoteDoc>('vote', solutionId);
    const users = new Set(doc?.users ?? []);
    if (!users.delete(user.login)) users.add(user.login);
    await this.store.putDoc('vote', solutionId, { users: [...users] } satisfies VoteDoc);
    return { count: users.size, mine: users.has(user.login) };
  }

  // --- Following ----------------------------------------------------------------

  async following(login: string): Promise<string[]> {
    return (await this.store.getDoc<FollowDoc>('follow', login.toLowerCase()))?.following ?? [];
  }

  async toggleFollow(user: User, target: string): Promise<{ following: boolean } | null> {
    const found = await this.store.findUserByLogin(target);
    if (!found || found.id === user.id) return null;
    const list = new Set(await this.following(user.login));
    const on = !list.delete(found.login);
    if (on) list.add(found.login);
    await this.store.putDoc('follow', user.login.toLowerCase(), { following: [...list] } satisfies FollowDoc);
    return { following: on };
  }

  /** Confirmed helps by the people this person follows, newest first. */
  async feed(login: string): Promise<{ helper: string; title: string; tech: string[]; solutionId: string; at: string }[]> {
    const mine = new Set((await this.following(login)).map((l) => l.toLowerCase()));
    if (mine.size === 0) return [];
    const proofs = await this.store.listDocs<{ helper: string; title: string; tech: string[]; solutionId: string; at: string }>('proof', 300);
    return proofs.filter((p) => mine.has(p.helper.toLowerCase())).slice(0, 30);
  }
}
