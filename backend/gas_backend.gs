/**
 * SSAP提案システム - Google Apps Scriptバックエンド
 *
 * セットアップ手順:
 * 1. 新しいGoogleスプレッドシートを作成
 * 2. スプレッドシートIDをSPREADSHEET_IDに設定
 * 3. このスクリプトをGASエディタに貼り付け
 * 4. Webアプリとしてデプロイ（アクセス: 全員）
 * 5. デプロイURLをフロントエンドに設定
 */

// ========== 設定 ==========
const SPREADSHEET_ID = "1_JbzctKYfqSLwPJ-7aBajENreTJFCjk_Q-J4KQThDzY"; // スプレッドシートIDを設定
const PROPOSAL_SHEET_NAME = "提案一覧";
const TOTAL_EMPLOYEES = 600; // 全従業員数
const PROPOSAL_DURATION_DAYS = 30; // 提案の掲載期間（日数）

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
    now.toISOString(), // G: 投稿日時
    expiryDate.toISOString(), // H: 期限日時
    0, // I: いいね数
    "", // J: いいねユーザーリスト（カンマ区切り）
    "掲載中", // K: ステータス（掲載中/実施候補/期限切れ）
    now.toISOString(), // L: 更新日時
  ];

  sheet.appendRow(rowData);

  return createResponse(true, "提案を投稿しました", {
    proposalId: proposalId,
    expiryDate: expiryDate.toISOString(),
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

    // 期限切れ以外を返す
    if (status !== "期限切れ") {
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
  sheet.getRange(row, 12).setValue(new Date().toISOString()); // 更新日時

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
  sheet.getRange(row, 12).setValue(new Date().toISOString());

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
