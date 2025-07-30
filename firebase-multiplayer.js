// Firebase Realtime Database Multiplayer Implementation
class FirebaseMultiplayerManager {
    constructor() {
        this.database = null;
        this.auth = null;
        this.gameRef = null;
        this.playersRef = null;
        this.roomCode = null;
        this.playerId = null;
        this.playerName = null;
        this.isHost = false;
        this.listeners = new Map();
        this.eventHandlers = new Map();
        this.isInitialized = false;
        this.connectionState = 'disconnected'; // disconnected, connecting, connected
        
        this.init();
    }

    async init() {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                console.error('Firebase SDK not loaded');
                return;
            }

            // Initialize Firebase if not already done
            if (!firebase.apps.length) {
                // Get config from environment or use Firebase config helper
                const firebaseConfig = window.EnvironmentConfig?.getFirebaseConfig() || 
                    window.FirebaseConfig?.getConfig() || {
                    // Real config for word-bot-ua project
                    apiKey: "AIzaSyDT_5CQ_NrbmGKuYiXjJs_2uSw62fVK4QY",
                    authDomain: "word-bot-ua.firebaseapp.com",
                    databaseURL: "https://word-bot-ua-default-rtdb.europe-west1.firebasedatabase.app",
                    projectId: "word-bot-ua",
                    storageBucket: "word-bot-ua.firebasestorage.app",
                    messagingSenderId: "1043590586166",
                    appId: "1:1043590586166:web:5a461a3f61ef5d2db3d4c7",
                    measurementId: "G-TMBHNXWKDK"
                };
                
                firebase.initializeApp(firebaseConfig);
            }

            this.database = firebase.database();
            this.auth = firebase.auth();
            
            // Set up anonymous authentication
            await this.setupAuth();
            
            // Set up connection monitoring
            this.setupConnectionMonitoring();
            
            this.isInitialized = true;
            this.emit('initialized');
            
            console.log('Firebase Multiplayer initialized');
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            this.emit('error', { error: 'Failed to initialize Firebase' });
        }
    }

    async setupAuth() {
        return new Promise((resolve, reject) => {
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.playerId = user.uid;
                    this.playerName = this.getPlayerName();
                    console.log('Firebase auth successful:', this.playerId);
                    resolve(user);
                } else {
                    try {
                        // Sign in anonymously
                        const userCredential = await this.auth.signInAnonymously();
                        this.playerId = userCredential.user.uid;
                        this.playerName = this.getPlayerName();
                        resolve(userCredential.user);
                    } catch (error) {
                        console.error('Anonymous auth failed:', error);
                        reject(error);
                    }
                }
            });
        });
    }

    setupConnectionMonitoring() {
        const connectedRef = this.database.ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            const connected = snapshot.val();
            this.connectionState = connected ? 'connected' : 'disconnected';
            this.emit('connectionStateChanged', { connected });
            
            if (connected && this.roomCode) {
                // Update player's last seen when reconnected
                this.updatePlayerPresence();
            }
        });
    }

    // Room Management
    async createRoom(settings = {}) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        const roomCode = this.generateRoomCode();
        const roomData = {
            code: roomCode,
            hostId: this.playerId,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            settings: {
                maxPlayers: 2,
                gameMode: 'classic',
                roundDuration: 60,
                category: 'Змішаний',
                ...settings
            },
            gameState: {
                status: 'waiting', // waiting, playing, paused, finished
                currentRound: 0,
                scores: {},
                currentWord: null,
                currentPlayer: null,
                timeLeft: 0,
                wordsGuessed: [],
                wordsSkipped: []
            },
            players: {
                [this.playerId]: {
                    id: this.playerId,
                    name: this.playerName,
                    isHost: true,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP,
                    status: 'online'
                }
            }
        };

        try {
            await this.database.ref(`rooms/${roomCode}`).set(roomData);
            
            this.roomCode = roomCode;
            this.isHost = true;
            this.gameRef = this.database.ref(`rooms/${roomCode}`);
            this.playersRef = this.database.ref(`rooms/${roomCode}/players`);
            
            // Set up room listeners
            this.setupRoomListeners();
            
            // Set up presence system
            this.setupPresenceSystem();
            
            this.emit('roomCreated', { roomCode });
            return roomCode;
        } catch (error) {
            console.error('Failed to create room:', error);
            throw error;
        }
    }

    async joinRoom(roomCode) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            // Check if room exists
            const roomSnapshot = await this.database.ref(`rooms/${roomCode}`).once('value');
            if (!roomSnapshot.exists()) {
                throw new Error('Room not found');
            }

            const roomData = roomSnapshot.val();
            
            // Check if room is full
            const playerCount = Object.keys(roomData.players || {}).length;
            if (playerCount >= roomData.settings.maxPlayers) {
                throw new Error('Room is full');
            }

            // Check if game is already in progress
            if (roomData.gameState.status === 'playing') {
                throw new Error('Game already in progress');
            }

            // Add player to room
            const playerData = {
                id: this.playerId,
                name: this.playerName,
                isHost: false,
                joinedAt: firebase.database.ServerValue.TIMESTAMP,
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                status: 'online'
            };

            await this.database.ref(`rooms/${roomCode}/players/${this.playerId}`).set(playerData);

            this.roomCode = roomCode;
            this.isHost = false;
            this.gameRef = this.database.ref(`rooms/${roomCode}`);
            this.playersRef = this.database.ref(`rooms/${roomCode}/players`);
            
            // Set up room listeners
            this.setupRoomListeners();
            
            // Set up presence system
            this.setupPresenceSystem();
            
            this.emit('roomJoined', { roomCode });
            return true;
        } catch (error) {
            console.error('Failed to join room:', error);
            throw error;
        }
    }

    async leaveRoom() {
        if (!this.roomCode) return;

        try {
            // Remove player from room
            await this.database.ref(`rooms/${this.roomCode}/players/${this.playerId}`).remove();
            
            // If host is leaving and there are other players, transfer host
            if (this.isHost) {
                await this.transferHostIfNeeded();
            }
            
            // Clean up listeners
            this.cleanupListeners();
            
            // Clean up local state
            this.roomCode = null;
            this.isHost = false;
            this.gameRef = null;
            this.playersRef = null;
            
            this.emit('roomLeft');
        } catch (error) {
            console.error('Failed to leave room:', error);
        }
    }

    async transferHostIfNeeded() {
        if (!this.gameRef) return;

        try {
            const playersSnapshot = await this.playersRef.once('value');
            const players = playersSnapshot.val() || {};
            
            // Find another player to make host
            const otherPlayers = Object.values(players).filter(p => p.id !== this.playerId);
            if (otherPlayers.length > 0) {
                const newHost = otherPlayers[0];
                await this.database.ref(`rooms/${this.roomCode}`).update({
                    hostId: newHost.id,
                    [`players/${newHost.id}/isHost`]: true
                });
            } else {
                // No other players, delete the room
                await this.gameRef.remove();
            }
        } catch (error) {
            console.error('Failed to transfer host:', error);
        }
    }

    setupRoomListeners() {
        if (!this.gameRef) return;

        // Listen to players changes
        this.listeners.set('players', this.playersRef.on('value', (snapshot) => {
            const players = snapshot.val() || {};
            this.emit('playersUpdated', { players: Object.values(players) });
        }));

        // Listen to game state changes
        this.listeners.set('gameState', this.gameRef.child('gameState').on('value', (snapshot) => {
            const gameState = snapshot.val();
            if (gameState) {
                this.emit('gameStateUpdated', { gameState });
            }
        }));

        // Listen to game actions
        this.listeners.set('gameActions', this.gameRef.child('gameActions').on('child_added', (snapshot) => {
            const action = snapshot.val();
            if (action && action.playerId !== this.playerId) {
                this.emit('gameAction', action);
            }
        }));
    }

    setupPresenceSystem() {
        if (!this.playersRef || !this.playerId) return;

        const playerRef = this.playersRef.child(this.playerId);
        const presenceRef = this.database.ref('.info/connected');

        presenceRef.on('value', (snapshot) => {
            if (snapshot.val()) {
                // When connected, set up disconnect handler
                playerRef.child('status').onDisconnect().set('offline');
                playerRef.child('lastSeen').onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
                
                // Set online status
                playerRef.update({
                    status: 'online',
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                });
            }
        });
    }

    updatePlayerPresence() {
        if (this.playersRef && this.playerId) {
            this.playersRef.child(this.playerId).update({
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                status: 'online'
            });
        }
    }

    cleanupListeners() {
        this.listeners.forEach((listener, key) => {
            if (key === 'players' && this.playersRef) {
                this.playersRef.off('value', listener);
            } else if (key === 'gameState' && this.gameRef) {
                this.gameRef.child('gameState').off('value', listener);
            } else if (key === 'gameActions' && this.gameRef) {
                this.gameRef.child('gameActions').off('child_added', listener);
            }
        });
        this.listeners.clear();
    }

    // Game Actions
    async startGame() {
        if (!this.isHost || !this.gameRef) {
            throw new Error('Only host can start the game');
        }

        try {
            const playersSnapshot = await this.playersRef.once('value');
            const players = Object.values(playersSnapshot.val() || {});
            
            if (players.length < 2) {
                throw new Error('Need at least 2 players to start');
            }

            const updates = {
                'gameState/status': 'playing',
                'gameState/currentRound': 1,
                'gameState/currentPlayer': players[0].id,
                'gameState/startedAt': firebase.database.ServerValue.TIMESTAMP
            };

            // Initialize scores
            players.forEach(player => {
                updates[`gameState/scores/${player.id}`] = 0;
            });

            await this.gameRef.update(updates);
            this.emit('gameStarted');
        } catch (error) {
            console.error('Failed to start game:', error);
            throw error;
        }
    }

    async sendGameAction(action, data = {}) {
        if (!this.gameRef) return;

        const actionData = {
            type: action,
            playerId: this.playerId,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            ...data
        };

        try {
            await this.gameRef.child('gameActions').push(actionData);
        } catch (error) {
            console.error('Failed to send game action:', error);
        }
    }

    async updateGameState(updates) {
        if (!this.gameRef) return;

        try {
            const gameStateUpdates = {};
            Object.keys(updates).forEach(key => {
                gameStateUpdates[`gameState/${key}`] = updates[key];
            });
            
            await this.gameRef.update(gameStateUpdates);
        } catch (error) {
            console.error('Failed to update game state:', error);
        }
    }

    async nextWord(word) {
        if (!this.gameRef) return;

        await this.updateGameState({
            currentWord: word,
            wordStartTime: firebase.database.ServerValue.TIMESTAMP
        });
    }

    async correctGuess(word) {
        if (!this.gameRef) return;

        const actionData = {
            word,
            result: 'correct',
            points: 1
        };

        await this.sendGameAction('wordGuessed', actionData);
        
        // Update score
        const currentScore = await this.getPlayerScore();
        await this.updateGameState({
            [`scores/${this.playerId}`]: currentScore + 1,
            wordsGuessed: firebase.database.ServerValue.arrayUnion(word)
        });
    }

    async skipWord(word) {
        if (!this.gameRef) return;

        await this.sendGameAction('wordSkipped', { word });
        await this.updateGameState({
            wordsSkipped: firebase.database.ServerValue.arrayUnion(word)
        });
    }

    async endGame() {
        if (!this.gameRef) return;

        await this.updateGameState({
            status: 'finished',
            endedAt: firebase.database.ServerValue.TIMESTAMP
        });

        this.emit('gameEnded');
    }

    // Utility Methods
    generateRoomCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    getPlayerName() {
        const saved = localStorage.getItem('firebase_player_name');
        if (saved) return saved;
        
        const names = [
            'Гравець', 'Мандрівник', 'Знавець', 'Ерудит', 'Словник', 
            'Читач', 'Поет', 'Мислитель', 'Майстер', 'Чемпіон'
        ];
        const randomName = names[Math.floor(Math.random() * names.length)] + ' ' + 
                          Math.floor(Math.random() * 1000);
        
        localStorage.setItem('firebase_player_name', randomName);
        return randomName;
    }

    setPlayerName(name) {
        localStorage.setItem('firebase_player_name', name);
        this.playerName = name;
        
        if (this.playersRef && this.playerId) {
            this.playersRef.child(this.playerId).update({ name });
        }
    }

    async getPlayerScore() {
        if (!this.gameRef || !this.playerId) return 0;
        
        try {
            const scoreSnapshot = await this.gameRef.child(`gameState/scores/${this.playerId}`).once('value');
            return scoreSnapshot.val() || 0;
        } catch (error) {
            console.error('Failed to get player score:', error);
            return 0;
        }
    }

    async getRoomData() {
        if (!this.gameRef) return null;
        
        try {
            const snapshot = await this.gameRef.once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Failed to get room data:', error);
            return null;
        }
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

    // Connection Status
    getConnectionStatus() {
        return {
            initialized: this.isInitialized,
            connected: this.connectionState === 'connected',
            roomCode: this.roomCode,
            playerId: this.playerId,
            playerName: this.playerName,
            isHost: this.isHost
        };
    }

    // Cleanup
    async destroy() {
        if (this.roomCode) {
            await this.leaveRoom();
        }
        
        this.cleanupListeners();
        
        if (this.auth) {
            await this.auth.signOut();
        }
        
        this.eventHandlers.clear();
        this.isInitialized = false;
    }
}

// CSS for Firebase UI
const firebaseMultiplayerCSS = `
.firebase-panel {
    background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
    color: white;
    border-radius: 12px;
    padding: 16px;
    margin: 16px 0;
    box-shadow: 0 8px 16px rgba(255, 107, 107, 0.3);
}

.firebase-panel h3 {
    margin: 0 0 12px 0;
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.firebase-icon::before {
    content: "🔥";
    font-size: 1.2rem;
}

.firebase-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    margin: 8px 0;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 6px;
}

.firebase-status.connected {
    background: rgba(16, 185, 129, 0.2);
}

.firebase-status.disconnected {
    background: rgba(239, 68, 68, 0.2);
}

.realtime-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10B981;
    animation: realtimePulse 1.5s infinite;
}

@keyframes realtimePulse {
    0%, 100% { 
        opacity: 1; 
        transform: scale(1);
    }
    50% { 
        opacity: 0.7; 
        transform: scale(1.2);
    }
}

.sync-status {
    font-size: 0.8rem;
    opacity: 0.9;
    margin-top: 4px;
}

.firebase-room-code {
    background: rgba(255, 255, 255, 0.25);
    padding: 10px 14px;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 1.3rem;
    font-weight: bold;
    text-align: center;
    margin: 12px 0;
    border: 2px solid rgba(255, 255, 255, 0.3);
    position: relative;
    overflow: hidden;
}

.firebase-room-code::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
}

.firebase-players {
    margin: 12px 0;
}

.firebase-player {
    background: rgba(255, 255, 255, 0.15);
    padding: 8px 12px;
    border-radius: 6px;
    margin: 6px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.3s ease;
}

.firebase-player:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateX(2px);
}

.player-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.player-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
}

.player-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.player-name {
    font-weight: 500;
    font-size: 0.9rem;
}

.player-role {
    font-size: 0.7rem;
    opacity: 0.8;
}

.player-status-badge {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.2);
}

.player-status-badge.online {
    background: rgba(16, 185, 129, 0.3);
}

.player-status-badge.offline {
    background: rgba(107, 114, 128, 0.3);
}

.firebase-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
}

.firebase-btn {
    flex: 1;
    min-width: 120px;
    padding: 10px 14px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.firebase-btn::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
}

.firebase-btn:hover::before {
    left: 100%;
}

.btn-create {
    background: linear-gradient(45deg, #10B981, #059669);
    color: white;
}

.btn-join {
    background: linear-gradient(45deg, #3B82F6, #2563EB);
    color: white;
}

.btn-start {
    background: linear-gradient(45deg, #F59E0B, #D97706);
    color: white;
}

.btn-leave {
    background: linear-gradient(45deg, #EF4444, #DC2626);
    color: white;
}

.firebase-input {
    padding: 10px 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1rem;
    width: 100%;
    margin: 8px 0;
    transition: all 0.3s ease;
}

.firebase-input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.15);
}

.firebase-input::placeholder {
    color: rgba(255, 255, 255, 0.7);
}

.loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.firebase-error {
    background: rgba(239, 68, 68, 0.2);
    color: #FEE2E2;
    padding: 8px 12px;
    border-radius: 6px;
    margin: 8px 0;
    font-size: 0.9rem;
    border-left: 4px solid #EF4444;
}

.firebase-success {
    background: rgba(16, 185, 129, 0.2);
    color: #D1FAE5;
    padding: 8px 12px;
    border-radius: 6px;
    margin: 8px 0;
    font-size: 0.9rem;
    border-left: 4px solid #10B981;
}
`;

// Add CSS to document
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = firebaseMultiplayerCSS;
    document.head.appendChild(style);
}

// Export
if (typeof window !== 'undefined') {
    window.FirebaseMultiplayerManager = FirebaseMultiplayerManager;
}

// Auto-initialize if Firebase is available
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && window.EnvironmentConfig?.isFirebaseEnabled()) {
        window.firebaseMultiplayerManager = new FirebaseMultiplayerManager();
    }
});
