// Multiplayer Integration for Word Game
class MultiplayerGameIntegration {
    constructor(wordGame) {
        this.game = wordGame;
        this.mp = window.multiplayerManager;
        this.isMultiplayerMode = false;
        
        if (this.mp) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Room events
        this.mp.on('roomCreated', (data) => this.onRoomCreated(data));
        this.mp.on('roomJoined', (data) => this.onRoomJoined(data));
        this.mp.on('playerJoined', (data) => this.onPlayerJoined(data));
        this.mp.on('playerLeft', (data) => this.onPlayerLeft(data));

        // Game events
        this.mp.on('gameStarted', (data) => this.onGameStarted(data));
        this.mp.on('gameAction', (data) => this.onGameAction(data));
        this.mp.on('gameStateUpdate', (data) => this.onGameStateUpdate(data));
        
        // Connection events
        this.mp.on('disconnected', () => this.onDisconnected());
        this.mp.on('error', (data) => this.onError(data));
    }

    // Room Management UI
    showCreateRoom() {
        const screen = this.game.createElement('div', {
            className: 'card hidden-screen',
            id: 'create-room-screen'
        });

        screen.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">🏠 Створити кімнату</h2>
            
            <div class="multiplayer-panel">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 text-white">Ваше ім'я:</label>
                    <input type="text" id="player-name-input" class="room-input" 
                           placeholder="Введіть ваше ім'я..." 
                           value="${this.mp?.getPlayerName() || ''}">
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 text-white">Категорія слів:</label>
                    <select id="room-category" class="room-input">
                        <option value="Змішаний">🎲 Змішаний</option>
                        <option value="Технології">💻 Технології</option>
                        <option value="Природа">🌿 Природа</option>
                        <option value="Їжа">🍕 Їжа</option>
                        <option value="Спорт">⚽ Спорт</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 text-white">Тривалість раунду:</label>
                    <select id="room-duration" class="room-input">
                        <option value="30">30 секунд</option>
                        <option value="60" selected>60 секунд</option>
                        <option value="90">90 секунд</option>
                        <option value="120">2 хвилини</option>
                    </select>
                </div>
                
                <div id="connection-status" class="connection-status">
                    <div class="status-indicator connecting"></div>
                    <span class="text-white">Підключення до сервера...</span>
                </div>
            </div>
            
            <div class="flex gap-3 mt-6">
                <button id="create-room-confirm-btn" class="btn btn-host flex-1" disabled>
                    Створити кімнату
                </button>
                <button id="cancel-create-room-btn" class="btn btn-leave">
                    Скасувати
                </button>
            </div>
        `;

        this.game.showScreen(screen);
        this.setupCreateRoomHandlers();
    }

    showJoinRoom() {
        const screen = this.game.createElement('div', {
            className: 'card hidden-screen',
            id: 'join-room-screen'
        });

        screen.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">🚪 Приєднатися до кімнати</h2>
            
            <div class="multiplayer-panel">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 text-white">Ваше ім'я:</label>
                    <input type="text" id="join-player-name" class="room-input" 
                           placeholder="Введіть ваше ім'я..." 
                           value="${this.mp?.getPlayerName() || ''}">
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 text-white">Код кімнати:</label>
                    <input type="text" id="room-code-input" class="room-input" 
                           placeholder="Введіть 6-значний код..." 
                           maxlength="6" style="text-transform: uppercase;">
                </div>
                
                <div id="join-connection-status" class="connection-status">
                    <div class="status-indicator connecting"></div>
                    <span class="text-white">Підключення до сервера...</span>
                </div>
            </div>
            
            <div class="flex gap-3 mt-6">
                <button id="join-room-confirm-btn" class="btn btn-join flex-1" disabled>
                    Приєднатися
                </button>
                <button id="cancel-join-room-btn" class="btn btn-leave">
                    Скасувати
                </button>
            </div>
        `;

        this.game.showScreen(screen);
        this.setupJoinRoomHandlers();
    }

    showRoomLobby(roomCode, isHost) {
        const screen = this.game.createElement('div', {
            className: 'card hidden-screen',
            id: 'room-lobby-screen'
        });

        screen.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">
                ${isHost ? '🏠 Ваша кімната' : '🚪 Кімната'}
            </h2>
            
            <div class="multiplayer-panel">
                <h3 class="text-white">Код кімнати</h3>
                <div class="room-code">${roomCode}</div>
                
                <div id="players-section">
                    <h4 class="text-white">Гравці в кімнаті:</h4>
                    <div id="player-list" class="player-list">
                        <!-- Players will be populated here -->
                    </div>
                </div>
                
                <div id="waiting-section" class="text-center">
                    <div class="waiting-animation">
                        <div class="waiting-dot"></div>
                        <div class="waiting-dot"></div>
                        <div class="waiting-dot"></div>
                    </div>
                    <p class="text-white">Очікування другого гравця...</p>
                </div>
                
                <div id="lobby-connection-status" class="connection-status">
                    <div class="status-indicator connected"></div>
                    <span class="text-white">Підключено</span>
                </div>
            </div>
            
            <div class="multiplayer-actions">
                ${isHost ? `
                    <button id="start-multiplayer-game-btn" class="btn btn-host" disabled>
                        Почати гру
                    </button>
                ` : ''}
                <button id="leave-room-btn" class="btn btn-leave">
                    Покинути кімнату
                </button>
            </div>
        `;

        this.game.showScreen(screen);
        this.setupLobbyHandlers(isHost);
        this.updatePlayerList();
    }

    // Event handlers
    setupCreateRoomHandlers() {
        const createBtn = document.getElementById('create-room-confirm-btn');
        const cancelBtn = document.getElementById('cancel-create-room-btn');
        const nameInput = document.getElementById('player-name-input');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.game.backToStart());
        }

        if (nameInput) {
            nameInput.addEventListener('input', () => {
                if (this.mp) {
                    this.mp.setPlayerName(nameInput.value);
                }
            });
        }

        if (createBtn && this.mp) {
            this.mp.connect()
                .then(() => {
                    this.updateConnectionStatus('create', 'connected');
                    createBtn.disabled = false;
                    
                    createBtn.addEventListener('click', async () => {
                        createBtn.disabled = true;
                        createBtn.textContent = 'Створення...';
                        
                        const settings = {
                            category: document.getElementById('room-category').value,
                            roundDuration: parseInt(document.getElementById('room-duration').value),
                            maxPlayers: 2
                        };
                        
                        await this.mp.createRoom(settings);
                    });
                })
                .catch((error) => {
                    this.updateConnectionStatus('create', 'disconnected');
                    this.game.showError('Не вдалося підключитися до сервера: ' + error.message);
                });
        }
    }

    setupJoinRoomHandlers() {
        const joinBtn = document.getElementById('join-room-confirm-btn');
        const cancelBtn = document.getElementById('cancel-join-room-btn');
        const nameInput = document.getElementById('join-player-name');
        const codeInput = document.getElementById('room-code-input');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.game.backToStart());
        }

        if (nameInput) {
            nameInput.addEventListener('input', () => {
                if (this.mp) {
                    this.mp.setPlayerName(nameInput.value);
                }
            });
        }

        if (codeInput) {
            codeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }

        if (joinBtn && this.mp) {
            this.mp.connect()
                .then(() => {
                    this.updateConnectionStatus('join', 'connected');
                    joinBtn.disabled = false;
                    
                    joinBtn.addEventListener('click', async () => {
                        const roomCode = codeInput.value.trim();
                        if (roomCode.length !== 6) {
                            this.game.showError('Введіть 6-значний код кімнати');
                            return;
                        }
                        
                        joinBtn.disabled = true;
                        joinBtn.textContent = 'Приєднання...';
                        
                        await this.mp.joinRoom(roomCode);
                    });
                })
                .catch((error) => {
                    this.updateConnectionStatus('join', 'disconnected');
                    this.game.showError('Не вдалося підключитися до сервера: ' + error.message);
                });
        }
    }

    setupLobbyHandlers(isHost) {
        const leaveBtn = document.getElementById('leave-room-btn');
        const startBtn = document.getElementById('start-multiplayer-game-btn');

        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => {
                if (this.mp) {
                    this.mp.leaveRoom();
                }
                this.game.backToStart();
            });
        }

        if (startBtn && isHost) {
            startBtn.addEventListener('click', () => {
                if (this.mp && this.mp.canStartGame()) {
                    this.mp.startGame();
                }
            });
        }
    }

    updateConnectionStatus(type, status) {
        const statusElement = document.getElementById(
            type === 'create' ? 'connection-status' : 
            type === 'join' ? 'join-connection-status' : 
            'lobby-connection-status'
        );
        if (!statusElement) return;

        const indicator = statusElement.querySelector('.status-indicator');
        const text = statusElement.querySelector('span');

        if (indicator) indicator.className = `status-indicator ${status}`;
        
        if (text) {
            switch (status) {
                case 'connected':
                    text.textContent = 'Підключено до сервера';
                    break;
                case 'disconnected':
                    text.textContent = 'Помилка підключення';
                    break;
                case 'connecting':
                default:
                    text.textContent = 'Підключення до сервера...';
                    break;
            }
        }
    }

    updatePlayerList() {
        const playerList = document.getElementById('player-list');
        const waitingSection = document.getElementById('waiting-section');
        const startBtn = document.getElementById('start-multiplayer-game-btn');

        if (!playerList || !this.mp) return;

        const players = this.mp.getPlayers();
        
        playerList.innerHTML = '';
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.innerHTML = `
                <span class="player-name">${player.name}</span>
                <span class="player-status">${player.isHost ? 'Хост' : 'Гравець'}</span>
            `;
            playerList.appendChild(playerItem);
        });

        // Show/hide waiting section
        if (waitingSection) {
            waitingSection.style.display = players.length < 2 ? 'block' : 'none';
        }

        // Enable/disable start button for host
        if (startBtn) {
            startBtn.disabled = !this.mp.canStartGame();
        }
    }

    // Multiplayer Event Handlers
    onRoomCreated(data) {
        this.showRoomLobby(data.roomCode, true);
    }

    onRoomJoined(data) {
        this.showRoomLobby(data.roomCode, false);
    }

    onPlayerJoined(data) {
        this.updatePlayerList();
        this.showNotification(`${data.player.name} приєднався до гри`);
    }

    onPlayerLeft(data) {
        this.updatePlayerList();
        this.showNotification(`Гравець покинув гру`);
    }

    onGameStarted(data) {
        this.isMultiplayerMode = true;
        this.startMultiplayerGame(data.state);
    }

    onGameAction(data) {
        console.log('Multiplayer game action:', data);
        this.showNotification(`${data.playerName || 'Гравець'}: ${data.action}`);
    }

    onGameStateUpdate(data) {
        console.log('Multiplayer game state update:', data);
    }

    onDisconnected() {
        this.game.showError('Втрачено з\'єднання з сервером');
    }

    onError(data) {
        this.game.showError('Помилка мультиплеєра: ' + data.error);
    }

    // Multiplayer Game Logic
    startMultiplayerGame(initialState) {
        const gameScreen = this.game.createElement('div', {
            className: 'card hidden-screen',
            id: 'multiplayer-game-screen'
        });

        gameScreen.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-semibold text-gray-700">🌐 Мультиплеєр гра</h2>
                <button id="exit-multiplayer-game-btn" class="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                    Вийти
                </button>
            </div>
            
            <div id="multiplayer-players" class="mb-4 grid grid-cols-2 gap-4">
                <!-- Players info will be populated here -->
            </div>
            
            <div class="text-center my-6 p-6 bg-indigo-50 rounded-lg min-h-[120px] flex items-center justify-center">
                <h2 id="multiplayer-word" class="text-3xl md:text-4xl font-bold text-gray-800 tracking-wider word-display">
                    ОЧІКУВАННЯ...
                </h2>
            </div>
            
            <div id="multiplayer-controls" class="mt-4">
                <div class="grid grid-cols-2 gap-4">
                    <button id="mp-correct-button" class="btn btn-primary bg-green-500 hover:bg-green-600">
                        Правильно!
                    </button>
                    <button id="mp-skip-button" class="btn btn-secondary">
                        Пропустити
                    </button>
                </div>
                
                <!-- Speech controls for multiplayer -->
                <div id="mp-speech-controls" class="mt-4 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div class="grid grid-cols-3 gap-2">
                        <button id="mp-voice-listen-btn" class="btn btn-sm bg-blue-500 text-white hover:bg-blue-600">
                            <span class="text-xs">🎤</span>
                        </button>
                        <button id="mp-voice-repeat-btn" class="btn btn-sm bg-purple-500 text-white hover:bg-purple-600">
                            <span class="text-xs">🔄</span>
                        </button>
                        <button id="mp-voice-hint-btn" class="btn btn-sm bg-orange-500 text-white hover:bg-orange-600">
                            <span class="text-xs">💡</span>
                        </button>
                    </div>
                    <div class="text-xs text-gray-600 text-center mt-2">
                        Голосові команди для мультиплеєра
                    </div>
                </div>
            </div>
            
            <div id="mp-game-log" class="mt-4 p-3 bg-gray-100 rounded-lg max-h-32 overflow-y-auto">
                <div class="text-sm text-gray-600">Журнал гри:</div>
                <div id="mp-log-content"></div>
            </div>
        `;

        this.game.showScreen(gameScreen);
        this.setupMultiplayerGameHandlers();
        this.logGameEvent('Гра розпочата!');
    }

    setupMultiplayerGameHandlers() {
        const exitBtn = document.getElementById('exit-multiplayer-game-btn');
        const correctBtn = document.getElementById('mp-correct-button');
        const skipBtn = document.getElementById('mp-skip-button');

        // Speech controls
        const voiceListenBtn = document.getElementById('mp-voice-listen-btn');
        const voiceRepeatBtn = document.getElementById('mp-voice-repeat-btn');
        const voiceHintBtn = document.getElementById('mp-voice-hint-btn');

        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                if (this.mp) {
                    this.mp.leaveRoom();
                }
                this.game.backToStart();
            });
        }

        if (correctBtn) {
            correctBtn.addEventListener('click', () => {
                this.sendMultiplayerAction('correct');
                this.logGameEvent('Ви відмітили слово як правильне');
            });
        }

        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.sendMultiplayerAction('skip');
                this.logGameEvent('Ви пропустили слово');
            });
        }

        // Speech controls for multiplayer
        if (voiceListenBtn && window.speechManager) {
            voiceListenBtn.addEventListener('click', () => {
                const started = window.speechManager.startListening();
                if (started) {
                    this.logGameEvent('Голосове слухання активовано');
                }
            });
        }

        if (voiceRepeatBtn && window.speechManager) {
            voiceRepeatBtn.addEventListener('click', () => {
                const currentWord = document.getElementById('multiplayer-word').textContent;
                if (currentWord && currentWord !== 'ОЧІКУВАННЯ...') {
                    window.speechManager.announceWord(currentWord);
                    this.logGameEvent('Слово повторено голосом');
                }
            });
        }

        if (voiceHintBtn && window.speechManager) {
            voiceHintBtn.addEventListener('click', () => {
                const currentWord = document.getElementById('multiplayer-word').textContent;
                if (currentWord && currentWord !== 'ОЧІКУВАННЯ...') {
                    const hint = `Перша літера: ${currentWord.charAt(0)}, всього літер: ${currentWord.length}`;
                    window.speechManager.announceHint(hint);
                    this.logGameEvent('Підказка озвучена');
                }
            });
        }
    }

    sendMultiplayerAction(action, data = {}) {
        if (this.mp) {
            this.mp.sendGameAction(action, data);
        }
    }

    logGameEvent(message) {
        const logContent = document.getElementById('mp-log-content');
        if (logContent) {
            const time = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.className = 'text-xs text-gray-700 mb-1';
            logEntry.textContent = `[${time}] ${message}`;
            logContent.appendChild(logEntry);
            logContent.scrollTop = logContent.scrollHeight;
        }
    }

    showNotification(message) {
        // Create floating notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);

        // Also log to game log
        this.logGameEvent(message);
    }
}

// Initialize multiplayer integration when game is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for game to be initialized
    setTimeout(() => {
        if (window.wordGame && window.multiplayerManager) {
            window.multiplayerIntegration = new MultiplayerGameIntegration(window.wordGame);
            
            // Add multiplayer methods to game instance
            window.wordGame.showCreateRoom = () => window.multiplayerIntegration.showCreateRoom();
            window.wordGame.showJoinRoom = () => window.multiplayerIntegration.showJoinRoom();
        }
    }, 1000);
});
