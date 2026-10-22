import type { CodeExchange } from './github.js';

export interface GoogleUser {
  /** Stable identifier of the Google account. */
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
}

export interface GoogleClient {
  /** OAuth web flow: trades the temporary code for an access token. */
  exchangeCode(params: CodeExchange): Promise<string>;
  getUser(accessToken: string): Promise<GoogleUser>;
}

export class GoogleApiError extends Error {
  constructor(readonly status: number) {
    super(`Google a répondu ${status}`);
  }
}

export const fetchGoogleClient: GoogleClient = {
  async exchangeCode({ code, clientId, clientSecret, redirectUri }) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new GoogleApiError(response.status);
    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) throw new GoogleApiError(401);
    return data.access_token;
  },

  async getUser(accessToken) {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new GoogleApiError(response.status);
    return (await response.json()) as GoogleUser;
  },
};
