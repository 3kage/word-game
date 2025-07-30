// Firebase Game Integration
// Інтеграція Firebase мультиплеєра з основною грою

class FirebaseGameIntegration {
    constructor(wordGame) {
        this.wordGame = wordGame;
        this.firebaseManager = null;
        this.isMultiplayerMode = false;
        this.isHost = false;
        this.opponentId = null;
        this.gameSync = null;
        
        this.init();
    }

    async init() {
        try {
            // Перевіряємо чи Firebase увімкнено
            if (!window.EnvironmentConfig?.isFirebaseEnabled()) {
                console.log('Firebase integration disabled');
                return;
            }

            // Ініціалізуємо Firebase manager
            this.firebaseManager = new FirebaseMultiplayerManager();
            
            // Налаштовуємо event listeners
            this.setupEventListeners();
            
            console.log('Firebase game integration initialized');
        } catch (error) {
            console.error('Failed to initialize Firebase integration:', error);
        }
    }

    setupEventListeners() {
        if (!this.firebaseManager) return;

        // Firebase events
        this.firebaseManager.on('gameStarted', (data) => {
            this.onGameStarted(data);
        });

        this.firebaseManager.on('gameAction', (data) => {
            this.onGameAction(data);
        });

        this.firebaseManager.on('gameStateUpdated', (data) => {
            this.onGameStateUpdated(data);
        });

        this.firebaseManager.on('playersUpdated', (data) => {
            this.onPlayersUpdated(data);
        });

        // Game events
        if (this.wordGame) {
            // Перехоплюємо події гри для синхронізації
            this.setupGameEventInterception();
        }
    }

    setupGameEventInterception() {
        // Зберігаємо оригінальні методи
        const originalMethods = {
            correctWord: this.wordGame.correctWord?.bind(this.wordGame),
            skipWord: this.wordGame.skipWord?.bind(this.wordGame),
            endGame: this.wordGame.endGame?.bind(this.wordGame),
            startGame: this.wordGame.startGame?.bind(this.wordGame)
        };

        // Перехоплюємо метод правильної відповіді
        if (this.wordGame.correctWord) {
            this.wordGame.correctWord = (...args) => {
                const result = originalMethods.correctWord(...args);
                
                if (this.isMultiplayerMode) {
                    this.syncCorrectWord(...args);
                }
                
                return result;
            };
        }

        // Перехоплюємо метод пропуску слова
        if (this.wordGame.skipWord) {
            this.wordGame.skipWord = (...args) => {
                const result = originalMethods.skipWord(...args);
                
                if (this.isMultiplayerMode) {
                    this.syncSkipWord(...args);
                }
                
                return result;
            };
        }

        // Перехоплюємо завершення гри
        if (this.wordGame.endGame) {
            this.wordGame.endGame = (...args) => {
                const result = originalMethods.endGame(...args);
                
                if (this.isMultiplayerMode) {
                    this.syncEndGame(...args);
                }
                
                return result;
            };
        }

        // Перехоплюємо початок гри
        if (this.wordGame.startGame) {
            this.wordGame.startGame = (...args) => {
                if (this.isMultiplayerMode && !this.isHost) {
                    // Не хост не може почати гру
                    console.log('Only host can start multiplayer game');
                    return;
                }
                
                const result = originalMethods.startGame(...args);
                
                if (this.isMultiplayerMode) {
                    this.syncStartGame(...args);
                }
                
                return result;
            };
        }
    }

    // Multiplayer Game Control
    async createMultiplayerRoom(settings = {}) {
        if (!this.firebaseManager) {
            throw new Error('Firebase not initialized');
        }

        const roomCode = await this.firebaseManager.createRoom({
            gameMode: this.wordGame?.config?.gameMode || 'classic',
            roundDuration: this.wordGame?.config?.roundDuration || 60,
            category: this.wordGame?.config?.currentCategory || 'Змішаний',
            ...settings
        });

        this.isMultiplayerMode = true;
        this.isHost = true;
        
        // Налаштовуємо гру для мультиплеєра
        this.setupMultiplayerGame();
        
        return roomCode;
    }

    async joinMultiplayerRoom(roomCode) {
        if (!this.firebaseManager) {
            throw new Error('Firebase not initialized');
        }

        await this.firebaseManager.joinRoom(roomCode);
        
        this.isMultiplayerMode = true;
        this.isHost = false;
        
        // Налаштовуємо гру для мультиплеєра
        this.setupMultiplayerGame();
        
        return true;
    }

    async leaveMultiplayerRoom() {
        if (!this.firebaseManager) return;

        await this.firebaseManager.leaveRoom();
        
        this.isMultiplayerMode = false;
        this.isHost = false;
        this.opponentId = null;
        
        // Повертаємо гру в одиночний режим
        this.setupSinglePlayerGame();
    }

    setupMultiplayerGame() {
        if (!this.wordGame) return;

        // Змінюємо UI для мультиплеєра
        this.updateUIForMultiplayer();
        
        // Налаштовуємо синхронізацію
        this.gameSync = {
            currentWord: null,
            scores: {},
            gameState: 'waiting',
            currentPlayer: null
        };
    }

    setupSinglePlayerGame() {
        if (!this.wordGame) return;

        // Повертаємо оригінальний UI
        this.updateUIForSinglePlayer();
        
        // Очищаємо синхронізацію
        this.gameSync = null;
    }

    updateUIForMultiplayer() {
        // Додаємо індикатор мультиплеєра
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer && !gameContainer.querySelector('.multiplayer-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'multiplayer-indicator';
            indicator.innerHTML = `
                <div class="multiplayer-badge">
                    🔥 Multiplayer
                    <span class="player-role">${this.isHost ? 'Host' : 'Guest'}</span>
                </div>
            `;
            gameContainer.prepend(indicator);
        }

        // Оновлюємо кнопки керування
        this.updateGameControls();
    }

    updateUIForSinglePlayer() {
        // Видаляємо індикатор мультиплеєра
        const indicator = document.querySelector('.multiplayer-indicator');
        if (indicator) {
            indicator.remove();
        }

        // Відновлюємо оригінальні кнопки
        this.restoreOriginalControls();
    }

    updateGameControls() {
        const controlsContainer = document.querySelector('.game-controls');
        if (!controlsContainer) return;

        // Додаємо кнопку залишити кімнату
        if (!controlsContainer.querySelector('.leave-room-btn')) {
            const leaveBtn = document.createElement('button');
            leaveBtn.className = 'leave-room-btn btn-secondary';
            leaveBtn.textContent = '🚪 Покинути кімнату';
            leaveBtn.onclick = () => this.leaveMultiplayerRoom();
            controlsContainer.appendChild(leaveBtn);
        }

        // Модифікуємо кнопку старту для хоста
        const startBtn = controlsContainer.querySelector('.start-game-btn');
        if (startBtn) {
            if (this.isHost) {
                startBtn.textContent = '🎮 Почати мультиплеєр гру';
            } else {
                startBtn.style.display = 'none'; // Гість не може почати гру
            }
        }
    }

    restoreOriginalControls() {
        // Видаляємо кнопку залишити кімнату
        const leaveBtn = document.querySelector('.leave-room-btn');
        if (leaveBtn) {
            leaveBtn.remove();
        }

        // Відновлюємо кнопку старту
        const startBtn = document.querySelector('.start-game-btn');
        if (startBtn) {
            startBtn.textContent = '🎮 Почати гру';
            startBtn.style.display = '';
        }
    }

    // Firebase Event Handlers
    onGameStarted(data) {
        console.log('Multiplayer game started:', data);
        
        if (this.wordGame && data.state) {
            // Синхронізуємо початковий стан гри
            this.syncGameStateToLocal(data.state);
        }
        
        // Показуємо повідомлення
        this.showMultiplayerMessage('🎮 Мультиплеєр гра розпочалась!');
    }

    onGameAction(data) {
        console.log('Received game action:', data);
        
        if (data.playerId === this.firebaseManager?.playerId) {
            // Це наша власна дія, ігноруємо
            return;
        }

        // Обробляємо дії опонента
        switch (data.type) {
            case 'wordGuessed':
                this.handleOpponentWordGuessed(data);
                break;
            case 'wordSkipped':
                this.handleOpponentWordSkipped(data);
                break;
            case 'gameEnded':
                this.handleOpponentGameEnded(data);
                break;
        }
    }

    onGameStateUpdated(data) {
        console.log('Game state updated:', data);
        
        if (data.gameState) {
            this.syncGameStateToLocal(data.gameState);
        }
    }

    onPlayersUpdated(data) {
        console.log('Players updated:', data);
        
        if (data.players) {
            // Знаходимо опонента
            this.opponentId = data.players.find(p => 
                p.id !== this.firebaseManager?.playerId
            )?.id;
            
            // Оновлюємо UI з інформацією про гравців
            this.updatePlayersDisplay(data.players);
        }
    }

    // Game Synchronization Methods
    async syncCorrectWord(word) {
        if (!this.firebaseManager) return;
        
        await this.firebaseManager.sendGameAction('wordGuessed', {
            word: word,
            result: 'correct',
            points: 1,
            timestamp: Date.now()
        });
        
        // Оновлюємо рахунок
        const currentScore = await this.firebaseManager.getPlayerScore();
        await this.firebaseManager.updateGameState({
            [`scores/${this.firebaseManager.playerId}`]: currentScore + 1
        });
    }

    async syncSkipWord(word) {
        if (!this.firebaseManager) return;
        
        await this.firebaseManager.sendGameAction('wordSkipped', {
            word: word,
            timestamp: Date.now()
        });
    }

    async syncStartGame() {
        if (!this.firebaseManager || !this.isHost) return;
        
        await this.firebaseManager.startGame();
    }

    async syncEndGame(result) {
        if (!this.firebaseManager) return;
        
        await this.firebaseManager.sendGameAction('gameEnded', {
            result: result,
            finalScore: this.wordGame?.score || 0,
            timestamp: Date.now()
        });
        
        await this.firebaseManager.endGame();
    }

    syncGameStateToLocal(gameState) {
        if (!this.wordGame || !gameState) return;
        
        // Синхронізуємо рахунки
        if (gameState.scores && this.firebaseManager) {
            const myScore = gameState.scores[this.firebaseManager.playerId] || 0;
            const opponentScore = this.opponentId ? 
                (gameState.scores[this.opponentId] || 0) : 0;
            
            this.wordGame.score = myScore;
            this.updateScoreDisplay(myScore, opponentScore);
        }
        
        // Синхронізуємо поточне слово
        if (gameState.currentWord) {
            this.wordGame.currentWord = gameState.currentWord;
            this.updateWordDisplay();
        }
        
        // Синхронізуємо стан гри
        if (gameState.status) {
            this.updateGameStatus(gameState.status);
        }
    }

    // UI Update Methods
    updateScoreDisplay(myScore, opponentScore) {
        const scoreElement = document.querySelector('.score');
        if (scoreElement) {
            scoreElement.innerHTML = `
                <div class="multiplayer-scores">
                    <div class="my-score">Ви: ${myScore}</div>
                    <div class="opponent-score">Опонент: ${opponentScore}</div>
                </div>
            `;
        }
    }

    updateWordDisplay() {
        if (this.wordGame?.updateDisplay) {
            this.wordGame.updateDisplay();
        }
    }

    updateGameStatus(status) {
        const statusElement = document.querySelector('.game-status');
        if (statusElement) {
            let statusText = '';
            switch (status) {
                case 'waiting':
                    statusText = '⏳ Очікування гравців...';
                    break;
                case 'playing':
                    statusText = '🎮 Гра в процесі';
                    break;
                case 'paused':
                    statusText = '⏸️ Гра призупинена';
                    break;
                case 'finished':
                    statusText = '🏁 Гра завершена';
                    break;
            }
            statusElement.textContent = statusText;
        }
    }

    updatePlayersDisplay(players) {
        const playersContainer = document.querySelector('.multiplayer-players');
        if (!playersContainer) {
            // Створюємо контейнер якщо його немає
            const container = document.createElement('div');
            container.className = 'multiplayer-players';
            
            const gameInfo = document.querySelector('.game-info');
            if (gameInfo) {
                gameInfo.appendChild(container);
            }
        }
        
        const playersHTML = players.map(player => `
            <div class="player-info ${player.id === this.firebaseManager?.playerId ? 'current-player' : ''}">
                <span class="player-name">${player.name}</span>
                <span class="player-role">${player.isHost ? '👑' : '👤'}</span>
                <span class="player-status ${player.status}">${player.status === 'online' ? '🟢' : '🔴'}</span>
            </div>
        `).join('');
        
        if (playersContainer) {
            playersContainer.innerHTML = playersHTML;
        }
    }

    showMultiplayerMessage(message, type = 'info') {
        // Створюємо тимчасове повідомлення
        const messageElement = document.createElement('div');
        messageElement.className = `multiplayer-message ${type}`;
        messageElement.textContent = message;
        
        document.body.appendChild(messageElement);
        
        // Видаляємо через 3 секунди
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 3000);
    }

    // Opponent Actions Handlers
    handleOpponentWordGuessed(data) {
        this.showMultiplayerMessage(`🎯 Опонент відгадав: "${data.word}"`);
        
        // Оновлюємо рахунок опонента в UI
        if (this.opponentId && data.playerId === this.opponentId) {
            // Рахунок буде оновлено через gameStateUpdated
        }
    }

    handleOpponentWordSkipped(data) {
        this.showMultiplayerMessage(`⏭️ Опонент пропустив: "${data.word}"`);
    }

    handleOpponentGameEnded(data) {
        this.showMultiplayerMessage('🏁 Опонент завершив гру');
        
        // Можемо автоматично завершити нашу гру або дати можливість продовжити
        if (confirm('Опонент завершив гру. Завершити вашу гру?')) {
            this.wordGame?.endGame();
        }
    }

    // Public API
    getMultiplayerStatus() {
        return {
            isMultiplayerMode: this.isMultiplayerMode,
            isHost: this.isHost,
            roomCode: this.firebaseManager?.roomCode,
            opponentId: this.opponentId,
            isConnected: this.firebaseManager?.getConnectionStatus()?.connected || false
        };
    }

    getFirebaseManager() {
        return this.firebaseManager;
    }
}

// CSS для мультиплеєр інтеграції
const multiplayerIntegrationCSS = `
.multiplayer-indicator {
    background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    text-align: center;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.multiplayer-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.player-role {
    background: rgba(255,255,255,0.2);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
}

.multiplayer-scores {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #F7FAFC;
    padding: 12px;
    border-radius: 8px;
    border: 2px solid #E2E8F0;
}

.my-score {
    color: #4299E1;
    font-weight: 600;
}

.opponent-score {
    color: #9F7AEA;
    font-weight: 600;
}

.multiplayer-players {
    background: #EDF2F7;
    padding: 12px;
    border-radius: 8px;
    margin: 12px 0;
}

.player-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #CBD5E0;
}

.player-info:last-child {
    border-bottom: none;
}

.player-info.current-player {
    background: rgba(66, 153, 225, 0.1);
    padding: 6px 8px;
    border-radius: 4px;
}

.player-name {
    font-weight: 500;
}

.leave-room-btn {
    background: #E53E3E !important;
    color: white;
    margin-left: 8px;
}

.leave-room-btn:hover {
    background: #C53030 !important;
}

.multiplayer-message {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4299E1;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
}

.multiplayer-message.info {
    background: #4299E1;
}

.multiplayer-message.success {
    background: #48BB78;
}

.multiplayer-message.warning {
    background: #ED8936;
}

.multiplayer-message.error {
    background: #E53E3E;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;

// Додаємо CSS
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = multiplayerIntegrationCSS;
    document.head.appendChild(style);
}

// Автоматична ініціалізація
document.addEventListener('DOMContentLoaded', () => {
    if (window.EnvironmentConfig?.isFirebaseEnabled() && window.wordGame) {
        window.firebaseGameIntegration = new FirebaseGameIntegration(window.wordGame);
    }
});

// Export
if (typeof window !== 'undefined') {
    window.FirebaseGameIntegration = FirebaseGameIntegration;
}
