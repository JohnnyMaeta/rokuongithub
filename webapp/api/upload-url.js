import { getAccessToken, getGroups } from '../lib/graph.js';

const FOLDER_ROOT = '録音くん保存フォルダ';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const fileName = sanitize(body?.fileName);
  const subFolder = sanitize(body?.subFolder || '');

  if (!fileName) {
    return res.status(400).json({ error: 'fileName is required' });
  }

  const groups = await getGroups();
  if (groups.length === 0) {
    return res.status(503).json({ error: '管理者がまだグループを設定していません。先生に連絡してください。' });
  }
  if (!subFolder || !groups.includes(subFolder)) {
    return res.status(400).json({ error: 'グループが選択されていないか、管理者が設定したグループと一致しません。' });
  }

  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    if (e.code === 'NOT_CONFIGURED') {
      return res.status(503).json({ error: '管理者がまだサインインしていません。/admin にアクセスして設定してください。' });
    }
    return res.status(500).json({ error: 'Auth failure: ' + e.message });
  }

  const path = subFolder
    ? `${FOLDER_ROOT}/${subFolder}/${fileName}`
    : `${FOLDER_ROOT}/${fileName}`;
  const encodedPath = encodeURIComponent(path);

  const sessionRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedPath}:/createUploadSession`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item: { '@microsoft.graph.conflictBehavior': 'rename' },
      }),
    }
  );

  const session = await sessionRes.json();
  if (!sessionRes.ok || !session.uploadUrl) {
    return res.status(500).json({ error: 'createUploadSession failed', details: session });
  }

  res.json({
    uploadUrl: session.uploadUrl,
    folderPath: path.substring(0, path.lastIndexOf('/')),
  });
}

function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
}
