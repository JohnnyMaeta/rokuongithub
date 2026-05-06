# 録音くん（Webアプリ版）

子どもがブラウザで録音すると、自動的に**先生のOneDrive**に保存されるWebアプリ。

子どもはサインイン不要・URLにアクセスするだけで使えます。先生は最初に1回だけサインインして自分のOneDriveを保存先として登録すればOK。Google Apps Script版と同じ「デプロイした人のドライブに集約」モデルです。

---

## アーキテクチャ

```
[子どものブラウザ]
   │ ① fetch('/api/upload-url')
   ↓
[Vercel Function]
   │ ② Microsoft Graph API
   │   "createUploadSession"
   │   （先生のリフレッシュトークンで認証）
   ↓
[OneDrive]                               一時的なアップロードURLを返す
   │
[子どものブラウザ] ─③ 直接OneDriveへPUT─→ [先生のOneDriveに保存] 完了
```

**ポイント**: 音声データはVercelを通らない（直接OneDriveへ）ので、Vercel無料枠のリクエストサイズ制限を気にせず、何分の録音でも大丈夫。

---

## デプロイ手順（先生がやること）

所要時間：約30分。Microsoftアカウントとクレジットカード**不要**。

### 1. Azure ADアプリ登録（10分）

OneDriveアクセス用の認証アプリを作成します。

1. <https://portal.azure.com/> にアクセス、自分のMicrosoftアカウントでサインイン
2. 上部検索バーで **「Microsoft Entra ID」** を検索して開く
3. 左メニュー **「アプリの登録」** → 上部 **「+ 新規登録」**
4. 以下を入力：
   - **名前**: `録音くん` （何でもOK）
   - **サポートされているアカウントの種類**: **「任意の組織のディレクトリ内のアカウント＋個人のMicrosoftアカウント」** を選択
   - **リダイレクトURI**: 一旦空でOK（あとでVercel URLが分かってから設定）
5. **「登録」** をクリック
6. 表示されたページで **「アプリケーション (クライアント) ID」** をコピーしてメモ → これが後で使う `MICROSOFT_CLIENT_ID`

#### クライアントシークレットを作成

1. 左メニュー **「証明書とシークレット」** → **「+ 新しいクライアント シークレット」**
2. 説明を入れる（例: `Vercel`）、有効期限は **「24か月」** を選択
3. **「追加」** → 表示された **「値」** をすぐコピー（ページを離れると二度と表示されません！）→ これが後で使う `MICROSOFT_CLIENT_SECRET`

#### API権限を追加

1. 左メニュー **「APIのアクセス許可」** → **「+ アクセス許可の追加」**
2. **「Microsoft Graph」** → **「委任されたアクセス許可」**
3. 検索して以下にチェック：
   - `Files.ReadWrite`
   - `User.Read`
   - `offline_access`
4. **「アクセス許可の追加」** をクリック

### 2. リポジトリをforkする（1分）

1. <https://github.com/JohnnyMaeta/rokuongithub> を開く
2. 右上の **「Fork」** ボタン → 自分のアカウントにforkを作成

### 3. Vercelにデプロイ（5分）

1. <https://vercel.com/signup> でGitHubアカウントでサインアップ
2. 右上 **「Add New...」** → **「Project」**
3. forkした `rokuongithub` リポジトリを **「Import」**
4. **「Configure Project」** で：
   - **Root Directory**: **「Edit」** をクリック → `webapp` を選択（重要）
   - **Environment Variables**:
     - `MICROSOFT_CLIENT_ID` = 手順1でコピーしたクライアントID
     - `MICROSOFT_CLIENT_SECRET` = 手順1でコピーしたシークレット値
5. **「Deploy」** をクリック → 1〜2分で完了
6. デプロイ後のURL（例: `https://rokuongithub-xxx.vercel.app`）をメモ

### 4. Vercel KVを接続（3分）

リフレッシュトークンの保管庫を作ります。

1. プロジェクトページで上部 **「Storage」** タブ
2. **「Create Database」** → **「KV」** （Powered by Upstash）を選択
3. **「Create」** → 適当な名前（例: `rokuon-kv`）→ **「Create」**
4. **「Connect Project」** → 自分のプロジェクトを選択 → **「Connect」**
5. 環境変数が自動で追加されます
6. 上部 **「Deployments」** タブ → 最新のデプロイの **「⋯」** → **「Redeploy」** で再デプロイ

### 5. Azure ADにリダイレクトURIを追加（2分）

1. Azure Portal に戻る → 手順1で作ったアプリ → 左メニュー **「認証」**
2. **「+ プラットフォームを追加」** → **「Web」**
3. **リダイレクトURI**: `https://<あなたのVercel URL>/api/auth-callback`
   - 例: `https://rokuongithub-xxx.vercel.app/api/auth-callback`
4. **「構成」** をクリック

### 6. 管理者サインイン（1分）

1. ブラウザで `https://<あなたのVercel URL>/admin.html` にアクセス
2. **「Microsoftアカウントでサインイン」** をクリック
3. 自分のMicrosoftアカウントでサインイン
4. 同意画面で **「承諾」**
5. ✅ サインイン完了画面が出たら成功！

### 7. 子どもたちにURLを共有

`https://<あなたのVercel URL>/` を子どもたちに共有するだけ。

子どもはサインイン不要で、グループ名を入れて録音 → アップロード → あなたのOneDriveの `録音くん保存フォルダ/[グループ名]/` に保存されます。

---

## 動作確認

### 保存先

OneDriveの以下の場所を確認：

```
OneDrive/
└── 録音くん保存フォルダ/
    ├── history.csv          ← 全録音の履歴
    ├── TeamA/
    │   └── TeamA_20260506_143025.mp3
    └── TeamB/
        └── TeamB_20260506_143112.mp3
```

`history.csv` の中身（Excelで開ける）:

| 保存日時 | ファイル名 | フォルダ | ファイルURL |
|---|---|---|---|
| 2026-05-06 14:30:25 | TeamA_20260506_143025.mp3 | TeamA | https://... |

---

## トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| 子どもが録音→アップロードで「管理者がまだサインインしていません」 | `/admin.html` で先生のサインインがまだ。手順6を実施 |
| サインイン時に `redirect_uri_mismatch` エラー | 手順5のリダイレクトURIが正しく設定されていない。Vercel URL末尾に `/api/auth-callback` が付いているか確認 |
| サインイン後にエラー画面 | クライアントシークレット失効の可能性。Azure Portalで新しいシークレット作成 → Vercelの環境変数を更新 → Redeploy |
| しばらく使わなかったあとエラー | リフレッシュトークン失効（90日無使用）。`/admin.html` で再サインイン |
| マイクが使えない | ブラウザのマイク許可を確認。HTTPSサイトでないとマイクは使えない（VercelはHTTPSなのでOK） |

---

## メンテナンス

### コードを更新したい

forkリポジトリにコミット → push すると、Vercelが自動でデプロイします。

### 別のMicrosoftアカウントに切り替えたい

1. Vercel → プロジェクト → Storage → KV → `Browse Data` で `ms:refresh_token` を削除
2. `/admin.html` で別アカウントでサインイン

### コストは？

- **Vercel Hobby（個人利用）**: 無料
  - 月100GB帯域、サーバーレス関数100GB-Hours
  - クラス1つ分なら余裕で無料枠内
- **Vercel KV**: 無料枠あり（月3万コマンドまで）
  - リフレッシュトークン1個しか保存しないので問題なし
- **Azure AD**: 無料

---

## 開発（ローカル実行）

```bash
cd webapp
npm install
npx vercel dev
```

ローカル開発時は `.env.local` に環境変数を書く（`.env.example` を参照）。Vercel KVの代わりに `KV_REST_API_URL` を Vercel ダッシュボードからコピーすればローカルから本番KVを使えます。

---

## ファイル構成

```
webapp/
├── api/
│   ├── auth-start.js        # OAuth開始（先生サインイン）
│   ├── auth-callback.js     # OAuth完了 → KVにRT保存
│   ├── upload-url.js        # 子どもがアップロード先URLを取得
│   └── log-history.js       # history.csv 追記
├── lib/
│   └── graph.js             # トークン管理 + Graph API共通処理
├── index.html               # 子ども向け録音画面
├── admin.html               # 先生向け設定画面
├── package.json
├── vercel.json
└── .env.example
```

---

## ライセンス

MIT License - Copyright (c) 2024 Masaaki Maeta
