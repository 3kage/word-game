// Game configuration object
const GameConfig = {
    // Default game settings
    DEFAULT_ROUND_DURATION: 60,
    TOTAL_ROUNDS: 2,
    STREAK_BONUS_THRESHOLD: 3,
    MAX_HISTORY_ENTRIES: 10,
    
    // Payment configuration (move sensitive data here)
    PAYMENT: {
        // This should be loaded from environment or secure config in production
        PROVIDER_TOKEN: '5775769170:LIVE:TG_1oguw1YT13ms_s3AuCVLtWgA',
        CURRENCY: 'USDT',
        DONATION_AMOUNTS: [2, 5, 10]
    },
    
    // Bot configuration
    BOT: {
        USERNAME: 'word_game_ua_bot'
    },
    
    // UI configuration
    UI: {
        ANIMATION_DURATION: 300,
        SCREEN_TRANSITION_DELAY: 50,
        LOADING_DELAY: 500
    },
    
    // Storage keys for Telegram Cloud Storage
    STORAGE_KEYS: {
        HISTORY: 'word_game_history',
        SETTINGS: 'word_game_settings'
    },
    
    // Sound configuration
    SOUNDS: {
        ENABLED: true,
        NOTES: {
            CORRECT: 'C5',
            SKIP: 'A3',
            CLICK: 'C2',
            END_ROUND: 'G5',
            STREAK: ['C5', 'E5', 'G5']
        }
    },
    
    // Error messages
    ERRORS: {
        DICTIONARY_NOT_LOADED: 'Словники не завантажено!',
        PAYMENT_NOT_CONFIGURED: 'Функція донатів ще не налаштована розробником.',
        HISTORY_LOAD_FAILED: 'Не вдалося завантажити історію.',
        SETTINGS_SAVE_FAILED: 'Не вдалося зберегти налаштування.',
        NETWORK_ERROR: 'Помилка мережі. Перевірте з\'єднання.'
    },
    
    // Success messages
    MESSAGES: {
        PAYMENT_SUCCESS: 'Дякую за вашу підтримку! ❤️',
        SETTINGS_SAVED: 'Налаштування збережено!',
        GAME_SHARED: 'Гру успішно поділено!'
    }
};

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
}