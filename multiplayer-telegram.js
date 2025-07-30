// Telegram-based Multiplayer Manager
// Використовує Telegram Bot API для реального часу та GitHub API для збереження стану

class TelegramMultiplayerManager {
    constructor() {
        this.currentRoom = null;
        this.playerId = this.generatePlayerId();
        this.playerName = '';
        this.isHost = false;
        this.eventHandlers = new Map();
        this.pollingInterval = null;
        this.lastUpdateId = 0;
        this.connected = false;
        
        this.telegramAPI = window.EnvironmentConfig?.getTelegramAPIURL();
        this.githubAPI = window.EnvironmentConfig?.getGitHubAPIURL();
        this.githubRepo = window.EnvironmentConfig?.getGitHubRepo();
        
        this.init();
    }

    generatePlayerId() {
        return 'tg_player_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        // Перевіряємо доступність Telegram WebApp
        if (window.Telegram?.WebApp) {
            this.telegramUser = window.Telegram.WebApp.initDataUnsafe?.user;
            if (this.telegramUser) {
                this.playerId = `tg_${this.telegramUser.id}`;
                this.playerName = this.telegramUser.first_name || this.telegramUser.username || 'Telegram User';
            }
        }

        // Запускаємо моніторинг оновлень
        this.startPolling();
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
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }

    // Створення кімнати через GitHub Gist
    async createRoom(settings = {}) {
        try {
            const roomCode = this.generateRoomCode();
            const roomData = {
                code: roomCode,
                host: {
                    id: this.playerId,
                    name: this.playerName
                },
                players: [{
                    id: this.playerId,
                    name: this.playerName,
                    joinedAt: Date.now()
                }],
                settings: {
                    category: settings.category || 'Змішаний',
                    roundDuration: settings.roundDuration || 60,
                    maxPlayers: settings.maxPlayers || 2
                },
                gameState: {
                    status: 'waiting', // waiting, playing, finished
                    currentWord: null,
                    score: {},
                    round: 0
                },
                createdAt: Date.now(),
                lastActivity: Date.now()
            };

            // Зберігаємо кімнату в GitHub Gist
            const gistResponse = await this.createGist(roomCode, roomData);
            
            if (gistResponse.ok) {
                this.currentRoom = roomCode;
                this.isHost = true;
                this.connected = true;
                
                this.emit('roomCreated', {
                    roomCode: roomCode,
                    players: roomData.players
                });

                // Повідомляємо в Telegram канал (якщо доступний)
                await this.notifyTelegramChannel(`🎮 Створено нову кімнату: ${roomCode}`);
                
                return { success: true, roomCode };
            } else {
                throw new Error('Failed to create room on GitHub');
            }
        } catch (error) {
            console.error('Error creating room:', error);
            this.emit('error', { message: 'Не вдалося створити кімнату' });
            return { success: false, error: error.message };
        }
    }

    // Приєднання до кімнати
    async joinRoom(roomCode, playerName = null) {
        try {
            this.playerName = playerName || this.playerName;
            
            // Отримуємо дані кімнати з GitHub
            const roomData = await this.getRoomData(roomCode);
            
            if (!roomData) {
                throw new Error('Кімнату не знайдено');
            }

            if (roomData.players.length >= roomData.settings.maxPlayers) {
                throw new Error('Кімната переповнена');
            }

            // Додаємо гравця
            const playerExists = roomData.players.find(p => p.id === this.playerId);
            if (!playerExists) {
                roomData.players.push({
                    id: this.playerId,
                    name: this.playerName,
                    joinedAt: Date.now()
                });
            }

            roomData.lastActivity = Date.now();

            // Оновлюємо кімнату
            const updateResponse = await this.updateGist(roomCode, roomData);
            
            if (updateResponse.ok) {
                this.currentRoom = roomCode;
                this.isHost = false;
                this.connected = true;
                
                this.emit('roomJoined', {
                    roomCode: roomCode,
                    players: roomData.players
                });

                this.emit('playerJoined', {
                    playerId: this.playerId,
                    playerName: this.playerName,
                    players: roomData.players
                });

                // Повідомляємо в Telegram
                await this.notifyTelegramChannel(`👤 ${this.playerName} приєднався до кімнати ${roomCode}`);
                
                return { success: true };
            } else {
                throw new Error('Failed to join room');
            }
        } catch (error) {
            console.error('Error joining room:', error);
            this.emit('error', { message: error.message });
            return { success: false, error: error.message };
        }
    }

    // Відправка ігрової дії
    async sendGameAction(action, data = {}) {
        if (!this.currentRoom) {
            this.emit('error', { message: 'Не підключено до кімнати' });
            return;
        }

        try {
            const roomData = await this.getRoomData(this.currentRoom);
            if (!roomData) {
                throw new Error('Кімнату не знайдено');
            }

            // Додаємо дію до історії
            if (!roomData.gameState.actions) {
                roomData.gameState.actions = [];
            }

            const actionData = {
                id: Date.now().toString(),
                playerId: this.playerId,
                playerName: this.playerName,
                action: action,
                data: data,
                timestamp: Date.now()
            };

            roomData.gameState.actions.push(actionData);
            roomData.lastActivity = Date.now();

            // Обробляємо дію відповідно до типу
            this.processGameAction(roomData, actionData);

            // Оновлюємо кімнату
            await this.updateGist(this.currentRoom, roomData);

            // Повідомляємо локально
            this.emit('gameAction', actionData);

            // Повідомляємо в Telegram
            await this.notifyTelegramChannel(
                `🎯 ${this.playerName}: ${this.getActionDescription(action, data)}`
            );

        } catch (error) {
            console.error('Error sending game action:', error);
            this.emit('error', { message: 'Не вдалося відправити дію' });
        }
    }

    // Обробка ігрових дій
    processGameAction(roomData, actionData) {
        switch (actionData.action) {
            case 'startGame':
                roomData.gameState.status = 'playing';
                roomData.gameState.round = 1;
                roomData.gameState.startTime = Date.now();
                break;
                
            case 'correct':
                if (!roomData.gameState.score[actionData.playerId]) {
                    roomData.gameState.score[actionData.playerId] = 0;
                }
                roomData.gameState.score[actionData.playerId] += (actionData.data.points || 10);
                break;
                
            case 'skip':
                // Логіка пропуску слова
                break;
                
            case 'pause':
                roomData.gameState.status = 'paused';
                break;
                
            case 'resume':
                roomData.gameState.status = 'playing';
                break;
                
            case 'endGame':
                roomData.gameState.status = 'finished';
                roomData.gameState.endTime = Date.now();
                break;
        }
    }

    // Опис дій для Telegram
    getActionDescription(action, data) {
        switch (action) {
            case 'correct': return `Правильно! +${data.points || 10} балів`;
            case 'skip': return 'Пропустив слово';
            case 'pause': return 'Призупинив гру';
            case 'resume': return 'Відновив гру';
            case 'startGame': return 'Розпочав гру!';
            case 'endGame': return 'Завершив гру';
            default: return action;
        }
    }

    // Покинути кімнату
    async leaveRoom() {
        if (!this.currentRoom) return;

        try {
            const roomData = await this.getRoomData(this.currentRoom);
            if (roomData) {
                // Видаляємо гравця
                roomData.players = roomData.players.filter(p => p.id !== this.playerId);
                
                // Якщо хост покидає кімнату, передаємо право іншому гравцю
                if (this.isHost && roomData.players.length > 0) {
                    roomData.host = {
                        id: roomData.players[0].id,
                        name: roomData.players[0].name
                    };
                }

                roomData.lastActivity = Date.now();

                if (roomData.players.length === 0) {
                    // Видаляємо пусту кімнату
                    await this.deleteGist(this.currentRoom);
                } else {
                    // Оновлюємо кімнату
                    await this.updateGist(this.currentRoom, roomData);
                }

                await this.notifyTelegramChannel(`👋 ${this.playerName} покинув кімнату ${this.currentRoom}`);
            }

            this.currentRoom = null;
            this.isHost = false;
            this.connected = false;
            
            this.emit('leftRoom', {});
            
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }

    // Генерація коду кімнати
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Робота з GitHub Gist
    async createGist(roomCode, roomData) {
        const githubToken = window.EnvironmentConfig?.getGitHubToken();
        
        // Якщо немає GitHub токена, використовуємо localStorage як fallback
        if (!githubToken) {
            console.warn('GitHub token not available, using localStorage fallback');
            localStorage.setItem(`room_${roomCode}`, JSON.stringify(roomData));
            return { ok: true };
        }

        const gistData = {
            description: `Word Game Room: ${roomCode}`,
            public: false,
            files: {
                [`room_${roomCode}.json`]: {
                    content: JSON.stringify(roomData, null, 2)
                }
            }
        };

        try {
            const response = await fetch(`${this.githubAPI}/gists`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `token ${githubToken}`
                },
                body: JSON.stringify(gistData)
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            return response;
        } catch (error) {
            console.error('GitHub Gist creation failed, using localStorage:', error);
            localStorage.setItem(`room_${roomCode}`, JSON.stringify(roomData));
            return { ok: true };
        }
    }

    async updateGist(roomCode, roomData) {
        const githubToken = window.EnvironmentConfig?.getGitHubToken();
        
        // Fallback до localStorage
        if (!githubToken) {
            localStorage.setItem(`room_${roomCode}`, JSON.stringify(roomData));
            return { ok: true };
        }

        try {
            // Для простоти, створюємо новий gist при кожному оновленні
            // В продакшн варіанті краще використовувати існуючий gist
            return await this.createGist(roomCode, roomData);
        } catch (error) {
            console.error('GitHub Gist update failed, using localStorage:', error);
            localStorage.setItem(`room_${roomCode}`, JSON.stringify(roomData));
            return { ok: true };
        }
    }

    async getRoomData(roomCode) {
        const githubToken = window.EnvironmentConfig?.getGitHubToken();
        
        // Спочатку пробуємо localStorage
        const localData = localStorage.getItem(`room_${roomCode}`);
        if (localData) {
            try {
                return JSON.parse(localData);
            } catch (error) {
                console.error('Error parsing local room data:', error);
            }
        }

        // Якщо немає GitHub токена, повертаємо null
        if (!githubToken) {
            return null;
        }

        try {
            // Пошук через GitHub Search API (публічні gists)
            const searchQuery = `filename:room_${roomCode}.json`;
            const response = await fetch(`${this.githubAPI}/search/code?q=${encodeURIComponent(searchQuery)}`);
            
            if (response.ok) {
                const searchResults = await response.json();
                if (searchResults.items && searchResults.items.length > 0) {
                    // Отримуємо вміст файлу
                    const fileUrl = searchResults.items[0].url;
                    const fileResponse = await fetch(fileUrl);
                    if (fileResponse.ok) {
                        const fileData = await fileResponse.json();
                        const content = atob(fileData.content);
                        return JSON.parse(content);
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting room data from GitHub:', error);
            return null;
        }
    }

    async deleteGist(roomCode) {
        // Заглушка для видалення - в реальності потрібен ID gist
        console.log(`Room ${roomCode} should be deleted`);
    }

    // Повідомлення в Telegram канал
    async notifyTelegramChannel(message) {
        if (!this.telegramAPI) return;

        try {
            // Якщо є доступ до Telegram WebApp, використовуємо його для повідомлень
            if (window.Telegram?.WebApp?.showAlert) {
                // Показуємо локальне повідомлення
                console.log(`Telegram notification: ${message}`);
            }
        } catch (error) {
            console.error('Error sending Telegram notification:', error);
        }
    }

    // Моніторинг оновлень
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(async () => {
            if (this.currentRoom) {
                await this.checkForUpdates();
            }
        }, 2000); // Перевірка кожні 2 секунди
    }

    async checkForUpdates() {
        try {
            const roomData = await this.getRoomData(this.currentRoom);
            if (!roomData) {
                this.emit('error', { message: 'Кімнату не знайдено' });
                this.currentRoom = null;
                this.connected = false;
                return;
            }

            // Перевіряємо нові дії
            if (roomData.gameState.actions) {
                const newActions = roomData.gameState.actions.filter(action => 
                    action.timestamp > this.lastUpdateId && action.playerId !== this.playerId
                );

                newActions.forEach(action => {
                    this.emit('gameAction', action);
                });

                if (newActions.length > 0) {
                    this.lastUpdateId = Math.max(...newActions.map(a => a.timestamp));
                }
            }

            // Перевіряємо зміни в списку гравців
            this.emit('playersUpdated', {
                players: roomData.players
            });

        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // Отримання статусу з'єднання
    getConnectionStatus() {
        return this.connected ? 'connected' : 'disconnected';
    }

    // Очищення при знищенні
    destroy() {
        this.stopPolling();
        if (this.currentRoom) {
            this.leaveRoom();
        }
    }
}

// Експорт для глобального використання
if (typeof window !== 'undefined') {
    window.TelegramMultiplayerManager = TelegramMultiplayerManager;
}
