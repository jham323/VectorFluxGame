import { createHitEffect, createMuzzleFlash } from '../effects/explosions.js';
import { addParticle } from './particles.js';

// Game objects
let projectiles = [];

// Clear all projectiles
function clearProjectiles() {
    projectiles = [];
}

// Function to handle shooting through the targeting sight
function shoot(player) {
    console.log("Shooting!"); // Debug log
    
    // Make sure player has a sight position
    if (!player.sightX || !player.sightY) {
        player.sightX = player.x;
        player.sightY = player.y - 150;
    }
    
    // Add projectile that will pass through the targeting sight
    projectiles.push({
        x: player.x,
        y: player.y - player.height/3,
        z: 0,
        initialX: player.x, // Store initial position
        initialY: player.y - player.height/3,
        // Store the sight position as the target
        targetX: player.sightX,
        targetY: player.sightY,
        // Calculate velocity based on the distance to the sight
        speed: 1200,
        width: 5,
        height: 15,
        isEnemy: false,
        // Flag to identify targeting sight projectiles
        isTargeting: true
    });
    
    // Add muzzle flash
    addParticle({
        x: player.x,
        y: player.y - player.height/3,
        z: 0,
        size: 20,
        color: '#00FFFF',
        life: 0.1,
        maxLife: 0.1,
        type: 'flash'
    });
}

// Create enemy projectile
function createEnemyProjectile(enemy, targetX, targetY) {
    // Calculate direction vector toward target
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Create the projectile with proper initialization
    const projectile = {
        x: enemy.x,
        y: enemy.y,
        z: enemy.z,
        width: 5,
        height: 15,
        speed: 280, // Lower speed to make projectiles easier to evade
        isEnemy: true,
        // Store initial position for trajectory calculation
        initialX: enemy.x,
        initialY: enemy.y,
        // Store normalized direction with increased randomness for less accuracy
        dirX: (dx / dist) + (Math.random() - 0.5) * 0.15,
        dirY: (dy / dist) + (Math.random() - 0.5) * 0.15,
        // Add more variation for visual interest
        dx: (Math.random() - 0.5) * 0.1,
        dy: (Math.random() - 0.5) * 0.1,
        // Store target for more accurate trajectory
        targetX: targetX,
        targetY: targetY
    };
    
    projectiles.push(projectile);
    
    // Add muzzle flash effect
    createMuzzleFlash(enemy.x, enemy.y, enemy.z);
}

// Update projectiles to move through the targeting sight
function updateProjectiles(deltaTime, player) {
    for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i];
        
        if (!p.isEnemy && p.targetX && p.targetY) {
            // For player projectiles with a target, calculate position along the path
            
            // Move forward in Z (negative direction in new coordinate system)
            p.z -= p.speed * deltaTime;
            
            // Calculate how far along the path we are (0 to 1)
            const totalDistance = 1000; // Distance to sight in Z
            const progress = Math.min(1, Math.abs(p.z) / totalDistance);
            
            // Interpolate position between start and target
            p.x = p.x + (p.targetX - p.x) * progress;
            p.y = p.y + (p.targetY - p.y) * progress;
            
            // Once we pass the target, continue in a straight line
            if (progress >= 1) {
                // We've reached the target, now continue straight
                if (!p.passedTarget) {
                    p.passedTarget = true;
                    // Calculate direction from start to target
                    const dx = p.targetX - p.x;
                    const dy = p.targetY - p.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    // Store normalized direction
                    p.dx = dx / dist;
                    p.dy = dy / dist;
                }
                
                // Move in the calculated direction
                p.x += p.dx * p.speed * deltaTime;
                p.y += p.dy * p.speed * deltaTime;
            }
        } else if (p.isEnemy) {
            // For enemy projectiles - maintain their relationship to the enemy that fired them
            // Move in the direction of the player (toward negative z)
            p.z -= p.speed * 1.5 * deltaTime; // Increased speed in z-direction for better passing effect
            
            // Ensure z doesn't go too negative which could cause perspective issues
            p.z = Math.max(p.z, -1000);
            
            // Remove enemy projectiles when they get too close to the player
            // This prevents visual glitches when projectiles get too close
            if (p.z < -50) {
                projectiles.splice(i, 1);
                i--;
                continue;
            }
            
            // Calculate perspective for z-position with safety check
            const perspective = 500 / Math.max(500 + p.z, 1);
            
            // Add validation to prevent extreme perspective values
            if (!isFinite(perspective) || perspective <= 0 || perspective > 20) {
                // Remove invalid projectiles
                projectiles.splice(i, 1);
                i--;
                continue;
            }
            
            // Store initial position if not already stored
            if (!p.initialX) {
                p.initialX = p.x;
                p.initialY = p.y;
                
                // If we don't have a stored target, use player position
                if (!p.targetX || !p.targetY) {
                    p.targetX = player.x;
                    p.targetY = player.y;
                }
                
                // Calculate direction vector toward target
                const dx = p.targetX - p.initialX;
                const dy = p.targetY - p.initialY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                // Store normalized direction with slight randomness
                p.dirX = (dx / dist) + (Math.random() - 0.5) * 0.05;
                p.dirY = (dy / dist) + (Math.random() - 0.5) * 0.05;
            }
            
            // Calculate progress with better targeting
            // As z decreases (projectile moves forward), it moves more toward the player
            const zProgress = Math.min(1, (2000 - p.z) / 2000); // Progress from 0 to 1 as projectile moves forward
            
            // Increase speed as projectiles get closer to the player
            const speedMultiplier = 1.0 + zProgress * 0.8;
            
            // Use a more accurate trajectory calculation
            // Calculate current position based on a blend of initial direction and direct path to target
            const homingStrength = zProgress * 0.4;
            
            // Get current vector to target (which may have moved)
            const currentTargetX = player.x; // Track the player's current position
            const currentTargetY = player.y;
            const currentDx = currentTargetX - p.x;
            const currentDy = currentTargetY - p.y;
            const currentDist = Math.sqrt(currentDx*currentDx + currentDy*currentDy);
            
            // Blend initial direction with current direction to target
            let moveX, moveY;
            if (currentDist > 0) {
                // Normalize current direction
                const currentDirX = currentDx / currentDist;
                const currentDirY = currentDy / currentDist;
                
                // Blend initial and current directions
                moveX = p.dirX * (1 - homingStrength) + currentDirX * homingStrength;
                moveY = p.dirY * (1 - homingStrength) + currentDirY * homingStrength;
            } else {
                // Fallback if distance is zero
                moveX = p.dirX;
                moveY = p.dirY;
            }
            
            // Apply movement with speed multiplier
            p.x += moveX * p.speed * deltaTime * zProgress * 0.5 * speedMultiplier;
            p.y += moveY * p.speed * deltaTime * zProgress * 0.5 * speedMultiplier;
            
            // Apply slight movement based on original dx/dy for variation
            if (p.dx) p.x += p.dx * p.speed * deltaTime * 0.05;
            if (p.dy) p.y += p.dy * p.speed * deltaTime * 0.05;
            
            // Add boundary checks to keep projectiles on screen
            const margin = 100;
            if (p.x < -margin || p.x > window.innerWidth + margin || 
                p.y < -margin || p.y > window.innerHeight + margin) {
                // Remove projectiles that go too far off screen
                projectiles.splice(i, 1);
                i--;
                continue;
            }
        } else {
            // For other projectiles without a target
            p.x += (p.dx || 0) * p.speed * deltaTime;
            p.y += (p.dy || 0) * p.speed * deltaTime;
            p.z -= (p.dz || 1) * p.speed * deltaTime;
        }
        
        // Remove projectile if it goes off screen or too far into the distance
        if (p.x < -50 || p.x > window.innerWidth + 50 || p.y < -50 || p.y > window.innerHeight + 50 || p.z < -1000) {
            projectiles.splice(i, 1);
            i--;
        }
    }
}

// Get all projectiles
function getProjectiles() {
    return projectiles;
}

export {
    projectiles,
    clearProjectiles,
    shoot,
    createEnemyProjectile,
    updateProjectiles,
    getProjectiles
}; 