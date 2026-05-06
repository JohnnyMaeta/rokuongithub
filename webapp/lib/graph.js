import { kv } from '@vercel/kv';

const TOKEN_KEY = 'ms:refresh_token';
const SCOPES = 'Files.ReadWrite User.Read offline_access';
const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

export async function getAccessToken() {
  const refreshToken = await kv.get(TOKEN_KEY);
  if (!refreshToken) {
    const e = new Error('NOT_CONFIGURED');
    e.code = 'NOT_CONFIGURED';
    throw e;
  }

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: SCOPES,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${data.error_description || JSON.stringify(data)}`);
  }

  if (data.refresh_token && data.refresh_token !== refreshToken) {
    await kv.set(TOKEN_KEY, data.refresh_token);
  }

  return data.access_token;
}

export async function exchangeCodeForToken(code, redirectUri) {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    scope: SCOPES,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  return response.json();
}

export async function saveRefreshToken(refreshToken) {
  await kv.set(TOKEN_KEY, refreshToken);
}

export async function clearRefreshToken() {
  await kv.del(TOKEN_KEY);
}

export async function isConfigured() {
  return Boolean(await kv.get(TOKEN_KEY));
}

export function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export function getAuthorizeUrl(redirectUri) {
  const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  url.searchParams.set('client_id', process.env.MICROSOFT_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}
