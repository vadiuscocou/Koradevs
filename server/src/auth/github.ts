export interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
}

export interface CodeExchange {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GithubClient {
  getUser(accessToken: string): Promise<GithubUser>;
  /** OAuth web flow: trades the temporary code for an access token. */
  exchangeCode(params: CodeExchange): Promise<string>;
}

export class GithubApiError extends Error {
  constructor(readonly status: number) {
    super(`GitHub a répondu ${status}`);
  }
}

export const fetchGithubClient: GithubClient = {
  async getUser(accessToken) {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'sos-dev',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new GithubApiError(response.status);
    return (await response.json()) as GithubUser;
  },

  async exchangeCode({ code, clientId, clientSecret, redirectUri }) {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'sos-dev' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new GithubApiError(response.status);
    const data = (await response.json()) as { access_token?: string; error?: string };
    if (!data.access_token) throw new GithubApiError(401);
    return data.access_token;
  },
};
