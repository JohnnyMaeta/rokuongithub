import { exchangeCodeForToken, saveRefreshToken, getOrigin, createAdminSession, adminSessionCookie } from '../lib/graph.js';

export default async function handler(req, res) {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(302, `/admin.html?error=${encodeURIComponent(error_description || error)}`);
  }
  if (!code) {
    return res.redirect(302, '/admin.html?error=no_code');
  }

  const redirectUri = `${getOrigin(req)}/api/auth-callback`;
  const data = await exchangeCodeForToken(String(code), redirectUri);

  if (!data.refresh_token) {
    const msg = data.error_description || data.error || 'no_refresh_token';
    return res.redirect(302, `/admin.html?error=${encodeURIComponent(msg)}`);
  }

  await saveRefreshToken(data.refresh_token);
  const sessionToken = await createAdminSession();

  let email = '';
  try {
    if (data.id_token) {
      const payload = JSON.parse(Buffer.from(data.id_token.split('.')[1], 'base64').toString('utf8'));
      email = payload.preferred_username || payload.email || payload.upn || '';
    }
  } catch {}

  res.setHeader('Set-Cookie', adminSessionCookie(sessionToken));
  res.redirect(302, `/admin.html?status=success&email=${encodeURIComponent(email)}`);
}
