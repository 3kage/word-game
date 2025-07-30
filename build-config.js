// Build-time configuration placeholder
// This file will be replaced during GitHub Actions build process
// with actual configuration values from secrets

window.BUILD_CONFIG = {
    'TELEGRAM_BOT_TOKEN': '',
    'GITHUB_TOKEN': '',
    'GAME_ENVIRONMENT': 'development',
    'MULTIPLAYER_MODE': 'telegram',
    'GITHUB_REPO': '3kage/word-game',
    'GITHUB_API_URL': 'https://api.github.com',
    'TELEGRAM_API_URL': 'https://api.telegram.org/bot'
};

console.log('🔧 Build configuration loaded (development mode)');
