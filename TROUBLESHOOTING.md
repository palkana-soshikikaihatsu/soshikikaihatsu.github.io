# トラブルシューティングガイド

## 目次
1. [フェッチエラーの解決方法](#フェッチエラーの解決方法)
2. [よくあるエラーと対処法](#よくあるエラーと対処法)
3. [デバッグ方法](#デバッグ方法)

---

## フェッチエラーの解決方法

### 問題: 「スプレッドシートの内容は読み取れるが、書き込み（送信）がフェッチエラーになる」

この問題は通常、以下のいずれかの原因で発生します:

### ✅ チェックリスト

#### 1. GAS_WEB_APP_URLが正しく設定されているか確認

**確認場所:** `js/config.js` の8行目

```javascript
const GAS_WEB_APP_URL = 'YOUR_GAS_DEPLOYMENT_URL_HERE';
```

❌ **NG例:**
```javascript
const GAS_WEB_APP_URL = 'YOUR_GAS_DEPLOYMENT_URL_HERE'; // 未設定
```

✅ **OK例:**
```javascript
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXX/exec';
```

**取得方法:**
1. Google Apps Scriptエディタを開く
2. 右上の「デプロイ」→「新しいデプロイ」
3. 表示されるURLをコピーして設定

---

#### 2. GASが正しくデプロイされているか確認

**必須設定:**

| 項目 | 設定値 |
|------|--------|
| デプロイタイプ | ウェブアプリ |
| アクセスできるユーザー | **全員** |
| 実行ユーザー | 自分 |

**手順:**

1. GASエディタで「デプロイ」→「新しいデプロイ」をクリック
2. 歯車アイコンをクリックして「ウェブアプリ」を選択
3. 説明: 「SSAP提案システムAPI」（任意）
4. 実行者: 「自分」を選択
5. **アクセスできるユーザー: 「全員」を選択** ← 重要！
6. 「デプロイ」をクリック
7. 表示されたURLをコピー
8. `js/config.js`に貼り付け

⚠️ **注意:** 「全員」に設定しないと、匿名ユーザーがアクセスできずフェッチエラーになります。

---

#### 3. スプレッドシートIDが設定されているか確認

**確認場所:** `backend/gas_backend.gs` の13行目

```javascript
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";
```

❌ **NG例:**
```javascript
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; // 未設定
```

✅ **OK例:**
```javascript
const SPREADSHEET_ID = "1ABC...XYZ"; // 44文字程度の文字列
```

**取得方法:**
1. Googleスプレッドシートを開く
2. URLを確認: `https://docs.google.com/spreadsheets/d/【ここがID】/edit`
3. IDをコピーして設定

---

#### 4. GASのアクセス権限が正しいか確認

**初回実行時に必要な手順:**

1. GASエディタで `setupTriggers` 関数を選択
2. 「実行」ボタンをクリック
3. 権限の確認ダイアログが表示される
4. 「権限を確認」→ Googleアカウントを選択
5. 「詳細」→「（プロジェクト名）に移動」をクリック
6. 「許可」をクリック

---

## よくあるエラーと対処法

### エラー1: `GAS_WEB_APP_URLが設定されていません`

**原因:** `js/config.js`のURLが未設定

**対処法:**
1. GASをWebアプリとしてデプロイ
2. デプロイURLを`js/config.js`に設定
3. ブラウザを再読み込み

---

### エラー2: `HTTP error! status: 404`

**原因:** デプロイURLが間違っている、または古い

**対処法:**
1. GASエディタで「デプロイ」→「デプロイを管理」
2. 最新のデプロイURLを確認
3. URLの末尾が `/exec` で終わっているか確認
4. `/dev` で終わっている場合は、本番用のURLを使用

---

### エラー3: `スプレッドシートIDが設定されていません`

**原因:** `backend/gas_backend.gs`のSPREADSHEET_IDが未設定

**対処法:**
1. スプレッドシートのURLからIDを取得
2. `backend/gas_backend.gs`の13行目に設定
3. GASを再デプロイ（「デプロイ」→「新しいデプロイ」）

---

### エラー4: CORS エラー

**エラーメッセージ例:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**原因:** GASのアクセス権限が「全員」になっていない

**対処法:**
1. GASエディタで「デプロイ」→「デプロイを管理」
2. 対象のデプロイを選択→「編集」（鉛筆アイコン）
3. 「アクセスできるユーザー」を「全員」に変更
4. 「バージョン」を「新しいバージョン」に設定
5. 「デプロイ」をクリック
6. **新しいURLが発行されるので、再度コピーして設定**

---

### エラー5: `Failed to fetch`

**原因:** ネットワークエラーまたはURLの誤り

**対処法:**
1. インターネット接続を確認
2. デプロイURLをブラウザで直接開いて動作確認
   - 正常な場合: `{"success":false,"message":"Unknown action",...}` のようなJSONが返る
   - エラーの場合: 404エラーや認証エラーが表示される
3. URLが正しいか再確認

---

## デバッグ方法

### 1. ブラウザの開発者ツールを使う

**手順:**
1. ブラウザでF12キーを押して開発者ツールを開く
2. 「Console」タブを選択
3. フォームを送信してエラーを確認

**確認ポイント:**
- `📤 送信データ:` が表示されるか
- `📍 送信先URL:` が正しいか
- `📥 レスポンスステータス:` は何か
- エラーメッセージの詳細

---

### 2. GASのログを確認

**手順:**
1. GASエディタで「実行ログ」タブを開く
2. フォーム送信を試す
3. ログにエラーが表示されないか確認

**よくあるログエラー:**
- `Exception: Unexpected error while getting the method or property openById`
  → スプレッドシートIDが間違っている
- `ReferenceError: SPREADSHEET_ID is not defined`
  → SPREADSHEET_IDが設定されていない

---

### 3. テストリクエストを送る

**ブラウザのコンソールで直接テスト:**

```javascript
// GETリクエストテスト
fetch('あなたのGAS_URL?action=getProposals')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);

// POSTリクエストテスト
fetch('あなたのGAS_URL', {
  method: 'POST',
  body: JSON.stringify({
    action: 'addProposal',
    title: 'テスト',
    description: 'テスト',
    category: '業務効率化',
    submitterName: 'テスト太郎',
    submitterEmail: 'test@example.com'
  })
})
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
```

---

## 完全なセットアップ手順（おさらい）

### ステップ1: スプレッドシートを準備
1. 新しいGoogleスプレッドシートを作成
2. URLからスプレッドシートIDをコピー

### ステップ2: GASを設定
1. スプレッドシートで「拡張機能」→「Apps Script」
2. `backend/gas_backend.gs` の内容をコピペ
3. 13行目の `SPREADSHEET_ID` を設定
4. 保存（Ctrl+S）

### ステップ3: GASをデプロイ
1. 「デプロイ」→「新しいデプロイ」
2. 歯車アイコン→「ウェブアプリ」を選択
3. **「アクセスできるユーザー」を「全員」に設定**
4. 「デプロイ」をクリック
5. デプロイURLをコピー

### ステップ4: フロントエンドを設定
1. `js/config.js` を開く
2. 8行目の `GAS_WEB_APP_URL` にデプロイURLを貼り付け
3. 保存

### ステップ5: 動作確認
1. `index.html` をブラウザで開く
2. 「新しい提案を投稿」をクリック
3. フォームに入力して送信
4. 成功メッセージが表示されるか確認
5. スプレッドシートに行が追加されているか確認

---

## まだ解決しない場合

以下の情報を確認して、詳しい人に相談してください:

1. ブラウザの開発者ツールのConsoleタブのスクリーンショット
2. GASの実行ログのスクリーンショット
3. `js/config.js` の設定（URLは一部マスクしてOK）
4. GASのデプロイ設定のスクリーンショット
5. エラーが発生するタイミング（読み取りは成功、書き込みで失敗、など）

---

## 成功時の動作

✅ **正常に動作している場合:**

1. フォーム送信時にローディング表示
2. コンソールに以下のようなログ:
   ```
   📤 送信データ: {action: "addProposal", title: "...", ...}
   📍 送信先URL: https://script.google.com/...
   📥 レスポンスステータス: 200
   📥 レスポンス本文: {"success":true,"message":"提案を投稿しました",...}
   ```
3. 成功メッセージが表示
4. スプレッドシートに新しい行が追加される

---

このガイドで問題が解決しない場合は、より詳しい調査が必要です。
