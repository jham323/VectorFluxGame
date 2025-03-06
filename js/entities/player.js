import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SETTINGS } from '../utils/constants.js';
import { keys } from '../core/input.js';
import { createShieldImpact, createHullDamageEffect, createExplosion } from '../effects/explosions.js';
import { addScreenShake } from '../effects/effects.js';
import { shoot } from './projectiles.js';

// Player ship
const player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    width: PLAYER_SETTINGS.width,
    height: PLAYER_SETTINGS.height,
    speed: PLAYER_SETTINGS.speed,
    isShooting: false,
    lastShot: 0,
    shotCooldown: PLAYER_SETTINGS.shotCooldown,
    bankAngle: 0,
    maxBankAngle: PLAYER_SETTINGS.maxBankAngle,
    pitchAngle: 0,
    maxPitchAngle: PLAYER_SETTINGS.maxPitchAngle,
    scale: 1.0,
    targetScale: 1.0,
    shields: PLAYER_SETTINGS.maxShields,
    hull: PLAYER_SETTINGS.maxHull,
    maxShields: PLAYER_SETTINGS.maxShields,
    maxHull: PLAYER_SETTINGS.maxHull,
    speedX: 0,
    speedY: 0,
    sightX: 0,
    sightY: 0
};

// Reset player for new game
function resetPlayer() {
    player.shields = player.maxShields;
    player.hull = player.maxHull;
    player.x = CANVAS_WIDTH / 2;
    player.y = CANVAS_HEIGHT + 150; // Start below the screen
    player.bankAngle = 0;
    player.pitchAngle = -0.3; // Slight upward pitch
    player.scale = 1.5; // Start larger
    player.speedX = 0;
    player.speedY = 0;
    
    // Add entrance animation properties
    player.entranceAnimation = {
        active: true,
        duration: 2.0, // seconds
        timeElapsed: 0,
        targetY: CANVAS_HEIGHT * 0.8, // Final position
        targetScale: 1.0 // Final scale
    };
    
    // Reset player targeting sight
    player.sightX = player.x;
    player.sightY = player.y - 150;
}

// Update player with entrance animation
function updatePlayer(deltaTime) {
    // Previous position for calculating banking and pitch
    const prevX = player.x;
    const prevY = player.y;
    
    // Handle entrance animation if active
    if (player.entranceAnimation && player.entranceAnimation.active) {
        player.entranceAnimation.timeElapsed += deltaTime;
        const progress = Math.min(player.entranceAnimation.timeElapsed / player.entranceAnimation.duration, 1.0);
        
        // Ease-out function for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        // Update player position and scale
        player.y = CANVAS_HEIGHT + 150 - (CANVAS_HEIGHT + 150 - player.entranceAnimation.targetY) * easeOut;
        player.scale = player.entranceAnimation.targetScale + (1.5 - player.entranceAnimation.targetScale) * (1 - easeOut);
        
        // Gradually level out the pitch
        player.pitchAngle = -0.3 * (1 - easeOut);
        
        // End animation when complete
        if (progress >= 1.0) {
            player.entranceAnimation.active = false;
            player.y = player.entranceAnimation.targetY;
            player.scale = player.entranceAnimation.targetScale;
            player.pitchAngle = 0;
        }
        
        // During entrance animation, only update sight position
        player.sightX = player.x;
        player.sightY = player.y - 150;
        
        return; // Skip regular movement during entrance
    }
    
    // Add animation properties if they don't exist
    if (player.animState === undefined) {
        player.animState = {
            pitchTarget: 0,
            pitchVelocity: 0,
            bankTarget: 0,
            bankVelocity: 0,
            scaleTarget: 1.0,
            scaleVelocity: 0
        };
    }
    
    // Store previous position for speed calculation
    const oldX = player.x;
    const oldY = player.y;
    
    // Move player based on key presses
    if (keys.ArrowUp && player.y > 50) {
        player.y -= player.speed * deltaTime;
    }
    if (keys.ArrowDown && player.y < CANVAS_HEIGHT - 50) {
        player.y += player.speed * deltaTime;
    }
    if (keys.ArrowLeft && player.x > 50) {
        player.x -= player.speed * deltaTime;
        // Set bank target to max left bank (negative)
        player.animState.bankTarget = -player.maxBankAngle;
    } else if (keys.ArrowRight && player.x < CANVAS_WIDTH - 50) {
        player.x += player.speed * deltaTime;
        // Set bank target to max right bank (positive)
        player.animState.bankTarget = player.maxBankAngle;
    } else {
        // No left/right input, return to level flight faster
        player.animState.bankTarget = 0;
    }
    
    // Calculate player speed for enemy targeting
    player.speedX = (player.x - oldX) / deltaTime;
    player.speedY = (player.y - oldY) / deltaTime;
    
    // Calculate banking based on horizontal movement (more responsive)
    const bankSpeed = 8.0; // Fast banking when turning
    const returnSpeed = 8.0; // Slightly slower return to level (adjusted from 12.0)
    
    // Use different speeds for banking and returning to level
    const currentBankSpeed = player.animState.bankTarget === 0 ? returnSpeed : bankSpeed;
    
    // Smoothly interpolate current bank angle toward target
    const bankDiff = player.animState.bankTarget - player.bankAngle;
    player.bankAngle += bankDiff * currentBankSpeed * deltaTime;
    
    // Calculate pitch based on vertical movement
    const pitchSpeed = 6.0;
    const dy = player.y - prevY;
    player.animState.pitchTarget = -dy * 0.1; // Pitch up when moving up
    
    // Clamp pitch target
    player.animState.pitchTarget = Math.max(-player.maxPitchAngle, Math.min(player.maxPitchAngle, player.animState.pitchTarget));
    
    // Smoothly interpolate current pitch angle toward target
    const pitchDiff = player.animState.pitchTarget - player.pitchAngle;
    player.pitchAngle += pitchDiff * pitchSpeed * deltaTime;
    
    // Handle shooting
    if (keys[' '] && !player.isShooting) {
        const now = Date.now();
        if (now - player.lastShot > player.shotCooldown) {
            shoot(player);
            player.lastShot = now;
            player.isShooting = true;
        }
    } else if (!keys[' ']) {
        player.isShooting = false;
    }
    
    // Update targeting sight
    updateTargetingSight();
}

// Update the targeting sight position
function updateTargetingSight() {
    // Calculate the targeting sight position in front of the player
    const sightDistance = 150;
    const bankOffset = Math.sin(player.bankAngle) * 100;
    const pitchOffset = player.pitchAngle * 150;
    
    player.sightX = player.x + bankOffset;
    player.sightY = player.y - sightDistance + pitchOffset;
}

// Apply damage to player
function damagePlayer() {
    if (player.shields > 0) {
        // Damage shields first
        player.shields--;
        console.log("Shields hit! Remaining shields:", player.shields);
    
        // Add screen shake
        addScreenShake(0.3);
        
        // Create shield impact effect
        createShieldImpact(player);
    } else {
        // Damage hull when shields are depleted
        player.hull--;
        console.log("Hull hit! Remaining hull:", player.hull);
        
        // Add stronger screen shake for hull hits
        addScreenShake(0.6);
        
        // Create hull damage effect
        createHullDamageEffect(player);
        
        // Check if player is destroyed
        if (player.hull <= 0) {
            console.log("Player destroyed!");
            createExplosion(player.x, player.y, 0);
            return true; // Player destroyed
        }
    }
    
    return false; // Player still alive
}

export {
    player,
    resetPlayer,
    updatePlayer,
    updateTargetingSight,
    damagePlayer
}; 