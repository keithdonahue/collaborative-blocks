const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
const db = new sqlite3.Database('./blocks.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        // Create blocks table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS blocks (
            id TEXT PRIMARY KEY,
            x REAL NOT NULL,
            y REAL NOT NULL,
            text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err);
            } else {
                console.log('Blocks table ready');
                // Initialize with some default blocks if table is empty
                initializeDefaultBlocks();
            }
        });
    }
});

// Initialize default blocks
function initializeDefaultBlocks() {
    db.get('SELECT COUNT(*) as count FROM blocks', (err, row) => {
        if (err) {
            console.error('Error checking blocks:', err);
            return;
        }
        
        if (row.count === 0) {
            console.log('Initializing default blocks...');
            const defaultBlocks = [
                { id: '1', x: 100, y: 100, text: 'Block 1' },
                { id: '2', x: 300, y: 150, text: 'Block 2' },
                { id: '3', x: 500, y: 200, text: 'Block 3' },
                { id: '4', x: 200, y: 350, text: 'Block 4' },
                { id: '5', x: 450, y: 400, text: 'Block 5' },
                { id: '6', x: 650, y: 300, text: 'Block 6' },
            ];
            
            const stmt = db.prepare('INSERT INTO blocks (id, x, y, text) VALUES (?, ?, ?, ?)');
            defaultBlocks.forEach(block => {
                stmt.run(block.id, block.x, block.y, block.text);
            });
            stmt.finalize();
            console.log('Default blocks created');
        }
    });
}

// Load all blocks from database
function loadBlocks(callback) {
    db.all('SELECT id, x, y, text FROM blocks', (err, rows) => {
        if (err) {
            console.error('Error loading blocks:', err);
            callback({});
        } else {
            const blocks = {};
            rows.forEach(row => {
                blocks[row.id] = {
                    id: row.id,
                    x: row.x,
                    y: row.y,
                    text: row.text
                };
            });
            callback(blocks);
        }
    });
}

// Save block position
function saveBlockPosition(id, x, y) {
    db.run(
        'UPDATE blocks SET x = ?, y = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [x, y, id],
        (err) => {
            if (err) {
                console.error('Error updating block:', err);
            }
        }
    );
}

// Create new block
function createBlock(id, x, y, text = null) {
    const blockText = text || `Block ${id}`;
    db.run(
        'INSERT INTO blocks (id, x, y, text) VALUES (?, ?, ?, ?)',
        [id, x, y, blockText],
        (err) => {
            if (err) {
                console.error('Error creating block:', err);
            }
        }
    );
}

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Send current blocks state to new client
    loadBlocks((blocks) => {
        socket.emit('blocks-state', blocks);
    });
    
    // Handle block movement
    socket.on('move-block', (data) => {
        const { id, x, y } = data;
        
        // Update database
        saveBlockPosition(id, x, y);
        
        // Broadcast to ALL clients (including sender) for real-time sync
        // Clients will ignore updates for blocks they're currently dragging
        io.emit('block-moved', { id, x, y });
    });
    
    // Handle block creation
    socket.on('create-block', (data) => {
        const { x, y } = data;
        const id = Date.now().toString();
        
        // Save to database
        createBlock(id, x, y);
        
        const newBlock = { id, x, y, text: `Block ${id}` };
        
        // Broadcast to all clients including sender
        io.emit('block-created', newBlock);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Export for Vercel (though WebSockets won't work on Vercel)
module.exports = app;

// Only start server if not in serverless environment
if (process.env.VERCEL !== '1') {
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
