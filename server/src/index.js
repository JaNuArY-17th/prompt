import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/api/game/stats', (req, res) => {
    res.json({
        playersOnline: io.sockets.sockets.size,
        serverUptime: process.uptime()
    });
});

// Game state (in a real game, this would be in a database)
let gameState = {
    players: new Map(),
    rooms: new Map(),
    highScores: []
};

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    // Handle player join
    socket.on('join-game', (playerData) => {
        gameState.players.set(socket.id, {
            id: socket.id,
            name: playerData.name || `Player${socket.id.substr(0, 4)}`,
            score: 0,
            health: 100,
            position: { x: 400, y: 300 },
            connectedAt: Date.now()
        });
        
        // Send current game state to new player
        socket.emit('game-state', {
            playerId: socket.id,
            players: Array.from(gameState.players.values()),
            highScores: gameState.highScores
        });
        
        // Notify other players
        socket.broadcast.emit('player-joined', gameState.players.get(socket.id));
        
        console.log('Player joined game:', playerData.name);
    });
    
    // Handle player movement
    socket.on('player-move', (position) => {
        if (gameState.players.has(socket.id)) {
            gameState.players.get(socket.id).position = position;
            
            // Broadcast position to other players
            socket.broadcast.emit('player-moved', {
                playerId: socket.id,
                position: position
            });
        }
    });
    
    // Handle player shooting
    socket.on('player-shoot', (shootData) => {
        // Broadcast bullet to all players
        io.emit('bullet-fired', {
            playerId: socket.id,
            from: shootData.from,
            to: shootData.to,
            timestamp: Date.now()
        });
    });
    
    // Handle score update
    socket.on('score-update', (score) => {
        if (gameState.players.has(socket.id)) {
            gameState.players.get(socket.id).score = score;
            
            // Check if it's a high score
            if (gameState.highScores.length < 10 || score > gameState.highScores[gameState.highScores.length - 1].score) {
                const player = gameState.players.get(socket.id);
                gameState.highScores.push({
                    name: player.name,
                    score: score,
                    timestamp: Date.now()
                });
                
                // Sort and keep top 10
                gameState.highScores.sort((a, b) => b.score - a.score);
                gameState.highScores = gameState.highScores.slice(0, 10);
                
                // Broadcast new high scores
                io.emit('high-scores-update', gameState.highScores);
            }
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        if (gameState.players.has(socket.id)) {
            // Notify other players
            socket.broadcast.emit('player-left', socket.id);
            
            // Remove player from game state
            gameState.players.delete(socket.id);
        }
    });
    
    // Handle ping for latency testing
    socket.on('ping', (timestamp) => {
        socket.emit('pong', timestamp);
    });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('../client/dist'));
    
    app.get('*', (req, res) => {
        res.sendFile(path.resolve('../client/dist/index.html'));
    });
}

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🎮 Game server ready for connections`);
}); 