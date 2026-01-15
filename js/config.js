/**
 * SSAP提案システム - 設定ファイル
 * 
 * GASのデプロイURLを設定してください
 */

// Google Apps ScriptのWebアプリURL（デプロイ後に設定）
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyAMjNQIYVrRCH_eQfb-UCUpfimF-ZTd9lWB0kmiDs06r-umMPYcOfpzPMotqlXY2iFnQ/exec';

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
