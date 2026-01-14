/**
 * SSAP提案システム - API通信モジュール
 */

/**
 * GASバックエンドにPOSTリクエストを送信
 */
async function sendRequest(action, data = {}) {
    if (GAS_WEB_APP_URL === 'YOUR_GAS_DEPLOYMENT_URL_HERE') {
        throw new Error('GAS_WEB_APP_URLが設定されていません。js/config.jsを確認してください。');
    }

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: action,
                ...data
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'リクエストに失敗しました');
        }

        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * GASバックエンドにGETリクエストを送信
 */
async function getRequest(action) {
    if (GAS_WEB_APP_URL === 'YOUR_GAS_DEPLOYMENT_URL_HERE') {
        throw new Error('GAS_WEB_APP_URLが設定されていません。js/config.jsを確認してください。');
    }

    try {
        const url = `${GAS_WEB_APP_URL}?action=${action}`;
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'リクエストに失敗しました');
        }

        return result.data;
    } catch (error) {
        console.error('API Error:', error);
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
