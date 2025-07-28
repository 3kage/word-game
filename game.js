// Word Game - Main Game Logic
class WordGame {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.settings = {
            roundDuration: GameConfig.DEFAULT_ROUND_DURATION,
            soundEnabled: GameConfig.SOUNDS.ENABLED,
            difficulty: 'NORMAL',
            selectedCategory: 'Змішаний'
        };
        this.gameState = {
            words: [],
            availableWords: [],
            guessedWordsThisRound: [],
            skippedWordsThisRound: [],
            player1Score: 0,
            player2Score: 0,
            currentRound: 0,
            currentStreak: 0,
            timerInterval: null,
            isGameActive: false
        };
        this.synth = null;
        this.sounds = {};
        this.userCategories = {};
        this.init();
    }

    async init() {
        try {
            if (!this.tg) {
                console.warn('Telegram WebApp not available, running in development mode');
                this.tg = {
                    ready: () => {},
                    CloudStorage: {
                        getItem: (key, callback) => callback(null, localStorage.getItem(key)),
                        setItem: (key, value, callback) => {
                            localStorage.setItem(key, value);
                            callback(null, true);
                        }
                    },
                    showAlert: (message) => alert(message),
                    openInvoice: () => console.log('Invoice functionality not available'),
                    openTelegramLink: (url) => window.open(url, '_blank'),
                    close: () => window.close()
                };
            }
            
            this.tg.ready();
            await this.initializeSounds();
            await this.loadSettings();
            await this.loadUserCategories();
            this.setupEventListeners();
            await this.populateDictionaries();
            this.showLoadingComplete();
        } catch (error) {
            this.showError(GameConfig.ERRORS.GAME_INITIALIZATION_FAILED + ': ' + error.message);
            console.error('Game initialization error:', error);
        }
    }

    async initializeSounds() {
        try {
            if (window.Tone && this.settings.soundEnabled) {
                this.synth = new Tone.Synth().toDestination();
                this.sounds = {
                    correct: () => this.synth.triggerAttackRelease(GameConfig.SOUNDS.NOTES.CORRECT, "8n", Tone.now()),
                    skip: () => this.synth.triggerAttackRelease(GameConfig.SOUNDS.NOTES.SKIP, "8n", Tone.now()),
                    click: () => new Tone.MembraneSynth().toDestination().triggerAttackRelease(GameConfig.SOUNDS.NOTES.CLICK, "8n", Tone.now()),
                    endRound: () => this.synth.triggerAttackRelease(GameConfig.SOUNDS.NOTES.END_ROUND, "4n", Tone.now()),
                    streak: () => new Tone.PolySynth(Tone.Synth).toDestination().triggerAttackRelease(GameConfig.SOUNDS.NOTES.STREAK, "8n")
                };
            }
        } catch (error) {
            console.warn('Sound initialization failed:', error);
            this.settings.soundEnabled = false;
        }
    }

    async loadUserCategories() {
        try {
            return new Promise((resolve) => {
                this.tg.CloudStorage.getItem(GameConfig.STORAGE_KEYS.USER_CATEGORIES, (err, value) => {
                    if (!err && value) {
                        try {
                            this.userCategories = JSON.parse(value);
                        } catch (parseError) {
                            console.warn('Failed to parse user categories:', parseError);
                            this.userCategories = {};
                        }
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.warn('Failed to load user categories:', error);
            this.userCategories = {};
        }
    }

    async saveUserCategories() {
        try {
            return new Promise((resolve, reject) => {
                this.tg.CloudStorage.setItem(
                    GameConfig.STORAGE_KEYS.USER_CATEGORIES, 
                    JSON.stringify(this.userCategories), 
                    (err, success) => {
                        if (err) {
                            reject(new Error(GameConfig.ERRORS.CLOUD_STORAGE_ERROR));
                        } else {
                            resolve(success);
                        }
                    }
                );
            });
        } catch (error) {
            throw new Error(GameConfig.ERRORS.CLOUD_STORAGE_ERROR);
        }
    }
    async loadSettings() {
        try {
            return new Promise((resolve) => {
                this.tg.CloudStorage.getItem(GameConfig.STORAGE_KEYS.SETTINGS, (err, value) => {
                    if (!err && value) {
                        try {
                            const savedSettings = JSON.parse(value);
                            this.settings = { ...this.settings, ...savedSettings };
                            
                            // Apply difficulty settings if set
                            if (this.settings.difficulty && GameConfig.DIFFICULTY_LEVELS[this.settings.difficulty]) {
                                const difficultyConfig = GameConfig.DIFFICULTY_LEVELS[this.settings.difficulty];
                                this.settings.roundDuration = difficultyConfig.roundDuration;
                            }
                        } catch (parseError) {
                            console.warn('Failed to parse saved settings:', parseError);
                        }
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            return new Promise((resolve, reject) => {
                this.tg.CloudStorage.setItem(
                    GameConfig.STORAGE_KEYS.SETTINGS, 
                    JSON.stringify(this.settings), 
                    (err, success) => {
                        if (err) {
                            reject(new Error(GameConfig.ERRORS.SETTINGS_SAVE_FAILED));
                        } else {
                            resolve(success);
                        }
                    }
                );
            });
        } catch (error) {
            throw new Error(GameConfig.ERRORS.SETTINGS_SAVE_FAILED);
        }
    }

    setupEventListeners() {
        const startButton = document.getElementById('start-button');
        const historyButton = document.getElementById('history-button');
        const settingsButton = document.getElementById('settings-button');
        const shareButton = document.getElementById('share-button');
        const donateScreenBtn = document.getElementById('donate-screen-btn');

        if (startButton) startButton.addEventListener('click', () => this.startGame());
        if (historyButton) historyButton.addEventListener('click', () => this.showHistory());
        if (settingsButton) settingsButton.addEventListener('click', () => this.showSettings());
        if (shareButton) shareButton.addEventListener('click', () => this.shareBot());
        if (donateScreenBtn) donateScreenBtn.addEventListener('click', () => this.showDonate());
    }

    async populateDictionaries() {
        try {
            if (typeof wordDictionaries === 'undefined') {
                throw new Error(GameConfig.ERRORS.DICTIONARY_NOT_LOADED);
            }

            const dictionarySelect = document.getElementById('dictionary-select');
            if (!dictionarySelect) return;

            // Show loading state
            dictionarySelect.innerHTML = '<option>Завантаження...</option>';
            
            // Simulate loading delay for better UX
            await this.delay(GameConfig.UI.LOADING_DELAY);
            
            dictionarySelect.innerHTML = '';
            
            // Add mixed option
            const mixedOption = this.createElement('option', {
                value: "Змішаний",
                textContent: "🎲 Змішаний (Всі категорії)"
            });
            dictionarySelect.appendChild(mixedOption);

            // Add default category options
            for (const category in wordDictionaries) {
                const option = this.createElement('option', {
                    value: category,
                    textContent: `📚 ${category}`
                });
                dictionarySelect.appendChild(option);
            }

            // Add user categories if any
            if (Object.keys(this.userCategories).length > 0) {
                const separator = this.createElement('option', {
                    disabled: true,
                    textContent: '─── Мої категорії ───'
                });
                dictionarySelect.appendChild(separator);

                for (const category in this.userCategories) {
                    const option = this.createElement('option', {
                        value: `user_${category}`,
                        textContent: `👤 ${category}`
                    });
                    dictionarySelect.appendChild(option);
                }
            }

            // Set previously selected category
            if (this.settings.selectedCategory) {
                dictionarySelect.value = this.settings.selectedCategory;
            }
        } catch (error) {
            this.showError(error.message);
        }
    }

    createElement(tag, attributes = {}) {
        const element = document.createElement(tag);
        Object.keys(attributes).forEach(key => {
            if (key === 'textContent') {
                element.textContent = attributes[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attributes[key];
            } else if (key === 'className') {
                element.className = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        return element;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    playSound(soundName) {
        if (this.settings.soundEnabled && this.sounds[soundName]) {
            try {
                this.sounds[soundName]();
            } catch (error) {
                console.warn('Sound playback failed:', error);
            }
        }
    }

    showError(message) {
        // Create or update error display
        let errorDiv = document.getElementById('error-message');
        if (!errorDiv) {
            errorDiv = this.createElement('div', {
                id: 'error-message',
                className: 'error-message'
            });
            document.querySelector('.card').appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    showSuccess(message) {
        let successDiv = document.getElementById('success-message');
        if (!successDiv) {
            successDiv = this.createElement('div', {
                id: 'success-message',
                className: 'success-message'
            });
            document.querySelector('.card').appendChild(successDiv);
        }
        successDiv.textContent = message;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    showLoadingComplete() {
        // Remove any loading indicators
        const loadingElements = document.querySelectorAll('.loading-spinner');
        loadingElements.forEach(el => el.remove());
    }

    startGame() {
        try {
            this.playSound('click');
            const selectedCategory = document.getElementById('dictionary-select').value;
            
            // Save selected category to settings
            this.settings.selectedCategory = selectedCategory;
            this.saveSettings().catch(console.warn);
            
            if (selectedCategory === "Змішаний") {
                // Combine all default categories
                this.gameState.words = Object.values(wordDictionaries).flat();
                
                // Add user categories if any
                if (Object.keys(this.userCategories).length > 0) {
                    const userWords = Object.values(this.userCategories).flat();
                    this.gameState.words = this.gameState.words.concat(userWords);
                }
            } else if (selectedCategory.startsWith('user_')) {
                // User category
                const categoryName = selectedCategory.replace('user_', '');
                this.gameState.words = [...(this.userCategories[categoryName] || [])];
            } else {
                // Default category
                this.gameState.words = [...wordDictionaries[selectedCategory]];
            }
            
            if (this.gameState.words.length === 0) {
                throw new Error('Вибрана категорія порожня!');
            }
            
            this.gameState.player1Score = 0;
            this.gameState.player2Score = 0;
            this.gameState.currentRound = 0;
            this.gameState.isGameActive = true;
            
            this.startNextRound();
        } catch (error) {
            this.showError('Помилка запуску гри: ' + error.message);
        }
    }

    startNextRound() {
        try {
            this.gameState.currentRound++;
            this.gameState.availableWords = [...this.gameState.words];
            this.gameState.guessedWordsThisRound = [];
            this.gameState.skippedWordsThisRound = [];
            this.gameState.currentStreak = 0;
            
            const gameScreen = this.createGameScreen();
            this.showScreen(gameScreen);
            
            this.setupGameEventListeners();
            this.updateScores();
            this.nextWord();
            this.startTimer();
            this.updateTurnIndicator();
        } catch (error) {
            this.showError('Помилка створення раунду: ' + error.message);
        }
    }

    createGameScreen() {
        const gameScreen = this.createElement('div', {
            className: 'card hidden-screen',
            id: 'game-screen'
        });

        gameScreen.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-semibold text-gray-700">Раунд ${this.gameState.currentRound}</h2>
                <button id="exit-game-btn" class="text-sm font-semibold text-indigo-600 hover:text-indigo-800" 
                        aria-label="Вийти з гри">Вийти</button>
            </div>
            <div class="flex justify-between items-center mb-4">
                <div class="text-center w-1/3">
                    <span class="text-sm text-gray-500">Гравець 1</span>
                    <p id="player1-score" class="text-3xl font-bold text-indigo-600 transition-transform" 
                       aria-label="Рахунок гравця 1">${this.gameState.player1Score}</p>
                </div>
                <div class="text-center w-1/3">
                    <span class="text-sm text-gray-500">Час</span>
                    <p id="timer" class="text-3xl font-bold text-red-500" 
                       aria-label="Час що залишився" aria-live="polite">${this.settings.roundDuration}</p>
                </div>
                <div class="text-center w-1/3">
                    <span class="text-sm text-gray-500">Гравець 2</span>
                    <p id="player2-score" class="text-3xl font-bold text-teal-600 transition-transform" 
                       aria-label="Рахунок гравця 2">${this.gameState.player2Score}</p>
                </div>
            </div>
            <div id="turn-indicator" class="text-center bg-gray-100 p-2 rounded-lg mb-6 text-gray-700 font-semibold" 
                 aria-live="polite"></div>
            <div class="text-center my-6 p-6 bg-indigo-50 rounded-lg min-h-[120px] flex items-center justify-center">
                <h2 id="word-to-guess" class="text-3xl md:text-4xl font-bold text-gray-800 tracking-wider word-display" 
                    aria-label="Слово для відгадування">СЛОВО</h2>
            </div>
            <div id="streak-indicator" class="text-center text-amber-500 font-bold h-6" aria-live="polite"></div>
            <div class="mt-2">
                <div class="grid grid-cols-2 gap-4 mt-4">
                    <button id="correct-button" class="btn btn-primary bg-green-500 hover:bg-green-600" 
                            aria-label="Відмітити як правильну відповідь">Правильно!</button>
                    <button id="skip-button" class="btn btn-secondary" 
                            aria-label="Пропустити це слово">Пропустити</button>
                </div>
            </div>
        `;

        return gameScreen;
    }

    setupGameEventListeners() {
        const exitBtn = document.getElementById('exit-game-btn');
        const correctBtn = document.getElementById('correct-button');
        const skipBtn = document.getElementById('skip-button');

        if (exitBtn) exitBtn.addEventListener('click', () => this.backToStart());
        if (correctBtn) correctBtn.addEventListener('click', () => this.handleCorrectGuess());
        if (skipBtn) skipBtn.addEventListener('click', () => this.handleSkip());

        // Add keyboard support for game controls
        this.gameKeyboardHandler = (e) => {
            if (!this.gameState.isGameActive) return;
            
            switch(e.key) {
                case 'ArrowRight':
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.handleCorrectGuess();
                    break;
                case 'ArrowLeft':
                case 'Escape':
                    e.preventDefault();
                    this.handleSkip();
                    break;
                case 'q':
                case 'Q':
                    e.preventDefault();
                    this.backToStart();
                    break;
            }
        };

        document.addEventListener('keydown', this.gameKeyboardHandler);
    }

    showScreen(screenElement) {
        const startScreen = document.getElementById('start-screen');
        const screenContainer = document.getElementById('screen-container');
        
        if (startScreen) {
            startScreen.classList.remove('visible-screen');
            startScreen.classList.add('hidden-screen');
        }
        
        screenContainer.innerHTML = '';
        screenContainer.appendChild(screenElement);
        
        setTimeout(() => {
            screenElement.classList.remove('hidden-screen');
            screenElement.classList.add('visible-screen');
        }, GameConfig.UI.SCREEN_TRANSITION_DELAY);
    }

    backToStart() {
        this.playSound('click');
        this.clearTimer();
        this.gameState.isGameActive = false;
        
        // Remove keyboard event listener
        if (this.gameKeyboardHandler) {
            document.removeEventListener('keydown', this.gameKeyboardHandler);
            this.gameKeyboardHandler = null;
        }
        
        const currentScreen = document.querySelector('#screen-container .visible-screen');
        const startScreen = document.getElementById('start-screen');
        
        if (currentScreen) {
            currentScreen.classList.remove('visible-screen');
            currentScreen.classList.add('hidden-screen');
        }
        
        if (startScreen) {
            startScreen.classList.remove('hidden-screen');
            startScreen.classList.add('visible-screen');
        }
        
        setTimeout(() => {
            document.getElementById('screen-container').innerHTML = '';
        }, 500);
    }

    clearTimer() {
        if (this.gameState.timerInterval) {
            clearInterval(this.gameState.timerInterval);
            this.gameState.timerInterval = null;
        }
    }

    // Additional methods will be implemented in the next iteration
    handleCorrectGuess() {
        this.playSound('correct');
        this.gameState.currentStreak++;
        
        const word = document.getElementById('word-to-guess').textContent;
        if (word !== "Слова скінчились!") {
            this.gameState.guessedWordsThisRound.push(word);
            
            if (this.gameState.currentRound % 2 !== 0) {
                this.gameState.player1Score++;
            } else {
                this.gameState.player2Score++;
            }
            
            // Check for streak bonus using current difficulty settings
            const currentDifficulty = GameConfig.DIFFICULTY_LEVELS[this.settings.difficulty] || GameConfig.DIFFICULTY_LEVELS.NORMAL;
            const streakThreshold = currentDifficulty.streakBonus;
            
            if (this.gameState.currentStreak > 0 && this.gameState.currentStreak % streakThreshold === 0) {
                this.playSound('streak');
                if (this.gameState.currentRound % 2 !== 0) {
                    this.gameState.player1Score++;
                } else {
                    this.gameState.player2Score++;
                }
                
                const streakIndicator = document.getElementById('streak-indicator');
                if (streakIndicator) {
                    streakIndicator.textContent = `Серія ${this.gameState.currentStreak}! +1 бонус!`;
                    streakIndicator.setAttribute('aria-live', 'polite');
                    setTimeout(() => streakIndicator.textContent = '', 2000);
                }
            }
        }
        
        this.updateScores();
        this.nextWord();
    }

    handleSkip() {
        this.playSound('skip');
        this.gameState.currentStreak = 0;
        
        const word = document.getElementById('word-to-guess').textContent;
        if (word !== "Слова скінчились!") {
            this.gameState.skippedWordsThisRound.push(word);
        }
        
        this.nextWord();
    }

    updateScores() {
        const p1Element = document.getElementById('player1-score');
        const p2Element = document.getElementById('player2-score');
        
        if (p1Element && p1Element.textContent !== String(this.gameState.player1Score)) {
            p1Element.classList.add('pop-animation');
        }
        if (p2Element && p2Element.textContent !== String(this.gameState.player2Score)) {
            p2Element.classList.add('pop-animation');
        }
        
        if (p1Element) p1Element.textContent = this.gameState.player1Score;
        if (p2Element) p2Element.textContent = this.gameState.player2Score;
        
        setTimeout(() => {
            if (p1Element) p1Element.classList.remove('pop-animation');
            if (p2Element) p2Element.classList.remove('pop-animation');
        }, GameConfig.UI.ANIMATION_DURATION);
    }

    startTimer() {
        let timer = this.settings.roundDuration;
        const timerDisplay = document.getElementById('timer');
        
        if (timerDisplay) timerDisplay.textContent = timer;
        
        this.clearTimer();
        this.gameState.timerInterval = setInterval(() => {
            timer--;
            if (timerDisplay) timerDisplay.textContent = timer;
            
            if (timer <= 0) {
                this.playSound('endRound');
                this.clearTimer();
                this.showRoundSummary();
            }
        }, 1000);
    }

    updateTurnIndicator() {
        const turnIndicator = document.getElementById('turn-indicator');
        if (!turnIndicator) return;
        
        if (this.gameState.currentRound % 2 !== 0) {
            turnIndicator.innerHTML = `<span>Описує: <b>Гравець 1</b></span> | <span>Відгадує: <b>Гравець 2</b></span>`;
        } else {
            turnIndicator.innerHTML = `<span>Описує: <b>Гравець 2</b></span> | <span>Відгадує: <b>Гравець 1</b></span>`;
        }
    }

    nextWord() {
        const wordToGuessDisplay = document.getElementById('word-to-guess');
        if (!wordToGuessDisplay) return;
        
        if (this.gameState.availableWords.length === 0) {
            wordToGuessDisplay.textContent = "Слова скінчились!";
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * this.gameState.availableWords.length);
        wordToGuessDisplay.textContent = this.gameState.availableWords[randomIndex];
        this.gameState.availableWords.splice(randomIndex, 1);
    }

    showRoundSummary() {
        this.clearTimer();
        
        const guessedHtml = this.gameState.guessedWordsThisRound.length > 0 
            ? this.gameState.guessedWordsThisRound.map(w => `<li class="text-green-600">${w}</li>`).join('') 
            : '<li class="text-gray-400">Немає</li>';
            
        const skippedHtml = this.gameState.skippedWordsThisRound.length > 0 
            ? this.gameState.skippedWordsThisRound.map(w => `<li class="text-red-500">${w}</li>`).join('') 
            : '<li class="text-gray-400">Немає</li>';

        const summaryScreen = this.createElement('div', {
            className: 'card hidden-screen',
            id: 'summary-screen'
        });

        summaryScreen.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-4 text-center">Підсумки раунду ${this.gameState.currentRound}</h2>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h3 class="font-semibold mb-2">✅ Відгадано (${this.gameState.guessedWordsThisRound.length})</h3>
                    <ul class="space-y-1 text-sm max-h-40 overflow-y-auto">${guessedHtml}</ul>
                </div>
                <div>
                    <h3 class="font-semibold mb-2">❌ Пропущено (${this.gameState.skippedWordsThisRound.length})</h3>
                    <ul class="space-y-1 text-sm max-h-40 overflow-y-auto">${skippedHtml}</ul>
                </div>
            </div>
            <button id="continue-from-summary-btn" class="btn btn-primary w-full text-lg mt-6">Далі</button>
        `;

        this.showScreen(summaryScreen);
        
        const continueBtn = document.getElementById('continue-from-summary-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.playSound('click');
                this.endRound();
            });
        }
    }

    endRound() {
        if (this.gameState.currentRound < GameConfig.TOTAL_ROUNDS) {
            this.showRoundEndScreen();
        } else {
            this.endGame();
        }
    }

    showRoundEndScreen() {
        const roundEndScreen = this.createElement('div', {
            className: 'card text-center hidden-screen',
            id: 'round-end-screen'
        });

        roundEndScreen.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-2">Раунд завершено!</h2>
            <p class="text-gray-600 mb-6">Поточний рахунок:</p>
            <div class="flex justify-around items-center mb-8">
                <div class="text-center">
                    <span class="text-lg text-gray-500">Гравець 1</span>
                    <p class="text-5xl font-bold text-indigo-600">${this.gameState.player1Score}</p>
                </div>
                <div class="text-center">
                    <span class="text-lg text-gray-500">Гравець 2</span>
                    <p class="text-5xl font-bold text-teal-600">${this.gameState.player2Score}</p>
                </div>
            </div>
            <p class="text-gray-600 mb-8">Далі описує Гравець ${this.gameState.currentRound === 1 ? 2 : 1}.</p>
            <button id="next-round-button" class="btn btn-primary w-full text-lg">Наступний раунд</button>
            <button id="reset-round-btn" class="btn btn-secondary w-full text-lg mt-3">Скинути і вийти</button>
        `;

        this.showScreen(roundEndScreen);
        
        const nextRoundBtn = document.getElementById('next-round-button');
        const resetBtn = document.getElementById('reset-round-btn');
        
        if (nextRoundBtn) {
            nextRoundBtn.addEventListener('click', () => {
                this.playSound('click');
                this.startNextRound();
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.backToStart());
        }
    }

    endGame() {
        let winnerText = '';
        if (this.gameState.player1Score > this.gameState.player2Score) {
            winnerText = '🎉 Переміг Гравець 1! 🎉';
        } else if (this.gameState.player2Score > this.gameState.player1Score) {
            winnerText = '🎉 Переміг Гравець 2! 🎉';
        } else {
            winnerText = '🤝 Нічия! 🤝';
        }

        const endScreen = this.createElement('div', {
            className: 'card text-center hidden-screen',
            id: 'end-screen'
        });

        const winnerClass = this.gameState.player1Score > this.gameState.player2Score ? 'text-indigo-600' 
            : (this.gameState.player2Score > this.gameState.player1Score ? 'text-teal-600' : 'text-gray-600');

        endScreen.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-2">Гру завершено!</h2>
            <p class="text-2xl font-semibold ${winnerClass} mb-6">${winnerText}</p>
            <p class="text-gray-600 mb-4">Фінальний рахунок:</p>
            <div class="flex justify-around items-center mb-8">
                <div class="text-center">
                    <span class="text-lg text-gray-500">Гравець 1</span>
                    <p class="text-5xl font-bold text-indigo-600">${this.gameState.player1Score}</p>
                </div>
                <div class="text-center">
                    <span class="text-lg text-gray-500">Гравець 2</span>
                    <p class="text-5xl font-bold text-teal-600">${this.gameState.player2Score}</p>
                </div>
            </div>
            <button id="restart-button" class="btn btn-primary w-full text-lg">Грати знову</button>
        `;

        this.showScreen(endScreen);
        
        const restartBtn = document.getElementById('restart-button');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.backToStart());
        }
        
        this.saveResult(winnerText);
    }

    async saveResult(winnerText) {
        try {
            const result = {
                date: new Date().toISOString(),
                p1Score: this.gameState.player1Score,
                p2Score: this.gameState.player2Score,
                winner: winnerText
            };

            return new Promise((resolve) => {
                this.tg.CloudStorage.getItem(GameConfig.STORAGE_KEYS.HISTORY, (err, value) => {
                    if (err) {
                        console.error('Error getting history:', err);
                        resolve();
                        return;
                    }

                    let history = value ? JSON.parse(value) : [];
                    history.push(result);
                    
                    if (history.length > GameConfig.MAX_HISTORY_ENTRIES) {
                        history = history.slice(history.length - GameConfig.MAX_HISTORY_ENTRIES);
                    }

                    this.tg.CloudStorage.setItem(GameConfig.STORAGE_KEYS.HISTORY, JSON.stringify(history), (err, success) => {
                        if (err) {
                            console.error('Error saving history:', err);
                        }
                        resolve();
                    });
                });
            });
        } catch (error) {
            console.error('Failed to save result:', error);
        }
    }

    showHistory() {
        this.playSound('click');
        
        const historyScreen = this.createElement('div', {
            className: 'card hidden-screen',
            id: 'history-screen'
        });

        historyScreen.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">Історія ігор</h2>
                <button id="close-history-button" class="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
            </div>
            <div id="history-list" class="space-y-3 max-h-96 overflow-y-auto">
                <div class="loading-spinner"></div>
            </div>
        `;

        this.showScreen(historyScreen);
        
        const closeBtn = document.getElementById('close-history-button');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.backToStart());
        }
        
        this.loadHistory();
    }

    loadHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        this.tg.CloudStorage.getItem(GameConfig.STORAGE_KEYS.HISTORY, (err, value) => {
            if (err) {
                historyList.innerHTML = '<p class="text-red-500">Не вдалося завантажити історію.</p>';
                return;
            }

            const history = value ? JSON.parse(value) : [];
            
            if (history.length === 0) {
                historyList.innerHTML = '<p class="text-gray-500 text-center">Історії ігор ще немає.</p>';
            } else {
                historyList.innerHTML = '';
                history.reverse().forEach(game => {
                    const date = new Date(game.date).toLocaleString('uk-UA', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const item = this.createElement('div', {
                        className: 'bg-gray-50 p-4 rounded-lg'
                    });
                    
                    item.innerHTML = `
                        <p class="font-semibold text-gray-700">${game.winner}</p>
                        <p class="text-sm text-gray-500">Рахунок: ${game.p1Score} - ${game.p2Score}</p>
                        <p class="text-xs text-gray-400 mt-1">${date}</p>
                    `;
                    
                    historyList.appendChild(item);
                });
            }
        });
    }

    showSettings() {
        this.playSound('click');
        
        const settingsScreen = this.createElement('div', {
            className: 'card hidden-screen',
            id: 'settings-screen'
        });

        const difficultyOptions = Object.keys(GameConfig.DIFFICULTY_LEVELS).map(key => {
            const level = GameConfig.DIFFICULTY_LEVELS[key];
            const selected = this.settings.difficulty === key ? 'selected' : '';
            return `<option value="${key}" ${selected}>${level.name} - ${level.description}</option>`;
        }).join('');

        settingsScreen.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Налаштування</h2>
            
            <div class="mb-6">
                <label for="difficulty-select" class="block mb-2 text-sm font-medium text-gray-700">
                    Рівень складності:
                </label>
                <select id="difficulty-select" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5">
                    ${difficultyOptions}
                </select>
            </div>
            
            <div class="mb-6">
                <label for="time-slider" class="block mb-2 text-sm font-medium text-gray-700">
                    Час раунду: <span id="time-value" class="font-bold text-indigo-600">${this.settings.roundDuration}</span> сек
                </label>
                <input id="time-slider" type="range" min="30" max="120" value="${this.settings.roundDuration}" step="15" 
                       class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
            </div>
            
            <div class="mb-6">
                <label class="flex items-center">
                    <input type="checkbox" id="sound-toggle" ${this.settings.soundEnabled ? 'checked' : ''} 
                           class="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                    <span class="text-sm font-medium text-gray-700">Увімкнути звуки</span>
                </label>
            </div>
            
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-3">Власні категорії</h3>
                <button id="manage-categories-btn" class="btn btn-secondary w-full text-base">
                    Керувати категоріями (${Object.keys(this.userCategories).length})
                </button>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <button id="save-settings-button" class="btn btn-primary text-lg">Зберегти</button>
                <button id="cancel-settings-button" class="btn btn-secondary text-lg">Скасувати</button>
            </div>
        `;

        this.showScreen(settingsScreen);
        
        const difficultySelect = document.getElementById('difficulty-select');
        const timeSlider = document.getElementById('time-slider');
        const timeValue = document.getElementById('time-value');
        const soundToggle = document.getElementById('sound-toggle');
        const manageCategoriesBtn = document.getElementById('manage-categories-btn');
        const saveBtn = document.getElementById('save-settings-button');
        const cancelBtn = document.getElementById('cancel-settings-button');
        
        // Update round duration when difficulty changes
        if (difficultySelect) {
            difficultySelect.addEventListener('change', (e) => {
                const selectedDifficulty = GameConfig.DIFFICULTY_LEVELS[e.target.value];
                if (selectedDifficulty) {
                    timeSlider.value = selectedDifficulty.roundDuration;
                    timeValue.textContent = selectedDifficulty.roundDuration;
                }
            });
        }
        
        if (timeSlider && timeValue) {
            timeSlider.addEventListener('input', (e) => {
                timeValue.textContent = e.target.value;
            });
        }
        
        if (manageCategoriesBtn) {
            manageCategoriesBtn.addEventListener('click', () => this.showCategoryManager());
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                try {
                    this.settings.difficulty = difficultySelect.value;
                    this.settings.roundDuration = parseInt(timeSlider.value, 10);
                    this.settings.soundEnabled = soundToggle.checked;
                    
                    await this.saveSettings();
                    this.showSuccess(GameConfig.MESSAGES.SETTINGS_SAVED);
                    
                    setTimeout(() => {
                        this.backToStart();
                    }, 1000);
                } catch (error) {
                    this.showError('Помилка збереження налаштувань: ' + error.message);
                }
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.backToStart());
        }
    }

    showDonate() {
        this.playSound('click');
        
        const donateScreen = this.createElement('div', {
            className: 'card hidden-screen',
            id: 'donate-screen'
        });

        donateScreen.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-4 text-center">Підтримка розробника</h2>
            <p class="text-gray-600 text-center mb-6">
                Ваш донат допоможе мені підтримувати та покращувати гру. 
                Платежі приймаються в криптовалюті (USDT). Дякую!
            </p>
            <div class="space-y-3">
                ${GameConfig.PAYMENT.DONATION_AMOUNTS.map(amount => 
                    `<button class="donate-btn btn btn-secondary w-full" data-amount="${amount}">
                        Підтримати на ${amount} USDT
                    </button>`
                ).join('')}
            </div>
            <button id="back-from-donate" class="btn btn-primary w-full mt-6">Назад</button>
        `;

        this.showScreen(donateScreen);
        
        const backBtn = document.getElementById('back-from-donate');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.backToStart());
        }
        
        const donateButtons = document.querySelectorAll('.donate-btn');
        donateButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.playSound('click');
                const amount = parseInt(button.dataset.amount, 10);
                this.sendInvoice(amount);
            });
        });
    }

    showCategoryManager() {
        this.playSound('click');
        
        const managerScreen = this.createElement('div', {
            className: 'card hidden-screen',
            id: 'category-manager-screen'
        });

        const categoriesList = Object.keys(this.userCategories).map(categoryName => {
            const wordCount = this.userCategories[categoryName].length;
            return `
                <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                    <div>
                        <h4 class="font-medium text-gray-800">${categoryName}</h4>
                        <p class="text-sm text-gray-500">${wordCount} слів</p>
                    </div>
                    <div class="flex gap-2">
                        <button class="edit-category-btn text-indigo-600 hover:text-indigo-800 text-sm" data-category="${categoryName}">
                            Редагувати
                        </button>
                        <button class="delete-category-btn text-red-600 hover:text-red-800 text-sm" data-category="${categoryName}">
                            Видалити
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        managerScreen.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">Мої категорії</h2>
                <button id="close-manager-button" class="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
            </div>
            
            <div class="mb-6">
                <button id="create-category-btn" class="btn btn-primary w-full text-lg">+ Створити нову категорію</button>
            </div>
            
            <div id="categories-list" class="space-y-3 max-h-96 overflow-y-auto">
                ${categoriesList.length > 0 ? categoriesList : '<p class="text-gray-500 text-center">Ще немає власних категорій</p>'}
            </div>
        `;

        this.showScreen(managerScreen);
        
        const closeBtn = document.getElementById('close-manager-button');
        const createBtn = document.getElementById('create-category-btn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.showSettings());
        }
        
        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCategoryEditor());
        }
        
        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const categoryName = e.target.dataset.category;
                this.showCategoryEditor(categoryName);
            });
        });
        
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const categoryName = e.target.dataset.category;
                this.deleteCategory(categoryName);
            });
        });
    }

    showCategoryEditor(editCategoryName = null) {
        this.playSound('click');
        
        const isEditing = !!editCategoryName;
        const categoryData = isEditing ? this.userCategories[editCategoryName] : [];
        
        const editorScreen = this.createElement('div', {
            className: 'card hidden-screen',
            id: 'category-editor-screen'
        });

        editorScreen.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    ${isEditing ? 'Редагувати категорію' : 'Створити категорію'}
                </h2>
                <button id="close-editor-button" class="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
            </div>
            
            <div class="mb-4">
                <label for="category-name" class="block mb-2 text-sm font-medium text-gray-700">Назва категорії:</label>
                <input type="text" id="category-name" value="${editCategoryName || ''}" 
                       maxlength="${GameConfig.VALIDATION.MAX_CATEGORY_NAME_LENGTH}"
                       class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                       placeholder="Введіть назву категорії">
            </div>
            
            <div class="mb-4">
                <label for="category-words" class="block mb-2 text-sm font-medium text-gray-700">
                    Слова (по одному на рядок, мінімум ${GameConfig.VALIDATION.MIN_WORDS_PER_CATEGORY}):
                </label>
                <textarea id="category-words" rows="8" 
                          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                          placeholder="Введіть слова, кожне на новому рядку">${categoryData.join('\n')}</textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <button id="save-category-button" class="btn btn-primary text-lg">
                    ${isEditing ? 'Оновити' : 'Створити'}
                </button>
                <button id="cancel-editor-button" class="btn btn-secondary text-lg">Скасувати</button>
            </div>
        `;

        this.showScreen(editorScreen);
        
        const closeBtn = document.getElementById('close-editor-button');
        const saveBtn = document.getElementById('save-category-button');
        const cancelBtn = document.getElementById('cancel-editor-button');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.showCategoryManager());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.showCategoryManager());
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCategory(editCategoryName));
        }
    }

    async saveCategory(editCategoryName = null) {
        try {
            const nameInput = document.getElementById('category-name');
            const wordsInput = document.getElementById('category-words');
            
            const categoryName = nameInput.value.trim();
            const wordsText = wordsInput.value.trim();
            
            // Validation
            if (!categoryName) {
                throw new Error('Введіть назву категорії');
            }
            
            if (categoryName.length > GameConfig.VALIDATION.MAX_CATEGORY_NAME_LENGTH) {
                throw new Error(`Назва категорії занадто довга (максимум ${GameConfig.VALIDATION.MAX_CATEGORY_NAME_LENGTH} символів)`);
            }
            
            if (!editCategoryName && this.userCategories[categoryName]) {
                throw new Error(GameConfig.ERRORS.CATEGORY_EXISTS);
            }
            
            const words = wordsText.split('\n')
                .map(word => word.trim())
                .filter(word => word.length > 0)
                .filter(word => word.length <= GameConfig.VALIDATION.MAX_WORD_LENGTH);
            
            if (words.length < GameConfig.VALIDATION.MIN_WORDS_PER_CATEGORY) {
                throw new Error(GameConfig.ERRORS.TOO_FEW_WORDS);
            }
            
            if (words.length > GameConfig.VALIDATION.MAX_WORDS_PER_CATEGORY) {
                throw new Error(`Занадто багато слів (максимум ${GameConfig.VALIDATION.MAX_WORDS_PER_CATEGORY})`);
            }
            
            // Remove old category if editing with different name
            if (editCategoryName && editCategoryName !== categoryName) {
                delete this.userCategories[editCategoryName];
            }
            
            // Save new/updated category
            this.userCategories[categoryName] = words;
            
            await this.saveUserCategories();
            await this.populateDictionaries(); // Refresh the dictionary dropdown
            
            this.showSuccess(editCategoryName ? GameConfig.MESSAGES.CATEGORY_UPDATED : GameConfig.MESSAGES.CATEGORY_CREATED);
            
            setTimeout(() => {
                this.showCategoryManager();
            }, 1000);
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteCategory(categoryName) {
        try {
            if (confirm(`Ви впевнені, що хочете видалити категорію "${categoryName}"?`)) {
                delete this.userCategories[categoryName];
                await this.saveUserCategories();
                await this.populateDictionaries(); // Refresh the dictionary dropdown
                
                this.showSuccess(GameConfig.MESSAGES.CATEGORY_DELETED);
                this.showCategoryManager(); // Refresh the manager
            }
        } catch (error) {
            this.showError('Помилка видалення категорії: ' + error.message);
        }
    }

    sendInvoice(amount) {
        try {
            const providerToken = GameConfig.PAYMENT.PROVIDER_TOKEN;
            
            if (!providerToken || providerToken === 'YOUR_PROVIDER_TOKEN') {
                this.tg.showAlert(GameConfig.ERRORS.PAYMENT_NOT_CONFIGURED);
                return;
            }

            const amountInSmallestUnits = amount * 1000000;
            const invoice = {
                title: 'Донат на розвиток гри',
                description: 'Ваша підтримка дуже важлива для мене!',
                payload: `donate-wordgame-${Date.now()}-${amount}`,
                provider_token: providerToken,
                currency: GameConfig.PAYMENT.CURRENCY,
                prices: [{ 
                    label: `Донат ${amount} USDT`, 
                    amount: amountInSmallestUnits 
                }]
            };

            this.tg.openInvoice(invoice, (status) => {
                if (status === 'paid') {
                    this.tg.showAlert(GameConfig.MESSAGES.PAYMENT_SUCCESS);
                    this.tg.close();
                } else if (status === 'failed') {
                    this.tg.showAlert('На жаль, платіж не вдався. Спробуйте ще раз.');
                }
            });
        } catch (error) {
            this.showError('Помилка обробки платежу: ' + error.message);
        }
    }

    shareBot() {
        try {
            this.playSound('click');
            const botUsername = GameConfig.BOT.USERNAME;
            const shareText = "Привіт! Запрошую тебе зіграти у захоплюючу гру 'Вгадай Слово' прямо в Telegram!";
            const urlToShare = `https://t.me/${botUsername}`;
            const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(urlToShare)}&text=${encodeURIComponent(shareText)}`;
            
            this.tg.openTelegramLink(telegramShareUrl);
            this.showSuccess(GameConfig.MESSAGES.GAME_SHARED);
        } catch (error) {
            this.showError('Помилка поділу гри: ' + error.message);
        }
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wordGame = new WordGame();
});