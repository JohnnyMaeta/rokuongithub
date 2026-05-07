import { getGroups, setGroups, isAdminSessionValid } from '../lib/graph.js';

const MAX_GROUPS = 100;
const MAX_NAME_LEN = 40;

function sanitize(str) {
  return String(str || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const groups = await getGroups();
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ groups });
  }

  if (req.method === 'POST') {
    if (!(await isAdminSessionValid(req))) {
      return res.status(401).json({ error: '管理者としてサインインしてください（/admin.html）' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
    }

    const raw = Array.isArray(body?.groups) ? body.groups : [];
    const seen = new Set();
    const cleaned = [];
    for (const item of raw) {
      const name = sanitize(item).slice(0, MAX_NAME_LEN);
      if (!name) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      cleaned.push(name);
      if (cleaned.length >= MAX_GROUPS) break;
    }

    await setGroups(cleaned);
    return res.json({ ok: true, groups: cleaned });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
