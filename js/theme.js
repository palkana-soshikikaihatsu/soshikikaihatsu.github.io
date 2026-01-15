/**
 * テーマ切り替え機能
 * ライトモード/ダークモードの切り替えを管理
 */

// ページ読み込み時にテーマを適用
document.addEventListener('DOMContentLoaded', () => {
    // 保存されたテーマを読み込む
    const savedTheme = localStorage.getItem('ssap_theme') || 'light';
    applyTheme(savedTheme);

    // テーマ切り替えボタンを作成
    createThemeToggle();
});

/**
 * テーマを適用
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ssap_theme', theme);
    
    // ボタンのアイコンを更新
    updateToggleButton(theme);
}

/**
 * テーマを切り替え
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

/**
 * テーマ切り替えボタンを作成
 */
function createThemeToggle() {
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'テーマを切り替え');
    button.onclick = toggleTheme;
    
    document.body.appendChild(button);
}

/**
 * トグルボタンのアイコンを更新
 */
function updateToggleButton(theme) {
    const button = document.querySelector('.theme-toggle');
    if (!button) return;
    
    if (theme === 'dark') {
        button.innerHTML = '☀️'; // 太陽アイコン（ライトモードへ）
        button.setAttribute('title', 'ライトモードに切り替え');
    } else {
        button.innerHTML = '🌙'; // 月アイコン（ダークモードへ）
        button.setAttribute('title', 'ダークモードに切り替え');
    }
}
