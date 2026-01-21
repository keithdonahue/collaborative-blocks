const socket = io();
const blocksContainer = document.getElementById('blocks-container');
const statusEl = document.querySelector('.status');

let blocks = {};
let isDragging = false;
let currentBlockId = null;
let offsetX = 0;
let offsetY = 0;

// Update status
socket.on('connect', () => {
    statusEl.textContent = 'Connected - Start dragging blocks!';
    statusEl.style.color = '#4ade80';
});

socket.on('disconnect', () => {
    statusEl.textContent = 'Disconnected - Reconnecting...';
    statusEl.style.color = '#fbbf24';
});

// Receive initial blocks state
socket.on('blocks-state', (blocksData) => {
    blocks = blocksData;
    renderBlocks();
});

// Receive block position update
socket.on('block-moved', (data) => {
    if (data.id !== currentBlockId || !isDragging) {
        const block = document.getElementById(`block-${data.id}`);
        if (block) {
            block.style.left = data.x + 'px';
            block.style.top = data.y + 'px';
        }
        // Update local state
        if (blocks[data.id]) {
            blocks[data.id].x = data.x;
            blocks[data.id].y = data.y;
        }
    }
});

// Receive new block
socket.on('block-created', (blockData) => {
    blocks[blockData.id] = blockData;
    createBlockElement(blockData);
});

// Create block element
function createBlockElement(blockData) {
    const block = document.createElement('div');
    block.id = `block-${blockData.id}`;
    block.className = 'block';
    block.textContent = blockData.text || `Block ${blockData.id}`;
    block.style.left = blockData.x + 'px';
    block.style.top = blockData.y + 'px';
    
    // Make draggable
    block.addEventListener('mousedown', startDrag);
    
    blocksContainer.appendChild(block);
}

// Render all blocks
function renderBlocks() {
    blocksContainer.innerHTML = '';
    Object.values(blocks).forEach(blockData => {
        createBlockElement(blockData);
    });
}

// Start dragging
function startDrag(e) {
    isDragging = true;
    currentBlockId = e.target.id.replace('block-', '');
    e.target.classList.add('dragging');
    
    const rect = e.target.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    e.preventDefault();
}

// Drag
function drag(e) {
    if (!isDragging) return;
    
    const block = document.getElementById(`block-${currentBlockId}`);
    if (!block) return;
    
    const containerRect = blocksContainer.getBoundingClientRect();
    let x = e.clientX - containerRect.left - offsetX;
    let y = e.clientY - containerRect.top - offsetY;
    
    // Keep within bounds
    x = Math.max(0, Math.min(x, blocksContainer.offsetWidth - block.offsetWidth));
    y = Math.max(0, Math.min(y, blocksContainer.offsetHeight - block.offsetHeight));
    
    block.style.left = x + 'px';
    block.style.top = y + 'px';
    
    // Update local state
    if (blocks[currentBlockId]) {
        blocks[currentBlockId].x = x;
        blocks[currentBlockId].y = y;
    }
}

// Stop dragging
function stopDrag() {
    if (!isDragging) return;
    
    isDragging = false;
    const block = document.getElementById(`block-${currentBlockId}`);
    if (block) {
        block.classList.remove('dragging');
    }
    
    // Send position to server
    if (blocks[currentBlockId]) {
        socket.emit('move-block', {
            id: currentBlockId,
            x: blocks[currentBlockId].x,
            y: blocks[currentBlockId].y
        });
    }
    
    currentBlockId = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

// Create new block on double-click
blocksContainer.addEventListener('dblclick', (e) => {
    if (e.target === blocksContainer) {
        const x = e.clientX - blocksContainer.getBoundingClientRect().left - 75;
        const y = e.clientY - blocksContainer.getBoundingClientRect().top - 75;
        socket.emit('create-block', { x, y });
    }
});
