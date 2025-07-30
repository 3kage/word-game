// Firebase Multiplayer UI Component
class FirebaseMultiplayerUI {
    constructor(containerId = 'firebase-multiplayer-container') {
        this.container = document.getElementById(containerId);
        this.manager = null;
        this.currentRoom = null;
        this.players = [];
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            // Create container if it doesn't exist
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'firebase-multiplayer-container';
                document.body.appendChild(this.container);
            }

            // Initialize Firebase Multiplayer Manager
            this.manager = new FirebaseMultiplayerManager();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Render initial UI
            this.render();
            
            this.isInitialized = true;
            console.log('Firebase Multiplayer UI initialized');
        } catch (error) {
            console.error('Failed to initialize Firebase UI:', error);
            this.showError('Failed to initialize Firebase multiplayer');
        }
    }

    setupEventListeners() {
        if (!this.manager) return;

        this.manager.on('initialized', () => {
            this.render();
        });

        this.manager.on('roomCreated', (data) => {
            this.currentRoom = data.roomCode;
            this.showSuccess(`Кімнату створено! Код: ${data.roomCode}`);
            this.render();
        });

        this.manager.on('roomJoined', (data) => {
            this.currentRoom = data.roomCode;
            this.showSuccess(`Приєднались до кімнати ${data.roomCode}`);
            this.render();
        });

        this.manager.on('roomLeft', () => {
            this.currentRoom = null;
            this.players = [];
            this.showSuccess('Покинули кімнату');
            this.render();
        });

        this.manager.on('playersUpdated', (data) => {
            this.players = data.players;
            this.render();
        });

        this.manager.on('gameStateUpdated', (data) => {
            // Handle game state updates
            this.updateGameState(data.gameState);
        });

        this.manager.on('gameStarted', () => {
            this.showSuccess('Гра розпочалась!');
            this.render();
        });

        this.manager.on('gameEnded', () => {
            this.showSuccess('Гра завершена!');
            this.render();
        });

        this.manager.on('connectionStateChanged', (data) => {
            if (data.connected) {
                this.showSuccess('З\'єднання з Firebase відновлено');
            } else {
                this.showError('З\'єднання з Firebase втрачено');
            }
            this.render();
        });

        this.manager.on('error', (data) => {
            this.showError(data.error);
        });
    }

    render() {
        if (!this.container) return;

        const status = this.manager?.getConnectionStatus() || {};
        
        this.container.innerHTML = `
            <div class="firebase-panel">
                <h3>
                    <span class="firebase-icon"></span>
                    Firebase Multiplayer
                </h3>
                
                ${this.renderStatus(status)}
                ${this.renderRoomSection()}
                ${this.renderPlayersSection()}
                ${this.renderActionsSection()}
                ${this.renderMessagesSection()}
            </div>
        `;

        this.attachEventListeners();
    }

    renderStatus(status) {
        const statusClass = status.connected ? 'connected' : 'disconnected';
        const statusText = status.connected ? 'З\'єднано' : 'Не з\'єднано';
        
        return `
            <div class="firebase-status ${statusClass}">
                <div class="realtime-indicator"></div>
                <div>
                    <div>Статус: ${statusText}</div>
                    <div class="sync-status">
                        ${status.initialized ? 'Firebase ініціалізовано' : 'Ініціалізація...'}
                    </div>
                </div>
            </div>
        `;
    }

    renderRoomSection() {
        if (!this.currentRoom) return '';

        return `
            <div class="room-section">
                <h4>Поточна кімната</h4>
                <div class="firebase-room-code">
                    ${this.currentRoom}
                </div>
                <div class="room-info">
                    <small>Поділіться цим кодом з друзями для приєднання</small>
                </div>
            </div>
        `;
    }

    renderPlayersSection() {
        if (!this.currentRoom || this.players.length === 0) return '';

        const playersHtml = this.players.map(player => `
            <div class="firebase-player">
                <div class="player-info">
                    <div class="player-avatar">
                        ${player.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="player-details">
                        <div class="player-name">${player.name}</div>
                        <div class="player-role">
                            ${player.isHost ? 'Хост' : 'Гравець'}
                        </div>
                    </div>
                </div>
                <div class="player-status-badge ${player.status}">
                    ${player.status === 'online' ? '🟢 Онлайн' : '🔴 Офлайн'}
                </div>
            </div>
        `).join('');

        return `
            <div class="firebase-players">
                <h4>Гравці (${this.players.length}/2)</h4>
                ${playersHtml}
            </div>
        `;
    }

    renderActionsSection() {
        const status = this.manager?.getConnectionStatus() || {};
        
        if (!status.initialized) {
            return `
                <div class="firebase-actions">
                    <div class="loading-spinner"></div>
                    <span>Ініціалізація Firebase...</span>
                </div>
            `;
        }

        if (this.currentRoom) {
            return `
                <div class="firebase-actions">
                    ${status.isHost ? this.renderHostActions() : ''}
                    <button class="firebase-btn btn-leave" data-action="leave">
                        Покинути кімнату
                    </button>
                </div>
            `;
        }

        return `
            <div class="firebase-actions">
                <button class="firebase-btn btn-create" data-action="create">
                    Створити кімнату
                </button>
                <div class="join-section">
                    <input 
                        type="text" 
                        class="firebase-input" 
                        id="roomCodeInput"
                        placeholder="Введіть код кімнати"
                        maxlength="6"
                        style="text-transform: uppercase;"
                    />
                    <button class="firebase-btn btn-join" data-action="join">
                        Приєднатися
                    </button>
                </div>
                <div class="name-section">
                    <input 
                        type="text" 
                        class="firebase-input" 
                        id="playerNameInput"
                        placeholder="Ваше ім'я"
                        value="${status.playerName || ''}"
                        maxlength="20"
                    />
                </div>
            </div>
        `;
    }

    renderHostActions() {
        const canStart = this.players.length >= 2;
        
        return `
            <button 
                class="firebase-btn btn-start" 
                data-action="start"
                ${!canStart ? 'disabled' : ''}
            >
                ${canStart ? 'Почати гру' : `Очікування гравців (${this.players.length}/2)`}
            </button>
        `;
    }

    renderMessagesSection() {
        return `
            <div id="firebase-messages" class="firebase-messages"></div>
        `;
    }

    attachEventListeners() {
        // Action buttons
        this.container.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleAction(action);
            });
        });

        // Room code input formatting
        const roomCodeInput = this.container.querySelector('#roomCodeInput');
        if (roomCodeInput) {
            roomCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });

            roomCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAction('join');
                }
            });
        }

        // Player name input
        const playerNameInput = this.container.querySelector('#playerNameInput');
        if (playerNameInput) {
            playerNameInput.addEventListener('blur', () => {
                const name = playerNameInput.value.trim();
                if (name && this.manager) {
                    this.manager.setPlayerName(name);
                }
            });
        }
    }

    async handleAction(action) {
        if (!this.manager) return;

        try {
            switch (action) {
                case 'create':
                    await this.createRoom();
                    break;
                
                case 'join':
                    await this.joinRoom();
                    break;
                
                case 'start':
                    await this.startGame();
                    break;
                
                case 'leave':
                    await this.leaveRoom();
                    break;
            }
        } catch (error) {
            console.error(`Action ${action} failed:`, error);
            this.showError(error.message || `Помилка виконання дії: ${action}`);
        }
    }

    async createRoom() {
        const roomCode = await this.manager.createRoom({
            gameMode: 'classic',
            roundDuration: 60,
            category: 'Змішаний'
        });
        
        // Copy room code to clipboard if possible
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(roomCode);
                this.showSuccess(`Код скопійовано в буфер обміну: ${roomCode}`);
            } catch (error) {
                // Clipboard API failed, that's ok
            }
        }
    }

    async joinRoom() {
        const input = this.container.querySelector('#roomCodeInput');
        const roomCode = input?.value.trim().toUpperCase();
        
        if (!roomCode) {
            this.showError('Введіть код кімнати');
            return;
        }

        if (roomCode.length !== 6) {
            this.showError('Код кімнати повинен містити 6 символів');
            return;
        }

        await this.manager.joinRoom(roomCode);
    }

    async startGame() {
        await this.manager.startGame();
    }

    async leaveRoom() {
        await this.manager.leaveRoom();
    }

    updateGameState(gameState) {
        // This method can be extended to show game-specific UI updates
        console.log('Game state updated:', gameState);
        
        // Example: Show current game status
        if (gameState.status === 'playing') {
            this.showInfo(`Гра в процесі. Раунд: ${gameState.currentRound}`);
        }
    }

    showMessage(message, type = 'info') {
        const messagesContainer = this.container.querySelector('#firebase-messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `firebase-${type}`;
        messageElement.textContent = message;

        messagesContainer.appendChild(messageElement);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 5000);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showInfo(message) {
        this.showMessage(message, 'info');
    }

    // Public API methods
    getManager() {
        return this.manager;
    }

    getCurrentRoom() {
        return this.currentRoom;
    }

    getPlayers() {
        return this.players;
    }

    isHost() {
        return this.manager?.getConnectionStatus()?.isHost || false;
    }

    canStartGame() {
        return this.isHost() && this.players.length >= 2;
    }

    // Cleanup
    destroy() {
        if (this.manager) {
            this.manager.destroy();
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Auto-initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.EnvironmentConfig?.isFirebaseEnabled()) {
        // Wait a bit for Firebase to load
        setTimeout(() => {
            if (typeof FirebaseMultiplayerManager !== 'undefined') {
                window.firebaseMultiplayerUI = new FirebaseMultiplayerUI();
            }
        }, 1000);
    }
});

// Export
if (typeof window !== 'undefined') {
    window.FirebaseMultiplayerUI = FirebaseMultiplayerUI;
}
