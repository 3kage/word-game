// Multiplayer WebSocket Manager
class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.isHost = false;
        this.roomCode = null;
        this.playerId = null;
        this.players = new Map();
        this.gameState = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.heartbeatInterval = null;
        
        // Events
        this.eventHandlers = new Map();
        
        this.init();
    }

    async init() {
        // Check if multiplayer is enabled
        if (!window.EnvironmentConfig?.isMultiplayerEnabled()) {
            console.log('Multiplayer disabled in configuration');
            return;
        }

        // Generate unique player ID
        this.playerId = this.generatePlayerId();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    generatePlayerId() {
        const saved = localStorage.getItem('multiplayer_player_id');
        if (saved) return saved;
        
        const newId = 'player_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('multiplayer_player_id', newId);
        return newId;
    }

    setupEventListeners() {
        // Listen for page visibility changes to handle reconnection
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.roomCode && !this.isConnected) {
                this.reconnect();
            }
        });

        // Listen for beforeunload to properly disconnect
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });
    }

    // Connection Management
    async connect() {
        if (this.socket && this.isConnected) {
            console.log('Already connected');
            return true;
        }

        try {
            const wsUrl = window.EnvironmentConfig?.getWebSocketURL() || 'ws://localhost:3001';
            console.log(`Connecting to WebSocket: ${wsUrl}`);
            
            this.socket = new WebSocket(wsUrl);
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);

                this.socket.onopen = () => {
                    clearTimeout(timeout);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    
                    console.log('WebSocket connected');
                    this.emit('connected');
                    resolve(true);
                };

                this.socket.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.socket.onclose = (event) => {
                    this.isConnected = false;
                    this.stopHeartbeat();
                    
                    console.log('WebSocket disconnected:', event.code, event.reason);
                    this.emit('disconnected', { code: event.code, reason: event.reason });
                    
                    // Auto-reconnect if not intentional disconnect
                    if (event.code !== 1000 && this.roomCode) {
                        this.scheduleReconnect();
                    }
                };

                this.socket.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('WebSocket error:', error);
                    this.emit('error', error);
                    reject(error);
                };
            });
        } catch (error) {
            console.error('Failed to connect:', error);
            throw error;
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close(1000, 'User disconnected');
            this.socket = null;
        }
        this.isConnected = false;
        this.stopHeartbeat();
    }

    async reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('maxReconnectAttemptsReached');
            return false;
        }

        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        try {
            await this.connect();
            
            // Rejoin room if we were in one
            if (this.roomCode) {
                await this.joinRoom(this.roomCode);
            }
            
            return true;
        } catch (error) {
            console.error('Reconnection failed:', error);
            this.scheduleReconnect();
            return false;
        }
    }

    scheduleReconnect() {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
        setTimeout(() => this.reconnect(), delay);
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send('ping');
            }
        }, 30000); // 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Message Handling
    send(type, data = {}) {
        if (!this.isConnected || !this.socket) {
            console.warn('Cannot send message: not connected');
            return false;
        }

        const message = {
            type,
            playerId: this.playerId,
            roomCode: this.roomCode,
            timestamp: Date.now(),
            ...data
        };

        try {
            this.socket.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Failed to send message:', error);
            return false;
        }
    }

    handleMessage(rawData) {
        try {
            const message = JSON.parse(rawData);
            console.log('Received message:', message);

            switch (message.type) {
                case 'pong':
                    // Heartbeat response
                    break;
                
                case 'roomCreated':
                    this.handleRoomCreated(message);
                    break;
                
                case 'roomJoined':
                    this.handleRoomJoined(message);
                    break;
                
                case 'playerJoined':
                    this.handlePlayerJoined(message);
                    break;
                
                case 'playerLeft':
                    this.handlePlayerLeft(message);
                    break;
                
                case 'gameStateUpdate':
                    this.handleGameStateUpdate(message);
                    break;
                
                case 'gameAction':
                    this.handleGameAction(message);
                    break;
                
                case 'gameStarted':
                    this.handleGameStarted(message);
                    break;
                
                case 'gameEnded':
                    this.handleGameEnded(message);
                    break;
                
                case 'error':
                    this.handleError(message);
                    break;
                
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    }

    // Room Management
    async createRoom(settings = {}) {
        if (!this.isConnected) {
            await this.connect();
        }

        const roomSettings = {
            maxPlayers: 2,
            gameMode: 'classic',
            roundDuration: 60,
            category: 'Змішаний',
            ...settings
        };

        this.send('createRoom', { settings: roomSettings });
        this.isHost = true;
    }

    async joinRoom(code) {
        if (!this.isConnected) {
            await this.connect();
        }

        this.send('joinRoom', { roomCode: code });
    }

    leaveRoom() {
        if (this.roomCode) {
            this.send('leaveRoom');
            this.cleanupRoom();
        }
    }

    cleanupRoom() {
        this.roomCode = null;
        this.isHost = false;
        this.players.clear();
        this.gameState = null;
    }

    // Game Actions
    startGame() {
        if (!this.isHost) {
            console.warn('Only host can start the game');
            return;
        }
        
        this.send('startGame');
    }

    sendGameAction(action, data = {}) {
        this.send('gameAction', { action, ...data });
    }

    updateGameState(state) {
        if (this.isHost) {
            this.send('gameStateUpdate', { state });
        }
    }

    // Message Handlers
    handleRoomCreated(message) {
        this.roomCode = message.roomCode;
        this.emit('roomCreated', { roomCode: this.roomCode });
    }

    handleRoomJoined(message) {
        this.roomCode = message.roomCode;
        this.players = new Map(Object.entries(message.players || {}));
        this.emit('roomJoined', { 
            roomCode: this.roomCode, 
            players: Array.from(this.players.values()) 
        });
    }

    handlePlayerJoined(message) {
        this.players.set(message.player.id, message.player);
        this.emit('playerJoined', { player: message.player });
    }

    handlePlayerLeft(message) {
        this.players.delete(message.playerId);
        this.emit('playerLeft', { playerId: message.playerId });
    }

    handleGameStateUpdate(message) {
        this.gameState = message.state;
        this.emit('gameStateUpdate', { state: message.state });
    }

    handleGameAction(message) {
        this.emit('gameAction', { 
            playerId: message.playerId, 
            action: message.action, 
            data: message 
        });
    }

    handleGameStarted(message) {
        this.gameState = message.initialState;
        this.emit('gameStarted', { state: message.initialState });
    }

    handleGameEnded(message) {
        this.emit('gameEnded', { result: message.result });
    }

    handleError(message) {
        console.error('Server error:', message.error);
        this.emit('error', { error: message.error });
    }

    // Event System
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Event handler error:', error);
                }
            });
        }
    }

    // Utility Methods
    getPlayerName() {
        const saved = localStorage.getItem('multiplayer_player_name');
        if (saved) return saved;
        
        const names = [
            'Гравець', 'Мандрівник', 'Знавець', 'Ерудит', 'Словник', 
            'Читач', 'Поет', 'Мислитель', 'Майстер', 'Чемпіон'
        ];
        const randomName = names[Math.floor(Math.random() * names.length)] + ' ' + 
                          Math.floor(Math.random() * 1000);
        
        localStorage.setItem('multiplayer_player_name', randomName);
        return randomName;
    }

    setPlayerName(name) {
        localStorage.setItem('multiplayer_player_name', name);
        if (this.roomCode) {
            this.send('updatePlayer', { name });
        }
    }

    getPlayers() {
        return Array.from(this.players.values());
    }

    getPlayerCount() {
        return this.players.size;
    }

    isRoomFull() {
        return this.getPlayerCount() >= 2; // For word game, max 2 players
    }

    canStartGame() {
        return this.isHost && this.getPlayerCount() >= 2;
    }

    // Connection Status
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            roomCode: this.roomCode,
            playerId: this.playerId,
            isHost: this.isHost,
            playerCount: this.getPlayerCount(),
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// CSS for multiplayer UI
const multiplayerCSS = `
.multiplayer-panel {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    padding: 16px;
    margin: 16px 0;
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.multiplayer-panel h3 {
    margin: 0 0 12px 0;
    font-size: 1.1rem;
    font-weight: 600;
}

.room-code {
    background: rgba(255, 255, 255, 0.2);
    padding: 8px 12px;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 1.2rem;
    font-weight: bold;
    text-align: center;
    margin: 8px 0;
    border: 2px dashed rgba(255, 255, 255, 0.3);
}

.player-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 12px 0;
}

.player-item {
    background: rgba(255, 255, 255, 0.15);
    padding: 8px 12px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.player-name {
    font-weight: 500;
}

.player-status {
    font-size: 0.8rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.2);
}

.connection-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    margin: 8px 0;
}

.status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10B981;
    animation: pulse 2s infinite;
}

.status-indicator.disconnected {
    background: #EF4444;
}

.status-indicator.connecting {
    background: #F59E0B;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.multiplayer-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
}

.multiplayer-actions button {
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-host {
    background: #10B981;
    color: white;
}

.btn-host:hover {
    background: #059669;
}

.btn-join {
    background: #3B82F6;
    color: white;
}

.btn-join:hover {
    background: #2563EB;
}

.btn-leave {
    background: #EF4444;
    color: white;
}

.btn-leave:hover {
    background: #DC2626;
}

.room-input {
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1rem;
    width: 100%;
    margin: 8px 0;
}

.room-input::placeholder {
    color: rgba(255, 255, 255, 0.7);
}

.waiting-animation {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 12px 0;
}

.waiting-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: white;
    animation: waitingPulse 1.4s ease-in-out infinite both;
}

.waiting-dot:nth-child(1) { animation-delay: -0.32s; }
.waiting-dot:nth-child(2) { animation-delay: -0.16s; }
.waiting-dot:nth-child(3) { animation-delay: 0s; }

@keyframes waitingPulse {
    0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
}
`;

// Add CSS to document
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = multiplayerCSS;
    document.head.appendChild(style);
}

// Global instance
let multiplayerManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.EnvironmentConfig?.isMultiplayerEnabled()) {
        multiplayerManager = new MultiplayerManager();
        window.multiplayerManager = multiplayerManager;
    }
});

// Export
if (typeof window !== 'undefined') {
    window.MultiplayerManager = MultiplayerManager;
}
