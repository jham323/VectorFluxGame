// Add vaporwave color palette at the top of the file
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

// Game canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Audio elements
const gameMusic = document.getElementById('gameMusic');
const toggleAudioButton = document.getElementById('toggleAudio');
const audioIcon = document.getElementById('audioIcon');

// Make sure canvas is properly sized
canvas.width = 1000;
canvas.height = 700;

// Game state
let gameStarted = false;
let gameOver = false;
let gamePaused = false; // New: Track if game is paused
let score = 0;
let health = 1;
let lastTime = 0;

// Player ship
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 70,
    height: 50,
    speed: 300,
    isShooting: false,
    lastShot: 0,
    shotCooldown: 300, // ms
    bankAngle: 0,
    maxBankAngle: Math.PI / 6, // 30 degrees
    pitchAngle: 0,
    maxPitchAngle: Math.PI / 8, // 22.5 degrees
    scale: 1.0,
    targetScale: 1.0,
    shields: 3,     // New: Player has 3 shield hits
    hull: 2,        // New: Player has 2 hull hits
    maxShields: 3,  // New: Track maximum shield value
    maxHull: 2      // New: Track maximum hull value
};

// Game objects
let enemies = [];
let projectiles = [];
let particles = [];

// Corridor properties
const corridor = {
    segments: 20,
    segmentHeight: 700,
    width: 1000,
    depth: 5000,
    speed: 400,
    lines: [],
    gridLines: 8 // Number of grid lines per segment
};

// Initialize corridor lines
for (let i = 0; i < corridor.segments; i++) {
    const z = i * (corridor.depth / corridor.segments);
    corridor.lines.push({
        z: z,
        width: corridor.width
    });
}

// Event listeners
document.getElementById('startButton').addEventListener('click', startGame);
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// Key states
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    ' ': false,
    'Escape': false // Add Escape key to tracked keys
};

// Handle key down
function handleKeyDown(e) {
    if (e.key in keys) {
        keys[e.key] = true;
        e.preventDefault();
    }
    
    // Start game only with spacebar if not started
    if (!gameStarted && !e.repeat && e.key === ' ') {
        startGame();
    }
    
    // Toggle pause with Escape key
    if (gameStarted && !gameOver && e.key === 'Escape' && !e.repeat) {
        togglePause();
    }
}

// Handle key up
function handleKeyUp(e) {
    if (e.key in keys) {
        keys[e.key] = false;
        e.preventDefault();
    }
}

// Restore the player entrance animation and fix enemy spawning
function startGame() {
    console.log("Game started!");
    
    // Reset game state
    gameStarted = true;
    gameOver = false;
    gamePaused = false; // Reset pause state when starting game
    score = 0;
    
    // Add game-active class to body to show pause hint
    document.body.classList.add('game-active');
    
    // Show pause hint
    const pauseHint = document.getElementById('pauseHint');
    if (pauseHint) {
        pauseHint.style.display = 'flex';
    }
    
    // Hide pause menu if it exists
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) {
        pauseMenu.style.display = 'none';
    }
    
    // Ensure music is playing if enabled
    if (musicEnabled) {
        // Make sure we're playing the gameplay music
        if (currentTrack !== 'gameplay') {
            gameMusic.src = 'audio/Dreams.mp3';
            currentTrack = 'gameplay';
            console.log("Switched to gameplay music (Dreams.mp3)");
        }
        
        console.log("Starting game music");
        try {
            const playPromise = gameMusic.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => console.log("Game music started successfully"))
                    .catch(e => console.error("Failed to start game music:", e));
            }
        } catch (e) {
            console.error("Exception when trying to start game music:", e);
        }
    } else {
        console.log("Music not started because musicEnabled =", musicEnabled);
    }
    
    // Reset player health
    player.shields = player.maxShields; // Reset to full shields
    player.hull = player.maxHull;       // Reset to full hull
    
    // Set player to start off-screen below the canvas
    player.x = canvas.width / 2;
    player.y = canvas.height + 150; // Start below the screen
    player.bankAngle = 0;
    player.pitchAngle = -0.3; // Slight upward pitch
    player.scale = 1.5; // Start larger
    
    // Add entrance animation properties
    player.entranceAnimation = {
        active: true,
        duration: 2.0, // seconds
        timeElapsed: 0,
        targetY: canvas.height * 0.8, // Final position
        targetScale: 1.0 // Final scale
    };
    
    // Clear enemies and projectiles
    enemies = [];
    projectiles = [];
    particles = [];
    
    // Hide start screen
    document.getElementById('startScreen').style.display = 'none';
    
    // Show game HUD
    const gameHUD = document.getElementById('gameHUD');
    if (gameHUD) {
        gameHUD.style.display = 'block';
    }
    
    // Remove any game over text if it exists
    const gameOverText = document.getElementById('gameOverText');
    if (gameOverText) {
        gameOverText.remove();
    }
    
    // Remove any game over overlay if it exists
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    if (gameOverOverlay) {
        gameOverOverlay.style.display = 'none';
    }
    
    // Initialize star field if the function exists
    if (typeof initStarField === 'function') {
        initStarField();
    }
    
    // Set last time to current timestamp to avoid large first delta
    lastTime = performance.now();
    
    // Reset player targeting sight
    player.sightX = player.x;
    player.sightY = player.y - 150;
    
    // Make sure the game loop is running
    if (!window.gameLoopRunning) {
        window.gameLoopRunning = true;
        requestAnimationFrame(gameLoop);
    }
    
    console.log("Setting up enemy spawn timeout for 3.5 seconds from now");
    // Spawn enemies after 3-4 seconds
    setTimeout(() => {
        console.log("Enemy spawn timeout triggered!");
        // Create initial enemies
        createInitialEnemies();
        
        // Start regular enemy spawning
        if (window.enemySpawnInterval) {
            clearInterval(window.enemySpawnInterval);
        }
        window.enemySpawnInterval = setInterval(() => {
            console.log("Enemy spawn interval triggered");
            spawnEnemy();
        }, 5000); // CHANGED: Increased from 3000 to 5000 (spawn every 5 seconds instead of 3)
    }, 3500); // 3.5 seconds after game start
}

// Game loop
function gameLoop(timestamp) {
    // Calculate delta time
    const deltaTime = lastTime ? (timestamp - lastTime) / 1000 : 0;
    lastTime = timestamp;
    
    // If game is paused, don't update game state but still render pause screen
    if (gamePaused) {
        // Ensure music is paused when game is paused
        if (!gameMusic.paused) {
            console.log("Game loop detected music playing while paused - forcing pause");
            console.log("Current track: " + currentTrack);
            gameMusic.pause();
        }
        
        // Draw pause screen
        drawPauseScreen();
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Limit delta time to avoid large jumps
    const cappedDeltaTime = Math.min(deltaTime, 0.1);
    
    // Update screen shake
    if (screenShake.timeLeft > 0) {
        screenShake.timeLeft -= cappedDeltaTime;
        
        // Apply shake to canvas
        const shakeAmount = screenShake.intensity * (screenShake.timeLeft / screenShake.duration);
        ctx.save();
        ctx.translate(
            (Math.random() - 0.5) * shakeAmount * 20,
            (Math.random() - 0.5) * shakeAmount * 20
        );
    }
    
    // Clear canvas with vaporwave background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000033');
    gradient.addColorStop(1, '#2D1B4E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw retro grid first (background)
    drawRetroGrid();
    
    // Update and draw particles (even during game over)
    if (typeof updateParticles === 'function') {
        updateParticles(cappedDeltaTime);
    }
    if (typeof drawParticles === 'function') {
        drawParticles();
    }
    
    // FIXED: Restore context if screen shake was applied
    if (screenShake.timeLeft > 0) {
        ctx.restore();
    }
    
    if (gameStarted) {
        if (!gameOver) {
            // Update game state
            updatePlayer(cappedDeltaTime);
            
            // Update other game elements
            if (typeof updateStarField === 'function') {
                updateStarField(cappedDeltaTime);
            }
            
            if (typeof updateProjectiles === 'function') {
                updateProjectiles(cappedDeltaTime);
            }
            
            // Update enemies
            updateEnemies(cappedDeltaTime);
            
            // Check collisions
            checkCollisions();
            
            // Check if player health is depleted
            if (health <= 0) {
                // Create explosion at player position
                createExplosion(player.x, player.y, 0);
                showGameOver();
            }
            
            // We no longer need to draw the pause icon on the canvas
            // drawPauseIcon();
        }
        
        // Draw game objects (even during game over)
        if (typeof drawStarField === 'function') {
            drawStarField();
        }
        
        drawEnemies();
        
        if (typeof drawProjectiles === 'function') {
            drawProjectiles();
        }
        
        // Draw the player if not game over
        if (!gameOver) {
            drawPlayer();
            
            // Add labels
            addLabels();
        }
        
        // Update HUD outside canvas
        updateHUD();
    } else {
        // Draw the game title on start screen
        drawGameTitle();
        
        // Make sure HUD is hidden on title screen
        const gameHUD = document.getElementById('gameHUD');
        const oldHud = document.getElementById('hud');
        
        if (gameHUD) {
            gameHUD.style.display = 'none';
        }
        
        if (oldHud) {
            oldHud.style.display = 'none';
        }
    }
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Add labels to identify objects
function addLabels() {
    // Function intentionally left empty to remove all labels
}

// Update player with entrance animation
function updatePlayer(deltaTime) {
    // Handle entrance animation if active
    if (player.entranceAnimation && player.entranceAnimation.active) {
        player.entranceAnimation.timeElapsed += deltaTime;
        const progress = Math.min(player.entranceAnimation.timeElapsed / player.entranceAnimation.duration, 1.0);
        
        // Ease-out function for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        // Update player position and scale
        player.y = canvas.height + 150 - (canvas.height + 150 - player.entranceAnimation.targetY) * easeOut;
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
    
    // Previous position for calculating banking and pitch
    const prevX = player.x;
    const prevY = player.y;
    
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
    
    // Move player based on key presses
    if (keys.ArrowUp && player.y > 50) {
        player.y -= player.speed * deltaTime;
    }
    if (keys.ArrowDown && player.y < canvas.height - 50) {
        player.y += player.speed * deltaTime;
    }
    if (keys.ArrowLeft && player.x > 50) {
        player.x -= player.speed * deltaTime;
        // Set bank target to max left bank (negative)
        player.animState.bankTarget = -player.maxBankAngle;
    } else if (keys.ArrowRight && player.x < canvas.width - 50) {
        player.x += player.speed * deltaTime;
        // Set bank target to max right bank (positive)
        player.animState.bankTarget = player.maxBankAngle;
    } else {
        // No left/right input, return to level flight faster
        player.animState.bankTarget = 0;
    }
    
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
            shoot();
            player.lastShot = now;
            player.isShooting = true;
        }
    } else if (!keys[' ']) {
        player.isShooting = false;
    }
}

// Fix the targeting sight and shooting system
function drawTargetingSight() {
    // Only draw if player exists
    if (!player) return;
    
    // Calculate the targeting sight position in front of the player
    const sightDistance = 150;
    const bankOffset = Math.sin(player.bankAngle) * 100;
    const pitchOffset = player.pitchAngle * 150;
    
    const sightX = player.x + bankOffset;
    const sightY = player.y - sightDistance + pitchOffset;
    
    // Store the sight position for shooting
    player.sightX = sightX;
    player.sightY = sightY;
    
    // Draw targeting sight
    ctx.save();
    
    // Draw crosshair at the sight position
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    
    // Outer circle
    ctx.beginPath();
    ctx.arc(sightX, sightY, 20, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner circle
    ctx.beginPath();
    ctx.arc(sightX, sightY, 5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Add glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00FFFF';
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(sightX, sightY, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw line from player to sight
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 20);
    ctx.lineTo(sightX, sightY);
    ctx.stroke();
    
    // Check if any enemy is in the sight
    let enemyInSight = false;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        
        // Calculate perspective
        const perspective = 500 / (500 + e.z);
        
        // Calculate enemy screen size
        const enemyWidth = e.width * perspective;
        const enemyHeight = e.height * perspective;
        
        // Check if enemy is in sight
        if (
            sightX > e.x - enemyWidth/2 &&
            sightX < e.x + enemyWidth/2 &&
            sightY > e.y - enemyHeight/2 &&
            sightY < e.y + enemyHeight/2
        ) {
            enemyInSight = true;
            
            // Draw targeting indicator
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sightX, sightY, 20, 0, Math.PI * 2);
            ctx.stroke();
            
            // Add "LOCKED" text
            ctx.fillStyle = '#00FF00';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LOCKED', sightX, sightY - 30);
            
            break;
        }
    }
    
    ctx.restore();
}

// Function to handle shooting through the targeting sight
function shoot() {
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
        // ADDED: Flag to identify targeting sight projectiles
        isTargeting: true
    });
    
    // Add muzzle flash
    particles.push({
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

// Update projectiles to move through the targeting sight
function updateProjectiles(deltaTime) {
    for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i];
        
        if (!p.isEnemy && p.targetX && p.targetY) {
            // For player projectiles with a target, calculate position along the path
            
            // Move forward in Z (negative direction in new coordinate system)
            p.z -= p.speed * deltaTime; // CHANGED: Using -= to move forward in new coordinate system
            
            // Calculate how far along the path we are (0 to 1)
            const totalDistance = 1000; // Distance to sight in Z
            const progress = Math.min(1, Math.abs(p.z) / totalDistance); // CHANGED: Using absolute value
            
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
            // FIXED: For enemy projectiles - maintain their relationship to the enemy that fired them
            // Move in the direction of the player (toward negative z)
            p.z -= p.speed * 1.5 * deltaTime; // Increased speed in z-direction for better passing effect
            
            // IMPROVED: Add safety checks to prevent invalid z values
            // Ensure z doesn't go too negative which could cause perspective issues
            p.z = Math.max(p.z, -1000);
            
            // IMPROVED: Remove enemy projectiles when they get too close to the player
            // This prevents visual glitches when projectiles get too close
            // ADJUSTED: Allow projectiles to get closer before removing them
            if (p.z < -50) {
                projectiles.splice(i, 1);
                i--;
                continue;
            }
            
            // Calculate perspective for z-position with safety check
            const perspective = 500 / Math.max(500 + p.z, 1);
            
            // IMPROVED: Add validation to prevent extreme perspective values
            // ADJUSTED: Allow for more dramatic perspective effects while still preventing extremes
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
            
            // IMPROVED: Calculate progress with better targeting
            // As z decreases (projectile moves forward), it moves more toward the player
            const zProgress = Math.min(1, (2000 - p.z) / 2000); // Progress from 0 to 1 as projectile moves forward
            
            // IMPROVED: Increase speed as projectiles get closer to the player
            // This creates a more dramatic effect of projectiles accelerating toward the player
            const speedMultiplier = 1.0 + zProgress * 0.8; // REDUCED: Speed increases up to 1.8x as it gets closer (was 2.5x)
            
            // IMPROVED: Use a more accurate trajectory calculation
            // Calculate current position based on a blend of initial direction and direct path to target
            // This creates a "homing" effect that becomes stronger as the projectile gets closer
            const homingStrength = zProgress * 0.4; // REDUCED: Weaker homing effect for easier evasion (was 0.7)
            
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
            
            // IMPROVED: Add boundary checks to keep projectiles on screen
            const margin = 100;
            if (p.x < -margin || p.x > canvas.width + margin || 
                p.y < -margin || p.y > canvas.height + margin) {
                // Remove projectiles that go too far off screen
                projectiles.splice(i, 1);
                i--;
                continue;
            }
        } else {
            // For other projectiles without a target
            p.x += (p.dx || 0) * p.speed * deltaTime;
            p.y += (p.dy || 0) * p.speed * deltaTime;
            p.z -= (p.dz || 1) * p.speed * deltaTime; // CHANGED: Using -= for consistency
        }
        
        // Remove projectile if it goes off screen or too far into the distance
        if (p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50 || p.z < -1000) { // Expanded boundaries
            projectiles.splice(i, 1);
            i--;
        }
    }
}

// Fix the drawProjectiles function to make enemy projectiles clearly travel toward the player
function drawProjectiles() {
    // Sort projectiles by z-position for proper z-sorting
    // Draw distant projectiles first
    projectiles.sort((a, b) => b.z - a.z);
    
    for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i];
        
        ctx.save();
        
        // Calculate perspective for z-position
        const perspective = 500 / Math.max(500 + p.z, 1);
        
        // IMPROVED: Skip drawing if perspective is invalid or too large
        // ADJUSTED: Match the new perspective limit from updateProjectiles
        if (!isFinite(perspective) || perspective <= 0 || perspective > 20) {
            ctx.restore();
            continue;
        }
        
        // For enemy projectiles
        if (p.isEnemy) {
            // Calculate size based on perspective
            const size = 5 * perspective;
            
            // IMPROVED: Limit maximum size to prevent screen-filling lasers
            // ADJUSTED: Increased max size slightly for more dramatic effect
            const maxSize = 20;
            const limitedSize = Math.min(size, maxSize);
            
            // Calculate position with perspective
            const screenX = p.x;
            const screenY = p.y;
            
            // Add subtle glow effect
            ctx.shadowColor = '#FF00FF';
            ctx.shadowBlur = Math.min(10 * perspective, 20); // Limit blur size
            
            // Draw the enemy laser as a teardrop shape pointing toward the player
            ctx.fillStyle = '#FF00FF';
            
            // Save context for rotation
            ctx.save();
            ctx.translate(screenX, screenY);
            
            // IMPROVED: Calculate the angle toward the player's actual position
            // This ensures lasers are properly oriented toward the player
            const playerX = player.x;
            const playerY = player.y;
            const dx = playerX - screenX;
            const dy = playerY - screenY;
            const angle = Math.atan2(dy, dx);
            
            // Rotate to point toward the player
            ctx.rotate(angle + Math.PI/2); // Add 90 degrees to align properly
            
            // Draw teardrop shape with limited size
            ctx.beginPath();
            ctx.moveTo(0, -limitedSize * 2); // Top point
            ctx.bezierCurveTo(
                limitedSize, -limitedSize, // Control point 1
                limitedSize, limitedSize, // Control point 2
                0, limitedSize * 1.5 // Bottom point
            );
            ctx.bezierCurveTo(
                -limitedSize, limitedSize, // Control point 1
                -limitedSize, -limitedSize, // Control point 2
                0, -limitedSize * 2 // Back to top point
            );
            ctx.fill();
            
            // Add bright center
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, -limitedSize, Math.min(limitedSize/2, 5), 0, Math.PI * 2);
            ctx.fill();
            
            // Add trailing effect
            ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
            ctx.beginPath();
            ctx.moveTo(0, limitedSize * 0.5);
            ctx.lineTo(limitedSize/2, limitedSize * 2);
            ctx.lineTo(-limitedSize/2, limitedSize * 2);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore(); // Restore from rotation
        } else {
            // Player projectiles (existing code)
            // Add subtle glow effect
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 5; // Reduced blur
            
            // Calculate direction vector
            let dx = 0;
            let dy = -1; // Default upward direction
            
            // If we have target coordinates, use them for direction
            if (p.targetX !== undefined && p.targetY !== undefined) {
                // Calculate direction vector from origin to target
                dx = p.targetX - p.x;
                dy = p.targetY - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                // Normalize direction
                if (dist > 0) {
                    dx /= dist;
                    dy /= dist;
                }
                
                // Calculate progress (0 to 1) of the projectile's journey
                // Store initial distance if not already stored
                if (!p.initialDist) {
                    p.initialX = p.initialX || p.x;
                    p.initialY = p.initialY || p.y;
                    p.initialDist = Math.sqrt(
                        Math.pow(p.targetX - p.initialX, 2) + 
                        Math.pow(p.targetY - p.initialY, 2)
                    );
                }
                
                // Calculate current distance to target
                const currentDist = Math.sqrt(
                    Math.pow(p.targetX - p.x, 2) + 
                    Math.pow(p.targetY - p.y, 2)
                );
                
                // Calculate progress (0 to 1)
                const progress = 1 - (currentDist / p.initialDist);
                
                // Draw the laser as a rod that shrinks with distance
                ctx.fillStyle = '#00FFFF';
                
                // Calculate laser length based on progress
                const baseLength = 20;
                let laserLength;
                
                if (progress < 0.7) {
                    // Normal laser before reaching target
                    laserLength = baseLength;
                } else {
                    // Shrink laser as it approaches and passes target
                    // Map progress from 0.7-1.0 to 1.0-0.0 for shrinking effect
                    const shrinkProgress = (progress - 0.7) * (1/0.3); // 0.7->1.0 maps to 0->1
                    laserLength = baseLength * (1 - shrinkProgress);
                }
                
                // Calculate tail position
                const tailX = p.x - dx * laserLength;
                const tailY = p.y - dy * laserLength;
                
                // Draw the laser as a simple rod
                ctx.lineWidth = 3; // Thinner laser
                ctx.strokeStyle = '#00FFFF';
                ctx.lineCap = 'round';
                
                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                
                // Add a small dot at the front
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Fallback for projectiles without target coordinates
                const laserLength = 15;
                
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#00FFFF';
                ctx.lineCap = 'round';
                
                // Draw the beam
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x, p.y - laserLength);
                ctx.stroke();
                
                // Add a small dot at the front
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
}

// Create a sleek X-wing style fighter
function drawPlayer() {
    // Make sure player exists and has a position
    if (!player || player.x === undefined || player.y === undefined) {
        return;
    }
    
    // Draw shield first so it appears behind the ship
    drawPlayerShield();
    
    // Save context
    ctx.save();
    
    // Move to player position
    ctx.translate(player.x, player.y);
    
    // Apply scale
    ctx.scale(player.scale, player.scale);
    
    // Apply banking rotation
    ctx.rotate(player.bankAngle);
    
    // Apply pitch effect
    const pitchScale = 1.0 - Math.abs(player.pitchAngle) * 0.5;
    ctx.scale(1.0, pitchScale);
    
    // Set up neon wireframe effect
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#01CDFE'; // Bright cyan blue for outlines
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#01CDFE';
    
    // Scale factor to make ship larger
    const scale = 1.2;
    
    // MAIN BODY STRUCTURE - X-WING STYLE
    
    // Central fuselage - sleek design
    ctx.beginPath();
    ctx.moveTo(0, -30 * scale); // Nose
    ctx.lineTo(8 * scale, -15 * scale); // Right shoulder
    ctx.lineTo(8 * scale, 15 * scale); // Right hip
    ctx.lineTo(0, 25 * scale); // Tail
    ctx.lineTo(-8 * scale, 15 * scale); // Left hip
    ctx.lineTo(-8 * scale, -15 * scale); // Left shoulder
    ctx.closePath();
    ctx.stroke();
    
    // Cockpit canopy
    ctx.beginPath();
    ctx.moveTo(0, -20 * scale); // Front of canopy
    ctx.lineTo(6 * scale, -10 * scale); // Right side
    ctx.lineTo(6 * scale, 0 * scale); // Right rear
    ctx.lineTo(0, 5 * scale); // Center rear
    ctx.lineTo(-6 * scale, 0 * scale); // Left rear
    ctx.lineTo(-6 * scale, -10 * scale); // Left side
    ctx.closePath();
    ctx.stroke();
    
    // UPPER WINGS - X-WING STYLE
    
    // Upper right wing
    ctx.beginPath();
    ctx.moveTo(8 * scale, -10 * scale); // Wing root
    ctx.lineTo(20 * scale, -15 * scale); // Mid wing
    ctx.lineTo(40 * scale, -25 * scale); // Wing tip (pointed)
    ctx.lineTo(20 * scale, -5 * scale); // Trailing edge
    ctx.closePath();
    ctx.stroke();
    
    // Upper left wing
    ctx.beginPath();
    ctx.moveTo(-8 * scale, -10 * scale); // Wing root
    ctx.lineTo(-20 * scale, -15 * scale); // Mid wing
    ctx.lineTo(-40 * scale, -25 * scale); // Wing tip (pointed)
    ctx.lineTo(-20 * scale, -5 * scale); // Trailing edge
    ctx.closePath();
    ctx.stroke();
    
    // LOWER WINGS - X-WING STYLE
    
    // Lower right wing
    ctx.beginPath();
    ctx.moveTo(8 * scale, 10 * scale); // Wing root
    ctx.lineTo(20 * scale, 15 * scale); // Mid wing
    ctx.lineTo(40 * scale, 25 * scale); // Wing tip (pointed)
    ctx.lineTo(20 * scale, 5 * scale); // Trailing edge
    ctx.closePath();
    ctx.stroke();
    
    // Lower left wing
    ctx.beginPath();
    ctx.moveTo(-8 * scale, 10 * scale); // Wing root
    ctx.lineTo(-20 * scale, 15 * scale); // Mid wing
    ctx.lineTo(-40 * scale, 25 * scale); // Wing tip (pointed)
    ctx.lineTo(-20 * scale, 5 * scale); // Trailing edge
    ctx.closePath();
    ctx.stroke();
    
    // ENGINE NACELLES
    
    // Right engine
    ctx.beginPath();
    ctx.moveTo(20 * scale, 15 * scale); // Front
    ctx.lineTo(35 * scale, 15 * scale); // Top
    ctx.lineTo(35 * scale, 20 * scale); // Rear
    ctx.lineTo(20 * scale, 20 * scale); // Bottom
    ctx.closePath();
    ctx.stroke();
    
    // Left engine
    ctx.beginPath();
    ctx.moveTo(-20 * scale, 15 * scale); // Front
    ctx.lineTo(-35 * scale, 15 * scale); // Top
    ctx.lineTo(-35 * scale, 20 * scale); // Rear
    ctx.lineTo(-20 * scale, 20 * scale); // Bottom
    ctx.closePath();
    ctx.stroke();
    
    // FILL WITH SEMI-TRANSPARENT COLOR
    
    // Set fill style for a holographic look
    ctx.fillStyle = 'rgba(1, 205, 254, 0.15)'; // Very transparent cyan
    
    // Fill central fuselage
    ctx.beginPath();
    ctx.moveTo(0, -30 * scale); // Nose
    ctx.lineTo(8 * scale, -15 * scale); // Right shoulder
    ctx.lineTo(8 * scale, 15 * scale); // Right hip
    ctx.lineTo(0, 25 * scale); // Tail
    ctx.lineTo(-8 * scale, 15 * scale); // Left hip
    ctx.lineTo(-8 * scale, -15 * scale); // Left shoulder
    ctx.closePath();
    ctx.fill();
    
    // Fill cockpit with a different color
    ctx.fillStyle = 'rgba(5, 255, 161, 0.3)'; // Semi-transparent mint green
    ctx.beginPath();
    ctx.moveTo(0, -20 * scale); // Front of canopy
    ctx.lineTo(6 * scale, -10 * scale); // Right side
    ctx.lineTo(6 * scale, 0 * scale); // Right rear
    ctx.lineTo(0, 5 * scale); // Center rear
    ctx.lineTo(-6 * scale, 0 * scale); // Left rear
    ctx.lineTo(-6 * scale, -10 * scale); // Left side
    ctx.closePath();
    ctx.fill();
    
    // Fill wings with very subtle color
    ctx.fillStyle = 'rgba(1, 205, 254, 0.1)'; // Very transparent cyan
    
    // Upper right wing
    ctx.beginPath();
    ctx.moveTo(8 * scale, -10 * scale);
    ctx.lineTo(20 * scale, -15 * scale);
    ctx.lineTo(40 * scale, -25 * scale);
    ctx.lineTo(20 * scale, -5 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Upper left wing
    ctx.beginPath();
    ctx.moveTo(-8 * scale, -10 * scale);
    ctx.lineTo(-20 * scale, -15 * scale);
    ctx.lineTo(-40 * scale, -25 * scale);
    ctx.lineTo(-20 * scale, -5 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Lower right wing
    ctx.beginPath();
    ctx.moveTo(8 * scale, 10 * scale);
    ctx.lineTo(20 * scale, 15 * scale);
    ctx.lineTo(40 * scale, 25 * scale);
    ctx.lineTo(20 * scale, 5 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Lower left wing
    ctx.beginPath();
    ctx.moveTo(-8 * scale, 10 * scale);
    ctx.lineTo(-20 * scale, 15 * scale);
    ctx.lineTo(-40 * scale, 25 * scale);
    ctx.lineTo(-20 * scale, 5 * scale);
    ctx.closePath();
    ctx.fill();
    
    // ENGINE GLOW EFFECTS
    
    // Reset shadow for engine glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FF71CE'; // Pink glow
    
    // Right engine glow
    const rightEngineGradient = ctx.createRadialGradient(
        35 * scale, 17.5 * scale, 0,
        35 * scale, 17.5 * scale, 8 * scale
    );
    rightEngineGradient.addColorStop(0, '#FF71CE'); // Pink center
    rightEngineGradient.addColorStop(1, 'rgba(255, 113, 206, 0)'); // Transparent edge
    
    ctx.fillStyle = rightEngineGradient;
    ctx.beginPath();
    ctx.arc(35 * scale, 17.5 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Left engine glow
    const leftEngineGradient = ctx.createRadialGradient(
        -35 * scale, 17.5 * scale, 0,
        -35 * scale, 17.5 * scale, 8 * scale
    );
    leftEngineGradient.addColorStop(0, '#FF71CE'); // Pink center
    leftEngineGradient.addColorStop(1, 'rgba(255, 113, 206, 0)'); // Transparent edge
    
    ctx.fillStyle = leftEngineGradient;
    ctx.beginPath();
    ctx.arc(-35 * scale, 17.5 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // ENGINE TRAILS
    
    // Add engine trails when moving
    if (keys.ArrowUp) {
        // Reset shadow for trails
        ctx.shadowBlur = 0;
        
        // Create gradient for engine trails
        const trailGradient = ctx.createLinearGradient(
            0, 20 * scale,
            0, 80 * scale
        );
        trailGradient.addColorStop(0, '#FF71CE'); // Pink
        trailGradient.addColorStop(1, 'rgba(255, 113, 206, 0)');
        
        ctx.fillStyle = trailGradient;
        
        // Right engine trail
        ctx.beginPath();
        ctx.moveTo(30 * scale, 20 * scale);
        ctx.lineTo(40 * scale, 20 * scale);
        ctx.lineTo(37 * scale, 80 * scale);
        ctx.lineTo(33 * scale, 80 * scale);
        ctx.closePath();
        ctx.fill();
        
        // Left engine trail
        ctx.beginPath();
        ctx.moveTo(-30 * scale, 20 * scale);
        ctx.lineTo(-40 * scale, 20 * scale);
        ctx.lineTo(-37 * scale, 80 * scale);
        ctx.lineTo(-33 * scale, 80 * scale);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
    
    // Draw targeting sight
    drawTargetingSight();
}

// Check for collisions between game objects
function checkCollisions() {
    // Check for collisions between projectiles and enemies
    for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i];
        
        // Skip enemy projectiles for this check
        if (p.isEnemy) continue;
        
        // Calculate projectile perspective for size
        const pPerspective = 500 / Math.max(500 + Math.abs(p.z), 1);
        
        for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            
            // Calculate enemy perspective for size
            const ePerspective = 500 / Math.max(500 + Math.abs(e.z), 1);
            
            // Calculate sizes with perspective
            const pWidth = p.width * pPerspective;
            const pHeight = p.height * pPerspective;
            const eWidth = e.width * ePerspective;
            const eHeight = e.height * ePerspective;
            
            // IMPROVED: Greatly increased z-distance check for targeting sight mode
            // Only check collision if they're close in z-space
            const zDistance = Math.abs(p.z - e.z);
            
            // FIXED: Different z-distance thresholds based on projectile type
            const maxZDistance = p.targetX !== undefined ? 2000 : 500; // Much larger range for targeting sight projectiles
            
            if (zDistance > maxZDistance) continue;
            
            // FIXED: Special handling for targeting sight mode
            // If this is a targeting sight projectile
            if (p.targetX !== undefined) {
                // Use a more generous hit box for targeting sight projectiles
                // The multiplier increases with distance to make it easier to hit distant enemies
                const distanceMultiplier = Math.min(3, 1 + (zDistance / 1000)); // Scales from 1x to 3x based on distance
                
                // Check for collision with larger hit box
                if (
                    p.x + (pWidth * distanceMultiplier) > e.x - eWidth &&
                    p.x - (pWidth * distanceMultiplier) < e.x + eWidth &&
                    p.y + (pHeight * distanceMultiplier) > e.y - eHeight &&
                    p.y - (pHeight * distanceMultiplier) < e.y + eHeight
                ) {
                    // Create hit effect
                    if (typeof createHitEffect === 'function') {
                        createHitEffect(e.x, e.y, e.z);
                    }
                    
                    // Reduce enemy health
                    e.health -= 10;
                    
                    // Remove projectile
                    projectiles.splice(i, 1);
                    i--;
                    
                    // Check if enemy is destroyed
                    if (e.health <= 0) {
                        // Create explosion
                        if (typeof createExplosion === 'function') {
                            createExplosion(e.x, e.y, e.z);
                        }
                        
                        // Remove enemy
                        enemies.splice(j, 1);
                        j--;
                        
                        // Add score
                        score += 100;
                        
                        // Add screen shake
                        if (typeof addScreenShake === 'function') {
                            addScreenShake(0.3);
                        }
                    }
                    
                    // Update HUD
                    updateHUD();
                    
                    // Break out of enemy loop since projectile is gone
                    break;
                }
            } else {
                // Standard collision check for non-targeting projectiles
                if (
                    p.x + pWidth/2 > e.x - eWidth/2 &&
                    p.x - pWidth/2 < e.x + eWidth/2 &&
                    p.y + pHeight/2 > e.y - eHeight/2 &&
                    p.y - pHeight/2 < e.y + eHeight/2
                ) {
                    // Create hit effect
                    if (typeof createHitEffect === 'function') {
                        createHitEffect(e.x, e.y, e.z);
                    }
                    
                    // Reduce enemy health
                    e.health -= 10;
                    
                    // Remove projectile
                    projectiles.splice(i, 1);
                    i--;
                    
                    // Check if enemy is destroyed
                    if (e.health <= 0) {
                        // Create explosion
                        if (typeof createExplosion === 'function') {
                            createExplosion(e.x, e.y, e.z);
                        }
                        
                        // Remove enemy
                        enemies.splice(j, 1);
                        j--;
                        
                        // Add score
                        score += 100;
                        
                        // Add screen shake
                        if (typeof addScreenShake === 'function') {
                            addScreenShake(0.3);
                        }
                    }
                    
                    // Update HUD
                    updateHUD();
                    
                    // Break out of enemy loop since projectile is gone
                    break;
                }
            }
        }
    }
    
    // Check for collisions between enemy projectiles and player
    for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i];
        
        // Skip player projectiles for this check
        if (!p.isEnemy) continue;
        
        // Calculate projectile perspective for size
        const pPerspective = 500 / Math.max(500 + Math.abs(p.z), 1);
        
        // Calculate sizes with perspective
        const pWidth = p.width * pPerspective;
        const pHeight = p.height * pPerspective;
        
        // Only check collision if projectile is close to player in z-space
        if (p.z < 0 || p.z > 300) continue;
        
        // Check for collision with player (simple rectangle intersection)
        if (
            p.x + pWidth/2 > player.x - player.width/2 &&
            p.x - pWidth/2 < player.x + player.width/2 &&
            p.y + pHeight/2 > player.y - player.height/2 &&
            p.y - pHeight/2 < player.y + player.height/2
        ) {
            // Create hit effect on player
            if (typeof createPlayerHitEffect === 'function') {
                createPlayerHitEffect(player.x, player.y);
            }
            
            // Remove projectile
            projectiles.splice(i, 1);
            i--;
            
            // Apply damage to player using shield/hull system
            if (player.shields > 0) {
                // Damage shields first
                player.shields--;
                console.log("Shields hit! Remaining shields:", player.shields);
            
            // Add screen shake
                addScreenShake(0.3);
                
                // Create shield impact effect
                createShieldImpact();
            } else {
                // Damage hull when shields are depleted
                player.hull--;
                console.log("Hull hit! Remaining hull:", player.hull);
                
                // Add stronger screen shake for hull hits
                addScreenShake(0.6);
                
                // Create hull damage effect
                createHullDamageEffect();
                
                // Check if player is destroyed
                if (player.hull <= 0) {
                    console.log("Player destroyed!");
                    createExplosion(player.x, player.y, 0);
                    showGameOver();
                    return; // Exit the function to prevent further processing
                }
            }
            
            // Update HUD
            updateHUD();
        }
    }
    
    // Check for collisions between player and enemies
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        // Skip enemies behind the player
        if (enemy.z < 0) continue;
        
        // Calculate perspective for size adjustment
        const perspective = 500 / (500 + Math.abs(enemy.z));
        
        // Adjust collision size based on perspective
        const enemyWidth = enemy.width * perspective * 0.8; // 80% of visual size for better feel
        const enemyHeight = enemy.height * perspective * 0.8;
        
        // Simple rectangular collision detection
        if (
            player.x < enemy.x + enemyWidth / 2 &&
            player.x > enemy.x - enemyWidth / 2 &&
            player.y < enemy.y + enemyHeight / 2 &&
            player.y > enemy.y - enemyHeight / 2
        ) {
            console.log("Player collision with enemy!");
            
            // Remove the enemy
            createExplosion(enemy.x, enemy.y, enemy.z);
            enemies.splice(i, 1);
            i--;
            
            // Apply damage to player
            if (player.shields > 0) {
                // Damage shields first
                player.shields--;
                console.log("Shields hit! Remaining shields:", player.shields);
                
                // Add screen shake
                addScreenShake(0.3);
                
                // Create shield impact effect
                createShieldImpact();
            } else {
                // Damage hull when shields are depleted
                player.hull--;
                console.log("Hull hit! Remaining hull:", player.hull);
                
                // Add stronger screen shake for hull hits
                addScreenShake(0.6);
                
                // Create hull damage effect
                createHullDamageEffect();
                
                // Check if player is destroyed
                if (player.hull <= 0) {
                    console.log("Player destroyed!");
                    createExplosion(player.x, player.y, 0);
                    showGameOver();
                    return; // Exit the function to prevent further processing
                }
            }
            
            // Update HUD
            updateHUD();
        }
    }
}

// Create player hit effect with vaporwave colors
function createPlayerHitEffect(x, y) {
    // Create sparks with vaporwave colors
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 300;
        
        // Use vaporwave color palette
        let color;
        if (i % 4 === 0) {
            color = '#FFFFFF'; // White
        } else if (i % 4 === 1) {
            color = '#01CDFE'; // Bright blue (accent2)
        } else if (i % 4 === 2) {
            color = '#FF71CE'; // Pink (accent1)
        } else {
            color = '#05FFA1'; // Mint green (accent3)
        }
        
        particles.push({
            x: x + (Math.random() - 0.5) * 40,
            y: y + (Math.random() - 0.5) * 30,
            z: 0,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            dz: 0,
            size: 1.5 + Math.random() * 3.5,
            life: 0.4 + Math.random() * 0.8,
            maxLife: 0.4 + Math.random() * 0.8,
            color: color,
            type: 'playerhit'
        });
    }
    
    // Add flash
    particles.push({
        x: x,
        y: y,
        z: 0,
        size: 70,
        color: '#FFFFFF',
        life: 0.15,
        maxLife: 0.15,
        type: 'flash'
    });
    
    // Add a secondary glow
    particles.push({
        x: x,
        y: y,
        z: 0,
        size: 100,
        color: 'rgba(1, 205, 254, 0.5)', // Cyan glow
        life: 0.25,
        maxLife: 0.25,
        type: 'flash'
    });
    
    // Add screen shake
    addScreenShake(0.5);
}

// Add a simple hit effect for projectile impacts with vaporwave colors
function createHitEffect(x, y, z) {
    // Calculate perspective for size scaling
    const perspective = 500 / (500 + Math.abs(z));
    const baseSize = 3 * perspective;
    
    // Create particles
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 150;
        
        // Use vaporwave colors
        let color;
        if (i % 3 === 0) {
            color = '#FFFFFF'; // White
        } else if (i % 3 === 1) {
            color = '#01CDFE'; // Bright blue (accent2)
        } else {
            color = '#FF71CE'; // Pink (accent1)
        }
        
        particles.push({
            x: x,
            y: y,
            z: z,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            dz: 0,
            size: baseSize * (1 + Math.random()),
            life: 0.3 + Math.random() * 0.3,
            maxLife: 0.3 + Math.random() * 0.3,
            color: color,
            type: 'hit'
        });
    }
    
    // Add flash
    particles.push({
        x: x,
        y: y,
        z: z,
        size: 30 * perspective,
        color: '#FFFFFF',
        life: 0.1,
        maxLife: 0.1,
        type: 'flash'
    });
}

// Add screen shake effect
const screenShake = {
    intensity: 0,
    duration: 0,
    timeLeft: 0
};

function addScreenShake(intensity) {
    screenShake.intensity = intensity;
    screenShake.duration = 0.3;
    screenShake.timeLeft = screenShake.duration;
}

// Update the HUD function to use status bars
function updateHUD() {
    // Update shield and hull bars
    const shieldBar = document.getElementById('shieldBar');
    const hullBar = document.getElementById('hullBar');
    const newScoreDisplay = document.getElementById('newScoreDisplay');
    const oldScoreDisplay = document.getElementById('scoreDisplay');
    const gameHUD = document.getElementById('gameHUD');
    const oldHud = document.getElementById('hud');
    
    // Hide HUD elements on title screen
    if (!gameStarted) {
        if (gameHUD) {
            gameHUD.style.display = 'none';
        }
        
        if (oldHud) {
            oldHud.style.display = 'none';
        }
        
        return; // Exit the function early
    } else {
        // Show HUD elements during gameplay
        if (gameHUD) {
            gameHUD.style.display = 'block';
        }
        
        // Always keep the old HUD hidden
        if (oldHud) {
            oldHud.style.display = 'none';
        }
    }
    
    if (shieldBar) {
        // Calculate shield percentage
        const shieldPercent = (player.shields / player.maxShields) * 100;
        shieldBar.style.width = `${shieldPercent}%`;
        
        // Change color based on shield status
        if (player.shields === 0) {
            shieldBar.style.backgroundColor = '#FF0000'; // Red when depleted
        } else if (player.shields === 1) {
            shieldBar.style.backgroundColor = '#FFAA00'; // Orange when low
        } else {
            shieldBar.style.backgroundColor = '#01CDFE'; // Cyan when good
        }
    }
    
    if (hullBar) {
        // Calculate hull percentage
        const hullPercent = (player.hull / player.maxHull) * 100;
        hullBar.style.width = `${hullPercent}%`;
        
        // Change color based on hull status
        if (player.hull === 1) {
            hullBar.style.backgroundColor = '#FF0000'; // Red when critical
        } else {
            hullBar.style.backgroundColor = '#FF71CE'; // Pink when good
        }
    }
    
    // Update both score displays
    if (newScoreDisplay) {
        newScoreDisplay.innerHTML = `SCORE: ${score}`;
    }
    
    if (oldScoreDisplay) {
        oldScoreDisplay.textContent = score;
    }
}

// Improve the showGameOver function with a more dramatic animation
function showGameOver() {
    console.log("Game Over!");
    
    // Set game state
    gameOver = true;
    gamePaused = false; // Ensure game is not paused when game over
    
    // Hide pause menu if it exists
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) {
        pauseMenu.style.display = 'none';
    }
    
    // Hide pause hint
    const pauseHint = document.getElementById('pauseHint');
    if (pauseHint) {
        pauseHint.style.display = 'none';
    }
    
    // We don't stop the music on game over, but switch to game over music
    if (musicEnabled) {
        // Switch to game over music
        if (currentTrack !== 'gameover') {
            gameMusic.pause(); // Pause current music first
            gameMusic.src = 'audio/Cosmos.mp3'; // Set new source
            currentTrack = 'gameover';
            console.log("Switched to game over music (Cosmos.mp3)");
        }
        
        console.log("Playing game over music");
        try {
            const playPromise = gameMusic.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => console.log("Game over music playing"))
                    .catch(e => console.error("Failed to play game over music:", e));
            }
        } catch (e) {
            console.error("Exception when trying to play game over music:", e);
        }
    }
    
    // Stop enemy spawning
    if (window.enemySpawnInterval) {
        clearInterval(window.enemySpawnInterval);
        window.enemySpawnInterval = null;
    }
    
    // Add a dramatic flash effect before showing game over
    const flashOverlay = document.createElement('div');
    flashOverlay.className = 'flash-overlay';
    document.body.appendChild(flashOverlay);
    
    // Add screen shake for dramatic effect
    addScreenShake(1.5);
    
    // Dramatic flash sequence
    setTimeout(() => {
        flashOverlay.style.opacity = '1';
        
        // Create explosion particles at random positions
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                createExplosion(x, y, 0);
            }, i * 100);
        }
        
        setTimeout(() => {
            flashOverlay.style.opacity = '0';
            
            setTimeout(() => {
                flashOverlay.remove();
                
                // Now show the game over screen
                showGameOverScreen();
            }, 500);
        }, 300);
    }, 200);
    
    // Function to show the actual game over screen
    function showGameOverScreen() {
        // Create game over overlay if it doesn't exist
        let gameOverOverlay = document.getElementById('gameOverOverlay');
        if (!gameOverOverlay) {
            gameOverOverlay = document.createElement('div');
            gameOverOverlay.id = 'gameOverOverlay';
            gameOverOverlay.className = 'game-over-overlay';
            document.body.appendChild(gameOverOverlay);
            
            // Create GAME OVER text with letter-by-letter animation
            const gameOverTextContainer = document.createElement('div');
            gameOverTextContainer.className = 'game-over-text-container';
            gameOverOverlay.appendChild(gameOverTextContainer);
            
            // Create each letter with individual animation
            const gameOverText = "GAME OVER!";
            for (let i = 0; i < gameOverText.length; i++) {
                const letterSpan = document.createElement('span');
                letterSpan.className = 'game-over-letter';
                letterSpan.textContent = gameOverText[i];
                letterSpan.style.animationDelay = `${0.2 + i * 0.1}s`;
                gameOverTextContainer.appendChild(letterSpan);
            }
            
            // Create image container with glitch effect
            const imageContainer = document.createElement('div');
            imageContainer.className = 'game-over-image-container glitch-container';
            gameOverOverlay.appendChild(imageContainer);
            
            // Create game over image with glitch layers
            const gameOverImage = document.createElement('img');
            gameOverImage.src = 'images/gameover-image.png';
            gameOverImage.className = 'game-over-image glitch-image';
            imageContainer.appendChild(gameOverImage);
            
            // Add glitch effect layers
            const glitchBefore = document.createElement('div');
            glitchBefore.className = 'glitch-image-before';
            glitchBefore.style.backgroundImage = `url('images/gameover-image.png')`;
            imageContainer.appendChild(glitchBefore);
            
            const glitchAfter = document.createElement('div');
            glitchAfter.className = 'glitch-image-after';
            glitchAfter.style.backgroundImage = `url('images/gameover-image.png')`;
            imageContainer.appendChild(glitchAfter);
            
            // Create score display
            const scoreDisplay = document.createElement('div');
            scoreDisplay.className = 'game-over-score glitch-text';
            scoreDisplay.id = 'gameOverScore';
            gameOverOverlay.appendChild(scoreDisplay);
            
            // Create restart button
            const restartButton = document.createElement('button');
            restartButton.className = 'restart-button';
            restartButton.textContent = 'RESTART';
            restartButton.addEventListener('click', () => {
                gameOverOverlay.style.opacity = '0';
                setTimeout(() => {
                    restartGame(); // Use our new function instead of directly calling startGame
                }, 500);
            });
            gameOverOverlay.appendChild(restartButton);
        }
        
        // Update score display
        const scoreDisplay = document.getElementById('gameOverScore');
        scoreDisplay.innerHTML = `FINAL SCORE: ${score}`;
        
        // Show overlay with animation
        gameOverOverlay.style.display = 'flex';
        gameOverOverlay.style.opacity = '0';
        
        // Dramatic reveal animation
        setTimeout(() => {
            gameOverOverlay.style.opacity = '1';
            
            // Add glitch animation classes after a delay
            setTimeout(() => {
                const imageContainer = document.querySelector('.game-over-image-container');
                if (imageContainer) {
                    imageContainer.classList.add('active-glitch');
                }
                
                const scoreDisplay = document.getElementById('gameOverScore');
                if (scoreDisplay) {
                    scoreDisplay.classList.add('active-glitch');
                }
            }, 500);
        }, 100);
    }
}

// Update star field configuration
const starField = {
    stars: [],
    starCount: 100, // Reduced by 50%
    debrisCount: 15, // Reduced by 50%
    dustCount: 150, // Reduced by 50%
    maxDepth: 8000
};

// Improve star field initialization
function initStarField() {
    // Clear existing stars
    starField.stars = [];
    
    // Create stars with better distribution
    for (let i = 0; i < starField.starCount; i++) {
        // Distribute stars throughout 3D space
        const z = Math.random() * starField.maxDepth;
        // Use perspective to determine x,y range (wider range to ensure they pass through frame)
        const perspective = 500 / (500 + z);
        const xRange = canvas.width * (1 + (1 - perspective) * 4); // Wider range
        const yRange = canvas.height * (1 + (1 - perspective) * 4); // Wider range
        
        starField.stars.push({
            x: (Math.random() * xRange) - (xRange - canvas.width) / 2,
            y: (Math.random() * yRange) - (yRange - canvas.height) / 2,
            z: z,
            size: Math.random() * 1 + 0.5, // Smaller stars (50% smaller)
            color: Math.random() > 0.8 ? getRandomStarColor() : '#FFFFFF',
            type: 'star',
            // Add streaking effect for some stars
            streakLength: Math.random() > 0.7 ? Math.random() * 5 + 3 : 0 // Smaller streaks
        });
    }
    
    // Create space debris with better variety
    for (let i = 0; i < starField.debrisCount; i++) {
        const z = Math.random() * starField.maxDepth;
        const perspective = 500 / (500 + z);
        const xRange = canvas.width * (1 + (1 - perspective) * 4);
        const yRange = canvas.height * (1 + (1 - perspective) * 4);
        
        starField.stars.push({
            x: (Math.random() * xRange) - (xRange - canvas.width) / 2,
            y: (Math.random() * yRange) - (yRange - canvas.height) / 2,
            z: z,
            size: Math.random() * 3 + 1.5, // Smaller debris (50% smaller)
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 2,
            color: getRandomDebrisColor(),
            type: 'debris',
            points: generateDebrisShape()
        });
    }
    
    // Add dust particles for enhanced sense of speed
    for (let i = 0; i < starField.dustCount; i++) {
        const z = Math.random() * starField.maxDepth;
        const perspective = 500 / (500 + z);
        const xRange = canvas.width * (1 + (1 - perspective) * 4);
        const yRange = canvas.height * (1 + (1 - perspective) * 4);
        
        starField.stars.push({
            x: (Math.random() * xRange) - (xRange - canvas.width) / 2,
            y: (Math.random() * yRange) - (yRange - canvas.height) / 2,
            z: z,
            size: Math.random() * 0.5 + 0.2, // Smaller dust (50% smaller)
            color: '#FFFFFF',
            type: 'dust',
            opacity: Math.random() * 0.5 + 0.2
        });
    }
}

// Get random star color from vaporwave palette
function getRandomStarColor() {
    const colors = [
        vaporwaveColors.accent1,
        vaporwaveColors.accent2,
        vaporwaveColors.accent3,
        vaporwaveColors.secondary,
        '#FFFFFF'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Get random debris color
function getRandomDebrisColor() {
    const colors = [
        '#888888',
        '#AAAAAA',
        '#666666',
        '#777777',
        '#999999'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Generate random debris shape
function generateDebrisShape() {
    const points = [];
    const sides = Math.floor(Math.random() * 3) + 3; // 3-5 sides
    const radius = Math.random() * 3 + 2;
    
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const distance = radius * (0.8 + Math.random() * 0.4); // Slightly irregular
        points.push({
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance
        });
    }
    
    return points;
}

// Improve star field update to ensure stars pass through frame
function updateStarField(deltaTime) {
    // Move stars based on corridor speed
    const starSpeed = corridor.speed * 1.5; // Stars move faster than corridor for parallax effect
    
    for (let i = 0; i < starField.stars.length; i++) {
        const star = starField.stars[i];
        
        // Move star closer
        star.z -= starSpeed * deltaTime;
        
        // If star is too close, reset it to far away
        if (star.z < -500) { // Allow stars to pass through and behind the camera
            star.z = starField.maxDepth;
            
            // Distribute new position based on perspective
            const perspective = 500 / (500 + star.z);
            const xRange = canvas.width * (1 + (1 - perspective) * 4);
            const yRange = canvas.height * (1 + (1 - perspective) * 4);
            
            star.x = (Math.random() * xRange) - (xRange - canvas.width) / 2;
            star.y = (Math.random() * yRange) - (yRange - canvas.height) / 2;
            
            // Regenerate debris shape if it's debris
            if (star.type === 'debris') {
                star.points = generateDebrisShape();
                star.rotation = Math.random() * Math.PI * 2;
            }
        }
        
        // Update debris rotation
        if (star.type === 'debris') {
            star.rotation += star.rotationSpeed * deltaTime;
        }
    }
}

// Improve star field drawing to ensure stars pass through frame
function drawStarField() {
    // Draw distant nebula background
    drawNebula();
    
    // Sort stars by z-depth to draw far ones first
    const sortedStars = [...starField.stars].sort((a, b) => b.z - a.z);
    
    for (let i = 0; i < sortedStars.length; i++) {
        const star = sortedStars[i];
        
        // Skip stars that are behind the camera
        if (star.z < -500) continue;
        
        // Calculate perspective - allow for closer stars
        const perspective = 500 / (500 + star.z);
        
        // Calculate screen position with perspective
        // Use a wider field of view to ensure stars pass through frame edges
        const screenX = canvas.width/2 + (star.x - canvas.width/2) * perspective;
        const screenY = canvas.height/2 + (star.y - canvas.height/2) * perspective;
        
        // Skip if star is outside the visible area
        if (screenX < -50 || screenX > canvas.width + 50 || 
            screenY < -50 || screenY > canvas.height + 50) {
            continue;
        }
        
        if (star.type === 'star') {
            // Draw star with glow effect
            const size = star.size * perspective * 2;
            
            // Star brightness based on distance
            const opacity = Math.min(1, perspective * 2);
            
            // Draw streak effect for moving stars
            if (star.streakLength > 0 && star.z < starField.maxDepth * 0.5) {
                const streakLength = star.streakLength * perspective * (1 + (1 - perspective) * 3);
                
                // Create gradient for streak
                const gradient = ctx.createLinearGradient(
                    screenX, screenY,
                    screenX, screenY + streakLength
                );
                gradient.addColorStop(0, star.color);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                ctx.globalAlpha = opacity * 0.7;
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(screenX - size/2, screenY);
                ctx.lineTo(screenX + size/2, screenY);
                ctx.lineTo(screenX + size/3, screenY + streakLength);
                ctx.lineTo(screenX - size/3, screenY + streakLength);
                ctx.closePath();
                ctx.fill();
            }
            
            // Draw glow
            ctx.globalAlpha = opacity * 0.5;
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, size * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw core
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw twinkle effect for closer stars
            if (star.z < starField.maxDepth * 0.3) {
                ctx.globalAlpha = opacity * 0.8 * (0.7 + Math.sin(Date.now() / 300 + i) * 0.3);
                ctx.beginPath();
                ctx.arc(screenX, screenY, size * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (star.type === 'debris') {
            // Draw space debris
            const size = star.size * perspective;
            ctx.globalAlpha = Math.min(1, perspective * 1.5);
            
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(star.rotation);
            
            // Draw debris shape
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.moveTo(star.points[0].x * size, star.points[0].y * size);
            for (let j = 1; j < star.points.length; j++) {
                ctx.lineTo(star.points[j].x * size, star.points[j].y * size);
            }
            ctx.closePath();
            ctx.fill();
            
            // Add detail lines
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 0.5 * perspective;
            ctx.beginPath();
            const midX = 0;
            const midY = 0;
            ctx.moveTo(midX - size, midY);
            ctx.lineTo(midX + size, midY);
            ctx.stroke();
            
            ctx.restore();
        } else if (star.type === 'dust') {
            // Draw dust particles
            const size = star.size * perspective;
            
            // Dust gets more visible as it gets closer
            const dustOpacity = star.opacity * Math.min(1, (1 - perspective) * 3);
            
            // Draw simple dust particle
            ctx.globalAlpha = dustOpacity;
            ctx.fillStyle = star.color;
            
            // For very close dust, add motion blur
            if (star.z < starField.maxDepth * 0.2) {
                const streakLength = (1 - perspective) * 20;
                
                // Create gradient for streak
                const gradient = ctx.createLinearGradient(
                    screenX, screenY,
                    screenX, screenY + streakLength
                );
                gradient.addColorStop(0, star.color);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(screenX - size/2, screenY);
                ctx.lineTo(screenX + size/2, screenY);
                ctx.lineTo(screenX + size/3, screenY + streakLength);
                ctx.lineTo(screenX - size/3, screenY + streakLength);
                ctx.closePath();
                ctx.fill();
            } else {
                // Simple dot for distant dust
                ctx.beginPath();
                ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    ctx.globalAlpha = 1.0;
}

// Draw nebula background
function drawNebula() {
    // Create gradient for nebula
    const gradient = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.5, 0,
        canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.8
    );
    
    gradient.addColorStop(0, 'rgba(45, 27, 78, 0.1)');
    gradient.addColorStop(0.3, 'rgba(255, 0, 255, 0.05)');
    gradient.addColorStop(0.6, 'rgba(0, 255, 255, 0.03)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some nebula clouds
    const time = Date.now() / 10000;
    
    // First cloud
    ctx.fillStyle = 'rgba(255, 113, 206, 0.03)';
    ctx.beginPath();
    ctx.ellipse(
        canvas.width * (0.3 + Math.sin(time) * 0.1),
        canvas.height * (0.4 + Math.cos(time) * 0.1),
        canvas.width * 0.4,
        canvas.height * 0.3,
        time,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // Second cloud
    ctx.fillStyle = 'rgba(1, 205, 254, 0.03)';
    ctx.beginPath();
    ctx.ellipse(
        canvas.width * (0.7 + Math.cos(time) * 0.1),
        canvas.height * (0.6 + Math.sin(time) * 0.1),
        canvas.width * 0.5,
        canvas.height * 0.4,
        -time * 0.7,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// Space background with natural diagonal star pattern
function drawRetroGrid() {
    // Draw subtle static stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    
    // Create diagonal patterns with prime number offsets to avoid repetition
    const primes = [17, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
    
    // First diagonal pattern (top-left to bottom-right)
    for (let i = 0; i < 80; i++) {
        // Use different prime numbers for x and y to create natural diagonal
        const x = (i * primes[i % 6]) % canvas.width;
        const y = (i * primes[(i + 3) % 6]) % canvas.height;
        
        // Vary size slightly based on position
        const size = 0.5 + ((x + y) % 3) * 0.3;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Second diagonal pattern (top-right to bottom-left)
    for (let i = 0; i < 70; i++) {
        // Use different prime numbers for a different diagonal
        const x = (i * primes[(i + 6) % 6] + canvas.width/2) % canvas.width;
        const y = (i * primes[(i + 9) % 6]) % canvas.height;
        
        // Vary size slightly based on position
        const size = 0.5 + ((x * y) % 3) * 0.3;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw a few subtle colored stars along the diagonals
    const colors = ['rgba(1, 205, 254, 0.5)', 'rgba(255, 113, 206, 0.5)', 'rgba(5, 255, 161, 0.5)'];
    
    for (let i = 0; i < 15; i++) {
        // Use larger primes for colored stars to place them along the diagonals
        const x = (i * primes[(i + 12) % 6] * 1.5) % canvas.width;
        const y = (i * primes[(i + 15) % 6] * 1.5) % canvas.height;
        
        // Slightly larger size for colored stars
        const size = 1 + (i % 3);
        const color = colors[i % colors.length];
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Calculate parallax offsets based on player movement (if player exists)
    let parallaxX = 0;
    let parallaxY = 0;
    
    if (player) {
        parallaxX = player.bankAngle * 20; // Subtle horizontal parallax
        parallaxY = player.pitchAngle * 15; // Subtle vertical parallax
    }
    
    // Draw planets with subtle parallax (always visible)
    drawPlanet(
        canvas.width * 0.75 - parallaxX * 0.1, // Very subtle parallax for distant planet
        canvas.height * 0.3 - parallaxY * 0.1,
        canvas.width * 0.08,
        '#01CDFE'
    ); // Blue planet
    
    drawPlanet(
        canvas.width * 0.25 - parallaxX * 0.15, // Slightly more parallax for closer planet, but still subtle
        canvas.height * 0.2 - parallaxY * 0.15,
        canvas.width * 0.05,
        '#FF71CE'
    ); // Pink planet
}

// Draw a vaporwave planet with clean texture
function drawPlanet(x, y, radius, color) {
    // Draw planet base with smooth gradient
    const planetGradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, 0,
        x, y, radius
    );
    planetGradient.addColorStop(0, '#FFFFFF');
    planetGradient.addColorStop(0.3, color);
    planetGradient.addColorStop(1, '#2D1B4E');
    
    ctx.fillStyle = planetGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add highlight (simple and clean)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Add atmosphere glow
    ctx.globalAlpha = 0.2;
    const glowGradient = ctx.createRadialGradient(
        x, y, radius * 0.9,
        x, y, radius * 1.2
    );
    glowGradient.addColorStop(0, color);
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1.0;
}

// Remove laser beams function completely
function drawLaserBeams() {
    // Function intentionally left empty to remove all laser beams
}

// Initialize the game
function init() {
    // Initialize player position
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    
    // Initialize star field
    initStarField();
}

// Start initialization
init();

// Fix the updateEnemies function to make enemies move more naturally
function updateEnemies(deltaTime) {
    const now = Date.now();
    
    // Check if we need to spawn more enemies
    if (enemies.length < 2 && Math.random() < 0.008) { // REDUCED spawn chance from 0.01 to 0.008
        if (typeof spawnEnemy === 'function') {
            spawnEnemy();
        }
    }
    
    // Update each enemy
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        
        // Move enemy toward player (negative z in new coordinate system)
        e.z -= e.speed * deltaTime;
        
        // FIXED: Apply more consistent movement patterns with reduced variance
        switch (e.movePattern) {
            case 0: // Gentle corkscrew pattern - smoother spiral motion
                const corkscrewTime = now * 0.0008 + e.phaseOffset;
                const corkscrewRadius = 25 + e.verticalAmplitude * 0.3; // Reduced radius
                
                // Circular motion in x-y plane - more consistent speed
                e.x += Math.cos(corkscrewTime) * corkscrewRadius * deltaTime * 0.8;
                e.y += Math.sin(corkscrewTime) * corkscrewRadius * deltaTime * 0.8;
                
                // Slight z-axis oscillation - reduced amplitude
                e.z += Math.sin(corkscrewTime * 0.5) * 5 * deltaTime;
                break;
                
            case 1: // Smooth evasive pattern - less erratic
                const evasiveTime = now * 0.001 + e.phaseOffset; // Reduced speed
                
                // Smoother, less erratic movement
                e.x += Math.sin(evasiveTime * 1.5) * e.verticalAmplitude * 0.08;
                e.y += Math.sin(evasiveTime * 1.2 + 1.0) * e.verticalAmplitude * 0.06;
                
                // Occasional forward/backward jinks - reduced amplitude
                e.z += Math.sin(evasiveTime * 2.0) * 8 * deltaTime;
                break;
                
            case 2: // Gentle swooping attack - smoother dive
                const swoopTime = now * 0.0004 + e.phaseOffset; // Slower pattern
                const swoopPhase = (swoopTime % (Math.PI * 2)) / (Math.PI * 2);
                
                // Horizontal figure-8 pattern - more consistent
                e.x += Math.sin(swoopTime) * e.verticalAmplitude * 0.06;
                
                // Vertical swooping motion - smoother transitions
                if (swoopPhase < 0.5) {
                    // Dive down phase - gentler
                    e.y += e.verticalAmplitude * 0.06 * deltaTime;
                    // Speed up slightly during dive - reduced boost
                    e.z -= e.speed * 0.1 * deltaTime;
                } else {
                    // Pull up phase - gentler
                    e.y -= e.verticalAmplitude * 0.06 * deltaTime;
                }
                break;
                
            case 3: // Steady strafing run - more consistent
                const strafeTime = now * 0.0007 + e.phaseOffset; // Slower pattern
                
                // Smoother side-to-side motion
                e.x += Math.sin(strafeTime) * e.verticalAmplitude * 0.07;
                
                // Slight up/down motion - reduced amplitude
                e.y += Math.sin(strafeTime * 1.5) * e.verticalAmplitude * 0.02;
                
                // Forward/backward pulsing - reduced amplitude
                e.z += Math.sin(strafeTime * 1.2) * 10 * deltaTime;
                break;
        }
        
        // IMPROVED: Add boundary constraints to keep enemies on screen
        // Keep enemies within reasonable screen bounds
        const margin = 50;
        if (e.x < margin) e.x = margin;
        if (e.x > canvas.width - margin) e.x = canvas.width - margin;
        if (e.y < margin) e.y = margin;
        if (e.y > canvas.height - margin) e.y = canvas.height - margin;
        
        // Check if enemy has passed the player
        if (e.z < -300) { // Remove enemy when it passes the player (negative z)
            // Remove enemy
            console.log("Enemy passed player and was removed. Z:", e.z);
            enemies.splice(i, 1);
            i--;
            continue;
        }
        
        // Only allow shooting when enemy is within a certain range
        // Adjusted shooting range for new z-coordinate values
        const isInShootingRange = e.z < 1500 && e.z > 300; // IMPROVED: Extended shooting range to make enemies more threatening
        
        // IMPROVED: Increase shooting probability based on distance to player
        // Enemies are more likely to shoot when closer to the player
        const distanceToPlayer = Math.sqrt(
            Math.pow(player.x - e.x, 2) + 
            Math.pow(player.y - e.y, 2) + 
            Math.pow(e.z, 2)
        );
        
        // Normalize distance (0 = close, 1 = far)
        const normalizedDistance = Math.min(Math.max(distanceToPlayer / 1500, 0), 1);
        
        // Adjust cooldown based on distance - closer enemies shoot more frequently
        const adjustedCooldown = e.shotCooldown * (0.8 + normalizedDistance * 0.5); // ADJUSTED: Increased minimum cooldown (was 0.7)
        
        // Check if enemy should shoot with adjusted cooldown
        if (isInShootingRange && now - e.lastShot > adjustedCooldown) {
            // IMPROVED: Create enemy projectile with more accurate targeting toward player
            // Use actual player position instead of approximate screen center
            const targetX = player.x;
            const targetY = player.y;
            
            // Calculate direction vector toward player's actual position
            const dx = targetX - e.x;
            const dy = targetY - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // IMPROVED: Add slight prediction to target where player will be
            // This makes enemies more threatening by anticipating player movement
            const predictedTargetX = targetX + player.speedX * 0.2; // REDUCED: Less accurate prediction (was 0.5 seconds)
            const predictedTargetY = targetY + player.speedY * 0.2; // REDUCED: Less accurate prediction (was 0.5 seconds)
            
            // Create the projectile with proper initialization
            const projectile = {
                x: e.x,
                y: e.y,
                z: e.z,
                width: 5,
                height: 15,
                speed: 280, // REDUCED: Lower speed to make projectiles easier to evade (was 350)
                isEnemy: true,
                // Store initial position for trajectory calculation
                initialX: e.x,
                initialY: e.y,
                // Store normalized direction with increased randomness for less accuracy
                dirX: (dx / dist) + (Math.random() - 0.5) * 0.15, // Increased randomness (was 0.05)
                dirY: (dy / dist) + (Math.random() - 0.5) * 0.15, // Increased randomness (was 0.05)
                // Add more variation for visual interest
                dx: (Math.random() - 0.5) * 0.1, // Increased variation (was 0.05)
                dy: (Math.random() - 0.5) * 0.1, // Increased variation (was 0.05)
                // Store target for more accurate trajectory
                targetX: predictedTargetX,
                targetY: predictedTargetY
            };
            
            projectiles.push(projectile);
            
            // Reset shot timer
            e.lastShot = now;
            
            // Add muzzle flash effect if the function exists
            if (typeof createMuzzleFlash === 'function') {
                createMuzzleFlash(e.x, e.y, e.z);
            }
        }
    }
}

// Modify spawnEnemy to include more varied movement patterns
function spawnEnemy() {
    // Limit the number of enemies on screen
    if (enemies.length >= 3) return; // REDUCED from 4 to 3 max enemies
    
    // Calculate a random position in the distance
    const x = canvas.width * 0.2 + Math.random() * (canvas.width * 0.6); // Middle 60% of screen
    const y = canvas.height * 0.3 + Math.random() * (canvas.height * 0.4); // Middle of screen
    
    // IMPORTANT: Set z to a POSITIVE value to ensure enemies start in front
    // Using a more reasonable distance
    const z = 3000; // CHANGED: Reduced from 6000 to 3000 for closer appearance
    
    // Create the enemy
    const enemy = {
        x: x,
        y: y,
        z: z,
        width: 60,
        height: 40,
        // FIXED: Use more consistent speed with less variance
        speed: 160 + Math.random() * 50, // CHANGED: Reduced variance from 150-230 to 160-210
        health: 30, // REDUCED from 50 to 30 to make enemies easier to destroy
        lastShot: Date.now() + 2000, // INCREASED from 1500 to 2000 ms delay before first shot
        shotCooldown: 4000 + Math.random() * 2500, // INCREASED: Longer cooldown between shots (was 3500-5500ms)
        movePattern: Math.floor(Math.random() * 4), // IMPROVED: Now 4 different patterns (0-3)
        // FIXED: Reduce amplitude variance for more consistent movement
        verticalAmplitude: 25 + Math.random() * 20, // CHANGED: Reduced variance from 20-60 to 25-45
        // Add random phase offset for varied movement
        phaseOffset: Math.random() * Math.PI * 2 // Random phase offset
    };
    
    enemies.push(enemy);
    console.log("Enemy spawned. Total enemies:", enemies.length, "at z:", z);
    
    // Create spawn effect for the enemy if the function exists
    if (typeof createEnemySpawnEffect === 'function') {
        createEnemySpawnEffect(enemy.x, enemy.y, enemy.z);
    }
}

// Create initial enemies that don't shoot immediately
function createInitialEnemies() {
    // Create 1-2 enemies in formation (reduced from 2-3)
    const numEnemies = 1 + Math.floor(Math.random()); // REDUCED from 2-3 to 1-2
    console.log("Creating initial enemies:", numEnemies);
    
    for (let i = 0; i < numEnemies; i++) {
        // Calculate position in formation
        const spacing = canvas.width / (numEnemies + 1);
        const x = spacing * (i + 1);
        const y = canvas.height * 0.3;
        
        // IMPORTANT: Set z to a POSITIVE value to ensure enemies start in front
        // Using a slightly closer position than regular spawns
        const z = 2500; // CHANGED: Reduced from 5000 to 2500
        
        // Create the enemy with a shorter delay before first shot
        const enemy = {
            x: x,
            y: y,
            z: z,
            width: 60,
            height: 40,
            // FIXED: Use more consistent speed with less variance
            speed: 150 + Math.random() * 40, // CHANGED: Reduced variance from 130-190 to 150-190
            health: 30, // REDUCED from 50 to 30 to make enemies easier to destroy
            lastShot: Date.now() + 3000, // INCREASED from 2000 to 3000 ms delay before first shot
            shotCooldown: 3500 + Math.random() * 2000, // INCREASED from 3000-4500 to 3500-5500 ms between shots
            movePattern: i % 4, // IMPROVED: Use all 4 movement patterns
            // FIXED: Reduce amplitude variance for more consistent movement
            verticalAmplitude: 25 + Math.random() * 15, // CHANGED: Reduced variance from 20-50 to 25-40
            // Add random phase offset for varied movement
            phaseOffset: (i / numEnemies) * Math.PI * 2 // Evenly spaced phase offsets for formation
        };
        
        enemies.push(enemy);
        console.log("Initial enemy created at position:", x, y, z);
        
        // Create spawn effect for each enemy if the function exists
        if (typeof createEnemySpawnEffect === 'function') {
            createEnemySpawnEffect(enemy.x, enemy.y, enemy.z);
        }
    }
}

// Redesign enemy ships with a wider V-shaped design, with nose pitched backward 45 degrees and banking effects
function drawEnemies() {
    console.log("Drawing enemies. Count:", enemies.length);
    
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        
        // Calculate perspective for z-position with safety check
        const perspective = 500 / Math.max(500 + Math.abs(e.z) * 0.7, 1);
        
        // Skip if perspective is invalid or too small
        if (!isFinite(perspective) || perspective <= 0.05) {
            console.log("Skipping enemy with invalid perspective. Z:", e.z);
            continue;
        }
        
        // Calculate enemy screen size with perspective
        const width = e.width * perspective;
        const height = e.height * 1.5 * perspective; // Increased height by 50%
        
        // Only draw enemies that are in front of the player (positive z)
        if (e.z < 0) {
            console.log("Enemy is behind player, not drawing. Z:", e.z);
            continue;
        }
        
        // Draw enemy ship
        ctx.save();
        ctx.translate(e.x, e.y);
        
        // FIXED: Calculate banking angle with smoothing to prevent glitchy rotations
        // Initialize banking properties if they don't exist
        if (e.currentBankAngle === undefined) {
            e.currentBankAngle = 0;
            e.targetBankAngle = 0;
        }
        
        // Calculate target bank angle based on horizontal movement
        if (e.lastX !== undefined) {
            // Calculate movement delta
            const deltaX = e.x - e.lastX;
            
            // Set target bank angle with limits
            e.targetBankAngle = Math.min(Math.max(deltaX * 0.05, -0.3), 0.3);
        }
        
        // Smoothly interpolate current bank angle toward target
        const bankingSmoothness = 0.1; // Lower = smoother transitions
        e.currentBankAngle += (e.targetBankAngle - e.currentBankAngle) * bankingSmoothness;
        
        // Apply banking rotation (roll around Z axis)
        ctx.rotate(e.currentBankAngle);
        
        // Store current position for next frame's banking calculation
        e.lastX = e.x;
        e.lastY = e.y;
        
        // Set up neon wireframe effect
        ctx.lineWidth = Math.max(1, 1.5 * perspective);
        ctx.strokeStyle = '#FF00FF'; // Magenta for enemy outlines
        ctx.shadowBlur = 10 * perspective;
        ctx.shadowColor = '#FF00FF';
        
        // Scale factor for ship proportions - increased for wider appearance
        const scale = 1.4;
        
        // Apply pitch transformation (45 degrees BACKWARD tilt - reversed from previous)
        // We'll achieve this by extending the vertical distances in the front half
        // and shortening them in the back half
        const pitchFactor = -0.7; // Changed to -0.7
        
        // MAIN BODY - V-shaped fuselage with nose pitched backward
        ctx.beginPath();
        // Start at the nose (front point of the V) - moved DOWN to simulate backward pitch
        ctx.moveTo(0, -height/1.6 * scale * (1 - pitchFactor));
        // Right side of V - adjusted for backward pitch
        ctx.lineTo(width/6 * scale, height/10 * scale * pitchFactor);
        // Right rear
        ctx.lineTo(width/7 * scale, height/3 * scale * (1 + pitchFactor));
        // Center rear
        ctx.lineTo(0, height/4 * scale * (1 + pitchFactor));
        // Left rear
        ctx.lineTo(-width/7 * scale, height/3 * scale * (1 + pitchFactor));
        // Left side of V - adjusted for backward pitch
        ctx.lineTo(-width/6 * scale, height/10 * scale * pitchFactor);
        ctx.closePath();
        ctx.stroke();
        
        // COCKPIT - Sleek visor-like shape near the front (nose)
        ctx.beginPath();
        ctx.moveTo(0, -height/2.0 * scale * (1 - pitchFactor)); // Top center (now at front)
        ctx.lineTo(width/12 * scale, -height/2.8 * scale * (1 - pitchFactor)); // Right edge
        ctx.lineTo(-width/12 * scale, -height/2.8 * scale * (1 - pitchFactor)); // Left edge
        ctx.closePath();
        ctx.stroke();
        
        // WINGS - Wide wings extending from sides, adjusted for backward pitch
        
        // Right wing
        ctx.beginPath();
        // Wing root (where it connects to body)
        ctx.moveTo(width/6 * scale, 0);
        // Wing extends much wider outward
        ctx.lineTo(width/1.2 * scale, height/10 * scale * pitchFactor);
        // Wing tip
        ctx.lineTo(width/1.4 * scale, height/2 * scale * (1 + pitchFactor/2));
        // Inner wing edge
        ctx.lineTo(width/7 * scale, height/3 * scale * (1 + pitchFactor));
        ctx.closePath();
        ctx.stroke();
        
        // Left wing
        ctx.beginPath();
        // Wing root (where it connects to body)
        ctx.moveTo(-width/6 * scale, 0);
        // Wing extends much wider outward
        ctx.lineTo(-width/1.2 * scale, height/10 * scale * pitchFactor);
        // Wing tip
        ctx.lineTo(-width/1.4 * scale, height/2 * scale * (1 + pitchFactor/2));
        // Inner wing edge
        ctx.lineTo(-width/7 * scale, height/3 * scale * (1 + pitchFactor));
        ctx.closePath();
        ctx.stroke();
        
        // WING FRONTAL EDGES - To emphasize wings from frontal view
        
        // Right wing front edge
        ctx.beginPath();
        ctx.moveTo(width/6 * scale, 0); // Wing root
        ctx.lineTo(width/3 * scale, -height/5 * scale * (1 - pitchFactor)); // Front edge point
        ctx.lineTo(width/1.2 * scale, height/10 * scale * pitchFactor); // Wing outer edge
        ctx.stroke();
        
        // Left wing front edge
        ctx.beginPath();
        ctx.moveTo(-width/6 * scale, 0); // Wing root
        ctx.lineTo(-width/3 * scale, -height/5 * scale * (1 - pitchFactor)); // Front edge point
        ctx.lineTo(-width/1.2 * scale, height/10 * scale * pitchFactor); // Wing outer edge
        ctx.stroke();
        
        // WING FINS - Vertical stabilizers on the wings
        
        // Right fin
        ctx.beginPath();
        ctx.moveTo(width/1.7 * scale, height/3 * scale * (1 + pitchFactor/2));
        ctx.lineTo(width/1.5 * scale, height/8 * scale * (1 + pitchFactor/4));
        ctx.lineTo(width/1.3 * scale, height/3 * scale * (1 + pitchFactor/2));
        ctx.closePath();
        ctx.stroke();
        
        // Left fin
        ctx.beginPath();
        ctx.moveTo(-width/1.7 * scale, height/3 * scale * (1 + pitchFactor/2));
        ctx.lineTo(-width/1.5 * scale, height/8 * scale * (1 + pitchFactor/4));
        ctx.lineTo(-width/1.3 * scale, height/3 * scale * (1 + pitchFactor/2));
        ctx.closePath();
        ctx.stroke();
        
        // ENGINE NACELLES - Now at the rear (bottom of screen)
        
        // Right engine
        ctx.beginPath();
        ctx.moveTo(width/7 * scale, height/3 * scale * (1 + pitchFactor)); // Front
        ctx.lineTo(width/4 * scale, height/3 * scale * (1 + pitchFactor)); // Top
        ctx.lineTo(width/4 * scale, height/2.5 * scale * (1 + pitchFactor)); // Rear
        ctx.lineTo(width/7 * scale, height/2.5 * scale * (1 + pitchFactor)); // Bottom
        ctx.closePath();
        ctx.stroke();
        
        // Left engine
        ctx.beginPath();
        ctx.moveTo(-width/7 * scale, height/3 * scale * (1 + pitchFactor)); // Front
        ctx.lineTo(-width/4 * scale, height/3 * scale * (1 + pitchFactor)); // Top
        ctx.lineTo(-width/4 * scale, height/2.5 * scale * (1 + pitchFactor)); // Rear
        ctx.lineTo(-width/7 * scale, height/2.5 * scale * (1 + pitchFactor)); // Bottom
        ctx.closePath();
        ctx.stroke();
        
        // FILL WITH SEMI-TRANSPARENT COLOR
        
        // Main body - semi-transparent magenta
        ctx.fillStyle = 'rgba(255, 0, 255, 0.15)';
        ctx.beginPath();
        // Start at the nose (front point of the V) - moved down to simulate backward pitch
        ctx.moveTo(0, -height/1.6 * scale * (1 - pitchFactor));
        // Right side of V - adjusted for pitch
        ctx.lineTo(width/6 * scale, height/10 * scale * pitchFactor);
        // Right rear
        ctx.lineTo(width/7 * scale, height/3 * scale * (1 + pitchFactor));
        // Center rear
        ctx.lineTo(0, height/4 * scale * (1 + pitchFactor));
        // Left rear
        ctx.lineTo(-width/7 * scale, height/3 * scale * (1 + pitchFactor));
        // Left side of V - adjusted for pitch
        ctx.lineTo(-width/6 * scale, height/10 * scale * pitchFactor);
        ctx.closePath();
        ctx.fill();
        
        // Cockpit - menacing red
        ctx.fillStyle = 'rgba(255, 0, 85, 0.3)';
        ctx.beginPath();
        ctx.moveTo(0, -height/2.0 * scale * (1 - pitchFactor));
        ctx.lineTo(width/12 * scale, -height/2.8 * scale * (1 - pitchFactor));
        ctx.lineTo(-width/12 * scale, -height/2.8 * scale * (1 - pitchFactor));
        ctx.closePath();
        ctx.fill();
        
        // Wings - more visible fill
        ctx.fillStyle = 'rgba(255, 113, 206, 0.15)'; // Slightly less transparent for better visibility
        
        // Right wing with front edge
        ctx.beginPath();
        ctx.moveTo(width/6 * scale, 0); // Wing root
        ctx.lineTo(width/3 * scale, -height/5 * scale * (1 - pitchFactor)); // Front edge point
        ctx.lineTo(width/1.2 * scale, height/10 * scale * pitchFactor); // Wing outer edge
        ctx.lineTo(width/1.4 * scale, height/2 * scale * (1 + pitchFactor/2)); // Wing tip
        ctx.lineTo(width/7 * scale, height/3 * scale * (1 + pitchFactor)); // Inner wing edge
        ctx.closePath();
        ctx.fill();
        
        // Left wing with front edge
        ctx.beginPath();
        ctx.moveTo(-width/6 * scale, 0); // Wing root
        ctx.lineTo(-width/3 * scale, -height/5 * scale * (1 - pitchFactor)); // Front edge point
        ctx.lineTo(-width/1.2 * scale, height/10 * scale * pitchFactor); // Wing outer edge
        ctx.lineTo(-width/1.4 * scale, height/2 * scale * (1 + pitchFactor/2)); // Wing tip
        ctx.lineTo(-width/7 * scale, height/3 * scale * (1 + pitchFactor)); // Inner wing edge
        ctx.closePath();
        ctx.fill();
        
        // ENGINE GLOW EFFECTS - Now at the rear (bottom of screen)
        
        // Reset shadow for engine glow
        ctx.shadowBlur = 15 * perspective;
        ctx.shadowColor = '#FFAA00'; // Orange glow
        
        // Right engine glow
        const rightEngineGradient = ctx.createRadialGradient(
            width/4 * scale, height/2.5 * scale * (1 + pitchFactor), 0,
            width/4 * scale, height/2.5 * scale * (1 + pitchFactor), width/10
        );
        rightEngineGradient.addColorStop(0, '#FFAA00'); // Orange center
        rightEngineGradient.addColorStop(1, 'rgba(255, 170, 0, 0)'); // Transparent edge
        
        ctx.fillStyle = rightEngineGradient;
        ctx.beginPath();
        ctx.arc(width/4 * scale, height/2.5 * scale * (1 + pitchFactor), width/12, 0, Math.PI * 2);
        ctx.fill();
        
        // Left engine glow
        const leftEngineGradient = ctx.createRadialGradient(
            -width/4 * scale, height/2.5 * scale * (1 + pitchFactor), 0,
            -width/4 * scale, height/2.5 * scale * (1 + pitchFactor), width/10
        );
        leftEngineGradient.addColorStop(0, '#FFAA00'); // Orange center
        leftEngineGradient.addColorStop(1, 'rgba(255, 170, 0, 0)'); // Transparent edge
        
        ctx.fillStyle = leftEngineGradient;
        ctx.beginPath();
        ctx.arc(-width/4 * scale, height/2.5 * scale * (1 + pitchFactor), width/12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Add image loading for title screen
const titleImage = new Image();
titleImage.src = 'images/title-image.png'; // Update this with your actual image filename

// Add this near the top of your file
titleImage.onload = function() {
    console.log("Title image loaded successfully");
    // If the game isn't started yet, redraw the title screen
    if (!gameStarted) {
        drawGameTitle();
    }
};

titleImage.onerror = function() {
    console.error("Error loading title image");
};

// Fine-tune the drawGameTitle function with a -0.7% horizontal shift
function drawGameTitle() {
    // Only draw title on start screen or when game is over
    if (!gameStarted || gameOver) {
        ctx.save();
        
        // Draw the title image if loaded
        if (titleImage.complete) {
            // Calculate position with 40% larger size
            const scaleFactor = 1.4; // 40% larger
            const imgWidth = Math.min(canvas.width * 0.8 * scaleFactor, titleImage.width * scaleFactor);
            const imgHeight = (imgWidth / titleImage.width) * titleImage.height;
            
            // Fine-tune horizontal position with a -0.7% shift to the left
            const imgX = (canvas.width - imgWidth) / 2 - imgWidth * 0.007;
            
            // Center the image vertically
            const imgY = (canvas.height - imgHeight) / 2;
            
            // Add a dark background behind the image for better visibility
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(imgX - 20, imgY - 20, imgWidth + 40, imgHeight + 40);
            
            // Set full opacity for the image
            ctx.globalAlpha = 1.0;
            
            // Draw the image
            ctx.drawImage(titleImage, imgX, imgY, imgWidth, imgHeight);
        }
        
        ctx.restore();
    }
}

// Add audio handling
// Variables are already declared at the top of the file
let musicEnabled = true;
let currentTrack = 'gameplay'; // Track which music is currently playing: 'gameplay' or 'gameover'

// Initialize audio
function initAudio() {
    // Set initial track to gameplay music
    gameMusic.src = 'audio/Dreams.mp3';
    
    // Set initial volume
    gameMusic.volume = 0.5;
    
    // Add event listener for the toggle button
    toggleAudioButton.addEventListener('click', toggleAudio);
    
    // Try to play music immediately (may be blocked by browser)
    if (musicEnabled) {
        // Try to play immediately
        gameMusic.play()
            .then(() => {
                console.log("Music started successfully on page load");
            })
            .catch(e => {
                console.log("Autoplay prevented by browser:", e);
                
                // Add a one-time click listener to the document to start audio
                const startAudioOnInteraction = () => {
                    if (musicEnabled) {
                        gameMusic.play()
                            .then(() => console.log("Music started after user interaction"))
                            .catch(e => console.log("Audio still failed:", e));
                    }
                    // Remove the listener after first interaction
                    document.removeEventListener('click', startAudioOnInteraction);
                };
                
                document.addEventListener('click', startAudioOnInteraction);
            });
    }
    
    // Keep the existing event listeners for when the game starts
    document.getElementById('startButton').addEventListener('click', function() {
        if (musicEnabled && gameMusic.paused) {
            gameMusic.play().catch(e => console.log("Audio play failed:", e));
        }
    });
    
    // Also ensure music is playing when spacebar is pressed to start game
    window.addEventListener('keydown', function(e) {
        if (musicEnabled && gameMusic.paused) {
            gameMusic.play().catch(e => console.log("Audio play failed:", e));
        }
    });
}

// Toggle audio on/off
function toggleAudio() {
    musicEnabled = !musicEnabled;
    console.log("Toggle audio called, musicEnabled =", musicEnabled, "currentTrack =", currentTrack);
    
    if (musicEnabled) {
        console.log("Enabling music (current track: " + currentTrack + ")");
        try {
            const playPromise = gameMusic.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => console.log("Music enabled successfully"))
                    .catch(e => console.error("Failed to enable music:", e));
            }
            audioIcon.textContent = '🔊';
        } catch (e) {
            console.error("Exception when trying to enable music:", e);
        }
    } else {
        console.log("Disabling music");
        gameMusic.pause();
        audioIcon.textContent = '🔇';
    }
}

// Call initAudio after the page loads
window.addEventListener('load', initAudio);

// Add the missing updateParticles function
function updateParticles(deltaTime) {
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Handle delay for delayed particles
        if (p.delayLeft > 0) {
            p.delayLeft -= deltaTime;
            continue;
        }
        
        // Update particle position
        p.x += p.dx * deltaTime;
        p.y += p.dy * deltaTime;
        if (p.dz) p.z += p.dz * deltaTime;
        
        // Update particle rotation if it has one
        if (p.rotationSpeed !== undefined) {
            p.rotation += p.rotationSpeed * deltaTime;
        }
        
        // Update particle life
        p.life -= deltaTime;
        
        // Remove dead particles
        if (p.life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
}

// Fix the drawParticles function to prevent negative radius errors
function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Skip particles that haven't started yet
        if (p.delayLeft && p.delayLeft > 0) continue;
        
        // Calculate perspective for size scaling
        const perspective = 500 / (500 + Math.abs(p.z));
        
        // Calculate size with perspective
        const size = p.size * perspective;
        
        if (p.type === 'hit') {
            // Draw hit particles (small sparks)
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            
            // Draw a small circle
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
            ctx.fill();
            
            // Add a small glow
            ctx.shadowBlur = 3;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (p.type === 'playerhit') {
            // Player hit particles - similar to hit particles but with more dynamic effects
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            
            // Save the context for rotation
            ctx.save();
            ctx.translate(p.x, p.y);
            
            // Rotate for dynamic effect
            ctx.rotate((Date.now() / 200 + i) % (Math.PI * 2));
            
            // Alternate between different shapes
            const hitType = i % 4;
            
            switch(hitType) {
                case 0: // Small line
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = Math.max(0.5, 2 * perspective);
                    ctx.beginPath();
                    ctx.moveTo(0, -size * 1.5);
                    ctx.lineTo(0, size * 1.5);
                    ctx.stroke();
                    break;
                    
                case 1: // Small square
                    ctx.beginPath();
                    ctx.rect(-size / 2, -size / 2, size, size);
                    ctx.fill();
                    break;
                    
                case 2: // Small triangle
                    ctx.beginPath();
                    ctx.moveTo(0, -size);
                    ctx.lineTo(size * 0.866, size * 0.5);
                    ctx.lineTo(-size * 0.866, size * 0.5);
                    ctx.closePath();
                    ctx.fill();
                    break;
                    
                case 3: // Small circle
                    ctx.beginPath();
                    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
            
            // Restore the context after rotation
            ctx.restore();
        } else if (p.type === 'debris') {
            // Debris particles are ship fragments - use angular shapes
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            
            // Save the context for rotation
            ctx.save();
            ctx.translate(p.x, p.y);
            
            // Position and rotate debris
            if (p.rotation !== undefined) {
                ctx.rotate(p.rotation);
            }
            
            // Random debris shape based on particle index
            const debrisType = i % 3;
            
            switch(debrisType) {
                case 0: // Triangular fragment
                    ctx.beginPath();
                    ctx.moveTo(0, -size);
                    ctx.lineTo(size * 0.7, size * 0.3);
                    ctx.lineTo(-size * 0.3, size * 0.8);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Add detail line
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = Math.max(0.5, 1 * perspective);
                    ctx.beginPath();
                    ctx.moveTo(0, -size * 0.5);
                    ctx.lineTo(size * 0.3, size * 0.2);
                    ctx.stroke();
                    break;
                    
                case 1: // Rectangular/panel fragment
                    ctx.beginPath();
                    ctx.rect(-size / 2, -size / 3, size, size / 1.5);
                    ctx.fill();
                    
                    // Add detail lines
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = Math.max(0.5, 1 * perspective);
                    ctx.beginPath();
                    ctx.moveTo(-size / 2, 0);
                    ctx.lineTo(size / 2, 0);
                    ctx.stroke();
                    break;
                    
                case 2: // Irregular polygon fragment
                    ctx.beginPath();
                    ctx.moveTo(-size * 0.3, -size * 0.5);
                    ctx.lineTo(size * 0.5, -size * 0.3);
                    ctx.lineTo(size * 0.3, size * 0.6);
                    ctx.lineTo(-size * 0.4, size * 0.2);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Add detail lines
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = Math.max(0.5, 1 * perspective);
                    ctx.beginPath();
                    ctx.moveTo(-size * 0.2, -size * 0.2);
                    ctx.lineTo(size * 0.2, size * 0.2);
                    ctx.stroke();
                    break;
            }
            
            // Restore the context
            ctx.restore();
        } else if (p.type === 'shockwave') {
            // Draw expanding shockwave
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3 * perspective;
            
            // Calculate current size based on life percentage
            const progress = 1 - (p.life / p.maxLife);
            const currentSize = p.size + (p.maxSize - p.size) * progress;
            
            // Set opacity to fade out as it expands
            ctx.globalAlpha = p.life / p.maxLife;
            
            // Draw the shockwave circle or arc
            ctx.beginPath();
            
            // Check if this is a partial arc shockwave
            if (p.startAngle !== undefined && p.endAngle !== undefined) {
                // Draw partial arc
                ctx.arc(p.x, p.y, Math.max(0.1, currentSize), p.startAngle, p.endAngle, false);
                
                // For partial arcs, add lines to center to create a filled sector
                if (progress > 0.5) {
                    // Only add the center lines for the second half of the animation
                    // This creates a "dissipating" effect
                    const fadeProgress = (progress - 0.5) * 2; // 0 to 1 for second half
                    
                    // Calculate points where the arc meets the center
                    const x1 = p.x + Math.cos(p.startAngle) * currentSize;
                    const y1 = p.y + Math.sin(p.startAngle) * currentSize;
                    const x2 = p.x + Math.cos(p.endAngle) * currentSize;
                    const y2 = p.y + Math.sin(p.endAngle) * currentSize;
                    
                    // Draw lines to center with reduced opacity
                    ctx.globalAlpha = p.life / p.maxLife * (1 - fadeProgress);
                    ctx.lineTo(p.x, p.y);
                    ctx.closePath();
                }
            } else {
                // Draw full circle for regular shockwave
                ctx.arc(p.x, p.y, Math.max(0.1, currentSize), 0, Math.PI * 2);
            }
            
            // Add glow effect
            ctx.shadowBlur = 10 * perspective;
            ctx.shadowColor = p.color;
            
            // Stroke the path
            ctx.stroke();
            
            // Reset shadow
            ctx.shadowBlur = 0;
        } else if (p.type === 'flash') {
            // Draw flash (simple radial gradient)
            // Ensure all values are finite to prevent errors
            if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(size) || size <= 0) {
                continue; // Skip this particle if any values are invalid
            }
            
            try {
                const gradient = ctx.createRadialGradient(
                    p.x, p.y, 0,
                    p.x, p.y, Math.max(0.1, size) // Ensure minimum size is positive
                );
                
                // Parse the color to get its base components
                let baseColor = p.color;
                let alpha = 1;
                
                // Handle rgba format
                if (p.color.startsWith('rgba')) {
                    const parts = p.color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                    if (parts) {
                        baseColor = `rgb(${parts[1]}, ${parts[2]}, ${parts[3]})`;
                        alpha = parseFloat(parts[4]);
                    }
                }
                
                // Create gradient with fading alpha
                gradient.addColorStop(0, p.color);
                gradient.addColorStop(0.7, p.color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
                gradient.addColorStop(1, p.color.replace(')', ', 0)').replace('rgb', 'rgba'));
                
                ctx.fillStyle = gradient;
                ctx.globalAlpha = p.life / p.maxLife;
                
                // Draw the flash
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            } catch (e) {
                console.log("Error rendering flash particle:", e);
                // Fallback rendering if gradient fails
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / p.maxLife;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.1, size), 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (p.type === 'arc') {
            // Draw electrical arc effect
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(0.5, size);
            ctx.globalAlpha = p.life / p.maxLife;
            
            // Create a jagged line from initial position to current position
            ctx.beginPath();
            
            // Start at the initial position (usually player center)
            const startX = p.initialX;
            const startY = p.initialY;
            
            // End at the particle position
            const endX = p.x;
            const endY = p.y;
            
            // Calculate distance and direction
            const dx = endX - startX;
            const dy = endY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Create a jagged lightning effect with multiple segments
            const segments = 5 + Math.floor(distance / 15);
            let currentX = startX;
            let currentY = startY;
            
            ctx.moveTo(currentX, currentY);
            
            // Create jagged segments
            for (let j = 0; j < segments - 1; j++) {
                // Calculate progress along the line (0 to 1)
                const progress = (j + 1) / segments;
                
                // Calculate the ideal position at this progress
                const idealX = startX + dx * progress;
                const idealY = startY + dy * progress;
                
                // Add randomness to create jagged effect
                // More randomness in the middle, less at the ends
                const jitterAmount = 10 * Math.sin(progress * Math.PI);
                const jitterX = (Math.random() - 0.5) * jitterAmount;
                const jitterY = (Math.random() - 0.5) * jitterAmount;
                
                // Set the next point
                currentX = idealX + jitterX;
                currentY = idealY + jitterY;
                
                ctx.lineTo(currentX, currentY);
            }
            
            // Ensure the last segment connects to the end point
            ctx.lineTo(endX, endY);
            
            // Add glow effect
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#FFFFFF';
            
            // Draw the arc
                    ctx.stroke();
            
            // Reset shadow
            ctx.shadowBlur = 0;
        }
    }
    
    // Reset global alpha
    ctx.globalAlpha = 1.0;
}

// Add the missing createExplosion function
function createExplosion(x, y, z) {
    // Calculate perspective for size scaling
    const perspective = 500 / (500 + Math.abs(z));
    const baseSize = 2.5 * perspective; // Reduced by 50% from 5
    
    // Create primary explosion particles with vaporwave colors
    for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 75 + Math.random() * 175; // Reduced by 50%
        const size = baseSize * (1 + Math.random() * 3);
        
        // Use enemy ship color palette (pinks, magentas, whites)
        const colors = [
            '#FFFFFF', // White
            '#FF00FF', // Magenta (primary)
            '#FF71CE', // Pink (accent1)
            '#FFAA00', // Orange/yellow
            '#FF5500'  // Orange/red
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particles.push({
            x: x + (Math.random() - 0.5) * 10 * perspective, // Reduced spread by 50%
            y: y + (Math.random() - 0.5) * 10 * perspective, // Reduced spread by 50%
            z: z,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            dz: 0,
            size: size,
            life: 0.7 + Math.random() * 1.2,
            maxLife: 0.7 + Math.random() * 1.2,
            color: color,
            type: 'explosion'
        });
    }
    
    // Add central flash
    particles.push({
        x: x,
        y: y,
        z: z,
        size: 75 * perspective, // Reduced by 50% from 150
        color: '#FFFFFF',
        life: 0.3,
        maxLife: 0.3,
        type: 'flash'
    });
    
    // Add magenta glow
    particles.push({
        x: x,
        y: y,
        z: z,
        size: 100 * perspective, // Reduced by 50% from 200
        color: 'rgba(255, 0, 255, 0.7)', // Magenta glow
        life: 0.5,
        maxLife: 0.5,
        type: 'flash'
    });
    
    // Add debris particles (ship fragments)
    for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 100; // Reduced by 50%
        
        // Use ship colors and warm accents
        const debrisColors = ['#FF00FF', '#FF71CE', '#FFAA00'];
        const color = debrisColors[i % debrisColors.length];
        
        particles.push({
            x: x + (Math.random() - 0.5) * 10 * perspective, // Reduced spread by 50%
            y: y + (Math.random() - 0.5) * 10 * perspective, // Reduced spread by 50%
            z: z,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            dz: 0,
            size: baseSize * (1.5 + Math.random() * 2),
            life: 1.2 + Math.random() * 1.8,
            maxLife: 1.2 + Math.random() * 1.8,
            color: color,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 8,
            type: 'debris'
        });
    }
    
    // Add shockwave
    particles.push({
        x: x,
        y: y,
        z: z,
        size: 5 * perspective,
        maxSize: 150 * perspective, // Reduced by 50% from 300
        color: 'rgba(255, 113, 206, 0.6)', // Pink shockwave (accent1)
        life: 0.7,
        maxLife: 0.7,
        type: 'shockwave'
    });
    
    // Add second shockwave (orange)
    particles.push({
        x: x,
        y: y,
        z: z,
        size: 2.5 * perspective,
        maxSize: 125 * perspective, // Reduced by 50% from 250
        color: 'rgba(255, 170, 0, 0.5)', // Orange shockwave
        life: 0.9,
        maxLife: 0.9,
        delay: 0.1,
        delayLeft: 0.1,
        type: 'shockwave'
    });
    
    // Add screen shake
    addScreenShake(0.5); // Reduced by 50% from 1.0
}

// Simplify the enemy spawn effect
function createEnemySpawnEffect(x, y, z) {
    // Calculate perspective for size scaling
    const perspective = 500 / (500 + Math.abs(z));
    
    // Add a subtle flash
    particles.push({
        x: x,
        y: y,
        z: z,
        size: 30 * perspective,
        color: 'rgba(255, 0, 255, 0.5)', // Magenta glow
        life: 0.3,
        maxLife: 0.3,
        type: 'flash'
    });
    
    // Add a few small particles
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 50;
        
        particles.push({
            x: x,
            y: y,
            z: z,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            dz: 0,
            size: 1.5 * perspective,
            life: 0.3 + Math.random() * 0.3,
            maxLife: 0.3 + Math.random() * 0.3,
            color: '#FF00FF',
            type: 'hit'
        });
    }
}

// Add shield impact visual effect
function createShieldImpact() {
    // Use the player's position directly with offset for the shield position
    const x = player.x;
    const y = player.y - 30 * player.scale; // Match the updated shield offset
    
    // Create a shield flash effect - make it a partial arc to match the shield shape
    // Use the same angles as the shield
    const startAngle = -Math.PI * 0.8; // Start at -144 degrees (further left)
    const endAngle = -Math.PI * 0.2;   // End at -36 degrees (further right)
    
    particles.push({
        x: x,
        y: y,
        z: 0,
        size: 70 * player.scale, // Match new shield size
        maxSize: 90 * player.scale, // Slightly larger max size
        color: 'rgba(1, 205, 254, 0.6)', // More visible
        life: 0.4,
        maxLife: 0.4,
        type: 'shockwave',
        // Add angle properties to create a partial shockwave matching the shield
        startAngle: startAngle,
        endAngle: endAngle
    });
    
    // Add a second, faster shockwave
    particles.push({
        x: x,
        y: y,
        z: 0,
        size: 60 * player.scale,
        maxSize: 100 * player.scale,
        color: 'rgba(255, 255, 255, 0.4)', // More visible
        life: 0.25,
        maxLife: 0.25,
        type: 'shockwave',
        // Add angle properties to create a partial shockwave matching the shield
        startAngle: startAngle,
        endAngle: endAngle
    });
    
    // Add some small particles - only in the shield arc
    for (let i = 0; i < 18; i++) { // Increased for wider arc
        // Generate angle only within the shield arc
        const angle = startAngle + Math.random() * (endAngle - startAngle);
        const speed = 50 + Math.random() * 130;
        
        particles.push({
            x: x,
            y: y,
            z: 0,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            dz: 0,
            size: 1.0 + Math.random() * 1.5, // Slightly larger particles
            life: 0.2 + Math.random() * 0.3,
            maxLife: 0.2 + Math.random() * 0.3,
            color: '#01CDFE', // Cyan particles
            type: 'hit'
        });
    }
    
    // Add electrical arcs when shields are low (1 shield remaining)
    if (player.shields === 1) {
        // Add electrical arc particles - only in the shield arc
        for (let i = 0; i < 12; i++) { // Increased for wider arc
            // Generate angle only within the shield arc
            const angle = startAngle + Math.random() * (endAngle - startAngle);
            const distance = 30 + Math.random() * 40;
            const arcX = x + Math.cos(angle) * distance;
            const arcY = y + Math.sin(angle) * distance;
            
            particles.push({
                x: arcX,
                y: arcY,
                z: 0,
                initialX: x,
                initialY: y,
                size: 0.8 + Math.random() * 1.0, // Slightly thicker arcs
                life: 0.12 + Math.random() * 0.18,
                maxLife: 0.12 + Math.random() * 0.18,
                color: '#FFFFFF', // White electrical arcs
                type: 'arc'
            });
        }
        
        // Add glitch flash
        particles.push({
            x: x,
            y: y,
            z: 0,
            size: 70 * player.scale,
            color: 'rgba(255, 255, 255, 0.35)',
            life: 0.15,
            maxLife: 0.15,
            type: 'flash'
        });
    }
}

// Add hull damage visual effect
function createHullDamageEffect() {
    // Use the player's position directly
    const x = player.x;
    const y = player.y;
    
    // Create a hull damage flash
    particles.push({
        x: x,
        y: y,
        z: 0,
        size: 80,
        color: 'rgba(255, 0, 0, 0.5)', // Red flash
        life: 0.4,
        maxLife: 0.4,
        type: 'flash'
    });
    
    // Add a red shockwave for hull damage
    particles.push({
        x: x,
        y: y,
        z: 0,
        size: 80,
        maxSize: 130,
        color: 'rgba(255, 85, 0, 0.6)', // Orange-red shockwave
        life: 0.5,
        maxLife: 0.5,
        type: 'shockwave'
    });
    
    // Add debris particles
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 120;
        
        particles.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            z: 0,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            dz: 0,
            size: 1 + Math.random() * 3,
            life: 0.8 + Math.random() * 0.7,
            maxLife: 0.8 + Math.random() * 0.7,
            color: '#FF5500', // Orange/red debris
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 5,
            type: 'debris'
        });
    }
}

// New function to handle audio pausing and resuming
function handleGameAudio(isPaused) {
    // Use the global gameMusic variable
    console.log("handleGameAudio called with isPaused =", isPaused, "currentTrack =", currentTrack);
    console.log("Current music state: paused =", gameMusic.paused, "musicEnabled =", musicEnabled);
    
    if (isPaused) {
        // Force pause the music when game is paused
        console.log("Forcing music to pause");
        gameMusic.pause();
    } else if (musicEnabled) {
        // Only resume if music is enabled
        console.log("Attempting to resume music (track: " + currentTrack + ")");
        const playPromise = gameMusic.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => console.log("Music resumed successfully"))
                .catch(e => console.error("Failed to resume music:", e));
        }
    }
    
    // Verify the music state after our action
    setTimeout(() => {
        console.log("Music state after action: paused =", gameMusic.paused, "currentTrack =", currentTrack);
    }, 100);
}

// New function to toggle pause state
function togglePause() {
    // Toggle pause state
    gamePaused = !gamePaused;
    
    console.log("Toggle pause called, gamePaused =", gamePaused);
    
    // Handle audio based on pause state
    handleGameAudio(gamePaused);
    
    const pauseHint = document.getElementById('pauseHint');
    
    // Show/hide pause menu
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) {
        pauseMenu.style.display = gamePaused ? 'flex' : 'none';
    } else if (gamePaused) {
        // Create pause menu if it doesn't exist
        createPauseMenu();
    }
    
    // Toggle visibility of pause hint
    if (pauseHint) {
        pauseHint.style.display = gamePaused ? 'none' : 'flex';
    }
}

// New function to create pause menu
function createPauseMenu() {
    const pauseMenu = document.createElement('div');
    pauseMenu.id = 'pauseMenu';
    pauseMenu.style.position = 'absolute';
    pauseMenu.style.top = '0';
    pauseMenu.style.left = '0';
    pauseMenu.style.width = '100%';
    pauseMenu.style.height = '100%';
    pauseMenu.style.display = 'flex';
    pauseMenu.style.flexDirection = 'column';
    pauseMenu.style.justifyContent = 'center';
    pauseMenu.style.alignItems = 'center';
    pauseMenu.style.backgroundColor = 'rgba(0, 0, 51, 0.7)';
    pauseMenu.style.zIndex = '1000';
    
    // Use the same font as the game HUD
    pauseMenu.style.fontFamily = "'Orbitron', sans-serif";
    
    // Create a container for the pause menu content with styling similar to HUD elements
    const pauseContainer = document.createElement('div');
    pauseContainer.style.background = 'rgba(0, 0, 51, 0.8)';
    pauseContainer.style.padding = '30px 50px';
    pauseContainer.style.borderRadius = '5px';
    pauseContainer.style.border = '2px solid #FF00FF';
    pauseContainer.style.boxShadow = '0 0 20px #00FFFF';
    pauseContainer.style.display = 'flex';
    pauseContainer.style.flexDirection = 'column';
    pauseContainer.style.alignItems = 'center';
    
    const pauseTitle = document.createElement('h2');
    pauseTitle.textContent = 'PAUSED';
    pauseTitle.style.marginBottom = '30px';
    pauseTitle.style.fontSize = '36px';
    pauseTitle.style.color = '#00FFFF';
    pauseTitle.style.textShadow = '0 0 10px #00FFFF';
    pauseTitle.style.letterSpacing = '3px';
    
    const resumeText = document.createElement('p');
    resumeText.textContent = 'PRESS ESC TO RESUME';
    resumeText.style.fontSize = '18px';
    resumeText.style.marginBottom = '20px';
    resumeText.style.color = '#FF00FF';
    resumeText.style.textShadow = '0 0 5px #FF00FF';
    resumeText.style.letterSpacing = '2px';
    
    pauseContainer.appendChild(pauseTitle);
    pauseContainer.appendChild(resumeText);
    pauseMenu.appendChild(pauseContainer);
    
    document.body.appendChild(pauseMenu);
}

// New function to draw pause screen overlay on canvas
function drawPauseScreen() {
    // Add a subtle grid effect to the overlay
    ctx.fillStyle = 'rgba(0, 0, 51, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a subtle glow around the edges of the canvas when paused
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width / 3,
        canvas.width / 2, canvas.height / 2, canvas.width / 1.5
    );
    gradient.addColorStop(0, 'rgba(0, 0, 51, 0)');
    gradient.addColorStop(1, 'rgba(255, 0, 255, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Function is kept for compatibility but doesn't draw anything
function drawPauseIcon() {
    // No longer drawing text on the canvas
    // The pause hint is now handled by the HTML element
}

// Add a function to restart the game from game over
function restartGame() {
    console.log("Restarting game from game over");
    
    // Switch back to gameplay music if needed
    if (currentTrack !== 'gameplay' && musicEnabled) {
        gameMusic.pause();
        gameMusic.src = 'audio/Dreams.mp3';
        currentTrack = 'gameplay';
        console.log("Switched back to gameplay music (Dreams.mp3)");
        
        // Play the gameplay music
        gameMusic.play()
            .then(() => console.log("Gameplay music started for restart"))
            .catch(e => console.error("Failed to start gameplay music for restart:", e));
    }
    
    // Hide game over overlay if it exists and is visible
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    if (gameOverOverlay && gameOverOverlay.style.display !== 'none' && gameOverOverlay.style.opacity !== '0') {
        gameOverOverlay.style.display = 'none';
    }
    
    // Start a new game
    startGame();
}

// Add shield visualization function
function drawPlayerShield() {
    // Only draw shield if player has shields
    if (player.shields <= 0) return;
    
    // Save context
    ctx.save();
    
    // Move to player position
    ctx.translate(player.x, player.y);
    
    // Apply banking rotation
    ctx.rotate(player.bankAngle);
    
    // Apply pitch effect
    const pitchScale = 1.0 - Math.abs(player.pitchAngle) * 0.5;
    ctx.scale(1.0, pitchScale);
    
    // Calculate shield health percentage
    const shieldPercentage = player.shields / player.maxShields;
    
    // Set up shield glow effect - slightly thicker
    ctx.lineWidth = 1.5; // Keeping the thicker line
    ctx.strokeStyle = '#01CDFE'; // Bright cyan blue for shield
    ctx.shadowBlur = 15; // Keeping the enhanced glow
    ctx.shadowColor = '#01CDFE';
    
    // Create a more noticeable semi-transparent fill
    ctx.fillStyle = `rgba(1, 205, 254, ${0.08 + shieldPercentage * 0.12})`; // Keeping the enhanced opacity
    
    // Draw thin crescent shield that curves around the top of the ship
    ctx.beginPath();
    
    // Adjust shield size and position - wider radius to curve around the wings
    const shieldSize = 70 * player.scale; // Keeping the increased radius for wider coverage
    const shieldOffset = -30 * player.scale; // Keeping the same vertical position
    
    // Draw a wider arc that curves around more of the top of the ship (about 160 degrees)
    // Center the arc at the top of the ship (no rotation)
    const startAngle = -Math.PI * 0.8; // Start at -144 degrees (further left)
    const endAngle = -Math.PI * 0.2;   // End at -36 degrees (further right)
    ctx.arc(0, shieldOffset, shieldSize, startAngle, endAngle, false);
    
    // Add glitch effect when shields are low
    if (player.shields === 1) {
        // Create glitching effect by adding jagged lines
        const now = Date.now();
        const glitchIntensity = 0.15 + Math.sin(now / 100) * 0.05;
        const glitchSegments = 5; // Keeping increased segments for wider arc
        
        for (let i = 0; i < glitchSegments; i++) {
            const angle = startAngle + (endAngle - startAngle) / glitchSegments * i;
            const nextAngle = startAngle + (endAngle - startAngle) / glitchSegments * (i + 1);
            
            const glitchOffset = (Math.random() - 0.5) * glitchIntensity * shieldSize;
            
            const x1 = Math.cos(angle) * shieldSize;
            const y1 = Math.sin(angle) * shieldSize + shieldOffset;
            
            const x2 = Math.cos(nextAngle) * (shieldSize + glitchOffset);
            const y2 = Math.sin(nextAngle) * (shieldSize + glitchOffset) + shieldOffset;
            
            ctx.lineTo(x2, y2);
        }
    }
    
    // Create a true crescent shape with a more pronounced inner arc
    
    // Calculate the midpoint angle
    const midAngle = (startAngle + endAngle) / 2;
    
    // Make the inner radius larger for a more visible inner arc
    const innerRadius = shieldSize * 0.7; // Increased from 0.4 to 0.7 for more visibility
    
    // Calculate the inner curve points - use a larger portion of the inner curve
    // This creates a more visible inner arc while maintaining the crescent shape
    const innerArcStart = startAngle + Math.PI * 0.15; // Larger arc on the inner curve
    const innerArcEnd = endAngle - Math.PI * 0.15;   // Creates a more visible inner curve
    
    // Calculate the points where the outer arc ends
    const rightX = Math.cos(endAngle) * shieldSize;
    const rightY = Math.sin(endAngle) * shieldSize + shieldOffset;
    const leftX = Math.cos(startAngle) * shieldSize;
    const leftY = Math.sin(startAngle) * shieldSize + shieldOffset;
    
    // Calculate the points where the inner arc starts/ends
    const innerRightX = Math.cos(innerArcEnd) * innerRadius;
    const innerRightY = Math.sin(innerArcEnd) * innerRadius + shieldOffset;
    const innerLeftX = Math.cos(innerArcStart) * innerRadius;
    const innerLeftY = Math.sin(innerArcStart) * innerRadius + shieldOffset;
    
    // Draw straight lines from the outer arc ends to the inner arc
    ctx.lineTo(rightX, rightY); // Ensure we're at the end of the outer arc
    ctx.lineTo(innerRightX, innerRightY); // Connect to the start of the inner arc
    
    // Draw the inner arc - now more visible
    ctx.arc(0, shieldOffset, innerRadius, innerArcEnd, innerArcStart, true);
    
    // Connect back to the outer arc
    ctx.lineTo(leftX, leftY);
    
    // Fill and stroke the shield
    ctx.fill();
    ctx.stroke();
    
    // Add enhanced pulsing effect
    const pulseTime = Date.now() / 1000;
    const pulseIntensity = 0.5 + Math.sin(pulseTime * 3) * 0.4; // Keeping the enhanced intensity
    
    // Draw inner shield glow lines - slightly more visible
    ctx.beginPath();
    ctx.lineWidth = 0.8; // Keeping the thicker inner line
    ctx.strokeStyle = `rgba(1, 205, 254, ${0.25 * pulseIntensity})`; // Keeping the enhanced visibility
    
    // Draw the inner glow along the outer edge only
    ctx.arc(0, shieldOffset, shieldSize * 0.95, startAngle, endAngle, false);
    ctx.stroke();
    
    // Add shield energy particles when shields are active
    if (Math.random() < 0.15 * shieldPercentage) { // Keeping the enhanced probability
        const angle = startAngle + Math.random() * (endAngle - startAngle);
        const distance = shieldSize * (0.9 + Math.random() * 0.2);
        
        particles.push({
            x: player.x + Math.cos(angle + player.bankAngle) * distance,
            y: player.y + Math.sin(angle + player.bankAngle) * distance * pitchScale + shieldOffset,
            z: 0,
            dx: Math.cos(angle) * 15,
            dy: Math.sin(angle) * 15,
            dz: 0,
            size: 0.7 + Math.random() * 1.3, // Keeping the enhanced particle size
            life: 0.15 + Math.random() * 0.25, // Keeping the enhanced particle life
            maxLife: 0.15 + Math.random() * 0.25,
            color: '#01CDFE', // Cyan particles
            type: 'hit'
        });
    }
    
    // Restore context
    ctx.restore();
}