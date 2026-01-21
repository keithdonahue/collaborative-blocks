# Collaborative Blocks Website

A real-time collaborative website where users can drag and drop blocks that persist across all users. Built with WebSockets and SQLite.

## Features

- 🎯 Draggable blocks that can be moved around
- 🔄 Real-time synchronization via WebSockets
- 💾 Persistent storage in SQLite database
- 🌐 Multi-user support - see other users' changes instantly
- ➕ Double-click to create new blocks

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Server

Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Drag blocks around - they'll sync in real-time with all connected users
3. Double-click anywhere on the canvas to create a new block
4. All positions are saved to the database and persist across sessions

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **WebSockets**: Socket.io
- **Database**: SQLite3

## Project Structure

```
collaborative-blocks/
├── public/
│   ├── index.html    # Main HTML file
│   ├── style.css     # Styling
│   └── script.js     # Client-side JavaScript
├── server.js         # Express + Socket.io server
├── package.json      # Dependencies
└── blocks.db         # SQLite database (created automatically)
```

## How It Works

1. When a user connects, they receive the current state of all blocks
2. When a user drags a block, the new position is sent to the server
3. The server saves the position to the database
4. The server broadcasts the update to all other connected clients
5. All clients update their view in real-time

Enjoy creating your constantly changing collaborative website! 🎨
