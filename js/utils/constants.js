// Game constants and settings
const vaporwaveColors = {
    primary: '#FF00FF', // Magenta
    secondary: '#00FFFF', // Cyan
    accent1: '#FF71CE', // Pink
    accent2: '#01CDFE', // Bright blue
    accent3: '#05FFA1', // Mint green
    dark: '#2D1B4E', // Deep purple
    grid: '#B967FF', // Purple
    background: '#000033' // Dark blue
};

// Game canvas dimensions
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;

// Player settings
const PLAYER_SETTINGS = {
    width: 70,
    height: 50,
    speed: 300,
    shotCooldown: 300, // ms
    maxBankAngle: Math.PI / 6, // 30 degrees
    maxPitchAngle: Math.PI / 8, // 22.5 degrees
    maxShields: 3,
    maxHull: 2
};

// Corridor properties
const CORRIDOR_SETTINGS = {
    segments: 20,
    segmentHeight: 700,
    width: 1000,
    depth: 5000,
    speed: 400,
    gridLines: 8 // Number of grid lines per segment
};

// Enemy settings
const ENEMY_SETTINGS = {
    width: 60,
    height: 40,
    baseSpeed: 160,
    speedVariance: 50,
    health: 30,
    shotCooldown: 4000,
    shotCooldownVariance: 2500,
    spawnDistance: 3000
};

// Star field settings
const STARFIELD_SETTINGS = {
    starCount: 100,
    debrisCount: 15,
    dustCount: 150,
    maxDepth: 8000
};

// Export all constants
export {
    vaporwaveColors,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    PLAYER_SETTINGS,
    CORRIDOR_SETTINGS,
    ENEMY_SETTINGS,
    STARFIELD_SETTINGS
}; 