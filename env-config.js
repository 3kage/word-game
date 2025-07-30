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
            'TELEGRAM_BOT_USERNAME': 'word_game_ua_bot',
            'PAYMENT_PROVIDER_TOKEN': 'PAYMENT_TOKEN_NOT_CONFIGURED',
            'PAYMENT_CURRENCY': 'USDT',
            'GAME_ENVIRONMENT': 'production',
            'DEBUG_MODE': 'false'
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
