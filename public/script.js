const socket = io();
const blocksContainer = document.getElementById('blocks-container');
const statusEl = document.querySelector('.status');

let blocks = {};
let isDragging = false;
let currentBlockId = null;
let offsetX = 0;
let offsetY = 0;
let velocityX = 0;
let velocityY = 0;
let lastX = 0;
let lastY = 0;
let lastTime = 0;
let updateInterval = null;
let activeAnimations = {}; // Track active animations per block

// Physics constants
const FRICTION = 0.95; // Friction coefficient (0-1)
const BOUNCE_DAMPING = 0.7; // Bounce damping
const UPDATE_RATE = 50; // Update WebSocket every 50ms during movement
const MIN_VELOCITY = 0.5; // Minimum velocity to continue movement

// Update status
socket.on('connect', () => {
    statusEl.textContent = 'Connected - Drag and throw blocks!';
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
    // Don't update if we're currently dragging this block
    if (data.id === currentBlockId && isDragging) {
        return;
    }
    
    const block = document.getElementById(`block-${data.id}`);
    if (!block) return;
    
    // If there's an active animation for this block, stop it
    if (activeAnimations[data.id]) {
        activeAnimations[data.id].pause();
        delete activeAnimations[data.id];
    }
    
    // Use anime.js to smoothly animate to the new position
    const currentX = parseFloat(block.style.left) || blocks[data.id]?.x || 0;
    const currentY = parseFloat(block.style.top) || blocks[data.id]?.y || 0;
    
    activeAnimations[data.id] = anime({
        targets: block,
        left: data.x,
        top: data.y,
        duration: 200, // Smooth transition
        easing: 'easeOutQuad',
        complete: () => {
            delete activeAnimations[data.id];
        }
    });
    
    // Update local state
    if (blocks[data.id]) {
        blocks[data.id].x = data.x;
        blocks[data.id].y = data.y;
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
    
    // Make draggable and throwable
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
    
    // Stop any active animation for this block
    if (activeAnimations[currentBlockId]) {
        activeAnimations[currentBlockId].pause();
        delete activeAnimations[currentBlockId];
    }
    
    const rect = e.target.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    // Initialize velocity tracking
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = Date.now();
    velocityX = 0;
    velocityY = 0;
    
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
    
    // Calculate velocity based on movement
    const currentTime = Date.now();
    const deltaTime = Math.max(1, currentTime - lastTime);
    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;
    
    // Calculate velocity in pixels per frame (60fps = ~16ms per frame)
    // Scale up for more noticeable throwing effect
    velocityX = (deltaX / deltaTime) * 20;
    velocityY = (deltaY / deltaTime) * 20;
    
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
    
    // Update tracking variables
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = currentTime;
}

// Stop dragging and throw
function stopDrag(e) {
    if (!isDragging) return;
    
    isDragging = false;
    const block = document.getElementById(`block-${currentBlockId}`);
    if (!block) return;
    
    block.classList.remove('dragging');
    
    // If there's significant velocity, throw the block (lower threshold for easier throwing)
    if (Math.abs(velocityX) > 0.5 || Math.abs(velocityY) > 0.5) {
        throwBlock(currentBlockId, velocityX, velocityY);
    } else {
        // Just send final position
        if (blocks[currentBlockId]) {
            socket.emit('move-block', {
                id: currentBlockId,
                x: blocks[currentBlockId].x,
                y: blocks[currentBlockId].y
            });
        }
    }
    
    currentBlockId = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

// Throw block with physics
function throwBlock(blockId, initialVX, initialVY) {
    const block = document.getElementById(`block-${blockId}`);
    if (!block) return;
    
    // Stop any existing animation for this block
    if (activeAnimations[blockId]) {
        if (activeAnimations[blockId].cancel) {
            activeAnimations[blockId].cancel();
        }
        delete activeAnimations[blockId];
    }
    
    // Add throwing class for visual feedback
    block.classList.add('throwing');
    
    let vx = initialVX;
    let vy = initialVY;
    let x = parseFloat(block.style.left) || blocks[blockId]?.x || 0;
    let y = parseFloat(block.style.top) || blocks[blockId]?.y || 0;
    
    const containerWidth = blocksContainer.offsetWidth;
    const containerHeight = blocksContainer.offsetHeight;
    const blockWidth = block.offsetWidth;
    const blockHeight = block.offsetHeight;
    
    let lastUpdateTime = Date.now();
    let animationFrameId = null;
    
    // Start interval to update WebSocket during movement
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    updateInterval = setInterval(() => {
        // Send current position to server
        socket.emit('move-block', {
            id: blockId,
            x: x,
            y: y
        });
    }, UPDATE_RATE);
    
    // Physics animation loop using requestAnimationFrame
    function physicsLoop() {
        const currentTime = Date.now();
        const deltaTime = Math.min((currentTime - lastUpdateTime) / 16, 2); // Cap delta time
        lastUpdateTime = currentTime;
        
        // Apply velocity
        x += vx * deltaTime;
        y += vy * deltaTime;
        
        // Apply friction
        vx *= Math.pow(FRICTION, deltaTime);
        vy *= Math.pow(FRICTION, deltaTime);
        
        // Bounce off walls
        if (x < 0) {
            x = 0;
            vx = -vx * BOUNCE_DAMPING;
        } else if (x > containerWidth - blockWidth) {
            x = containerWidth - blockWidth;
            vx = -vx * BOUNCE_DAMPING;
        }
        
        if (y < 0) {
            y = 0;
            vy = -vy * BOUNCE_DAMPING;
        } else if (y > containerHeight - blockHeight) {
            y = containerHeight - blockHeight;
            vy = -vy * BOUNCE_DAMPING;
        }
        
        // Update block position
        block.style.left = x + 'px';
        block.style.top = y + 'px';
        
        // Update local state
        if (blocks[blockId]) {
            blocks[blockId].x = x;
            blocks[blockId].y = y;
        }
        
        // Check if we should stop
        if (Math.abs(vx) < MIN_VELOCITY && Math.abs(vy) < MIN_VELOCITY) {
            // Stop animation
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }
            block.classList.remove('throwing');
            delete activeAnimations[blockId];
            
            // Send final position
            socket.emit('move-block', {
                id: blockId,
                x: x,
                y: y
            });
        } else {
            // Continue animation
            animationFrameId = requestAnimationFrame(physicsLoop);
        }
    }
    
    // Start the physics loop
    animationFrameId = requestAnimationFrame(physicsLoop);
    
    // Store animation reference (with cancel method)
    activeAnimations[blockId] = {
        cancel: () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (updateInterval) {
                clearInterval(updateInterval);
            }
            block.classList.remove('throwing');
        }
    };
}

// Create new block on double-click
blocksContainer.addEventListener('dblclick', (e) => {
    if (e.target === blocksContainer) {
        const x = e.clientX - blocksContainer.getBoundingClientRect().left - 75;
        const y = e.clientY - blocksContainer.getBoundingClientRect().top - 75;
        socket.emit('create-block', { x, y });
    }
});
