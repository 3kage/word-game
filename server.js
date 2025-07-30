// Simple WebSocket Server for Multiplayer Word Game
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class GameServer {
    constructor() {
        this.rooms = new Map();
        this.players = new Map();
        this.server = null;
    }

    start(port = 3001) {
        this.server = new WebSocket.Server({ 
            port,
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.server.on('connection', (ws, request) => {
            console.log(`New connection from ${request.socket.remoteAddress}`);
            
            ws.on('message', (data) => {
                this.handleMessage(ws, data);
            });

            ws.on('close', () => {
                this.handleDisconnect(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });

            // Send connection confirmation
            this.sendMessage(ws, {
                type: 'connected',
                timestamp: Date.now()
            });
        });

        console.log(`Game server started on port ${port}`);
    }

    handleMessage(ws, rawData) {
        try {
            const message = JSON.parse(rawData);
            console.log('Received:', message.type, 'from', message.playerId);

            switch (message.type) {
                case 'ping':
                    this.sendMessage(ws, { type: 'pong' });
                    break;
                
                case 'createRoom':
                    this.handleCreateRoom(ws, message);
                    break;
                
                case 'joinRoom':
                    this.handleJoinRoom(ws, message);
                    break;
                
                case 'leaveRoom':
                    this.handleLeaveRoom(ws, message);
                    break;
                
                case 'startGame':
                    this.handleStartGame(ws, message);
                    break;
                
                case 'gameAction':
                    this.handleGameAction(ws, message);
                    break;
                
                case 'gameStateUpdate':
                    this.handleGameStateUpdate(ws, message);
                    break;
                
                case 'updatePlayer':
                    this.handleUpdatePlayer(ws, message);
                    break;
                
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Failed to handle message:', error);
            this.sendError(ws, 'Invalid message format');
        }
    }

    handleCreateRoom(ws, message) {
        const roomCode = this.generateRoomCode();
        const room = {
            code: roomCode,
            host: message.playerId,
            players: new Map(),
            settings: message.settings || {},
            gameState: null,
            isGameActive: false,
            createdAt: Date.now()
        };

        // Add player to room
        const player = {
            id: message.playerId,
            name: message.playerName || `Player ${Math.floor(Math.random() * 1000)}`,
            ws: ws,
            isHost: true,
            joinedAt: Date.now()
        };

        room.players.set(message.playerId, player);
        this.rooms.set(roomCode, room);
        this.players.set(ws, { playerId: message.playerId, roomCode });

        console.log(`Room ${roomCode} created by ${message.playerId}`);

        this.sendMessage(ws, {
            type: 'roomCreated',
            roomCode: roomCode,
            player: this.sanitizePlayer(player)
        });
    }

    handleJoinRoom(ws, message) {
        const room = this.rooms.get(message.roomCode);
        
        if (!room) {
            this.sendError(ws, 'Room not found');
            return;
        }

        if (room.players.size >= 2) {
            this.sendError(ws, 'Room is full');
            return;
        }

        if (room.isGameActive) {
            this.sendError(ws, 'Game already in progress');
            return;
        }

        const player = {
            id: message.playerId,
            name: message.playerName || `Player ${Math.floor(Math.random() * 1000)}`,
            ws: ws,
            isHost: false,
            joinedAt: Date.now()
        };

        room.players.set(message.playerId, player);
        this.players.set(ws, { playerId: message.playerId, roomCode: message.roomCode });

        console.log(`${message.playerId} joined room ${message.roomCode}`);

        // Send room info to joining player
        this.sendMessage(ws, {
            type: 'roomJoined',
            roomCode: message.roomCode,
            players: this.getRoomPlayers(room)
        });

        // Notify other players
        this.broadcastToRoom(message.roomCode, {
            type: 'playerJoined',
            player: this.sanitizePlayer(player)
        }, message.playerId);
    }

    handleLeaveRoom(ws, message) {
        const playerData = this.players.get(ws);
        if (!playerData) return;

        const room = this.rooms.get(playerData.roomCode);
        if (!room) return;

        room.players.delete(playerData.playerId);
        this.players.delete(ws);

        console.log(`${playerData.playerId} left room ${playerData.roomCode}`);

        // Notify other players
        this.broadcastToRoom(playerData.roomCode, {
            type: 'playerLeft',
            playerId: playerData.playerId
        });

        // If room is empty, delete it
        if (room.players.size === 0) {
            this.rooms.delete(playerData.roomCode);
            console.log(`Room ${playerData.roomCode} deleted (empty)`);
        } else if (room.host === playerData.playerId) {
            // Transfer host to another player
            const newHost = Array.from(room.players.values())[0];
            room.host = newHost.id;
            newHost.isHost = true;
            
            this.broadcastToRoom(playerData.roomCode, {
                type: 'hostChanged',
                newHost: newHost.id
            });
        }
    }

    handleStartGame(ws, message) {
        const playerData = this.players.get(ws);
        if (!playerData) return;

        const room = this.rooms.get(playerData.roomCode);
        if (!room || room.host !== playerData.playerId) {
            this.sendError(ws, 'Only host can start the game');
            return;
        }

        if (room.players.size < 2) {
            this.sendError(ws, 'Need at least 2 players to start');
            return;
        }

        room.isGameActive = true;
        room.gameState = this.createInitialGameState(room);

        console.log(`Game started in room ${playerData.roomCode}`);

        this.broadcastToRoom(playerData.roomCode, {
            type: 'gameStarted',
            initialState: room.gameState
        });
    }

    handleGameAction(ws, message) {
        const playerData = this.players.get(ws);
        if (!playerData) return;

        const room = this.rooms.get(playerData.roomCode);
        if (!room || !room.isGameActive) return;

        console.log(`Game action in room ${playerData.roomCode}:`, message.action);

        // Broadcast action to other players
        this.broadcastToRoom(playerData.roomCode, {
            type: 'gameAction',
            playerId: playerData.playerId,
            action: message.action,
            ...message
        }, playerData.playerId);
    }

    handleGameStateUpdate(ws, message) {
        const playerData = this.players.get(ws);
        if (!playerData) return;

        const room = this.rooms.get(playerData.roomCode);
        if (!room || room.host !== playerData.playerId) return;

        room.gameState = message.state;

        // Broadcast state update to other players
        this.broadcastToRoom(playerData.roomCode, {
            type: 'gameStateUpdate',
            state: message.state
        }, playerData.playerId);
    }

    handleUpdatePlayer(ws, message) {
        const playerData = this.players.get(ws);
        if (!playerData) return;

        const room = this.rooms.get(playerData.roomCode);
        if (!room) return;

        const player = room.players.get(playerData.playerId);
        if (!player) return;

        // Update player info
        if (message.name) player.name = message.name;

        // Broadcast update to other players
        this.broadcastToRoom(playerData.roomCode, {
            type: 'playerUpdated',
            player: this.sanitizePlayer(player)
        });
    }

    handleDisconnect(ws) {
        const playerData = this.players.get(ws);
        if (!playerData) return;

        console.log(`${playerData.playerId} disconnected`);
        
        // Handle as leave room
        this.handleLeaveRoom(ws, { playerId: playerData.playerId });
    }

    // Utility methods
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        do {
            code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(code));
        return code;
    }

    createInitialGameState(room) {
        const players = Array.from(room.players.values());
        return {
            players: players.map(p => ({
                id: p.id,
                name: p.name,
                score: 0,
                isCurrentPlayer: false
            })),
            currentRound: 1,
            totalRounds: 3,
            currentWord: null,
            timeLeft: room.settings.roundDuration || 60,
            isActive: true,
            startedAt: Date.now()
        };
    }

    getRoomPlayers(room) {
        const players = {};
        room.players.forEach((player, id) => {
            players[id] = this.sanitizePlayer(player);
        });
        return players;
    }

    sanitizePlayer(player) {
        return {
            id: player.id,
            name: player.name,
            isHost: player.isHost,
            joinedAt: player.joinedAt
        };
    }

    sendMessage(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                ...message,
                timestamp: Date.now()
            }));
        }
    }

    sendError(ws, error) {
        this.sendMessage(ws, {
            type: 'error',
            error: error
        });
    }

    broadcastToRoom(roomCode, message, excludePlayerId = null) {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        room.players.forEach((player, playerId) => {
            if (playerId !== excludePlayerId) {
                this.sendMessage(player.ws, message);
            }
        });
    }

    // Cleanup old rooms
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            this.rooms.forEach((room, code) => {
                if (now - room.createdAt > maxAge && room.players.size === 0) {
                    this.rooms.delete(code);
                    console.log(`Cleaned up old room: ${code}`);
                }
            });
        }, 60 * 60 * 1000); // Check every hour
    }

    getStats() {
        return {
            totalRooms: this.rooms.size,
            totalConnections: this.players.size,
            activeGames: Array.from(this.rooms.values()).filter(room => room.isGameActive).length
        };
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new GameServer();
    server.start(process.env.PORT || 3001);
    server.startCleanup();

    // Log stats periodically
    setInterval(() => {
        console.log('Server stats:', server.getStats());
    }, 5 * 60 * 1000); // Every 5 minutes
}

module.exports = GameServer;
