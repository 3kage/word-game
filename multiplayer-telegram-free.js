// Безкоштовний Telegram Multiplayer Manager
// Використовує тільки Telegram Bot API без зовнішніх сервісів

class TelegramFreeMultiplayerManager {
    constructor() {
        this.currentRoom = null;
        this.playerId = this.generatePlayerId();
        this.playerName = '';
        this.isHost = false;
        this.eventHandlers = new Map();
        this.pollingInterval = null;
        this.lastUpdateId = 0;
        this.connected = false;
        this.botToken = null;
        this.chatId = null;
        
        this.init();
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        // Перевіряємо доступність Telegram WebApp
        if (window.Telegram?.WebApp) {
            this.telegramUser = window.Telegram.WebApp.initDataUnsafe?.user;
            if (this.telegramUser) {
                this.playerId = `${this.telegramUser.id}`;
                this.playerName = this.telegramUser.first_name || this.telegramUser.username || 'Гравець';
                this.chatId = this.telegramUser.id;
            }
            
            // Отримуємо токен бота з query параметрів або конфігурації
            this.botToken = this.getBotToken();
        }

        console.log('🎮 Telegram Free Multiplayer initialized:', {
            playerId: this.playerId,
            playerName: this.playerName,
            hasTelegram: !!window.Telegram?.WebApp
        });
    }

    getBotToken() {
        // Спробуємо отримати токен з різних джерел
        if (window.EnvironmentConfig?.getTelegramBotToken()) {
            return window.EnvironmentConfig.getTelegramBotToken();
        }
        
        // Fallback: використовуємо публічний токен для демо
        return '5775769170:LIVE:TG_1oguWlYT13ms_s3AuCVLtWgA';
    }

    // Подієва система
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    emit(event, data) {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error('Event handler error:', error);
            }
        });
    }

    // Створення кімнати
    async createRoom(gameConfig = {}) {
        try {
            console.log('🏠 Creating room...');
            
            // Генеруємо унікальний ID кімнати
            const roomId = this.generateRoomId();
            
            // Створюємо кімнату локально
            const roomData = {
                id: roomId,
                hostId: this.playerId,
                hostName: this.playerName,
                players: [{
                    id: this.playerId,
                    name: this.playerName,
                    ready: false
                }],
                gameConfig: {
                    timeLimit: 60,
                    difficulty: 'medium',
                    rounds: 3,
                    ...gameConfig
                },
                gameState: {
                    status: 'waiting', // waiting, playing, finished
                    currentRound: 0,
                    currentPlayer: null,
                    words: [],
                    scores: {}
                },
                createdAt: Date.now(),
                lastActivity: Date.now()
            };

            // Зберігаємо локально
            this.saveRoomToStorage(roomData);
            
            this.currentRoom = roomData;
            this.isHost = true;
            this.connected = true;

            // Відправляємо повідомлення в Telegram про створення кімнати
            await this.sendTelegramMessage(`🏠 Кімната створена!\n\n🔑 Код: ${roomId}\n👑 Хост: ${this.playerName}\n\n📱 Щоб приєднатися, відправте: /join ${roomId}`);

            this.emit('roomCreated', { roomId, roomData });
            this.emit('connected', { roomId });

            // Запускаємо polling для оновлень
            this.startPolling();

            return { success: true, roomId, roomData };
        } catch (error) {
            console.error('❌ Failed to create room:', error);
            return { success: false, error: error.message };
        }
    }

    generateRoomId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    // Приєднання до кімнати
    async joinRoom(roomId) {
        try {
            console.log('🚪 Joining room:', roomId);

            // Спочатку перевіряємо localStorage
            let roomData = this.loadRoomFromStorage(roomId);
            
            if (!roomData) {
                // Якщо кімнати немає локально, створюємо запит через Telegram
                await this.sendTelegramMessage(`🔍 Шукаю кімнату: ${roomId}`);
                
                // Чекаємо відповідь (симуляція)
                await this.waitForRoomData(roomId);
                roomData = this.loadRoomFromStorage(roomId);
            }

            if (!roomData) {
                throw new Error(`Кімната ${roomId} не знайдена`);
            }

            // Перевіряємо, чи гравець вже в кімнаті
            const existingPlayer = roomData.players.find(p => p.id === this.playerId);
            if (!existingPlayer) {
                roomData.players.push({
                    id: this.playerId,
                    name: this.playerName,
                    ready: false
                });
                roomData.lastActivity = Date.now();
                this.saveRoomToStorage(roomData);
            }

            this.currentRoom = roomData;
            this.isHost = roomData.hostId === this.playerId;
            this.connected = true;

            // Повідомляємо інших гравців
            await this.sendTelegramMessage(`👋 ${this.playerName} приєднався до кімнати ${roomId}`);

            this.emit('roomJoined', { roomId, roomData });
            this.emit('connected', { roomId });

            // Запускаємо polling
            this.startPolling();

            return { success: true, roomId, roomData };
        } catch (error) {
            console.error('❌ Failed to join room:', error);
            return { success: false, error: error.message };
        }
    }

    // Покинути кімнату
    async leaveRoom() {
        try {
            if (!this.currentRoom) return;

            const roomId = this.currentRoom.id;
            
            // Видаляємо гравця з кімнати
            this.currentRoom.players = this.currentRoom.players.filter(p => p.id !== this.playerId);
            this.currentRoom.lastActivity = Date.now();

            // Якщо був хостом і є інші гравці, передаємо права
            if (this.isHost && this.currentRoom.players.length > 0) {
                this.currentRoom.hostId = this.currentRoom.players[0].id;
                await this.sendTelegramMessage(`👑 ${this.currentRoom.players[0].name} тепер хост кімнати ${roomId}`);
            }

            // Зберігаємо зміни
            this.saveRoomToStorage(this.currentRoom);

            // Повідомляємо про вихід
            await this.sendTelegramMessage(`👋 ${this.playerName} покинув кімнату ${roomId}`);

            // Очищуємо локальний стан
            this.stopPolling();
            this.currentRoom = null;
            this.isHost = false;
            this.connected = false;

            this.emit('roomLeft', { roomId });

        } catch (error) {
            console.error('❌ Failed to leave room:', error);
        }
    }

    // Відправка ігрової дії
    async sendGameAction(action, data = {}) {
        try {
            if (!this.currentRoom) {
                throw new Error('Не підключено до кімнати');
            }

            const gameAction = {
                type: 'gameAction',
                action: action,
                data: data,
                playerId: this.playerId,
                playerName: this.playerName,
                timestamp: Date.now(),
                roomId: this.currentRoom.id
            };

            // Оновлюємо локальний стан
            this.processGameAction(gameAction);

            // Відправляємо через Telegram
            const message = this.formatGameActionMessage(gameAction);
            await this.sendTelegramMessage(message);

            this.emit('gameAction', gameAction);

            return { success: true };
        } catch (error) {
            console.error('❌ Failed to send game action:', error);
            return { success: false, error: error.message };
        }
    }

    formatGameActionMessage(gameAction) {
        const { action, data, playerName } = gameAction;
        
        switch (action) {
            case 'playerReady':
                return `✅ ${playerName} готовий до гри`;
            case 'wordSubmitted':
                return `📝 ${playerName} надіслав слово: ${data.word}`;
            case 'gameStarted':
                return `🎮 Гра почалася! Перший ходить: ${data.currentPlayer}`;
            case 'roundFinished':
                return `🏁 Раунд завершено! Рахунок: ${Object.entries(data.scores).map(([p, s]) => `${p}: ${s}`).join(', ')}`;
            default:
                return `🎯 ${playerName}: ${action}`;
        }
    }

    processGameAction(gameAction) {
        if (!this.currentRoom) return;

        const { action, data, playerId } = gameAction;

        switch (action) {
            case 'playerReady':
                const player = this.currentRoom.players.find(p => p.id === playerId);
                if (player) {
                    player.ready = true;
                }
                break;

            case 'wordSubmitted':
                this.currentRoom.gameState.words.push({
                    word: data.word,
                    playerId: playerId,
                    timestamp: Date.now()
                });
                break;

            case 'gameStarted':
                this.currentRoom.gameState.status = 'playing';
                this.currentRoom.gameState.currentRound = 1;
                this.currentRoom.gameState.currentPlayer = data.currentPlayer;
                break;
        }

        this.currentRoom.lastActivity = Date.now();
        this.saveRoomToStorage(this.currentRoom);
    }

    // Telegram API методи
    async sendTelegramMessage(text) {
        if (!this.botToken || !this.chatId) {
            console.log('📝 [DEMO MODE]:', text);
            return;
        }

        try {
            const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: text,
                    parse_mode: 'HTML'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Failed to send Telegram message:', error);
        }
    }

    // Polling для оновлень
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(() => {
            this.checkForUpdates();
        }, 2000); // Кожні 2 секунди
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    async checkForUpdates() {
        try {
            if (!this.currentRoom) return;

            // Перевіряємо локальні оновлення
            const updatedRoom = this.loadRoomFromStorage(this.currentRoom.id);
            if (updatedRoom && updatedRoom.lastActivity > this.currentRoom.lastActivity) {
                this.currentRoom = updatedRoom;
                this.emit('roomUpdated', updatedRoom);
            }

            // Симулюємо отримання оновлень через Telegram (в реальній реалізації тут був би getUpdates)
            this.simulateUpdates();

        } catch (error) {
            console.error('❌ Polling error:', error);
        }
    }

    simulateUpdates() {
        // В реальній реалізації тут був би виклик getUpdates API
        // Поки що просто емітимо heartbeat
        this.emit('heartbeat', { timestamp: Date.now() });
    }

    // Локальне зберігання
    saveRoomToStorage(roomData) {
        try {
            const key = `room_${roomData.id}`;
            localStorage.setItem(key, JSON.stringify(roomData));
            
            // Також зберігаємо список активних кімнат
            const activeRooms = this.getActiveRooms();
            if (!activeRooms.includes(roomData.id)) {
                activeRooms.push(roomData.id);
                localStorage.setItem('active_rooms', JSON.stringify(activeRooms));
            }
        } catch (error) {
            console.error('❌ Failed to save room to storage:', error);
        }
    }

    loadRoomFromStorage(roomId) {
        try {
            const key = `room_${roomId}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('❌ Failed to load room from storage:', error);
            return null;
        }
    }

    getActiveRooms() {
        try {
            const data = localStorage.getItem('active_rooms');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            return [];
        }
    }

    async waitForRoomData(roomId, timeout = 5000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                const roomData = this.loadRoomFromStorage(roomId);
                if (roomData || Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    resolve(roomData);
                }
            }, 500);
        });
    }

    // Отримання статусу підключення
    isConnected() {
        return this.connected;
    }

    getCurrentRoom() {
        return this.currentRoom;
    }

    getPlayerId() {
        return this.playerId;
    }

    getPlayerName() {
        return this.playerName;
    }

    // Cleanup
    destroy() {
        this.stopPolling();
        this.currentRoom = null;
        this.connected = false;
        this.eventHandlers.clear();
    }
}

// Глобальний експорт
if (typeof window !== 'undefined') {
    window.TelegramFreeMultiplayerManager = TelegramFreeMultiplayerManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramFreeMultiplayerManager;
}
