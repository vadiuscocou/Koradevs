import type { AuthConfigResponse, CreatedRequest, PublicUser, SessionResponse, SolutionHit, SosRequest } from '@sos/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function messageOf(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const { message, issues } = data as { message?: unknown; issues?: unknown };
  const base = Array.isArray(message) ? message.join(', ') : typeof message === 'string' ? message : undefined;
  return Array.isArray(issues) && issues.length ? `${base ?? 'Requête invalide'} : ${issues.join(' ; ')}` : base;
}

export function createApi(server: string, token?: string, fetchImpl: typeof fetch = fetch) {
  async function call<T>(method: string, route: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(server + route, {
        method,
        headers: {
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ApiError(0, `serveur SOS Dev injoignable (${server})`);
    }
    if (response.status === 204) return undefined as T;
    const data: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw new ApiError(response.status, messageOf(data) ?? `le serveur a répondu ${response.status}`);
    return data as T;
  }

  return {
    authConfig: () => call<AuthConfigResponse>('GET', '/auth/config'),
    loginGithub: (accessToken: string) => call<SessionResponse>('POST', '/auth/github', { accessToken }),
    loginDev: (login: string) => call<SessionResponse>('POST', '/auth/dev', { login }),
    logout: () => call<void>('POST', '/auth/logout'),
    me: () => call<PublicUser>('GET', '/me'),
    sendRequest: (request: SosRequest) => call<CreatedRequest>('POST', '/requests', request),
    closeRequest: (id: string) => call<void>('POST', `/requests/${encodeURIComponent(id)}/close`),
    searchSolutions: (q: string, tech: string[]) =>
      call<SolutionHit[]>('GET', `/solutions/search?${new URLSearchParams({ q, ...(tech.length ? { tech: tech.join(',') } : {}) })}`),
    aiHint: () => call<{ hint: string }>('POST', '/solutions/ai-hint'),
  };
}

export type Api = ReturnType<typeof createApi>;
