// Audio state
let musicEnabled = true;
let currentTrack = 'gameplay'; // Track which music is currently playing: 'gameplay' or 'gameover'
let gameMusic;
let toggleAudioButton;
let audioIcon;

// Initialize audio
function initAudio() {
    gameMusic = document.getElementById('gameMusic');
    toggleAudioButton = document.getElementById('toggleAudio');
    audioIcon = document.getElementById('audioIcon');
    
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

// Handle game audio based on game state
function handleGameAudio(isPaused) {
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

// Switch to gameplay music
function playGameplayMusic() {
    if (currentTrack !== 'gameplay') {
        gameMusic.pause();
        gameMusic.src = 'audio/Dreams.mp3';
        currentTrack = 'gameplay';
        console.log("Switched to gameplay music (Dreams.mp3)");
        
        if (musicEnabled) {
            gameMusic.play()
                .then(() => console.log("Gameplay music started"))
                .catch(e => console.error("Failed to start gameplay music:", e));
        }
    } else if (musicEnabled && gameMusic.paused) {
        gameMusic.play()
            .catch(e => console.error("Failed to resume gameplay music:", e));
    }
}

// Switch to game over music
function playGameOverMusic() {
    if (currentTrack !== 'gameover') {
        gameMusic.pause();
        gameMusic.src = 'audio/Cosmos.mp3';
        currentTrack = 'gameover';
        console.log("Switched to game over music (Cosmos.mp3)");
        
        if (musicEnabled) {
            gameMusic.play()
                .then(() => console.log("Game over music started"))
                .catch(e => console.error("Failed to start game over music:", e));
        }
    }
}

export {
    musicEnabled,
    currentTrack,
    initAudio,
    toggleAudio,
    handleGameAudio,
    playGameplayMusic,
    playGameOverMusic
}; 