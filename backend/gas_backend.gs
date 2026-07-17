/**
 * SSAP提案システム - Google Apps Scriptバックエンド
 *
 * セットアップ手順:
 * 1. 新しいGoogleスプレッドシートを作成
 * 2. スプレッドシートIDをSPREADSHEET_IDに設定
 * 3. このスクリプトをGASエディタに貼り付け
 * 4. Webアプリとしてデプロイ（アクセス: 全員）
 * 5. デプロイURLをフロントエンドに設定
 *
 * メール通知の設定（重要）:
 * 1. NOTIFICATION_EMAIL に通知先を設定
 * 2. GASエディタで authorizeMailPermissions → testSendEmail の順に実行し、メール送信権限を承認
 * 3. Webアプリデプロイ時は必ず「次のユーザーとして実行: 自分」を選択
 *    （「アクセスしているユーザー」だと匿名投稿者に権限がなくメールが送れません）
 * 4. コード変更後は「新しいデプロイ」で再デプロイすること（管理画面の編集だけでは反映されません）
 * 5. 送信結果はスプレッドシートの「メールログ」シートにも記録されます
 */

// ========== 設定 ==========
const SPREADSHEET_ID = "1_JbzctKYfqSLwPJ-7aBajENreTJFCjk_Q-J4KQThDzY"; // スプレッドシートIDを設定
const PROPOSAL_SHEET_NAME = "提案一覧";
const ADMIN_SHEET_NAME = "管理者";
const TOTAL_EMPLOYEES = 600; // 全従業員数
const PROPOSAL_DURATION_DAYS = 30; // 提案の掲載期間（日数）
const AUTH_TOKEN_EXPIRY_HOURS = 24; // 認証トークン有効期限（時間）
const NOTIFICATION_EMAIL = "palkana-soshikikaihatsu@pal.or.jp"; // 新規投稿通知先（複数はカンマ区切り）
const MAIL_LOG_SHEET_NAME = "メールログ";

// ========== メイン関数 ==========

/**
 * POSTリクエストハンドラ
 */
function doPost(e) {
  try {
    // スプレッドシートIDチェック
    if (SPREADSHEET_ID === "YOUR_SPREADSHEET_ID_HERE") {
      return createResponse(false, "スプレッドシートIDが設定されていません");
    }

    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    switch (action) {
      case "addProposal":
        return addProposal(params);
      case "addLike":
        return addLike(params);
      case "removeLike":
        return removeLike(params);
      case "adminLogin":
        return adminLogin(params);
      case "updateProposal":
        return updateProposal(params);
      case "deleteProposal":
        return deleteProposal(params);
      case "changePassword":
        return changePassword(params);
      case "cleanExpired":
        return cleanExpiredWithAuth(params);
      default:
        return createResponse(false, "Unknown action");
    }
  } catch (error) {
    Logger.log("エラー詳細: " + error.toString());
    return createResponse(false, "サーバーエラー: " + error.toString());
  }
}

/**
 * GETリクエストハンドラ
 */
function doGet(e) {
  try {
    // スプレッドシートIDチェック
    if (SPREADSHEET_ID === "YOUR_SPREADSHEET_ID_HERE") {
      return createResponse(false, "スプレッドシートIDが設定されていません");
    }

    const action = e.parameter.action;

    switch (action) {
      case "getProposals":
        return getProposals();
      case "getAllProposals":
        return getAllProposals(e);
      case "cleanExpired":
        return cleanExpiredProposals();
      default:
        return createResponse(false, "Unknown action");
    }
  } catch (error) {
    Logger.log("エラー詳細: " + error.toString());
    return createResponse(false, "サーバーエラー: " + error.toString());
  }
}

// ========== 提案管理関数 ==========

/**
 * 新規提案を追加
 */
function addProposal(params) {
  const sheet = getOrCreateSheet();
  const proposalId = generateProposalId();
  const now = new Date();
  const expiryDate = new Date(
    now.getTime() + PROPOSAL_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  const rowData = [
    proposalId, // A: 提案ID
    params.title || "", // B: タイトル
    params.description || "", // C: 説明
    params.category || "", // D: カテゴリ
    params.submitterName || "匿名", // E: 提案者名
    params.submitterEmail || "", // F: 提案者メール
    now, // G: 投稿日時（Dateオブジェクト）
    expiryDate, // H: 期限日時（Dateオブジェクト）
    0, // I: いいね数
    "", // J: いいねユーザーリスト（カンマ区切り）
    "保留", // K: ステータス（保留/掲載中/実施候補/期限切れ）
    now, // L: 更新日時（Dateオブジェクト）
  ];

  sheet.appendRow(rowData);

  // G, H, L列に日時フォーマットを適用
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 7).setNumberFormat("yyyy/mm/dd hh:mm:ss"); // 投稿日時
  sheet.getRange(lastRow, 8).setNumberFormat("yyyy/mm/dd hh:mm:ss"); // 期限日時
  sheet.getRange(lastRow, 12).setNumberFormat("yyyy/mm/dd hh:mm:ss"); // 更新日時

  // 新規投稿の通知メールを送信
  const emailResult = sendNewProposalNotification({
    proposalId: proposalId,
    title: params.title || "",
    description: params.description || "",
    category: params.category || "",
    submitterName: params.submitterName || "匿名",
    submitterEmail: params.submitterEmail || "",
    postedDate: now,
  });

  return createResponse(true, "提案を投稿しました", {
    proposalId: proposalId,
    expiryDate: expiryDate.toISOString(),
    emailNotification: emailResult,
  });
}

/**
 * 提案一覧を取得（期限切れを除外）
 */
function getProposals() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return createResponse(true, "No proposals", { proposals: [] });
  }

  const now = new Date();
  const proposals = [];

  // ヘッダー行をスキップ（i=1から開始）
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const expiryDate = new Date(row[7]);
    const likeCount = row[8] || 0;
    let status = row[10] || "掲載中";

    // 期限チェック
    if (now > expiryDate && status === "掲載中") {
      status = "期限切れ";
      // ステータスを更新
      sheet.getRange(i + 1, 11).setValue(status);
      continue; // 期限切れは表示しない
    }

    // いいね数チェック（実施候補への昇格）
    if (likeCount >= TOTAL_EMPLOYEES && status === "掲載中") {
      status = "実施候補";
      sheet.getRange(i + 1, 11).setValue(status);
    }

    // 掲載中と実施候補のみ返す（保留・期限切れは除外）
    if (status === "掲載中" || status === "実施候補") {
      proposals.push({
        id: row[0],
        title: row[1],
        description: row[2],
        category: row[3],
        submitterName: row[4],
        postedDate: row[6],
        expiryDate: row[7],
        likeCount: likeCount,
        status: status,
        daysRemaining: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)),
      });
    }
  }

  // 新しい順にソート
  proposals.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));

  return createResponse(true, "Success", {
    proposals: proposals,
    totalEmployees: TOTAL_EMPLOYEES,
  });
}

/**
 * いいねを追加
 */
function addLike(params) {
  const sheet = getOrCreateSheet();
  const proposalId = params.proposalId;
  const userId = params.userId; // メールアドレスなど

  if (!proposalId || !userId) {
    return createResponse(false, "proposalIdとuserIdが必要です");
  }

  const row = findProposalRow(sheet, proposalId);
  if (!row) {
    return createResponse(false, "提案が見つかりません");
  }

  // 既にいいね済みかチェック
  const likedUsers = sheet.getRange(row, 10).getValue().toString();
  const likedUsersList = likedUsers ? likedUsers.split(",") : [];

  if (likedUsersList.includes(userId)) {
    return createResponse(false, "既にいいね済みです");
  }

  // いいねを追加
  likedUsersList.push(userId);
  const newLikeCount = likedUsersList.length;

  sheet.getRange(row, 9).setValue(newLikeCount); // いいね数
  sheet.getRange(row, 10).setValue(likedUsersList.join(",")); // ユーザーリスト
  sheet.getRange(row, 12).setValue(new Date()); // 更新日時
  sheet.getRange(row, 12).setNumberFormat("yyyy/mm/dd hh:mm:ss"); // 日時フォーマット

  // 実施候補への昇格チェック
  if (newLikeCount >= TOTAL_EMPLOYEES) {
    sheet.getRange(row, 11).setValue("実施候補");
  }

  return createResponse(true, "いいねしました", {
    likeCount: newLikeCount,
    status: newLikeCount >= TOTAL_EMPLOYEES ? "実施候補" : "掲載中",
  });
}

/**
 * いいねを削除
 */
function removeLike(params) {
  const sheet = getOrCreateSheet();
  const proposalId = params.proposalId;
  const userId = params.userId;

  if (!proposalId || !userId) {
    return createResponse(false, "proposalIdとuserIdが必要です");
  }

  const row = findProposalRow(sheet, proposalId);
  if (!row) {
    return createResponse(false, "提案が見つかりません");
  }

  // いいね削除
  const likedUsers = sheet.getRange(row, 10).getValue().toString();
  let likedUsersList = likedUsers ? likedUsers.split(",") : [];

  if (!likedUsersList.includes(userId)) {
    return createResponse(false, "いいねしていません");
  }

  likedUsersList = likedUsersList.filter((u) => u !== userId);
  const newLikeCount = likedUsersList.length;

  sheet.getRange(row, 9).setValue(newLikeCount);
  sheet.getRange(row, 10).setValue(likedUsersList.join(","));
  sheet.getRange(row, 12).setValue(new Date());
  sheet.getRange(row, 12).setNumberFormat("yyyy/mm/dd hh:mm:ss");

  return createResponse(true, "いいねを取り消しました", {
    likeCount: newLikeCount,
  });
}

/**
 * 期限切れ提案を削除（定期実行用）
 */
function cleanExpiredProposals() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  let deletedCount = 0;

  // 下から上に削除（行番号のズレを防ぐ）
  for (let i = data.length - 1; i >= 1; i--) {
    const expiryDate = new Date(data[i][7]);
    if (now > expiryDate) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }

  return createResponse(true, `${deletedCount}件の期限切れ提案を削除しました`);
}

/**
 * 全提案を取得（管理者用、期限切れ含む）
 */
function getAllProposals(e) {
  const authToken = e.parameter.authToken;
  const admin = verifyAuthToken(authToken);
  if (!admin) {
    return createResponse(false, "認証が必要です");
  }

  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return createResponse(true, "No proposals", { proposals: [] });
  }

  const now = new Date();
  const proposals = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const expiryDate = new Date(row[7]);
    const likeCount = row[8] || 0;
    const status = row[10] || "掲載中";

    proposals.push({
      id: row[0],
      title: row[1],
      description: row[2],
      category: row[3],
      submitterName: row[4],
      submitterEmail: row[5],
      postedDate: row[6],
      expiryDate: row[7],
      likeCount: likeCount,
      status: status,
      daysRemaining: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)),
    });
  }

  proposals.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));

  return createResponse(true, "Success", {
    proposals: proposals,
    totalEmployees: TOTAL_EMPLOYEES,
  });
}

// ========== 管理者認証関数 ==========

/**
 * 管理者ログイン
 */
function adminLogin(params) {
  const adminId = params.adminId;
  const password = params.password;

  if (!adminId || !password) {
    return createResponse(false, "管理者IDとパスワードを入力してください");
  }

  const adminSheet = getOrCreateAdminSheet();
  const data = adminSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === adminId && row[1] === password) {
      const token = generateAuthToken();
      const expiresAt = new Date(
        new Date().getTime() + AUTH_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
      );

      adminSheet.getRange(i + 1, 4).setValue(token);
      adminSheet.getRange(i + 1, 5).setValue(expiresAt);
      adminSheet.getRange(i + 1, 5).setNumberFormat("yyyy/mm/dd hh:mm:ss");

      return createResponse(true, "ログイン成功", {
        success: true,
        adminName: row[2] || adminId,
        token: token,
        expiresAt: expiresAt.toISOString(),
      });
    }
  }

  return createResponse(false, "管理者IDまたはパスワードが正しくありません");
}

/**
 * 認証トークンを検証
 */
function verifyAuthToken(token) {
  if (!token) return null;

  const adminSheet = getOrCreateAdminSheet();
  const data = adminSheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const storedToken = row[3];
    const expiresAt = new Date(row[4]);

    if (storedToken === token && now < expiresAt) {
      return {
        adminId: row[0],
        adminName: row[2] || row[0],
        row: i + 1,
      };
    }
  }

  return null;
}

/**
 * 提案を更新（管理者用）
 */
function updateProposal(params) {
  const admin = verifyAuthToken(params.authToken);
  if (!admin) {
    return createResponse(false, "認証が必要です");
  }

  const sheet = getOrCreateSheet();
  const proposalId = params.proposalId;
  const row = findProposalRow(sheet, proposalId);

  if (!row) {
    return createResponse(false, "提案が見つかりません");
  }

  if (params.title) sheet.getRange(row, 2).setValue(params.title);
  if (params.description) sheet.getRange(row, 3).setValue(params.description);
  if (params.category) sheet.getRange(row, 4).setValue(params.category);
  if (params.status) sheet.getRange(row, 11).setValue(params.status);

  // 期限延長オプション
  if (params.extendDays && params.extendDays > 0) {
    const newExpiryDate = new Date(
      new Date().getTime() + params.extendDays * 24 * 60 * 60 * 1000
    );
    sheet.getRange(row, 8).setValue(newExpiryDate);
    sheet.getRange(row, 8).setNumberFormat("yyyy/mm/dd hh:mm:ss");
  }

  sheet.getRange(row, 12).setValue(new Date());
  sheet.getRange(row, 12).setNumberFormat("yyyy/mm/dd hh:mm:ss");

  return createResponse(true, "提案を更新しました");
}

/**
 * 提案を削除（管理者用）
 */
function deleteProposal(params) {
  const admin = verifyAuthToken(params.authToken);
  if (!admin) {
    return createResponse(false, "認証が必要です");
  }

  const sheet = getOrCreateSheet();
  const proposalId = params.proposalId;
  const row = findProposalRow(sheet, proposalId);

  if (!row) {
    return createResponse(false, "提案が見つかりません");
  }

  sheet.deleteRow(row);
  return createResponse(true, "提案を削除しました");
}

/**
 * パスワード変更（管理者用）
 */
function changePassword(params) {
  const admin = verifyAuthToken(params.authToken);
  if (!admin) {
    return createResponse(false, "認証が必要です");
  }

  const adminSheet = getOrCreateAdminSheet();
  const currentPassword = adminSheet.getRange(admin.row, 2).getValue();

  if (currentPassword !== params.currentPassword) {
    return createResponse(false, "現在のパスワードが正しくありません");
  }

  if (!params.newPassword || params.newPassword.length < 6) {
    return createResponse(false, "新しいパスワードは6文字以上で設定してください");
  }

  adminSheet.getRange(admin.row, 2).setValue(params.newPassword);
  return createResponse(true, "パスワードを変更しました");
}

/**
 * 期限切れ提案を削除（認証付き）
 */
function cleanExpiredWithAuth(params) {
  const admin = verifyAuthToken(params.authToken);
  if (!admin) {
    return createResponse(false, "認証が必要です");
  }

  return cleanExpiredProposals();
}

/**
 * 認証トークンを生成
 */
function generateAuthToken() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * 管理者シートを取得または作成
 */
function getOrCreateAdminSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(ADMIN_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(ADMIN_SHEET_NAME);
    sheet.appendRow([
      "管理者ID",
      "パスワード",
      "表示名",
      "認証トークン",
      "トークン有効期限",
    ]);

    const headerRange = sheet.getRange(1, 1, 1, 5);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4285f4");
    headerRange.setFontColor("#ffffff");

    sheet.appendRow(["admin", "admin123", "管理者", "", ""]);
  }

  return sheet;
}

// ========== メール通知関数 ==========

/**
 * 通知先メールアドレスを取得（カンマ区切り対応）
 */
function getNotificationRecipients() {
  if (!NOTIFICATION_EMAIL || NOTIFICATION_EMAIL.trim() === "") {
    return [];
  }
  return NOTIFICATION_EMAIL.split(",")
    .map(function (email) {
      return email.trim();
    })
    .filter(function (email) {
      return email !== "";
    });
}

/**
 * メール送信結果をスプレッドシートに記録
 */
function logMailEvent(status, message, proposalTitle) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(MAIL_LOG_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(MAIL_LOG_SHEET_NAME);
      sheet.appendRow(["日時", "ステータス", "提案タイトル", "詳細"]);
      const headerRange = sheet.getRange(1, 1, 1, 4);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4285f4");
      headerRange.setFontColor("#ffffff");
    }

    sheet.appendRow([new Date(), status, proposalTitle || "", message]);
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1).setNumberFormat("yyyy/mm/dd hh:mm:ss");
  } catch (error) {
    Logger.log("メールログ記録エラー: " + error.toString());
  }
}

/**
 * 新規提案の通知メールを送信
 * @returns {{sent: boolean, error?: string, recipients?: string[]}}
 */
function sendNewProposalNotification(proposal) {
  if (!proposal || !proposal.title) {
    const errorMessage = "提案データが不正です（タイトルなし）";
    Logger.log("メール送信スキップ: " + errorMessage);
    logMailEvent("SKIP", errorMessage, "");
    return { sent: false, error: errorMessage };
  }

  const recipients = getNotificationRecipients();
  if (recipients.length === 0) {
    const errorMessage = "NOTIFICATION_EMAIL が未設定です";
    Logger.log("メール送信スキップ: " + errorMessage);
    logMailEvent("ERROR", errorMessage, proposal.title);
    return { sent: false, error: errorMessage };
  }

  try {
    const subject =
      "【いいね！パルプロジェクト】新規提案が投稿されました: " + proposal.title;

    const body =
      "いいね！パルプロジェクトに新しい提案が投稿されました。\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "■ 提案内容\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
      "【タイトル】\n" +
      proposal.title +
      "\n\n" +
      "【カテゴリ】\n" +
      proposal.category +
      "\n\n" +
      "【提案者】\n" +
      proposal.submitterName +
      "（" +
      proposal.submitterEmail +
      "）\n\n" +
      "【投稿日時】\n" +
      Utilities.formatDate(proposal.postedDate, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss") +
      "\n\n" +
      "【提案内容】\n" +
      proposal.description +
      "\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
      "この提案は現在「保留」ステータスです。\n" +
      "管理画面で内容を確認し、掲載するかどうかを判断してください。\n\n" +
      "▼ 管理画面はこちら\n" +
      "https://soshikikaihatsu.github.io/login.html\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "このメールは自動送信されています。\n" +
      "いいね！パルプロジェクト | 組織開発課\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

    MailApp.sendEmail({
      to: recipients.join(","),
      subject: subject,
      body: body,
      name: "いいね！パルプロジェクト",
    });

    const successMessage = "送信成功 → " + recipients.join(",");
    Logger.log("通知メールを送信しました: " + proposal.title);
    logMailEvent("SUCCESS", successMessage, proposal.title);
    return { sent: true, recipients: recipients };
  } catch (error) {
    const errorMessage = error.toString();
    Logger.log("メール送信エラー: " + errorMessage);
    logMailEvent("ERROR", errorMessage, proposal.title);
    return { sent: false, error: errorMessage };
  }
}

/**
 * メール設定の診断（GASエディタから手動実行）
 */
function checkMailSetup() {
  const recipients = getNotificationRecipients();
  Logger.log("=== メール通知 診断 ===");
  Logger.log("通知先: " + (recipients.length ? recipients.join(", ") : "未設定"));
  Logger.log("スクリプト実行者: " + Session.getActiveUser().getEmail());

  try {
    Logger.log("残り送信可能数: " + MailApp.getRemainingDailyQuota());
    Logger.log("✅ メール送信権限: 承認済み");
  } catch (error) {
    Logger.log("❌ メール送信権限: 未承認");
    Logger.log("   → authorizeMailPermissions を実行して権限を承認してください");
  }

  if (recipients.length === 0) {
    Logger.log("❌ NOTIFICATION_EMAIL を設定してください");
    return;
  }

  Logger.log("次のステップ: authorizeMailPermissions → testSendEmail の順に実行");
}

/**
 * メール送信権限の承認（GASエディタから最初に実行）
 * 実行時に権限承認ダイアログが表示されます。「許可」をクリックしてください。
 */
function authorizeMailPermissions() {
  const recipients = getNotificationRecipients();
  if (recipients.length === 0) {
    throw new Error("NOTIFICATION_EMAIL を設定してください");
  }

  MailApp.sendEmail({
    to: recipients[0],
    subject: "【権限確認】いいね！パルプロジェクト メール送信テスト",
    body:
      "このメールは GAS のメール送信権限確認用です。\n\n" +
      "authorizeMailPermissions 関数の実行に成功しています。\n" +
      "続けて testSendEmail を実行して本番形式のテスト送信を確認してください。",
    name: "いいね！パルプロジェクト",
  });

  Logger.log("✅ メール送信権限の承認とテスト送信が完了しました");
}

/**
 * メール送信テスト用関数（authorizeMailPermissions 実行後に実行）
 */
function testSendEmail() {
  const result = sendNewProposalNotification({
    proposalId: "TEST_001",
    title: "テスト提案",
    description:
      "これはテストメールです。正常に届いていれば、メール通知機能は正しく動作しています。",
    category: "テスト",
    submitterName: "テスト太郎",
    submitterEmail: "test@example.com",
    postedDate: new Date(),
  });

  Logger.log("テストメール結果: " + JSON.stringify(result));
  if (!result.sent) {
    throw new Error("テストメール送信失敗: " + (result.error || "不明なエラー"));
  }
}

// ========== ユーティリティ関数 ==========

/**
 * シートを取得または作成
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(PROPOSAL_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PROPOSAL_SHEET_NAME);
    // ヘッダー行を作成
    sheet.appendRow([
      "提案ID",
      "タイトル",
      "説明",
      "カテゴリ",
      "提案者名",
      "提案者メール",
      "投稿日時",
      "期限日時",
      "いいね数",
      "いいねユーザーリスト",
      "ステータス",
      "更新日時",
    ]);

    // ヘッダー行を装飾
    const headerRange = sheet.getRange(1, 1, 1, 12);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4285f4");
    headerRange.setFontColor("#ffffff");
  }

  return sheet;
}

/**
 * 提案IDを生成
 */
function generateProposalId() {
  return (
    "SSAP_" +
    new Date().getTime() +
    "_" +
    Math.random().toString(36).substr(2, 9)
  );
}

/**
 * 提案IDから行番号を検索
 */
function findProposalRow(sheet, proposalId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === proposalId) {
      return i + 1; // 1-indexed
    }
  }
  return null;
}

/**
 * レスポンスを作成
 */
function createResponse(success, message, data = {}) {
  const response = {
    success: success,
    message: message,
    data: data,
    timestamp: new Date().toISOString(),
  };

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ========== トリガー設定用関数 ==========

/**
 * 毎日実行して期限切れをチェック（トリガー設定が必要）
 */
function dailyCleanup() {
  cleanExpiredProposals();
}

/**
 * トリガーを自動設定（初回のみ手動実行）
 */
function setupTriggers() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  // 毎日午前2時に期限切れチェック
  ScriptApp.newTrigger("dailyCleanup")
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();

  Logger.log("トリガーを設定しました");
}
