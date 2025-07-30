// Безкоштовний Telegram Multiplayer Adapter
// Адаптер для інтеграції з основним інтерфейсом гри

class TelegramFreeMultiplayerAdapter {
    constructor() {
        this.multiplayerManager = null;
        this.gameManager = null;
        this.currentScreen = 'menu';
        this.eventHandlers = new Map();
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing Telegram Free Multiplayer...');
            
            // Створюємо менеджер мультиплеєра
            this.multiplayerManager = new TelegramFreeMultiplayerManager();
            
            // Підписуємося на події
            this.setupEventHandlers();
            
            // Перевіряємо, чи запущено в Telegram
            this.checkTelegramEnvironment();
            
            console.log('✅ Telegram Free Multiplayer ready!');
            
        } catch (error) {
            console.error('❌ Failed to initialize multiplayer:', error);
            this.showError('Помилка ініціалізації мультиплеєра');
        }
    }

    setupEventHandlers() {
        // Події від мультиплеєр менеджера
        this.multiplayerManager.on('roomCreated', (data) => {
            this.onRoomCreated(data);
        });

        this.multiplayerManager.on('roomJoined', (data) => {
            this.onRoomJoined(data);
        });

        this.multiplayerManager.on('roomLeft', (data) => {
            this.onRoomLeft(data);
        });

        this.multiplayerManager.on('connected', (data) => {
            this.onConnected(data);
        });

        this.multiplayerManager.on('roomUpdated', (data) => {
            this.onRoomUpdated(data);
        });

        this.multiplayerManager.on('gameAction', (data) => {
            this.onGameAction(data);
        });

        this.multiplayerManager.on('heartbeat', (data) => {
            this.updateConnectionStatus();
        });
    }

    checkTelegramEnvironment() {
        if (window.Telegram?.WebApp) {
            console.log('📱 Running in Telegram WebApp');
            this.showTelegramInfo();
        } else {
            console.log('🌐 Running in browser (demo mode)');
            this.showBrowserInfo();
        }
    }

    showTelegramInfo() {
        const infoDiv = document.getElementById('telegram-info');
        if (infoDiv) {
            infoDiv.innerHTML = `
                <div class="telegram-status">
                    <span class="status-icon">📱</span>
                    <span>Запущено в Telegram</span>
                </div>
            `;
            infoDiv.style.display = 'block';
        }
    }

    showBrowserInfo() {
        const infoDiv = document.getElementById('telegram-info');
        if (infoDiv) {
            infoDiv.innerHTML = `
                <div class="telegram-status demo">
                    <span class="status-icon">🌐</span>
                    <span>Демо-режим (відкрийте в Telegram для повного функціоналу)</span>
                </div>
            `;
            infoDiv.style.display = 'block';
        }
    }

    // Створення кімнати
    async createRoom(gameConfig = {}) {
        try {
            console.log('🏠 Creating multiplayer room...');
            
            this.showLoading('Створення кімнати...');
            
            const result = await this.multiplayerManager.createRoom(gameConfig);
            
            this.hideLoading();
            
            if (result.success) {
                console.log('✅ Room created successfully:', result.roomId);
                this.showRoomCreated(result.roomId, result.roomData);
            } else {
                throw new Error(result.error || 'Невідома помилка');
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Failed to create room:', error);
            this.hideLoading();
            this.showError(`Помилка створення кімнати: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Приєднання до кімнати
    async joinRoom(roomId) {
        try {
            console.log('🚪 Joining room:', roomId);
            
            if (!roomId || roomId.trim() === '') {
                throw new Error('Введіть код кімнати');
            }
            
            this.showLoading('Підключення до кімнати...');
            
            const result = await this.multiplayerManager.joinRoom(roomId.trim().toUpperCase());
            
            this.hideLoading();
            
            if (result.success) {
                console.log('✅ Joined room successfully:', roomId);
                this.showRoomJoined(roomId, result.roomData);
            } else {
                throw new Error(result.error || 'Невідома помилка');
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Failed to join room:', error);
            this.hideLoading();
            this.showError(`Помилка підключення: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Покинути кімнату
    async leaveRoom() {
        try {
            await this.multiplayerManager.leaveRoom();
            this.showMultiplayerMenu();
        } catch (error) {
            console.error('❌ Failed to leave room:', error);
            this.showError(`Помилка виходу з кімнати: ${error.message}`);
        }
    }

    // Готовність до гри
    async setPlayerReady() {
        try {
            const result = await this.multiplayerManager.sendGameAction('playerReady', {
                ready: true
            });
            
            if (result.success) {
                this.updatePlayerReadyStatus();
            }
            
        } catch (error) {
            console.error('❌ Failed to set player ready:', error);
            this.showError('Помилка готовності до гри');
        }
    }

    // Надіслати слово
    async submitWord(word) {
        try {
            const result = await this.multiplayerManager.sendGameAction('wordSubmitted', {
                word: word,
                timestamp: Date.now()
            });
            
            return result.success;
            
        } catch (error) {
            console.error('❌ Failed to submit word:', error);
            return false;
        }
    }

    // Обробка подій
    onRoomCreated(data) {
        console.log('🏠 Room created:', data.roomId);
        this.currentScreen = 'room';
        this.updateUI();
    }

    onRoomJoined(data) {
        console.log('🚪 Room joined:', data.roomId);
        this.currentScreen = 'room';
        this.updateUI();
    }

    onRoomLeft(data) {
        console.log('👋 Left room:', data.roomId);
        this.currentScreen = 'menu';
        this.updateUI();
    }

    onConnected(data) {
        console.log('🔗 Connected to room:', data.roomId);
        this.updateConnectionStatus();
    }

    onRoomUpdated(data) {
        console.log('🔄 Room updated');
        this.updateRoomInfo(data);
    }

    onGameAction(data) {
        console.log('🎮 Game action:', data.action);
        this.handleGameAction(data);
    }

    handleGameAction(data) {
        const { action, data: actionData, playerName } = data;
        
        switch (action) {
            case 'playerReady':
                this.showNotification(`✅ ${playerName} готовий до гри`);
                this.updatePlayersList();
                break;
                
            case 'wordSubmitted':
                this.showNotification(`📝 ${playerName} надіслав слово`);
                this.updateGameState();
                break;
                
            case 'gameStarted':
                this.showNotification('🎮 Гра почалася!');
                this.startGame();
                break;
                
            default:
                console.log('Unknown game action:', action);
        }
    }

    // UI методи
    showRoomCreated(roomId, roomData) {
        const container = document.getElementById('multiplayer-container');
        if (!container) return;

        container.innerHTML = `
            <div class="room-created">
                <h2>🏠 Кімната створена!</h2>
                <div class="room-code">
                    <h3>Код кімнати:</h3>
                    <div class="code-display">${roomId}</div>
                    <button onclick="navigator.clipboard?.writeText('${roomId}')" class="copy-btn">
                        📋 Копіювати
                    </button>
                </div>
                <div class="room-info">
                    <p><strong>👑 Хост:</strong> ${roomData.hostName}</p>
                    <p><strong>👥 Гравці:</strong> ${roomData.players.length}/4</p>
                </div>
                <div class="players-list" id="players-list">
                    ${this.renderPlayersList(roomData.players)}
                </div>
                <div class="room-actions">
                    <button onclick="telegramMultiplayer.setPlayerReady()" class="ready-btn">
                        ✅ Готовий до гри
                    </button>
                    <button onclick="telegramMultiplayer.leaveRoom()" class="leave-btn">
                        🚪 Покинути кімнату
                    </button>
                </div>
                <div class="share-info">
                    <p>💡 Поділіться кодом <strong>${roomId}</strong> з друзями</p>
                </div>
            </div>
        `;
    }

    showRoomJoined(roomId, roomData) {
        this.showRoomCreated(roomId, roomData); // Використовуємо той самий інтерфейс
    }

    renderPlayersList(players) {
        return players.map(player => `
            <div class="player-item ${player.ready ? 'ready' : ''}">
                <span class="player-name">${player.name}</span>
                <span class="player-status">${player.ready ? '✅' : '⏳'}</span>
            </div>
        `).join('');
    }

    updatePlayersList() {
        const room = this.multiplayerManager.getCurrentRoom();
        if (!room) return;

        const playersListEl = document.getElementById('players-list');
        if (playersListEl) {
            playersListEl.innerHTML = this.renderPlayersList(room.players);
        }
    }

    showMultiplayerMenu() {
        const container = document.getElementById('multiplayer-container');
        if (!container) return;

        container.innerHTML = `
            <div class="multiplayer-menu">
                <h2>🎮 Мультиплеєр</h2>
                <div class="multiplayer-actions">
                    <button onclick="telegramMultiplayer.createRoom()" class="create-room-btn">
                        🏠 Створити кімнату
                    </button>
                    <div class="join-room-section">
                        <input type="text" id="room-code-input" placeholder="Код кімнати" maxlength="6" 
                               style="text-transform: uppercase;">
                        <button onclick="telegramMultiplayer.joinRoomFromInput()" class="join-room-btn">
                            🚪 Приєднатися
                        </button>
                    </div>
                </div>
                <div id="telegram-info" class="telegram-info"></div>
            </div>
        `;

        // Показуємо інформацію про Telegram
        this.checkTelegramEnvironment();
    }

    async joinRoomFromInput() {
        const input = document.getElementById('room-code-input');
        if (input) {
            await this.joinRoom(input.value);
        }
    }

    showLoading(message) {
        const container = document.getElementById('multiplayer-container');
        if (!container) return;

        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner">⏳</div>
                <p>${message}</p>
            </div>
        `;
    }

    hideLoading() {
        // Loading буде замінено наступним контентом
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <span class="error-icon">❌</span>
            <span class="error-message">${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.innerHTML = `
            <span class="success-message">${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    updateConnectionStatus() {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            const isConnected = this.multiplayerManager.isConnected();
            statusEl.textContent = isConnected ? '🟢 Підключено' : '🔴 Не підключено';
            statusEl.className = isConnected ? 'connected' : 'disconnected';
        }
    }

    updateRoomInfo(roomData) {
        this.updatePlayersList();
        // Додаткові оновлення UI...
    }

    updateUI() {
        // Оновлення інтерфейсу відповідно до поточного стану
        if (this.currentScreen === 'menu') {
            this.showMultiplayerMenu();
        }
    }

    updatePlayerReadyStatus() {
        // Оновлення статусу готовності гравця
        this.updatePlayersList();
    }

    updateGameState() {
        // Оновлення стану гри
        console.log('🎮 Game state updated');
    }

    startGame() {
        // Запуск гри
        console.log('🚀 Starting multiplayer game');
    }

    // Отримання поточного стану
    getCurrentRoom() {
        return this.multiplayerManager?.getCurrentRoom();
    }

    isConnected() {
        return this.multiplayerManager?.isConnected() || false;
    }

    // Cleanup
    destroy() {
        if (this.multiplayerManager) {
            this.multiplayerManager.destroy();
        }
    }
}

// Глобальна ініціалізація
let telegramMultiplayer = null;

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    telegramMultiplayer = new TelegramFreeMultiplayerAdapter();
    
    // Робимо доступним глобально
    if (typeof window !== 'undefined') {
        window.telegramMultiplayer = telegramMultiplayer;
    }
});

// Експорт для модулів
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramFreeMultiplayerAdapter;
}
