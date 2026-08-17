/**
 * SSAP提案システム - API通信モジュール
 */

/**
 * GASバックエンドにPOSTリクエストを送信
 */
async function sendRequest(action, data = {}) {
    if (GAS_WEB_APP_URL === 'YOUR_GAS_DEPLOYMENT_URL_HERE') {
        throw new Error('❌ GAS_WEB_APP_URLが設定されていません。\n\njs/config.jsファイルを開いて、GASのデプロイURLを設定してください。');
    }

    try {
        console.log('📤 送信データ:', { action, ...data });
        console.log('📍 送信先URL:', GAS_WEB_APP_URL);
        
        const requestUrl = data.authToken
            ? `${GAS_WEB_APP_URL}?authToken=${encodeURIComponent(data.authToken)}`
            : GAS_WEB_APP_URL;

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain', // CORSプリフライト回避
            },
            body: JSON.stringify({
                action: action,
                ...data
            })
        });

        console.log('📥 レスポンスステータス:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}\n\n考えられる原因:\n- GASのデプロイURLが間違っている\n- GASが「全員」アクセス可能に設定されていない\n- スプレッドシートIDが設定されていない`);
        }

        const text = await response.text();
        console.log('📥 レスポンス本文:', text);
        
        const result = JSON.parse(text);
        
        if (!result.success) {
            throw new Error(result.message || 'リクエストに失敗しました');
        }

        return result.data;
    } catch (error) {
        console.error('❌ API Error 詳細:', {
            message: error.message,
            stack: error.stack,
            url: GAS_WEB_APP_URL
        });
        
        // より詳細なエラーメッセージを生成
        let detailedError = error.message;
        if (error.message.includes('fetch')) {
            detailedError = `ネットワークエラーが発生しました。\n\n考えられる原因:\n1. GAS_WEB_APP_URLが正しく設定されていない\n2. GASがWebアプリとして正しくデプロイされていない\n3. インターネット接続に問題がある\n\n設定URL: ${GAS_WEB_APP_URL}`;
        }
        
        throw new Error(detailedError);
    }
}

/**
 * GASバックエンドにGETリクエストを送信
 */
async function getRequest(action) {
    if (GAS_WEB_APP_URL === 'YOUR_GAS_DEPLOYMENT_URL_HERE') {
        throw new Error('❌ GAS_WEB_APP_URLが設定されていません。\n\njs/config.jsファイルを開いて、GASのデプロイURLを設定してください。');
    }

    try {
        const url = `${GAS_WEB_APP_URL}?action=${action}`;
        console.log('📤 GETリクエスト:', url);
        
        const response = await fetch(url, {
            method: 'GET',
        });

        console.log('📥 レスポンスステータス:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        console.log('📥 レスポンス本文:', text);
        
        const result = JSON.parse(text);
        
        if (!result.success) {
            throw new Error(result.message || 'リクエストに失敗しました');
        }

        return result.data;
    } catch (error) {
        console.error('❌ API Error:', error);
        throw error;
    }
}

/**
 * 新規提案を投稿
 */
async function addProposal(proposalData) {
    return await sendRequest('addProposal', proposalData);
}

/**
 * 提案一覧を取得
 */
async function getProposals() {
    return await getRequest('getProposals');
}

/**
 * 実施中・完了提案の進捗報告を取得
 */
async function getProgressReports() {
    return await getRequest('getProgressReports');
}

/**
 * 全提案を取得（管理者用、期限切れ含む）
 */
async function getAllProposals(authToken) {
    if (GAS_WEB_APP_URL === 'YOUR_GAS_DEPLOYMENT_URL_HERE') {
        throw new Error('GAS_WEB_APP_URLが設定されていません');
    }

    const url = `${GAS_WEB_APP_URL}?action=getAllProposals&authToken=${encodeURIComponent(authToken)}`;
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = JSON.parse(await response.text());
    
    if (!result.success) {
        throw new Error(result.message || 'リクエストに失敗しました');
    }

    return result.data;
}

/**
 * いいねを追加
 */
async function addLike(proposalId, userId) {
    return await sendRequest('addLike', {
        proposalId: proposalId,
        userId: userId
    });
}

/**
 * いいねを削除
 */
async function removeLike(proposalId, userId) {
    return await sendRequest('removeLike', {
        proposalId: proposalId,
        userId: userId
    });
}

/**
 * エラーメッセージを表示
 */
function showError(message) {
    alert(`❌ エラー\n\n${message}`);
}

/**
 * 成功メッセージを表示
 */
function showSuccess(message) {
    // 必要に応じてカスタムトーストなどに変更可能
    console.log('Success:', message);
}
