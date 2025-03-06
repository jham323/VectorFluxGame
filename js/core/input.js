// Key states
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    ' ': false,
    'Escape': false
};

// Handle key down
function handleKeyDown(e) {
    if (e.key in keys) {
        keys[e.key] = true;
        e.preventDefault();
    }
    
    // These events will be handled by the game.js module
    document.dispatchEvent(new CustomEvent('game:keydown', { detail: { key: e.key, repeat: e.repeat } }));
}

// Handle key up
function handleKeyUp(e) {
    if (e.key in keys) {
        keys[e.key] = false;
        e.preventDefault();
    }
    
    document.dispatchEvent(new CustomEvent('game:keyup', { detail: { key: e.key } }));
}

// Initialize input handlers
function initInput() {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

// Clean up input handlers
function cleanupInput() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
}

export {
    keys,
    initInput,
    cleanupInput
}; 