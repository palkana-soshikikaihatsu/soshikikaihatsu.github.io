/**
 * SSAP提案システム - 管理機能モジュール
 */

let allProposals = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAdminAuth()) {
        return;
    }

    initializeAdmin();
});

/**
 * 管理画面を初期化
 */
function initializeAdmin() {
    document.getElementById('adminName').textContent = getAdminName();

    setupNavigation();
    setupLogout();
    setupModals();
    setupSettings();
    
    loadDashboardData();
}

/**
 * ナビゲーションタブの設定
 */
function setupNavigation() {
    const navBtns = document.querySelectorAll('.admin-nav-btn');
    const tabs = document.querySelectorAll('.admin-tab');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            navBtns.forEach(b => b.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`${tabId}Tab`).classList.add('active');

            if (tabId === 'proposals') {
                loadProposalsTable();
            }
        });
    });
}

/**
 * ログアウトボタンの設定
 */
function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('ログアウトしますか？')) {
            adminLogout();
        }
    });
}

/**
 * モーダルの設定
 */
function setupModals() {
    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');

    document.getElementById('closeEditModal').addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
        deleteModal.style.display = 'none';
    });

    editModal.querySelector('.modal-overlay').addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    deleteModal.querySelector('.modal-overlay').addEventListener('click', () => {
        deleteModal.style.display = 'none';
    });

    document.getElementById('editProposalForm').addEventListener('submit', handleEditSubmit);
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleDeleteConfirm);

    document.getElementById('refreshBtn').addEventListener('click', loadProposalsTable);

    document.getElementById('statusFilter').addEventListener('change', filterProposals);
    document.getElementById('searchInput').addEventListener('input', filterProposals);
}

/**
 * 設定関連の設定
 */
function setupSettings() {
    document.getElementById('changePasswordForm').addEventListener('submit', handlePasswordChange);
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);
    document.getElementById('cleanExpiredBtn').addEventListener('click', handleCleanExpired);
}

/**
 * ダッシュボードデータを読み込み
 */
async function loadDashboardData() {
    try {
        const authToken = getAuthToken();
        const data = await getAllProposals(authToken);
        allProposals = data.proposals || [];

        updateStats();
        renderTopProposals();
        renderExpiringProposals();
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        showAdminError('データの読み込みに失敗しました');
    }
}

/**
 * 統計情報を更新
 */
function updateStats() {
    const pending = allProposals.filter(p => p.status === '保留');
    const active = allProposals.filter(p => p.status === '掲載中');
    const candidates = allProposals.filter(p => p.status === '実施候補');
    const expired = allProposals.filter(p => p.status === '期限切れ');
    const totalLikes = allProposals.reduce((sum, p) => sum + (p.likeCount || 0), 0);

    document.getElementById('statTotal').textContent = allProposals.length;
    document.getElementById('statPending').textContent = pending.length;
    document.getElementById('statActive').textContent = active.length;
    document.getElementById('statCandidate').textContent = candidates.length;
    document.getElementById('statTotalLikes').textContent = totalLikes;
    
    const expiredStat = document.getElementById('statExpired');
    if (expiredStat) {
        expiredStat.textContent = expired.length;
    }
}

/**
 * 人気の提案トップ5を表示
 */
function renderTopProposals() {
    const container = document.getElementById('topProposalsList');
    const sorted = [...allProposals].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    const top5 = sorted.slice(0, 5);

    if (top5.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>提案がありません</p></div>';
        return;
    }

    container.innerHTML = top5.map((p, index) => `
        <div class="admin-list-item">
            <div class="rank-badge">${index + 1}</div>
            <div class="list-item-content">
                <div class="list-item-title">${escapeHtml(p.title)}</div>
                <div class="list-item-meta">
                    <span class="badge ${p.status === '実施候補' ? 'badge-candidate' : ''}">${p.status}</span>
                    <span>👍 ${p.likeCount || 0}</span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * 期限が近い提案を表示
 */
function renderExpiringProposals() {
    const container = document.getElementById('expiringProposalsList');
    const expiring = allProposals
        .filter(p => p.status === '掲載中' && p.daysRemaining <= 7 && p.daysRemaining > 0)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

    if (expiring.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>期限が近い提案はありません</p></div>';
        return;
    }

    container.innerHTML = expiring.map(p => `
        <div class="admin-list-item ${p.daysRemaining <= 3 ? 'urgent' : ''}">
            <div class="days-badge ${p.daysRemaining <= 3 ? 'danger' : 'warning'}">
                残り${p.daysRemaining}日
            </div>
            <div class="list-item-content">
                <div class="list-item-title">${escapeHtml(p.title)}</div>
                <div class="list-item-meta">
                    <span>👍 ${p.likeCount || 0}</span>
                    <span>📁 ${p.category}</span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * 提案テーブルを読み込み
 */
async function loadProposalsTable() {
    const tbody = document.getElementById('proposalsTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="loading-cell">
                <div class="loading-spinner"></div>
                <p>読み込み中...</p>
            </td>
        </tr>
    `;

    try {
        const authToken = getAuthToken();
        const data = await getAllProposals(authToken);
        allProposals = data.proposals || [];
        renderProposalsTable(allProposals);
    } catch (error) {
        console.error('テーブル読み込みエラー:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="error-cell">
                    <p>❌ データの読み込みに失敗しました</p>
                </td>
            </tr>
        `;
    }
}

/**
 * 提案テーブルを描画
 */
function renderProposalsTable(proposals) {
    const tbody = document.getElementById('proposalsTableBody');

    if (proposals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-cell">
                    <p>提案がありません</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = proposals.map(p => `
        <tr data-id="${p.id}">
            <td class="id-cell" title="${p.id}">${p.id.substring(0, 12)}...</td>
            <td class="title-cell">${escapeHtml(p.title)}</td>
            <td>${escapeHtml(p.category)}</td>
            <td>${escapeHtml(p.submitterName)}</td>
            <td class="likes-cell">👍 ${p.likeCount || 0}</td>
            <td>
                <span class="status-badge status-${getStatusClass(p.status)}">${p.status}</span>
            </td>
            <td class="${p.daysRemaining <= 3 ? 'danger-text' : p.daysRemaining <= 7 ? 'warning-text' : ''}">
                ${p.daysRemaining > 0 ? `${p.daysRemaining}日` : '期限切れ'}
            </td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-edit" onclick="openEditModal('${p.id}')">✏️</button>
                <button class="btn btn-sm btn-delete" onclick="openDeleteModal('${p.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

/**
 * 提案をフィルタリング
 */
function filterProposals() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    let filtered = allProposals;

    if (statusFilter) {
        filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(searchQuery) ||
            p.description.toLowerCase().includes(searchQuery) ||
            p.category.toLowerCase().includes(searchQuery) ||
            p.submitterName.toLowerCase().includes(searchQuery)
        );
    }

    renderProposalsTable(filtered);
}

/**
 * 編集モーダルを開く
 */
function openEditModal(proposalId) {
    const proposal = allProposals.find(p => p.id === proposalId);
    if (!proposal) return;

    document.getElementById('editProposalId').value = proposal.id;
    document.getElementById('editTitle').value = proposal.title;
    document.getElementById('editDescription').value = proposal.description;
    document.getElementById('editCategory').value = proposal.category;
    document.getElementById('editStatus').value = proposal.status;
    
    const extendDaysSelect = document.getElementById('extendDays');
    extendDaysSelect.value = '0';
    
    // 期限切れの提案は期限延長を推奨
    if (proposal.status === '期限切れ' || proposal.daysRemaining <= 0) {
        extendDaysSelect.value = '30';
    }

    document.getElementById('editModal').style.display = 'flex';
}

/**
 * 削除モーダルを開く
 */
function openDeleteModal(proposalId) {
    const proposal = allProposals.find(p => p.id === proposalId);
    if (!proposal) return;

    document.getElementById('deleteProposalId').value = proposal.id;
    document.getElementById('deleteProposalTitle').textContent = proposal.title;

    document.getElementById('deleteModal').style.display = 'flex';
}

/**
 * 編集フォーム送信処理
 */
async function handleEditSubmit(e) {
    e.preventDefault();

    const proposalId = document.getElementById('editProposalId').value;
    const extendDays = parseInt(document.getElementById('extendDays').value) || 0;
    
    const data = {
        proposalId: proposalId,
        title: document.getElementById('editTitle').value,
        description: document.getElementById('editDescription').value,
        category: document.getElementById('editCategory').value,
        status: document.getElementById('editStatus').value,
        extendDays: extendDays
    };

    try {
        await sendAuthenticatedRequest('updateProposal', data);
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('extendDays').value = '0';
        showAdminSuccess('提案を更新しました');
        loadProposalsTable();
        loadDashboardData();
    } catch (error) {
        console.error('更新エラー:', error);
        showAdminError('提案の更新に失敗しました');
    }
}

/**
 * 削除確認処理
 */
async function handleDeleteConfirm() {
    const proposalId = document.getElementById('deleteProposalId').value;

    try {
        await sendAuthenticatedRequest('deleteProposal', { proposalId: proposalId });
        document.getElementById('deleteModal').style.display = 'none';
        showAdminSuccess('提案を削除しました');
        loadProposalsTable();
        loadDashboardData();
    } catch (error) {
        console.error('削除エラー:', error);
        showAdminError('提案の削除に失敗しました');
    }
}

/**
 * パスワード変更処理
 */
async function handlePasswordChange(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showAdminError('新しいパスワードが一致しません');
        return;
    }

    if (newPassword.length < 6) {
        showAdminError('パスワードは6文字以上で設定してください');
        return;
    }

    try {
        await changeAdminPassword(currentPassword, newPassword);
        showAdminSuccess('パスワードを変更しました');
        document.getElementById('changePasswordForm').reset();
    } catch (error) {
        console.error('パスワード変更エラー:', error);
        showAdminError('パスワードの変更に失敗しました');
    }
}

/**
 * CSVエクスポート
 */
function exportToCsv() {
    if (allProposals.length === 0) {
        showAdminError('エクスポートするデータがありません');
        return;
    }

    const headers = ['ID', 'タイトル', '説明', 'カテゴリ', '提案者', 'いいね数', 'ステータス', '残り日数'];
    const rows = allProposals.map(p => [
        p.id,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        `"${(p.description || '').replace(/"/g, '""')}"`,
        p.category,
        p.submitterName,
        p.likeCount || 0,
        p.status,
        p.daysRemaining
    ]);

    const bom = '\uFEFF';
    const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposals_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAdminSuccess('CSVをダウンロードしました');
}

/**
 * 期限切れ提案を削除
 */
async function handleCleanExpired() {
    if (!confirm('期限切れの提案をすべて削除しますか？この操作は取り消せません。')) {
        return;
    }

    try {
        const result = await sendAuthenticatedRequest('cleanExpired');
        showAdminSuccess(result.message || '期限切れ提案を削除しました');
        loadProposalsTable();
        loadDashboardData();
    } catch (error) {
        console.error('削除エラー:', error);
        showAdminError('期限切れ提案の削除に失敗しました');
    }
}

/**
 * ステータスクラスを取得
 */
function getStatusClass(status) {
    switch (status) {
        case '保留': return 'pending';
        case '掲載中': return 'active';
        case '実施候補': return 'candidate';
        case '期限切れ': return 'expired';
        default: return '';
    }
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 成功メッセージを表示
 */
function showAdminSuccess(message) {
    showToast(message, 'success');
}

/**
 * エラーメッセージを表示
 */
function showAdminError(message) {
    showToast(message, 'error');
}

/**
 * トースト通知を表示
 */
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.admin-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `admin-toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
