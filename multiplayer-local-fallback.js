// Local Multiplayer Fallback for Development
// Цей файл забезпечує локальне тестування мультиплеєра без GitHub API

class LocalMultiplayerFallback {
    constructor() {
        this.rooms = new Map();
        this.eventHandlers = new Map();
        this.playerId = 'local_' + Math.random().toString(36).substr(2, 9);
        this.playerName = '';
        this.currentRoom = null;
    }

    // Подієва система (така ж як у TelegramMultiplayerManager)
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
                    status: 'waiting',
                    actions: [],
                    score: {}
                },
                createdAt: Date.now(),
                lastActivity: Date.now()
            };

            // Зберігаємо в localStorage
            localStorage.setItem(`room_${roomCode}`, JSON.stringify(roomData));
            this.rooms.set(roomCode, roomData);
            this.currentRoom = roomCode;

            this.emit('roomCreated', {
                roomCode: roomCode,
                players: roomData.players
            });

            console.log(`🏠 Локальна кімната створена: ${roomCode}`);
            return { success: true, roomCode };

        } catch (error) {
            console.error('Error creating local room:', error);
            this.emit('error', { message: 'Не вдалося створити кімнату (локально)' });
            return { success: false, error: error.message };
        }
    }

    async joinRoom(roomCode, playerName = null) {
        try {
            this.playerName = playerName || this.playerName;
            
            // Шукаємо кімнату в localStorage
            const roomDataStr = localStorage.getItem(`room_${roomCode}`);
            if (!roomDataStr) {
                throw new Error('Кімнату не знайдено');
            }

            const roomData = JSON.parse(roomDataStr);
            
            if (roomData.players.length >= roomData.settings.maxPlayers) {
                throw new Error('Кімната переповнена');
            }

            // Додаємо гравця якщо його ще немає
            const playerExists = roomData.players.find(p => p.id === this.playerId);
            if (!playerExists) {
                roomData.players.push({
                    id: this.playerId,
                    name: this.playerName,
                    joinedAt: Date.now()
                });
            }

            roomData.lastActivity = Date.now();

            // Оновлюємо дані
            localStorage.setItem(`room_${roomCode}`, JSON.stringify(roomData));
            this.rooms.set(roomCode, roomData);
            this.currentRoom = roomCode;

            this.emit('roomJoined', {
                roomCode: roomCode,
                players: roomData.players
            });

            this.emit('playerJoined', {
                playerId: this.playerId,
                playerName: this.playerName,
                players: roomData.players
            });

            console.log(`🚪 Приєднався до локальної кімнати: ${roomCode}`);
            return { success: true };

        } catch (error) {
            console.error('Error joining local room:', error);
            this.emit('error', { message: error.message });
            return { success: false, error: error.message };
        }
    }

    async sendGameAction(action, data = {}) {
        if (!this.currentRoom) {
            this.emit('error', { message: 'Не підключено до кімнати' });
            return;
        }

        try {
            const roomDataStr = localStorage.getItem(`room_${this.currentRoom}`);
            if (!roomDataStr) {
                throw new Error('Кімнату не знайдено');
            }

            const roomData = JSON.parse(roomDataStr);

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

            // Оновлюємо дані
            localStorage.setItem(`room_${this.currentRoom}`, JSON.stringify(roomData));
            this.rooms.set(this.currentRoom, roomData);

            this.emit('gameAction', actionData);

            console.log(`🎯 Локальна дія: ${action}`);

        } catch (error) {
            console.error('Error sending local game action:', error);
            this.emit('error', { message: 'Не вдалося відправити дію' });
        }
    }

    async leaveRoom() {
        if (!this.currentRoom) return;

        try {
            const roomDataStr = localStorage.getItem(`room_${this.currentRoom}`);
            if (roomDataStr) {
                const roomData = JSON.parse(roomDataStr);
                
                // Видаляємо гравця
                roomData.players = roomData.players.filter(p => p.id !== this.playerId);
                
                if (roomData.players.length === 0) {
                    // Видаляємо пусту кімнату
                    localStorage.removeItem(`room_${this.currentRoom}`);
                    this.rooms.delete(this.currentRoom);
                } else {
                    // Оновлюємо кімнату
                    localStorage.setItem(`room_${this.currentRoom}`, JSON.stringify(roomData));
                    this.rooms.set(this.currentRoom, roomData);
                }
            }

            this.currentRoom = null;
            this.emit('leftRoom', {});
            
            console.log('🚪 Покинув локальну кімнату');

        } catch (error) {
            console.error('Error leaving local room:', error);
        }
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    getConnectionStatus() {
        return 'connected'; // Завжди підключені локально
    }

    destroy() {
        if (this.currentRoom) {
            this.leaveRoom();
        }
    }
}

// Експорт для глобального використання
if (typeof window !== 'undefined') {
    window.LocalMultiplayerFallback = LocalMultiplayerFallback;
}
