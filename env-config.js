// Environment Configuration Manager
// This file provides a safe way to load environment variables in the browser

class EnvironmentConfig {
    constructor() {
        this.config = new Map();
        this.loadEnvironmentVariables();
    }

    loadEnvironmentVariables() {
        // Default fallback values (safe for public repository)
        const defaults = {
            'TELEGRAM_BOT_USERNAME': 'word_game_ua_bot',  // Ваш username бота
            'TELEGRAM_BOT_TOKEN': '',  // Set in GitHub Actions secrets
            'PAYMENT_PROVIDER_TOKEN': 'PAYMENT_TOKEN_NOT_CONFIGURED',
            'PAYMENT_CURRENCY': 'USDT',
            'GAME_ENVIRONMENT': 'development',  // Змінимо на development для кращого дебагу
            'DEBUG_MODE': 'true',
            'AI_FEATURES_ENABLED': 'true',
            'AI_COMPLEXITY_LEVEL': '1',
            'MULTIPLAYER_MODE': 'firebase',  // 'websocket', 'telegram', or 'firebase'
            'WEBSOCKET_URL': 'ws://localhost:3001',
            'TELEGRAM_API_URL': 'https://api.telegram.org/bot',
            'GITHUB_API_URL': 'https://api.github.com',
            'GITHUB_REPO': '3kage/word-game',
            'GIT_TOKEN': '',  // For GitHub API access (renamed to avoid GITHUB_ prefix restriction)
            'SPEECH_API_ENABLED': 'true',
            'SPEECH_LANGUAGE': 'uk-UA',
            'MULTIPLAYER_ENABLED': 'true',
            'FIREBASE_ENABLED': 'true',
            'FIREBASE_API_KEY': '',
            'FIREBASE_AUTH_DOMAIN': '',
            'FIREBASE_DATABASE_URL': '',
            'FIREBASE_PROJECT_ID': '',
            'FIREBASE_STORAGE_BUCKET': '',
            'FIREBASE_MESSAGING_SENDER_ID': '',
            'FIREBASE_APP_ID': '',
            'PREMIUM_FEATURES_ENABLED': 'false',
            'ADS_ENABLED': 'false',
            'ANALYTICS_ENDPOINT': '',
            'TOURNAMENT_MODE_ENABLED': 'false',
            'LOCALIZATION_ENABLED': 'true',
            'DEFAULT_LANGUAGE': 'uk'
        };

        // Load defaults first
        Object.keys(defaults).forEach(key => {
            this.config.set(key, defaults[key]);
        });

        // Load from environment if available (for build-time injection)
        if (typeof process !== 'undefined' && process.env) {
            Object.keys(defaults).forEach(key => {
                if (process.env[key]) {
                    this.config.set(key, process.env[key]);
                }
            });
        }

        // For GitHub Pages, variables can be injected during build process
        this.loadFromBuildTimeVariables();
    }

    loadFromBuildTimeVariables() {
        try {
            // Check if build-time variables were injected
            if (typeof window !== 'undefined' && window.BUILD_CONFIG) {
                Object.keys(window.BUILD_CONFIG).forEach(key => {
                    this.config.set(key, window.BUILD_CONFIG[key]);
                });
            }
        } catch (error) {
            console.warn('Failed to load build-time configuration:', error);
        }
    }

    get(key) {
        return this.config.get(key);
    }

    set(key, value) {
        this.config.set(key, value);
    }

    has(key) {
        return this.config.has(key);
    }

    // Development mode helpers
    isDevelopment() {
        return this.get('GAME_ENVIRONMENT') === 'development';
    }

    isProduction() {
        return this.get('GAME_ENVIRONMENT') === 'production';
    }

    isDebugMode() {
        return this.get('DEBUG_MODE') === 'true';
    }

    // Payment configuration
    isPaymentConfigured() {
        const token = this.get('PAYMENT_PROVIDER_TOKEN');
        return token && token !== 'PAYMENT_TOKEN_NOT_CONFIGURED' && token.trim().length > 0;
    }

    getPaymentToken() {
        if (!this.isPaymentConfigured()) {
            console.warn('Payment provider token not configured');
            return null;
        }
        return this.get('PAYMENT_PROVIDER_TOKEN');
    }

    // Bot configuration
    getBotUsername() {
        return this.get('TELEGRAM_BOT_USERNAME');
    }

    // Get donation amounts
    getDonationAmounts() {
        return [2, 5, 10]; // Static for now, can be made configurable
    }

    // AI and adaptive features
    isAIFeaturesEnabled() {
        return this.get('AI_FEATURES_ENABLED') === 'true';
    }

    getAIComplexityLevel() {
        return parseInt(this.get('AI_COMPLEXITY_LEVEL') || '1', 10);
    }

    // Multiplayer configuration
    isMultiplayerEnabled() {
        return this.get('MULTIPLAYER_ENABLED') === 'true';
    }

    getMultiplayerMode() {
        return this.get('MULTIPLAYER_MODE') || 'telegram';
    }

    getWebSocketURL() {
        return this.get('WEBSOCKET_URL') || 'ws://localhost:3001';
    }

    // Firebase configuration
    isFirebaseEnabled() {
        return this.get('FIREBASE_ENABLED') === 'true';
    }

    isFirebaseMultiplayer() {
        return this.getMultiplayerMode() === 'firebase';
    }

    getFirebaseConfig() {
        return {
            apiKey: this.get('FIREBASE_API_KEY'),
            authDomain: this.get('FIREBASE_AUTH_DOMAIN'),
            databaseURL: this.get('FIREBASE_DATABASE_URL'),
            projectId: this.get('FIREBASE_PROJECT_ID'),
            storageBucket: this.get('FIREBASE_STORAGE_BUCKET'),
            messagingSenderId: this.get('FIREBASE_MESSAGING_SENDER_ID'),
            appId: this.get('FIREBASE_APP_ID')
        };
    }

    isFirebaseConfigured() {
        const config = this.getFirebaseConfig();
        return config.apiKey && config.authDomain && config.databaseURL && config.projectId;
    }

    // Telegram API configuration
    getTelegramBotToken() {
        return this.get('TELEGRAM_BOT_TOKEN');
    }

    getTelegramAPIURL() {
        const token = this.getTelegramBotToken();
        if (!token) return null;
        return `${this.get('TELEGRAM_API_URL')}${token}`;
    }

    isTelegramMultiplayer() {
        return this.getMultiplayerMode() === 'telegram';
    }

    // GitHub API configuration  
    getGitHubToken() {
        return this.get('GIT_TOKEN');
    }

    getGitHubAPIURL() {
        return this.get('GITHUB_API_URL') || 'https://api.github.com';
    }

    getGitHubRepo() {
        return this.get('GITHUB_REPO') || '3kage/word-game';
    }

    // Speech API configuration
    isSpeechAPIEnabled() {
        return this.get('SPEECH_API_ENABLED') === 'true';
    }

    getSpeechLanguage() {
        return this.get('SPEECH_LANGUAGE') || 'uk-UA';
    }

    // Premium features
    isPremiumEnabled() {
        return this.get('PREMIUM_FEATURES_ENABLED') === 'true';
    }

    isAdsEnabled() {
        return this.get('ADS_ENABLED') === 'true';
    }

    // Tournament mode
    isTournamentModeEnabled() {
        return this.get('TOURNAMENT_MODE_ENABLED') === 'true';
    }

    // Localization
    isLocalizationEnabled() {
        return this.get('LOCALIZATION_ENABLED') === 'true';
    }

    getDefaultLanguage() {
        return this.get('DEFAULT_LANGUAGE') || 'uk';
    }

    // Analytics
    getAnalyticsEndpoint() {
        return this.get('ANALYTICS_ENDPOINT');
    }
}

// Create global instance
const envConfig = new EnvironmentConfig();

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.EnvironmentConfig = envConfig;
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = envConfig;
}
