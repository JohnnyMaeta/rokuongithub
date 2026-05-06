import { getOrigin, getAuthorizeUrl } from '../lib/graph.js';

export default function handler(req, res) {
  if (!process.env.MICROSOFT_CLIENT_ID) {
    return res.status(500).send('MICROSOFT_CLIENT_ID is not set in environment variables.');
  }
  const redirectUri = `${getOrigin(req)}/api/auth-callback`;
  res.redirect(302, getAuthorizeUrl(redirectUri));
}
