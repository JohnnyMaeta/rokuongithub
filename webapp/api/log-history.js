import { getAccessToken } from '../lib/graph.js';

const FOLDER_ROOT = '録音くん保存フォルダ';
const HISTORY_NAME = 'history.csv';
const HEADERS = '保存日時,ファイル名,フォルダ,ファイルURL\n';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const fileName = body?.fileName || '';
  const subFolder = body?.subFolder || '';
  const fileUrl = body?.fileUrl || '';

  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    if (e.code === 'NOT_CONFIGURED') {
      return res.status(503).json({ error: '管理者未設定' });
    }
    return res.status(500).json({ error: 'Auth failure: ' + e.message });
  }

  const csvPath = encodeURIComponent(`${FOLDER_ROOT}/${HISTORY_NAME}`);

  let existing = '';
  try {
    const r = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${csvPath}:/content`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (r.ok) existing = await r.text();
  } catch {}

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const row = [ts, fileName, subFolder, fileUrl]
    .map((v) => `"${String(v || '').replace(/"/g, '""')}"`)
    .join(',') + '\n';

  const updated = existing && existing.trim() ? existing + row : HEADERS + row;

  const putRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${csvPath}:/content`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/csv; charset=utf-8',
    },
    body: '﻿' + updated,
  });

  if (!putRes.ok) {
    const err = await putRes.json();
    return res.status(500).json({ error: 'Failed to update history.csv', details: err });
  }

  res.json({ ok: true });
}
