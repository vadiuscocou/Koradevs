import { randomUUID } from 'node:crypto';
import { solutionWords } from '../solutions/words.js';
import type { DocKind, NewRequest, NewSolution, PurgeResult, Solution, Store, StoredRequest, User, UserInput } from './types.js';

/** In-memory store for tests and quick local runs without PostgreSQL. */
export class MemoryStore implements Store {
  readonly kind = 'memoire' as const;
  private readonly users = new Map<string, User>();
  private readonly sessions = new Map<string, { userId: string; expiresAt: Date }>();
  private readonly requests = new Map<string, StoredRequest>();
  private readonly helperTech = new Map<string, string[]>();
  private readonly solutions = new Map<string, Solution>();
  private readonly credentials = new Map<string, { userId: string; passwordHash: string }>();
  private readonly docs = new Map<string, { data: unknown; createdAt: number }>();

  async upsertUser(input: UserInput): Promise<User> {
    const existing = [...this.users.values()].find((u) => u.provider === input.provider && u.providerId === input.providerId);
    if (existing) {
      Object.assign(existing, { login: input.login, name: input.name, avatarUrl: input.avatarUrl });
      return structuredClone(existing);
    }
    const user: User = { id: randomUUID(), ...input, createdAt: new Date() };
    this.users.set(user.id, user);
    return structuredClone(user);
  }

  async findUserByProvider(provider: User['provider'], providerId: string): Promise<User | null> {
    const user = [...this.users.values()].find((u) => u.provider === provider && u.providerId === providerId);
    return user ? structuredClone(user) : null;
  }

  async createPasswordUser(input: { login: string; email: string; passwordHash: string }): Promise<{ user: User } | { conflict: 'login' | 'email' }> {
    if (this.credentials.has(input.email)) return { conflict: 'email' };
    if ([...this.users.values()].some((u) => u.login.toLowerCase() === input.login.toLowerCase())) return { conflict: 'login' };
    const user: User = { id: randomUUID(), provider: 'password', providerId: input.email, login: input.login, name: null, avatarUrl: null, createdAt: new Date() };
    this.users.set(user.id, user);
    this.credentials.set(input.email, { userId: user.id, passwordHash: input.passwordHash });
    return { user: structuredClone(user) };
  }

  async findCredential(email: string): Promise<{ userId: string; passwordHash: string } | null> {
    const credential = this.credentials.get(email);
    return credential ? { ...credential } : null;
  }

  async createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }

  async findUserBySession(tokenHash: string, now: Date): Promise<User | null> {
    const session = this.sessions.get(tokenHash);
    if (!session || session.expiresAt <= now) return null;
    const user = this.users.get(session.userId);
    return user ? structuredClone(user) : null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }

  async createRequest(input: NewRequest): Promise<StoredRequest> {
    const request: StoredRequest = {
      id: randomUUID(),
      userId: input.userId,
      status: 'ouverte',
      tech: [...input.payload.tech],
      command: input.payload.command,
      exitCode: input.payload.exitCode,
      payload: structuredClone(input.payload),
      helperId: null,
      acceptedAt: null,
      resolvedAt: null,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
    };
    this.requests.set(request.id, request);
    return structuredClone(request);
  }

  async countRequestsSince(userId: string, since: Date): Promise<number> {
    return [...this.requests.values()].filter((r) => r.userId === userId && r.createdAt >= since).length;
  }

  async getRequest(id: string, now: Date): Promise<StoredRequest | null> {
    const request = this.requests.get(id);
    return request && request.expiresAt > now ? structuredClone(request) : null;
  }

  async listRequests(userId: string, now: Date): Promise<StoredRequest[]> {
    return [...this.requests.values()]
      .filter((r) => r.userId === userId && r.expiresAt > now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => structuredClone(r));
  }

  async listOpenRequests(now: Date): Promise<StoredRequest[]> {
    return [...this.requests.values()]
      .filter((r) => r.status === 'ouverte' && r.expiresAt > now)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((r) => structuredClone(r));
  }

  async acceptRequest(id: string, helperId: string, now: Date): Promise<StoredRequest | null> {
    const r = this.requests.get(id);
    if (!r || r.status !== 'ouverte' || r.expiresAt <= now || r.userId === helperId) return null;
    Object.assign(r, { status: 'acceptee', helperId, acceptedAt: now });
    return structuredClone(r);
  }

  async closeRequest(id: string, userId: string): Promise<boolean> {
    const r = this.requests.get(id);
    if (!r || r.userId !== userId || r.status === 'fermee') return false;
    r.status = 'fermee';
    return true;
  }

  async resolveRequest(id: string, userId: string, now: Date): Promise<boolean> {
    const r = this.requests.get(id);
    if (!r || r.status !== 'acceptee' || r.expiresAt <= now || (r.userId !== userId && r.helperId !== userId)) return false;
    Object.assign(r, { status: 'resolue', resolvedAt: now, expiresAt: now });
    return true;
  }

  async getUser(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? structuredClone(user) : null;
  }

  async setHelperTech(userId: string, tech: string[]): Promise<void> {
    this.helperTech.set(userId, [...tech]);
  }

  async getHelperTech(userId: string): Promise<string[]> {
    return [...(this.helperTech.get(userId) ?? [])];
  }

  async getHelperStats(userId: string): Promise<{ resolvedCount: number; avgResolutionTimeMs: number }> {
    const resolved = [...this.requests.values()].filter((r) => r.helperId === userId && r.status === 'resolue' && r.acceptedAt && r.resolvedAt);
    if (resolved.length === 0) return { resolvedCount: 0, avgResolutionTimeMs: 0 };
    const totalTime = resolved.reduce((sum, r) => sum + (r.resolvedAt!.getTime() - r.acceptedAt!.getTime()), 0);
    return { resolvedCount: resolved.length, avgResolutionTimeMs: totalTime / resolved.length };
  }

  async seedSolutions(solutions: NewSolution[]): Promise<void> {
    for (const s of solutions) if (!this.solutions.has(s.id)) this.solutions.set(s.id, { ...structuredClone(s), createdAt: new Date() });
  }

  async findSolutionCandidates(words: string[], limit: number): Promise<Solution[]> {
    const wanted = new Set(words);
    return [...this.solutions.values()]
      .filter((s) => solutionWords(`${s.title} ${s.error} ${s.cause} ${s.fix}`, 1000).some((w) => wanted.has(w)))
      .slice(0, limit)
      .map((s) => structuredClone(s));
  }

  async listSolutions(limit = 20): Promise<Solution[]> {
    return [...this.solutions.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((s) => structuredClone(s));
  }

  async putDoc(kind: DocKind, id: string, data: unknown): Promise<void> {
    const key = `${kind}:${id}`;
    this.docs.set(key, { data: structuredClone(data), createdAt: this.docs.get(key)?.createdAt ?? Date.now() });
  }

  async getDoc<T>(kind: DocKind, id: string): Promise<T | null> {
    const doc = this.docs.get(`${kind}:${id}`);
    return doc ? (structuredClone(doc.data) as T) : null;
  }

  async listDocs<T>(kind: DocKind, limit = 200): Promise<T[]> {
    return [...this.docs.entries()]
      .filter(([key]) => key.startsWith(`${kind}:`))
      .sort((a, b) => b[1].createdAt - a[1].createdAt)
      .slice(0, limit)
      .map(([, doc]) => structuredClone(doc.data) as T);
  }

  async listHelperIds(): Promise<string[]> {
    return [...this.helperTech.entries()].filter(([, tech]) => tech.length > 0).map(([id]) => id);
  }

  async findUserByLogin(login: string): Promise<User | null> {
    const user = [...this.users.values()].find((u) => u.login.toLowerCase() === login.toLowerCase());
    return user ? structuredClone(user) : null;
  }

  async purgeExpired(now: Date): Promise<PurgeResult> {
    const result = { requests: 0, sessions: 0 };
    for (const [id, r] of this.requests) if (r.expiresAt <= now && this.requests.delete(id)) result.requests++;
    for (const [hash, s] of this.sessions) if (s.expiresAt <= now && this.sessions.delete(hash)) result.sessions++;
    return result;
  }

  async close(): Promise<void> {}
}
