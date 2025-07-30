// Environment Configuration Loader
// This file loads environment variables safely

class EnvironmentConfig {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        // In production, these should be loaded from environment variables
        // For development, you can create a .env file
        const config = {
            // Default values (safe to commit)
            TELEGRAM_BOT_USERNAME: 'word_game_ua_bot',
            PAYMENT_CURRENCY: 'USDT',
            DONATION_AMOUNTS: [2, 5, 10],
            GAME_ENVIRONMENT: 'development'
        };

        // Load from environment if available (for GitHub Pages/production)
        if (typeof process !== 'undefined' && process.env) {
            config.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
            config.PAYMENT_PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN;
            config.TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || config.TELEGRAM_BOT_USERNAME;
            config.GAME_ENVIRONMENT = process.env.GAME_ENVIRONMENT || config.GAME_ENVIRONMENT;
        }

        return config;
    }

    get(key) {
        return this.config[key];
    }

    isDevelopment() {
        return this.config.GAME_ENVIRONMENT === 'development';
    }

    isProduction() {
        return this.config.GAME_ENVIRONMENT === 'production';
    }
}

// Export for use in other files
const envConfig = new EnvironmentConfig();

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.EnvironmentConfig = envConfig;
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = envConfig;
}
