// Internationalization (i18n) System
class LocalizationManager {
    constructor() {
        this.currentLanguage = 'uk';
        this.fallbackLanguage = 'uk';
        this.translations = {};
        this.supportedLanguages = ['uk', 'en', 'ru', 'pl', 'de', 'fr', 'es'];
        
        this.init();
    }

    async init() {
        // Load saved language preference
        const savedLang = localStorage.getItem('game_language') || window.EnvironmentConfig?.getDefaultLanguage() || 'uk';
        
        // Auto-detect browser language if not set
        const browserLang = this.detectBrowserLanguage();
        const initialLang = this.supportedLanguages.includes(savedLang) ? savedLang : browserLang;
        
        await this.loadLanguage(initialLang);
    }

    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0].toLowerCase();
        
        return this.supportedLanguages.includes(langCode) ? langCode : this.fallbackLanguage;
    }

    async loadLanguage(langCode) {
        if (!this.supportedLanguages.includes(langCode)) {
            langCode = this.fallbackLanguage;
        }

        try {
            // Try to load translation file
            const response = await fetch(`./locales/${langCode}.json`);
            
            if (response.ok) {
                const translations = await response.json();
                this.translations[langCode] = translations;
                this.currentLanguage = langCode;
                localStorage.setItem('game_language', langCode);
                
                this.updatePageLanguage();
                this.notifyLanguageChange();
            } else {
                throw new Error(`Failed to load ${langCode} translations`);
            }
        } catch (error) {
            console.warn(`Failed to load language ${langCode}:`, error);
            
            // Fallback to embedded translations
            this.loadEmbeddedTranslations(langCode);
        }
    }

    loadEmbeddedTranslations(langCode) {
        // Embedded translations for fallback
        const embeddedTranslations = {
            uk: {
                // Game UI
                'game.title': 'Вгадай Слово',
                'game.start': 'Почати гру',
                'game.settings': 'Налаштування',
                'game.history': 'Історія',
                'game.donate': 'Підтримати проєкт',
                'game.share': 'Поділитися грою',
                
                // Game play
                'game.round': 'Раунд',
                'game.score': 'Рахунок',
                'game.timer': 'Час',
                'game.streak': 'Серія',
                'game.correct': 'Правильно',
                'game.skip': 'Пропустити',
                'game.hint': 'Підказка',
                
                // Categories
                'category.general': 'Загальний',
                'category.technology': 'Технології',
                'category.nature': 'Природа',
                'category.food': 'Їжа',
                'category.professions': 'Професії',
                'category.science': 'Наука',
                'category.art': 'Мистецтво',
                'category.sports': 'Спорт',
                
                // Achievements
                'achievement.first_win': 'Перша перемога',
                'achievement.speed_demon': 'Швидкісний демон',
                'achievement.streak_master': 'Майстер серій',
                'achievement.perfect_round': 'Ідеальний раунд',
                
                // Messages
                'message.game_won': 'Ви виграли!',
                'message.game_lost': 'Ви програли!',
                'message.round_complete': 'Раунд завершено',
                'message.hint_used': 'Підказка використана',
                'message.no_hints': 'Підказки закінчились',
                
                // Speech recognition
                'speech.listening': 'Слухаю...',
                'speech.new_word': 'Нове слово: {word}',
                'speech.hint': 'Підказка: {hint}',
                'speech.hint_format': 'Підказка: перша літера "{hint}", всього {count} літер',
                'speech.score': 'Рахунок: {score}',
                'speech.time_warning': 'Залишилось {seconds} секунд',
                'speech.game_won': 'Ви виграли!',
                'speech.game_lost': 'Гра закінчена',
                'speech.correct_answer': 'Правильно!',
                'speech.streak_bonus': 'Серія {streak}! Бонус!',
                'speech.voice_control': 'Голосове керування',
                'speech.commands': 'Голосові команди: "правильно", "пропустити", "підказка", "повтори"',
                'speech.error.no_speech': 'Мову не розпізнано',
                'speech.error.no_mic': 'Мікрофон недоступний',
                'speech.error.permission': 'Доступ до мікрофона заборонено',
                'speech.error.general': 'Помилка розпізнавання мови',
                
                // Multiplayer
                'multiplayer.waiting': 'Очікування гравців...',
                'multiplayer.connected': 'Підключено до гри',
                'multiplayer.disconnected': 'Втрачено з\'єднання',
                'multiplayer.join_room': 'Приєднатися до кімнати',
                'multiplayer.create_room': 'Створити кімнату',
                'multiplayer.room_code': 'Код кімнати',
                
                // Premium
                'premium.unlock': 'Розблокувати Преміум',
                'premium.benefits': 'Переваги Преміум',
                'premium.no_ads': 'Без реклами',
                'premium.extra_hints': 'Додаткові підказки',
                'premium.exclusive_categories': 'Ексклюзивні категорії',
                
                // Tournament
                'tournament.join': 'Приєднатися до турніру',
                'tournament.leaderboard': 'Таблиця лідерів',
                'tournament.prize': 'Приз',
                'tournament.rank': 'Місце'
            },

            en: {
                // Game UI
                'game.title': 'Guess the Word',
                'game.start': 'Start Game',
                'game.settings': 'Settings',
                'game.history': 'History',
                'game.donate': 'Support Project',
                'game.share': 'Share Game',
                
                // Game play
                'game.round': 'Round',
                'game.score': 'Score',
                'game.timer': 'Time',
                'game.streak': 'Streak',
                'game.correct': 'Correct',
                'game.skip': 'Skip',
                'game.hint': 'Hint',
                
                // Categories
                'category.general': 'General',
                'category.technology': 'Technology',
                'category.nature': 'Nature',
                'category.food': 'Food',
                'category.professions': 'Professions',
                'category.science': 'Science',
                'category.art': 'Art',
                'category.sports': 'Sports',
                
                // Achievements
                'achievement.first_win': 'First Victory',
                'achievement.speed_demon': 'Speed Demon',
                'achievement.streak_master': 'Streak Master',
                'achievement.perfect_round': 'Perfect Round',
                
                // Messages
                'message.game_won': 'You won!',
                'message.game_lost': 'You lost!',
                'message.round_complete': 'Round complete',
                'message.hint_used': 'Hint used',
                'message.no_hints': 'No hints left',
                
                // Speech recognition
                'speech.listening': 'Listening...',
                'speech.new_word': 'New word: {word}',
                'speech.hint': 'Hint: {hint}',
                'speech.hint_format': 'Hint: first letter "{hint}", total {count} letters',
                'speech.score': 'Score: {score}',
                'speech.time_warning': '{seconds} seconds remaining',
                'speech.game_won': 'You won!',
                'speech.game_lost': 'Game over',
                'speech.correct_answer': 'Correct!',
                'speech.streak_bonus': 'Streak {streak}! Bonus!',
                'speech.voice_control': 'Voice Control',
                'speech.commands': 'Voice commands: "correct", "skip", "hint", "repeat"',
                'speech.error.no_speech': 'No speech detected',
                'speech.error.no_mic': 'Microphone not available',
                'speech.error.permission': 'Microphone access denied',
                'speech.error.general': 'Speech recognition error',
                
                // Multiplayer
                'multiplayer.waiting': 'Waiting for players...',
                'multiplayer.connected': 'Connected to game',
                'multiplayer.disconnected': 'Connection lost',
                'multiplayer.join_room': 'Join Room',
                'multiplayer.create_room': 'Create Room',
                'multiplayer.room_code': 'Room Code',
                
                // Premium
                'premium.unlock': 'Unlock Premium',
                'premium.benefits': 'Premium Benefits',
                'premium.no_ads': 'No Ads',
                'premium.extra_hints': 'Extra Hints',
                'premium.exclusive_categories': 'Exclusive Categories',
                
                // Tournament
                'tournament.join': 'Join Tournament',
                'tournament.leaderboard': 'Leaderboard',
                'tournament.prize': 'Prize',
                'tournament.rank': 'Rank'
            },

            ru: {
                // Game UI
                'game.title': 'Угадай Слово',
                'game.start': 'Начать игру',
                'game.settings': 'Настройки',
                'game.history': 'История',
                'game.donate': 'Поддержать проект',
                'game.share': 'Поделиться игрой',
                
                // Game play
                'game.round': 'Раунд',
                'game.score': 'Счёт',
                'game.timer': 'Время',
                'game.streak': 'Серия',
                'game.correct': 'Правильно',
                'game.skip': 'Пропустить',
                'game.hint': 'Подсказка',
                
                // Categories
                'category.general': 'Общие',
                'category.technology': 'Технологии',
                'category.nature': 'Природа',
                'category.food': 'Еда',
                'category.professions': 'Профессии',
                'category.science': 'Наука',
                'category.art': 'Искусство',
                'category.sports': 'Спорт'
            }
        };

        this.translations[langCode] = embeddedTranslations[langCode] || embeddedTranslations[this.fallbackLanguage];
        this.currentLanguage = langCode;
        localStorage.setItem('game_language', langCode);
        
        this.updatePageLanguage();
        this.notifyLanguageChange();
    }

    t(key, params = {}) {
        const translation = this.translations[this.currentLanguage]?.[key] || 
                           this.translations[this.fallbackLanguage]?.[key] || 
                           key;

        // Replace parameters in translation
        return this.interpolate(translation, params);
    }

    interpolate(text, params) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    updatePageLanguage() {
        document.documentElement.lang = this.currentLanguage;
        
        // Update all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update title
        document.title = this.t('game.title');
    }

    notifyLanguageChange() {
        // Dispatch custom event for components to react to language change
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLanguage }
        }));
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getSupportedLanguages() {
        return this.supportedLanguages.map(code => ({
            code,
            name: this.getLanguageName(code),
            nativeName: this.getLanguageNativeName(code)
        }));
    }

    getLanguageName(code) {
        const names = {
            'uk': 'Ukrainian',
            'en': 'English',
            'ru': 'Russian',
            'pl': 'Polish',
            'de': 'German',
            'fr': 'French',
            'es': 'Spanish'
        };
        return names[code] || code;
    }

    getLanguageNativeName(code) {
        const nativeNames = {
            'uk': 'Українська',
            'en': 'English',
            'ru': 'Русский',
            'pl': 'Polski',
            'de': 'Deutsch',
            'fr': 'Français',
            'es': 'Español'
        };
        return nativeNames[code] || code;
    }

    async switchLanguage(langCode) {
        if (langCode === this.currentLanguage) return;
        
        await this.loadLanguage(langCode);
        
        // Track language change
        if (window.gameAnalytics) {
            window.gameAnalytics.trackEvent('language_changed', {
                from: this.currentLanguage,
                to: langCode
            });
        }
    }

    // Helper method for formatting numbers based on locale
    formatNumber(number, options = {}) {
        try {
            const locale = this.getLocale();
            return new Intl.NumberFormat(locale, options).format(number);
        } catch (error) {
            return number.toString();
        }
    }

    // Helper method for formatting dates
    formatDate(date, options = {}) {
        try {
            const locale = this.getLocale();
            return new Intl.DateTimeFormat(locale, options).format(date);
        } catch (error) {
            return date.toString();
        }
    }

    getLocale() {
        const localeMap = {
            'uk': 'uk-UA',
            'en': 'en-US',
            'ru': 'ru-RU',
            'pl': 'pl-PL',
            'de': 'de-DE',
            'fr': 'fr-FR',
            'es': 'es-ES'
        };
        return localeMap[this.currentLanguage] || 'en-US';
    }

    // RTL support for future Arabic/Hebrew languages
    isRTL() {
        const rtlLanguages = ['ar', 'he', 'fa'];
        return rtlLanguages.includes(this.currentLanguage);
    }
}

// Global instance
let localizationManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    localizationManager = new LocalizationManager();
    await localizationManager.init();
    
    // Make available globally
    window.i18n = localizationManager;
    window.t = (key, params) => localizationManager.t(key, params);
});

// Export for modules
if (typeof window !== 'undefined') {
    window.LocalizationManager = LocalizationManager;
}
