/**
 * SSAP提案システム - 進捗報告ページ
 */

let allProgressItems = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    setupFilters();
    loadProgressItems();
});

function setupFilters() {
    document.querySelectorAll('.progress-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.progress-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderProgressItems();
        });
    });
}

async function loadProgressItems() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const progressList = document.getElementById('progressList');
    const emptyState = document.getElementById('emptyState');

    loadingSpinner.style.display = 'flex';
    errorMessage.style.display = 'none';
    progressList.innerHTML = '';
    emptyState.style.display = 'none';

    try {
        const data = await getProgressReports();
        allProgressItems = data.items || [];

        document.getElementById('inProgressCount').textContent = data.inProgressCount || 0;
        document.getElementById('candidateCount').textContent = data.candidateCount || 0;
        document.getElementById('completedCount').textContent = data.completedCount || 0;

        loadingSpinner.style.display = 'none';
        renderProgressItems();
    } catch (error) {
        console.error('進捗報告の取得に失敗:', error);
        try {
            const fallback = await getProposals();
            const candidates = (fallback.proposals || []).filter(p => p.status === '実施候補');
            allProgressItems = candidates.map(item => ({
                ...item,
                progressPercent: 0,
                department: '',
                latestReport: null,
                reports: []
            }));

            document.getElementById('inProgressCount').textContent = 0;
            document.getElementById('candidateCount').textContent = candidates.length;
            document.getElementById('completedCount').textContent = 0;
            loadingSpinner.style.display = 'none';
            renderProgressItems();
        } catch (fallbackError) {
            loadingSpinner.style.display = 'none';
            errorMessage.style.display = 'block';
            const isUnknownAction = (error.message || '').includes('Unknown action');
            document.getElementById('errorText').textContent = isUnknownAction
                ? '進捗報告機能を有効にするには、Google Apps Scriptの最新コードを再デプロイしてください。'
                : (error.message || 'サーバーとの通信に失敗しました');
        }
    }
}

function renderProgressItems() {
    const progressList = document.getElementById('progressList');
    const emptyState = document.getElementById('emptyState');

    const filtered = currentFilter === 'all'
        ? allProgressItems
        : allProgressItems.filter(item => item.status === currentFilter);

    if (filtered.length === 0) {
        progressList.innerHTML = '';
        emptyState.style.display = 'flex';
        const title = emptyState.querySelector('h3');
        const desc = emptyState.querySelector('p');
        if (allProgressItems.length === 0) {
            title.textContent = '表示できる進捗報告はまだありません';
            desc.textContent = '100票を獲得した提案の実施が始まると、ここに進捗が表示されます。';
        } else {
            title.textContent = 'この条件に合う提案はありません';
            desc.textContent = 'ほかのタブを選ぶと、実施中・実施準備・完了の提案を確認できます。';
        }
        return;
    }

    emptyState.style.display = 'none';
    progressList.innerHTML = filtered.map(item => createProgressCard(item)).join('');
}

function createProgressCard(item) {
    const percent = Math.max(0, Math.min(100, Number(item.progressPercent) || 0));
    const reports = item.reports || [];
    const latest = item.latestReport;
    const statusMeta = getStatusMeta(item.status);
    const safeId = escapeHtml(item.id);

    return `
        <article class="progress-card" data-id="${safeId}">
            <div class="progress-card-header">
                <div class="proposal-meta">
                    <span class="category-badge">${escapeHtml(item.category || '未分類')}</span>
                    <span class="badge ${statusMeta.badgeClass}">${statusMeta.label}</span>
                </div>
                ${item.department ? `<div class="progress-department">担当: ${escapeHtml(item.department)}</div>` : ''}
            </div>

            <h3 class="proposal-title">${escapeHtml(item.title)}</h3>
            <p class="proposal-description progress-description">${escapeHtml(item.description || '')}</p>

            <div class="progress-meter">
                <div class="progress-bar ${percent >= 100 ? 'complete' : ''}">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
                <div class="progress-label">${percent}%</div>
            </div>

            ${latest ? `
                <div class="progress-latest">
                    <div class="progress-latest-label">最新報告（${formatDate(latest.reportedAt)}）</div>
                    <p>${escapeHtml(latest.content)}</p>
                </div>
            ` : `
                <div class="progress-latest progress-latest-empty">
                    実施準備中です。進捗報告が投稿されるとここに表示されます。
                </div>
            `}

            ${reports.length > 0 ? `
                <button class="btn btn-secondary btn-sm progress-toggle" onclick="toggleTimeline('${safeId}')">
                    報告履歴を見る（${reports.length}件）
                </button>
                <ol class="progress-timeline" id="timeline-${safeId}" hidden>
                    ${reports.map(report => `
                        <li>
                            <div class="progress-timeline-meta">
                                <span>${formatDate(report.reportedAt)}</span>
                                <span>${Number(report.progressPercent) || 0}%</span>
                            </div>
                            <p>${escapeHtml(report.content)}</p>
                            ${report.department ? `<small>担当: ${escapeHtml(report.department)}</small>` : ''}
                        </li>
                    `).join('')}
                </ol>
            ` : ''}
        </article>
    `;
}

function toggleTimeline(proposalId) {
    const timeline = document.getElementById(`timeline-${proposalId}`);
    const card = document.querySelector(`.progress-card[data-id="${proposalId}"]`);
    const button = card ? card.querySelector('.progress-toggle') : null;
    if (!timeline) return;

    const willShow = timeline.hasAttribute('hidden');
    if (willShow) {
        timeline.removeAttribute('hidden');
        if (button) button.textContent = '報告履歴を閉じる';
    } else {
        timeline.setAttribute('hidden', '');
        if (button) {
            const count = (allProgressItems.find(item => item.id === proposalId)?.reports || []).length;
            button.textContent = `報告履歴を見る（${count}件）`;
        }
    }
}

function getStatusMeta(status) {
    switch (status) {
        case '実施中':
            return { label: '実施中', badgeClass: 'badge-in-progress' };
        case '完了':
            return { label: '完了', badgeClass: 'badge-complete' };
        case '実施候補':
            return { label: '実施準備', badgeClass: 'badge-candidate' };
        default:
            return { label: status || '未設定', badgeClass: 'badge-urgent' };
    }
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
