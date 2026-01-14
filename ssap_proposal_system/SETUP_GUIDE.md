# SSAP提案システム セットアップクイックガイド

このガイドに従って、5ステップでSSAP提案システムを稼働させましょう！

## ⚡ クイックスタート（5分）

### ステップ1: Googleスプレッドシートの作成

1. [Google Spreadsheets](https://sheets.google.com)で新しいスプレッドシートを作成
2. 名前を「SSAP提案データベース」などに変更
3. URLから**スプレッドシートID**をコピー
   - URL例: `https://docs.google.com/spreadsheets/d/`**`1ABC...XYZ`**`/edit`
   - 太字部分がスプレッドシートID

### ステップ2: Google Apps Scriptの設定

1. スプレッドシートで「拡張機能」→「Apps Script」をクリック
2. 既存のコードを削除
3. `backend/gas_backend.gs`ファイルの内容を全てコピー＆ペースト
4. **1行目の`SPREADSHEET_ID`を編集**:

```javascript
const SPREADSHEET_ID = 'ここに先ほどコピーしたスプレッドシートIDを貼り付け';
```

5. 保存（Ctrl+S / Cmd+S）

### ステップ3: Webアプリとしてデプロイ

1. 右上の「デプロイ」→「新しいデプロイ」
2. 歯車アイコン⚙️→「ウェブアプリ」を選択
3. 以下を設定:
   - **説明**: SSAP提案システムAPI
   - **次のユーザーとして実行**: 自分
   - **アクセスできるユーザー**: **全員**（重要！）
4. 「デプロイ」をクリック
5. **ウェブアプリのURLをコピー** → メモ帳に保存
   - 例: `https://script.google.com/macros/s/ABC.../exec`

### ステップ4: 自動削除トリガーの設定

1. Apps Scriptエディタで関数選択ドロップダウンから「`setupTriggers`」を選択
2. 「実行」ボタンをクリック
3. 権限の確認が表示されたら:
   - 「権限を確認」
   - Googleアカウントを選択
   - 「詳細」→「（安全ではないページ）に移動」
   - 「許可」をクリック
4. 実行ログに「トリガーを設定しました」と表示されればOK

### ステップ5: フロントエンドの設定

1. `js/config.js`ファイルを開く
2. **1行目を編集**:

```javascript
const GAS_WEB_APP_URL = 'ここにステップ3でコピーしたURLを貼り付け';
```

3. 保存

## 🎉 完了！

これでセットアップは完了です。以下の方法でテストできます:

### ローカルでテスト

```bash
# プロジェクトフォルダに移動
cd ssap_proposal_system

# Pythonがインストールされている場合
python -m http.server 8000

# ブラウザで以下にアクセス
# http://localhost:8000
```

### GitHub Pagesで公開

```bash
# Gitリポジトリを初期化
git init
git add .
git commit -m "SSAP提案システム初期セットアップ"

# GitHubにプッシュ
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

その後、GitHubのリポジトリ設定で:
1. 「Settings」→「Pages」
2. Source: `main`ブランチ
3. 保存

数分後、公開URLが表示されます！

## ✅ 動作確認

1. ブラウザでサイトにアクセス
2. 「新しい提案を投稿する」をクリック
3. テスト投稿を作成
4. 「提案一覧を見る」でテスト投稿が表示されることを確認
5. いいねボタンをクリックして動作確認

## ⚙️ 設定のカスタマイズ

### 従業員数を変更する場合

以下の2ファイルを編集:

**`js/config.js`**:
```javascript
const CONFIG = {
    TOTAL_EMPLOYEES: 600,  // ← ここを変更
    // ...
};
```

**`backend/gas_backend.gs`**:
```javascript
const TOTAL_EMPLOYEES = 600;  // ← ここを変更
```

### 掲載期間を変更する場合

同様に以下の2ファイルで変更:

```javascript
const PROPOSAL_DURATION_DAYS = 30;  // ← ここを変更（日数）
```

## 🆘 よくある問題

### 問題: 「GAS_WEB_APP_URLが設定されていません」

→ `js/config.js`の`GAS_WEB_APP_URL`にGASのデプロイURLを設定してください

### 問題: CORSエラー

→ GASのデプロイ設定で「アクセスできるユーザー」が「**全員**」になっているか確認

### 問題: 提案が投稿できない

1. ブラウザのコンソール（F12）でエラーを確認
2. GASのログを確認（Apps Scriptエディタ → 実行数）
3. スプレッドシートIDが正しいか確認

### 問題: いいねが反映されない

1. ブラウザをリロード
2. メールアドレスが入力されているか確認
3. GASのデプロイURLが正しいか確認

## 📞 サポート

問題が解決しない場合は、組織開発課までお問い合わせください。

詳細なドキュメントは `README.md` をご覧ください。
