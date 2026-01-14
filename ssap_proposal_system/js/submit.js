/**
 * SSAP提案システム - 提案投稿ページ
 */

// DOM要素
const form = document.getElementById('proposalForm');
const submitBtn = document.getElementById('submitBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const successMessage = document.getElementById('successMessage');
const descriptionTextarea = document.getElementById('description');
const charCount = document.getElementById('charCount');

// ユーザー情報の自動入力
document.addEventListener('DOMContentLoaded', () => {
    const userInfo = getUserInfo();
    if (userInfo.email) {
        document.getElementById('submitterEmail').value = userInfo.email;
    }
    if (userInfo.name) {
        document.getElementById('submitterName').value = userInfo.name;
    }
});

// 文字数カウント
descriptionTextarea.addEventListener('input', () => {
    const count = descriptionTextarea.value.length;
    charCount.textContent = count;
    
    if (count > 2000) {
        charCount.style.color = '#e53e3e';
    } else if (count > 1800) {
        charCount.style.color = '#dd6b20';
    } else {
        charCount.style.color = '#4a5568';
    }
});

// フォーム送信処理
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // ボタンを無効化
    submitBtn.disabled = true;
    loadingOverlay.style.display = 'flex';
    
    try {
        // フォームデータを取得
        const formData = {
            title: document.getElementById('title').value.trim(),
            category: document.getElementById('category').value,
            description: document.getElementById('description').value.trim(),
            submitterName: document.getElementById('submitterName').value.trim(),
            submitterEmail: document.getElementById('submitterEmail').value.trim()
        };
        
        // バリデーション
        if (!formData.title || !formData.category || !formData.description || 
            !formData.submitterName || !formData.submitterEmail) {
            throw new Error('すべての必須項目を入力してください');
        }
        
        if (!document.getElementById('agreement').checked) {
            throw new Error('注意事項に同意してください');
        }
        
        // メール形式チェック
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.submitterEmail)) {
            throw new Error('有効なメールアドレスを入力してください');
        }
        
        // APIに送信
        const result = await addProposal(formData);
        
        // ユーザー情報を保存
        saveUserInfo(formData.submitterEmail, formData.submitterName);
        
        // 成功表示
        loadingOverlay.style.display = 'none';
        form.style.display = 'none';
        successMessage.style.display = 'block';
        
        // ページトップにスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('投稿エラー:', error);
        loadingOverlay.style.display = 'none';
        submitBtn.disabled = false;
        showError(error.message || '投稿に失敗しました。時間をおいて再度お試しください。');
    }
});

// フォームリセット機能（続けて投稿する用）
function resetForm() {
    form.reset();
    charCount.textContent = '0';
    charCount.style.color = '#4a5568';
    successMessage.style.display = 'none';
    form.style.display = 'block';
    submitBtn.disabled = false;
}

// 「続けて投稿する」リンクの処理
document.addEventListener('DOMContentLoaded', () => {
    const continueLink = document.querySelector('.success-actions a[href="submit.html"]');
    if (continueLink) {
        continueLink.addEventListener('click', (e) => {
            e.preventDefault();
            resetForm();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
