/**
 * SSAP提案システム - 提案一覧ページ
 */

// グローバル変数
let allProposals = [];
let allPastProposals = [];
let filteredProposals = [];
let filteredPastProposals = [];
let userEmail = '';

// DOM要素
const proposalsList = document.getElementById('proposalsList');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const emptyState = document.getElementById('emptyState');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const sortBy = document.getElementById('sortBy');
const searchInput = document.getElementById('searchInput');
const displayCount = document.getElementById('displayCount');
const candidateCount = document.getElementById('candidateCount');
const pastCount = document.getElementById('pastCount');
const pastSection = document.getElementById('pastSection');
const pastProposalsList = document.getElementById('pastProposalsList');

// ページ読み込み時
document.addEventListener('DOMContentLoaded', async () => {
    // 匿名ユーザーIDを取得（自動生成）
    userEmail = getAnonymousUserId();
    
    console.log('🆔 ユーザーID:', userEmail);
    
    // 提案を読み込み
    await loadProposals();
    
    // フィルター・検索のイベントリスナー
    categoryFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    sortBy.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);
    
    // 自動更新（30秒ごと）
    setInterval(async () => {
        await loadProposals(true); // サイレント更新
    }, CONFIG.AUTO_REFRESH_INTERVAL);
});

/**
 * 提案一覧を読み込み
 */
async function loadProposals(silent = false) {
    if (!silent) {
        loadingSpinner.style.display = 'flex';
        errorMessage.style.display = 'none';
        proposalsList.innerHTML = '';
    }
    
    try {
        const data = await getProposals();
        allProposals = data.proposals || [];
        allPastProposals = data.pastProposals || [];
        
        if (!silent) {
            loadingSpinner.style.display = 'none';
        }
        
        applyFilters();
        
    } catch (error) {
        console.error('読み込みエラー:', error);
        if (!silent) {
            loadingSpinner.style.display = 'none';
            errorMessage.style.display = 'flex';
            errorText.textContent = error.message;
        }
    }
}

/**
 * フィルター・検索・ソートを適用
 */
function applyFilters() {
    // フィルター
    let filtered = [...allProposals];
    
    // カテゴリフィルター
    const category = categoryFilter.value;
    if (category !== 'all') {
        filtered = filtered.filter(p => p.category === category);
    }
    
    // ステータスフィルター
    filtered = filtered.filter(p => p.status === '掲載中' || p.status === '実施候補');

    const status = statusFilter.value;
    if (status !== 'all') {
        filtered = filtered.filter(p => p.status === status);
    }
    
    // 検索
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm) ||
            p.submitterName.toLowerCase().includes(searchTerm)
        );
    }

    let pastFiltered = [...allPastProposals];
    if (category !== 'all') {
        pastFiltered = pastFiltered.filter(p => p.category === category);
    }
    if (searchTerm) {
        pastFiltered = pastFiltered.filter(p =>
            p.title.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm) ||
            p.submitterName.toLowerCase().includes(searchTerm)
        );
    }
    pastFiltered.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
    filteredPastProposals = pastFiltered;
    
    // ソート
    const sortOrder = sortBy.value;
    switch(sortOrder) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.postedDate) - new Date(b.postedDate));
            break;
        case 'most-liked':
            filtered.sort((a, b) => b.likeCount - a.likeCount);
            break;
        case 'expiring-soon':
            filtered.sort((a, b) => a.daysRemaining - b.daysRemaining);
            break;
    }
    
    filteredProposals = filtered;
    
    // 表示を更新
    displayProposals();
    updateStats();
}

/**
 * 提案を表示
 */
function displayProposals() {
    if (filteredProposals.length === 0) {
        proposalsList.innerHTML = '';
        emptyState.style.display = 'flex';
        displayPastProposals();
        return;
    }
    
    emptyState.style.display = 'none';
    proposalsList.innerHTML = filteredProposals.map(proposal => createProposalCard(proposal)).join('');
    displayPastProposals();
}

/**
 * 過去の提案を表示
 */
function displayPastProposals() {
    if (!pastSection || !pastProposalsList) return;

    if (filteredPastProposals.length === 0) {
        pastSection.hidden = allPastProposals.length === 0;
        pastProposalsList.innerHTML = allPastProposals.length === 0
            ? ''
            : '<p class="past-proposals-empty">この条件に合う過去の提案はありません。</p>';
        return;
    }

    pastSection.hidden = false;
    pastProposalsList.innerHTML = filteredPastProposals.map(proposal => createProposalCard(proposal, true)).join('');
}

/**
 * 提案カードのHTMLを生成
 */
function createProposalCard(proposal, isPast = false) {
    const isLiked = isProposalLiked(proposal.id);
    const likeButtonClass = isLiked ? 'liked' : '';
    const likeButtonText = isLiked ? '❤️ いいね済み' : '🤍 いいね';
    
    // ステータスバッジ
    let statusBadge = '';
    if (proposal.status === '実施候補') {
        statusBadge = '<span class="badge badge-candidate">🎯 実施候補</span>';
    } else if (proposal.status === '完了') {
        statusBadge = '<span class="badge badge-complete">完了</span>';
    } else if (proposal.status === '期限切れ' || isPast) {
        statusBadge = '<span class="badge badge-expired">期限切れ</span>';
    } else if (proposal.daysRemaining <= 3) {
        statusBadge = '<span class="badge badge-urgent">⏰ 期限間近</span>';
    }
    
    // プログレスバー
    const progress = Math.min((proposal.likeCount / CONFIG.TOTAL_EMPLOYEES) * 100, 100);
    const progressClass = progress >= 100 ? 'complete' : '';
    const dateLabel = isPast
        ? `掲載終了 ${formatProposalDate(proposal.expiryDate)}`
        : `残り ${proposal.daysRemaining} 日`;
    
    return `
        <div class="proposal-card ${isPast ? 'proposal-card-past' : ''}" data-id="${proposal.id}">
            <div class="proposal-header">
                <div class="proposal-meta">
                    <span class="category-badge">${proposal.category}</span>
                    ${statusBadge}
                </div>
                <div class="proposal-date">
                    ${dateLabel}
                </div>
            </div>
            
            <h3 class="proposal-title">${escapeHtml(proposal.title)}</h3>
            
            <p class="proposal-description">
                ${escapeHtml(proposal.description.substring(0, 150))}${proposal.description.length > 150 ? '...' : ''}
            </p>
            
            <div class="proposal-submitter">
                提案者: ${escapeHtml(proposal.submitterName)}
            </div>
            
            <div class="proposal-stats">
                <div class="like-section">
                    ${isPast ? `
                        <div class="like-count past-like-count">
                            最終 <span class="like-number">${proposal.likeCount}</span> / ${CONFIG.TOTAL_EMPLOYEES} 票
                        </div>
                    ` : `
                        <button 
                            class="btn-like ${likeButtonClass}" 
                            onclick="toggleLike('${proposal.id}')"
                            data-proposal-id="${proposal.id}"
                        >
                            ${likeButtonText}
                        </button>
                        <div class="like-count">
                            <span class="like-number">${proposal.likeCount}</span> / ${CONFIG.TOTAL_EMPLOYEES}
                        </div>
                    `}
                </div>
                
                <div class="progress-bar ${progressClass}">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-label">${progress.toFixed(1)}%</div>
            </div>
            
            <div class="proposal-actions">
                <button class="btn btn-secondary btn-sm" onclick="showProposalDetail('${proposal.id}')">
                    詳細を見る
                </button>
            </div>
        </div>
    `;
}

/**
 * 統計情報を更新
 */
function updateStats() {
    displayCount.textContent = filteredProposals.length;
    const candidates = allProposals.filter(p => p.status === '実施候補');
    candidateCount.textContent = candidates.length;
    if (pastCount) {
        pastCount.textContent = filteredPastProposals.length;
    }
}

/**
 * いいねをトグル（楽観的UI更新）
 */
async function toggleLike(proposalId) {
    const isLiked = isProposalLiked(proposalId);
    const proposal = allProposals.find(p => p.id === proposalId);
    
    if (!proposal) return;
    
    // 1. 即座にUIを更新（楽観的更新）
    if (isLiked) {
        // いいね解除の場合
        removeLikedProposal(proposalId);
        proposal.likeCount = Math.max(0, proposal.likeCount - 1);
    } else {
        // いいね追加の場合
        saveLikedProposal(proposalId);
        proposal.likeCount++;
    }
    
    // UIを即座に更新
    applyFilters();
    
    // 数字アニメーションを追加
    addNumberAnimation(proposalId);
    
    // 2. バックグラウンドでサーバーに送信
    try {
        if (isLiked) {
            await removeLike(proposalId, userEmail);
        } else {
            await addLike(proposalId, userEmail);
        }
        
        // 3. サーバーから最新データを取得して同期
        await loadProposals(true);
        
    } catch (error) {
        console.error('いいね処理エラー:', error);
        
        // 4. エラーが発生した場合は元に戻す
        if (isLiked) {
            saveLikedProposal(proposalId);
            proposal.likeCount++;
        } else {
            removeLikedProposal(proposalId);
            proposal.likeCount = Math.max(0, proposal.likeCount - 1);
        }
        
        applyFilters();
        showError(error.message || 'いいね処理に失敗しました。元に戻しました。');
    }
}

/**
 * 数字アニメーションを追加
 */
function addNumberAnimation(proposalId) {
    // カード内の数字要素を取得
    const card = document.querySelector(`.proposal-card[data-id="${proposalId}"]`);
    if (card) {
        const numberElement = card.querySelector('.like-number');
        if (numberElement) {
            numberElement.classList.add('updating');
            setTimeout(() => {
                numberElement.classList.remove('updating');
            }, 300);
        }
    }
    
    // モーダル内の数字要素も更新
    const modal = document.getElementById('proposalModal');
    if (modal && modal.style.display === 'flex') {
        const modalNumber = modal.querySelector('.like-number');
        if (modalNumber) {
            modalNumber.classList.add('updating');
            setTimeout(() => {
                modalNumber.classList.remove('updating');
            }, 300);
        }
    }
}

/**
 * 提案詳細をモーダルで表示
 */
function showProposalDetail(proposalId) {
    const proposal = allProposals.find(p => p.id === proposalId)
        || allPastProposals.find(p => p.id === proposalId);
    if (!proposal) return;
    
    const modal = document.getElementById('proposalModal');
    const modalBody = document.getElementById('modalBody');
    
    const isLiked = isProposalLiked(proposal.id);
    const likeButtonClass = isLiked ? 'liked' : '';
    const likeButtonText = isLiked ? '❤️ いいね済み' : '🤍 いいね';
    
    const postedDate = formatProposalDate(proposal.postedDate);
    const expiryDate = formatProposalDate(proposal.expiryDate);
    const isPast = proposal.status === '期限切れ' || proposal.status === '完了';
    const statusBadge = proposal.status === '実施候補'
        ? '<span class="badge badge-candidate">🎯 実施候補</span>'
        : proposal.status === '完了'
            ? '<span class="badge badge-complete">完了</span>'
            : isPast
                ? '<span class="badge badge-expired">期限切れ</span>'
                : '';
    
    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="modal-badges">
                <span class="category-badge">${proposal.category}</span>
                ${statusBadge}
            </div>
            <h2>${escapeHtml(proposal.title)}</h2>
        </div>
        
        <div class="modal-body">
            <div class="detail-section">
                <h3>📝 提案内容</h3>
                <p class="detail-text">${escapeHtml(proposal.description).replace(/\n/g, '<br>')}</p>
            </div>
            
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">提案者:</span>
                    <span class="detail-value">${escapeHtml(proposal.submitterName)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">投稿日:</span>
                    <span class="detail-value">${postedDate}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">期限:</span>
                    <span class="detail-value">${expiryDate}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">${isPast ? '結果:' : '残り日数:'}</span>
                    <span class="detail-value">${isPast ? proposal.status : `${proposal.daysRemaining}日`}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>📊 投票状況</h3>
                <div class="modal-like-section">
                    ${isPast ? '' : `
                        <button 
                            class="btn-like btn-large ${likeButtonClass}" 
                            onclick="toggleLike('${proposal.id}')"
                            data-proposal-id="${proposal.id}"
                        >
                            ${likeButtonText}
                        </button>
                    `}
                    <div class="like-stats">
                        <div class="like-count-large">
                            ${proposal.likeCount} <span class="like-label">/ ${CONFIG.TOTAL_EMPLOYEES} 票</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min((proposal.likeCount / CONFIG.TOTAL_EMPLOYEES) * 100, 100)}%"></div>
                        </div>
                        <div class="progress-info">
                            ${isPast
                                ? '掲載期間は終了しています'
                                : `あと <strong>${Math.max(CONFIG.TOTAL_EMPLOYEES - proposal.likeCount, 0)}</strong> 票で実施候補に昇格`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * モーダルを閉じる
 */
function closeModal() {
    const modal = document.getElementById('proposalModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

/**
 * HTMLエスケープ
 */
function formatProposalDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ja-JP');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Escapeキーでモーダルを閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
