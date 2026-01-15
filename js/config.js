/**
 * SSAP提案システム - 設定ファイル
 * 
 * GASのデプロイURLを設定してください
 */

// Google Apps ScriptのWebアプリURL（デプロイ後に設定）
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzu-lnc7s4ygF5e13FHyc_7DIsEuR0Y2EngZoefMTwCM5ZH-VRDPLBXJAbITPThK3wHyQ/exec';

// ローカルストレージキー
const STORAGE_KEYS = {
    USER_EMAIL: 'ssap_user_email',
    USER_NAME: 'ssap_user_name',
    LIKED_PROPOSALS: 'ssap_liked_proposals' // ローカルにいいね済み提案を保存
};

// その他の設定
const CONFIG = {
    TOTAL_EMPLOYEES: 600,        // 全従業員数
    PROPOSAL_DURATION_DAYS: 30,  // 提案の掲載期間
    AUTO_REFRESH_INTERVAL: 30000 // 自動更新間隔（ミリ秒）
};

/**
 * ユーザー情報をローカルストレージに保存
 */
function saveUserInfo(email, name) {
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
    localStorage.setItem(STORAGE_KEYS.USER_NAME, name);
}

/**
 * ユーザー情報をローカルストレージから取得
 */
function getUserInfo() {
    return {
        email: localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || '',
        name: localStorage.getItem(STORAGE_KEYS.USER_NAME) || ''
    };
}

/**
 * 匿名ユーザーIDを生成または取得
 * ブラウザフィンガープリント + ランダムIDで一意に識別
 */
function getAnonymousUserId() {
    const STORAGE_KEY = 'ssap_anonymous_user_id';
    
    // 既存のIDがあれば返す
    let userId = localStorage.getItem(STORAGE_KEY);
    
    if (!userId) {
        // 新規ユーザー: ユニークIDを生成
        userId = generateUserId();
        localStorage.setItem(STORAGE_KEY, userId);
    }
    
    return userId;
}

/**
 * ユニークなユーザーIDを生成
 * タイムスタンプ + ランダム文字列 + ブラウザフィンガープリント
 */
function generateUserId() {
    // タイムスタンプ
    const timestamp = new Date().getTime();
    
    // ランダム文字列
    const random = Math.random().toString(36).substring(2, 15);
    
    // ブラウザフィンガープリント（簡易版）
    const fingerprint = getBrowserFingerprint();
    
    // 結合してハッシュ化（簡易版）
    return `USER_${timestamp}_${random}_${fingerprint}`;
}

/**
 * ブラウザフィンガープリント（簡易版）を生成
 * ユーザーエージェント、画面解像度、タイムゾーンなどから生成
 */
function getBrowserFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        !!window.sessionStorage,
        !!window.localStorage
    ].join('###');
    
    // 簡易ハッシュ関数
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
        const char = components.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32bit整数に変換
    }
    
    return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * いいね済み提案をローカルストレージに保存
 */
function saveLikedProposal(proposalId) {
    const liked = getLikedProposals();
    if (!liked.includes(proposalId)) {
        liked.push(proposalId);
        localStorage.setItem(STORAGE_KEYS.LIKED_PROPOSALS, JSON.stringify(liked));
    }
}

/**
 * いいね済み提案をローカルストレージから削除
 */
function removeLikedProposal(proposalId) {
    let liked = getLikedProposals();
    liked = liked.filter(id => id !== proposalId);
    localStorage.setItem(STORAGE_KEYS.LIKED_PROPOSALS, JSON.stringify(liked));
}

/**
 * いいね済み提案の一覧を取得
 */
function getLikedProposals() {
    const liked = localStorage.getItem(STORAGE_KEYS.LIKED_PROPOSALS);
    return liked ? JSON.parse(liked) : [];
}

/**
 * 提案がいいね済みかチェック
 */
function isProposalLiked(proposalId) {
    return getLikedProposals().includes(proposalId);
}

