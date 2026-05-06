# リリース手順（メンテナー向け）

録音くん（Excel Office Add-in）の新バージョンを配布するための手順です。

---

## 構成のおさらい

| 要素 | 場所 | 配布対象 |
| :--- | :--- | :--- |
| `taskpane.html` / `dialog.html` | GitHub Pages（mainブランチ） | 自動デプロイ |
| `manifest.xml` | GitHub Releases | ユーザーが手動ダウンロード |
| Azure ADアプリ登録 | Azure Portal | （配布物ではない） |

**ポイント**: アプリ本体（HTML/JS）は GitHub Pages から直接配信されるため、コードの修正は `git push` するだけでユーザーにも反映されます。manifest.xmlの再配布が必要なのは「アドインの構成自体」が変わるときだけです。

---

## どんな変更がmanifest.xml再配布を必要とするか

### ✅ Push のみで反映される（manifest.xml再配布 **不要**）

- taskpane.html / dialog.html の修正
- JavaScript の挙動変更
- CSS / UI の変更
- バグ修正全般

### ⚠️ manifest.xml の更新と再配布が **必要**

- リボンのボタン・グループ・タブ構成の変更
- 必要な権限（Permissions, Scopes）の追加
- アドインのDisplayName / Description 変更
- アイコン画像のURL変更
- `<Hosts>` の対応Office製品変更
- `<AppDomains>` の追加（外部ドメインへの新規通信）

---

## リリースフロー

### 1. バージョン番号を上げる

Office Add-inのバージョンは **4桁形式（X.X.X.X）** です。Semverと違い、すべて整数で1ずつ上げる運用が無難です。

`microsoft-addin/manifest.xml`:

```xml
<Version>1.0.0.7</Version>  →  <Version>1.0.0.8</Version>
```

> 注意: バージョンを下げると、Office側で「インストール済みより古い」と判定されインストールが拒否されます。必ず上げてください。

### 2. キャッシュバスター更新（任意）

GitHub Pages や CDNのキャッシュを確実に切るため、SourceLocationのクエリ文字列も上げます（任意）。

```xml
<SourceLocation DefaultValue="https://johnnymaeta.github.io/rokuongithub/microsoft-addin/taskpane.html?v=8"/>
```

### 3. コミット & タグ付け

```bash
git add microsoft-addin/manifest.xml
git commit -m "Bump add-in version to 1.0.0.8"
git tag v1.0.0.8
git push origin main --tags
```

### 4. GitHub Release を作成

#### Web UIでの作業

1. <https://github.com/JohnnyMaeta/rokuongithub/releases/new> を開く
2. **Choose a tag**: 先ほど push した `v1.0.0.8` を選択
3. **Release title**: `v1.0.0.8`（タグ名と同じでOK）
4. **Description**: 変更点を箇条書きで書く（ユーザーに見える）
5. **Attach binaries**: ローカルの `microsoft-addin/manifest.xml` をドラッグ＆ドロップ
6. **Set as the latest release** にチェック
7. **Publish release** をクリック

#### CLI（gh）での作業

```bash
gh release create v1.0.0.8 \
  microsoft-addin/manifest.xml \
  --title "v1.0.0.8" \
  --notes "変更内容をここに記載"
```

これで `https://github.com/JohnnyMaeta/rokuongithub/releases/latest/download/manifest.xml` が **常に最新の manifest.xml を返す固定URL** になります。

---

## ユーザーへのアナウンス

### 再配布が不要な変更の場合

通知は不要（自動反映）。ただし大きな機能追加なら Release Notes だけ書いておくと親切。

### 再配布が必要な変更の場合

ユーザーに以下を伝える：

> 録音くんを更新しました（v1.0.0.8）。お手数ですが、以下の手順で更新してください：
> 1. <https://github.com/JohnnyMaeta/rokuongithub/releases/latest> から最新の manifest.xml をダウンロード
> 2. Excelで一度アドインを削除（［挿入］→［アドイン］→ 録音くん の「…」→ 削除）
> 3. 新しい manifest.xml を再度サイドロード（README.md の手順参照）

---

## バージョン管理のコツ

- **コミットメッセージ**: バージョン番号を含める（例: `Bump add-in version to 1.0.0.8`）
- **タグ命名**: `v1.0.0.8` のように `v` プレフィックスをつける
- **manifest.xml と Release のバージョンは必ず一致させる**（ズレると問い合わせの元になる）
- **大きな破壊的変更はマイナー位置を上げる**: `1.0.0.x` → `1.1.0.0`（任意ルール）

---

## チェックリスト

リリース前に確認:

- [ ] `manifest.xml` の `<Version>` を上げた
- [ ] taskpane.html / dialog.html がローカルで動作確認できている
- [ ] `git push` で GitHub Pages が更新された（数分で反映）
- [ ] manifest.xml の検証エラーがない
  - `npx office-addin-manifest validate microsoft-addin/manifest.xml`
- [ ] GitHub Release を Publish した
- [ ] Release のアセットに manifest.xml が添付されている
- [ ] `releases/latest/download/manifest.xml` で実際にダウンロードできる
- [ ] （必要なら）ユーザーへの再サイドロード案内を送った

---

## 関連ドキュメント

- ユーザー向けインストール手順: [`README.md`](./README.md)
- 公式: [Office Add-in publish overview](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish)
- 公式: [Sideload an Office Add-in](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/sideload-office-add-ins-for-testing)
