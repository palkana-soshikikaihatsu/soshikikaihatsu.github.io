/**
 * SSAP提案システム - 認証モジュール
 */

const AUTH_STORAGE_KEY = 'ssap_admin_session';
const AUTH_REMEMBER_KEY = 'ssap_admin_remember';

/**
 * 管理者ログイン
 */
async function adminLogin(adminId, password, rememberMe = false) {
    try {
        const response = await sendRequest('adminLogin', {
            adminId: adminId,
            password: password
        });

        if (response.success) {
            const sessionData = {
                adminId: adminId,
                adminName: response.adminName || adminId,
                token: response.token,
                loginTime: new Date().toISOString(),
                expiresAt: response.expiresAt
            };

            if (rememberMe) {
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
                localStorage.setItem(AUTH_REMEMBER_KEY, 'true');
            } else {
                sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
                localStorage.removeItem(AUTH_REMEMBER_KEY);
            }

            return { success: true };
        } else {
            return { success: false, message: response.message || 'ログインに失敗しました' };
        }
    } catch (error) {
        console.error('ログインエラー:', error);
        return { success: false, message: error.message || 'サーバーとの通信に失敗しました' };
    }
}

/**
 * ログアウト
 */
function adminLogout() {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_REMEMBER_KEY);
    window.location.href = 'login.html';
}

/**
 * ログイン状態を確認
 */
function isAdminLoggedIn() {
    const session = getAdminSession();
    if (!session) return false;

    if (session.expiresAt) {
        const expiresAt = new Date(session.expiresAt);
        if (new Date() > expiresAt) {
            adminLogout();
            return false;
        }
    }

    return true;
}

/**
 * セッション情報を取得
 */
function getAdminSession() {
    const rememberMe = localStorage.getItem(AUTH_REMEMBER_KEY) === 'true';
    const storage = rememberMe ? localStorage : sessionStorage;
    const sessionStr = storage.getItem(AUTH_STORAGE_KEY);
    
    if (!sessionStr) {
        const altStorage = rememberMe ? sessionStorage : localStorage;
        const altSessionStr = altStorage.getItem(AUTH_STORAGE_KEY);
        if (altSessionStr) {
            return JSON.parse(altSessionStr);
        }
        return null;
    }
    
    return JSON.parse(sessionStr);
}

/**
 * 管理者名を取得
 */
function getAdminName() {
    const session = getAdminSession();
    return session ? session.adminName : '管理者';
}

/**
 * 認証トークンを取得
 */
function getAuthToken() {
    const session = getAdminSession();
    return session ? session.token : null;
}

/**
 * 認証付きリクエストを送信
 */
async function sendAuthenticatedRequest(action, data = {}) {
    const token = getAuthToken();
    if (!token) {
        throw new Error('認証が必要です');
    }

    return await sendRequest(action, {
        ...data,
        authToken: token
    });
}

/**
 * パスワード変更
 */
async function changeAdminPassword(currentPassword, newPassword) {
    try {
        const response = await sendAuthenticatedRequest('changePassword', {
            currentPassword: currentPassword,
            newPassword: newPassword
        });

        return response;
    } catch (error) {
        console.error('パスワード変更エラー:', error);
        throw error;
    }
}

/**
 * 認証チェック（管理画面用）
 */
function requireAdminAuth() {
    if (!isAdminLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}
