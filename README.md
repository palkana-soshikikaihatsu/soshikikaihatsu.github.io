# SSAP提案システム

GitHub PagesベースのSSAP（社内改善提案）システムです。全従業員が提案を投稿・閲覧し、いいね投票できます。600票以上獲得した提案は実施候補に昇格します。

## 🚀 機能

- ✏️ **提案投稿**: 業務改善アイデアを自由に投稿
- 👍 **いいね投票**: 良い提案にリアルタイムで投票
- ⏱️ **自動期限管理**: 投稿から30日後に自動で期限切れ
- 🎯 **実施候補昇格**: 600票以上で実施候補に自動昇格
- 📊 **リアルタイム集計**: いいね数やステータスがリアルタイムに更新
- 🔍 **検索・フィルター**: カテゴリ、ステータス、キーワードで検索
- 📱 **レスポンシブ対応**: スマホ・タブレットでも快適に利用可能

## 📋 システム構成

- **フロントエンド**: HTML/CSS/JavaScript（GitHub Pages）
- **バックエンド**: Google Apps Script（Google Spreadsheets）
- **データベース**: Google Spreadsheets
- **ホスティング**: GitHub Pages

## 🛠️ セットアップ手順

> 💡 **クイックチェック**: セットアップが完了したら、[setup-check.html](setup-check.html) を開いて設定を確認できます。

### 1. Google Spreadsheetの準備

1. 新しいGoogleスプレッドシートを作成
2. スプレッドシートのIDをコピー（URLの`/d/`と`/edit`の間の文字列）
3. Google Apps Scriptエディタを開く（拡張機能 > Apps Script）
4. `backend/gas_backend.gs`の内容をコピー＆ペースト
5. 1行目の`SPREADSHEET_ID`に、先ほどコピーしたIDを設定

```javascript
const SPREADSHEET_ID = 'あなたのスプレッドシートID';
```

### 2. GASをWebアプリとしてデプロイ

1. GASエディタで「デプロイ」>「新しいデプロイ」をクリック
2. 種類の選択: 「ウェブアプリ」
3. 説明: 「SSAP提案システムAPI」
4. 次のユーザーとして実行: 「自分」
5. アクセスできるユーザー: **「全員」**（重要！）
6. 「デプロイ」をクリック
7. 表示される「ウェブアプリのURL」をコピー

### 3. トリガーの設定

GASエディタで以下を実行:

1. `setupTriggers`関数を選択
2. 「実行」ボタンをクリック
3. 権限の承認を行う

これにより、毎日午前2時に期限切れ提案を自動削除するトリガーが設定されます。

### 4. フロントエンドの設定

1. `js/config.js`を開く
2. 2行目の`GAS_WEB_APP_URL`に、先ほどコピーしたGASのデプロイURLを設定

```javascript
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

### 5. GitHub Pagesでデプロイ

#### 方法A: GitHub Pagesを使用（推奨）

1. このプロジェクトをGitHubリポジトリにプッシュ

```bash
cd ssap_proposal_system
git init
git add .
git commit -m "Initial commit: SSAP提案システム"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ssap-proposal-system.git
git push -u origin main
```

2. GitHubのリポジトリ設定で「Pages」を開く
3. Source: `main`ブランチの`/root`を選択
4. 「Save」をクリック
5. 数分後、公開URLが表示されます

#### 方法B: ローカルでテスト

```bash
# Pythonの簡易サーバーで起動
cd ssap_proposal_system
python -m http.server 8000

# ブラウザで http://localhost:8000 にアクセス
```

## 📁 ファイル構造

```
ssap_proposal_system/
├── index.html          # ホームページ
├── submit.html         # 提案投稿ページ
├── proposals.html      # 提案一覧ページ
├── css/
│   └── style.css       # スタイルシート
├── js/
│   ├── config.js       # 設定ファイル（GAS URLを設定）
│   ├── api.js          # API通信モジュール
│   ├── submit.js       # 投稿ページのロジック
│   └── proposals.js    # 一覧ページのロジック
├── backend/
│   └── gas_backend.gs  # Google Apps Scriptバックエンド
└── README.md           # このファイル
```

## 🎨 カスタマイズ

### 全従業員数の変更

`js/config.js`と`backend/gas_backend.gs`の両方で以下を変更:

```javascript
const TOTAL_EMPLOYEES = 600; // 必要投票数
```

### 掲載期間の変更

`js/config.js`と`backend/gas_backend.gs`の両方で以下を変更:

```javascript
const PROPOSAL_DURATION_DAYS = 30; // 日数
```

### カテゴリの追加・変更

`submit.html`と`proposals.html`の`<select id="category">`部分を編集:

```html
<option value="新カテゴリ">新カテゴリ</option>
```

### デザインの変更

`css/style.css`の`:root`セクションでカラーテーマを変更可能:

```css
:root {
    --primary-color: #3182ce;  /* メインカラー */
    --success-color: #48bb78;  /* 成功カラー */
    /* ... */
}
```

## 🔒 セキュリティ考慮事項

### 重要な注意点

1. **GASのデプロイ設定**
   - 「アクセスできるユーザー: 全員」に設定する必要があります
   - これにより、GitHub Pagesから匿名でAPIを呼び出せます

2. **メールアドレスの扱い**
   - メールアドレスはいいね投票の識別に使用
   - Spreadsheetに保存されますが、フロントエンドには表示されません
   - ローカルストレージにも保存されます（ブラウザ内のみ）

3. **不正投稿対策**
   - 現状は誰でも投稿・投票可能です
   - より厳格な認証が必要な場合は以下を検討:
     - Google OAuth認証の実装
     - 社内ドメインのメールアドレス制限
     - reCAPTCHA導入

## 🐛 トラブルシューティング

> 📖 **詳細なトラブルシューティングガイド**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md) を参照してください。

### エラー: "GAS_WEB_APP_URLが設定されていません"

→ `js/config.js`の2行目にGASのデプロイURLを設定してください

### エラー: "CORS エラー"

→ GASのデプロイ設定で「アクセスできるユーザー」が「全員」になっているか確認

### いいねボタンが機能しない

1. ブラウザのコンソール（F12）でエラーを確認
2. GASのデプロイURLが正しいか確認
3. Spreadsheetの権限を確認
4. GASの実行ログを確認（Apps Scriptエディタ > 実行数）

### 提案が表示されない

1. GASエディタで`getProposals`関数を直接実行してテスト
2. Spreadsheetにデータが正しく保存されているか確認
3. ブラウザのキャッシュをクリア

## 📊 Spreadsheetのデータ構造

| 列 | 項目 | 説明 |
|---|---|---|
| A | 提案ID | 自動生成されるユニークID |
| B | タイトル | 提案のタイトル |
| C | 説明 | 提案の詳細内容 |
| D | カテゴリ | 選択されたカテゴリ |
| E | 提案者名 | 投稿者の名前 |
| F | 提案者メール | 投稿者のメールアドレス |
| G | 投稿日時 | ISO 8601形式 |
| H | 期限日時 | ISO 8601形式 |
| I | いいね数 | 現在のいいね数 |
| J | いいねユーザーリスト | カンマ区切りのメールアドレス |
| K | ステータス | 掲載中/実施候補/期限切れ |
| L | 更新日時 | 最終更新日時 |

## 🔄 更新履歴

### v1.0.0 (2026-01-14)

- 初版リリース
- 提案投稿機能
- いいね投票機能
- 自動期限管理
- 実施候補自動昇格
- リアルタイム更新
- レスポンシブデザイン

## 📝 ライセンス

このプロジェクトは組織内利用を目的としています。

## 👥 サポート

質問や問題がある場合は、組織開発課までお問い合わせください。

---

**開発**: 組織開発課  
**更新日**: 2026年1月14日
