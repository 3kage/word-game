// Game configuration object
const GameConfig = {
    // Game modes
    GAME_MODES: {
        CLASSIC: {
            name: 'Класичний',
            description: 'Стандартна гра на двох гравців',
            maxPlayers: 2,
            rounds: 2,
            features: ['basic_scoring', 'streaks']
        },
        BLITZ: {
            name: 'Блиц',
            description: 'Швидка гра з коротшими раундами',
            maxPlayers: 2,
            rounds: 3,
            roundDuration: 30,
            features: ['double_scoring', 'quick_streaks']
        },
        MARATHON: {
            name: 'Марафон',
            description: 'Довга гра з більшою кількістю раундів',
            maxPlayers: 2,
            rounds: 5,
            roundDuration: 90,
            features: ['endurance_bonus', 'category_rotation']
        },
        TEAM: {
            name: 'Командний (планується)',
            description: 'Гра для команд до 4 гравців',
            maxPlayers: 4,
            rounds: 3,
            features: ['team_scoring', 'relay_mode'],
            comingSoon: true
        }
    },

    // Default game settings
    DEFAULT_ROUND_DURATION: 60,
    TOTAL_ROUNDS: 2,
    STREAK_BONUS_THRESHOLD: 3,
    MAX_HISTORY_ENTRIES: 10,
    
    // Difficulty levels
    DIFFICULTY_LEVELS: {
        EASY: {
            name: 'Легкий',
            roundDuration: 90,
            streakBonus: 2,
            description: 'Більше часу, бонус за серію з 2 слів'
        },
        NORMAL: {
            name: 'Звичайний',
            roundDuration: 60,
            streakBonus: 3,
            description: 'Стандартні налаштування'
        },
        HARD: {
            name: 'Складний',
            roundDuration: 45,
            streakBonus: 4,
            description: 'Менше часу, бонус за серію з 4 слів'
        },
        EXPERT: {
            name: 'Експертний',
            roundDuration: 30,
            streakBonus: 5,
            description: 'Для справжніх професіоналів'
        }
    },
    
    // Achievement system
    ACHIEVEMENTS: {
        FIRST_WIN: {
            id: 'first_win',
            name: 'Перша перемога',
            description: 'Виграйте свою першу гру',
            icon: '🏆',
            points: 10
        },
        SPEED_DEMON: {
            id: 'speed_demon',
            name: 'Швидкісний демон',
            description: 'Відгадайте 10 слів за раунд',
            icon: '⚡',
            points: 25
        },
        STREAK_MASTER: {
            id: 'streak_master',
            name: 'Майстер серій',
            description: 'Досягніть серії з 15 слів',
            icon: '🔥',
            points: 30
        },
        CATEGORY_EXPERT: {
            id: 'category_expert',
            name: 'Експерт категорій',
            description: 'Створіть 5 власних категорій',
            icon: '📚',
            points: 20
        },
        MARATHON_RUNNER: {
            id: 'marathon_runner',
            name: 'Марафонець',
            description: 'Завершіть 10 ігор в режимі Марафон',
            icon: '🏃',
            points: 50
        },
        PERFECT_ROUND: {
            id: 'perfect_round',
            name: 'Ідеальний раунд',
            description: 'Відгадайте всі слова в раунді без пропусків',
            icon: '💎',
            points: 40
        },
        SOCIAL_BUTTERFLY: {
            id: 'social_butterfly',
            name: 'Соціальна метелик',
            description: 'Поділіться грою 5 разів',
            icon: '🦋',
            points: 15
        }
    },

    // Round duration options
    ROUND_DURATION_OPTIONS: [30, 45, 60, 75, 90, 120],
    
    // Payment configuration (sensitive data loaded from environment)
    PAYMENT: {
        // This will be loaded from environment variables in production
        PROVIDER_TOKEN: typeof window !== 'undefined' && window.EnvironmentConfig ? 
            window.EnvironmentConfig.get('PAYMENT_PROVIDER_TOKEN') : 
            'PAYMENT_TOKEN_NOT_CONFIGURED',
        CURRENCY: 'USDT',
        DONATION_AMOUNTS: [2, 5, 10]
    },
    
    // Bot configuration
    BOT: {
        USERNAME: typeof window !== 'undefined' && window.EnvironmentConfig ? 
            window.EnvironmentConfig.get('TELEGRAM_BOT_USERNAME') : 
            'word_game_ua_bot'
    },
    
    // UI configuration
    UI: {
        ANIMATION_DURATION: 300,
        SCREEN_TRANSITION_DELAY: 50,
        LOADING_DELAY: 500,
        MESSAGE_TIMEOUT: 5000,
        SUCCESS_MESSAGE_TIMEOUT: 3000
    },
    
    // Statistics tracking
    STATISTICS: {
        GAME_STATS: [
            'total_games',
            'wins',
            'losses',
            'total_words_guessed',
            'total_words_skipped',
            'best_streak',
            'favorite_category',
            'total_playtime'
        ],
        PERFORMANCE_METRICS: [
            'average_words_per_minute',
            'guess_accuracy',
            'category_performance',
            'difficulty_progress'
        ]
    },

    // Storage keys for Telegram Cloud Storage
    STORAGE_KEYS: {
        HISTORY: 'word_game_history',
        SETTINGS: 'word_game_settings',
        USER_CATEGORIES: 'word_game_user_categories'
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
    
    // Validation rules
    VALIDATION: {
        MAX_CATEGORY_NAME_LENGTH: 50,
        MAX_WORDS_PER_CATEGORY: 100,
        MIN_WORDS_PER_CATEGORY: 5,
        MAX_WORD_LENGTH: 30
    },
    
    // Error messages
    ERRORS: {
        DICTIONARY_NOT_LOADED: 'Словники не завантажено!',
        PAYMENT_NOT_CONFIGURED: 'Функція донатів ще не налаштована розробником.',
        HISTORY_LOAD_FAILED: 'Не вдалося завантажити історію.',
        SETTINGS_SAVE_FAILED: 'Не вдалося зберегти налаштування.',
        NETWORK_ERROR: 'Помилка мережі. Перевірте з\'єднання.',
        INVALID_CATEGORY_NAME: 'Некоректна назва категорії.',
        CATEGORY_EXISTS: 'Категорія з такою назвою вже існує.',
        TOO_FEW_WORDS: 'Недостатньо слів у категорії (мінімум 5).',
        WORD_TOO_LONG: 'Слово занадто довге (максимум 30 символів).',
        INVALID_DIFFICULTY: 'Некоректний рівень складності.',
        GAME_INITIALIZATION_FAILED: 'Не вдалося ініціалізувати гру.',
        SOUND_INITIALIZATION_FAILED: 'Не вдалося ініціалізувати звук.',
        CLOUD_STORAGE_ERROR: 'Помилка збереження даних.'
    },
    
    // Success messages
    MESSAGES: {
        PAYMENT_SUCCESS: 'Дякую за вашу підтримку! ❤️',
        SETTINGS_SAVED: 'Налаштування збережено!',
        GAME_SHARED: 'Гру успішно поділено!',
        CATEGORY_CREATED: 'Категорію успішно створено!',
        CATEGORY_UPDATED: 'Категорію оновлено!',
        CATEGORY_DELETED: 'Категорію видалено!'
    }
};

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
}