// ============ CONSTANTS ============
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 20;
const PLAYER_BASE_SPEED = 250; // pixels per second
const ENEMY_BASE_SPEEDS = {
    EASY: 100,
    MEDIUM: 150,
    HARD: 200
};
const ENEMY_RADIUS = 10;
const COLLISION_BUFFER = 5;

// Difficulty settings
const DIFFICULTY_SETTINGS = {
    EASY: {
        baseEnemySpeed: 100,
        initialSpawnInterval: 4000, // 4 seconds
        spawnRateDecrease: 10, // ms per second
        speedIncrease: 20, // pixels/sec per second
        speedIncreaseInterval: 1000 // every second
    },
    MEDIUM: {
        baseEnemySpeed: 150,
        initialSpawnInterval: 3000,
        spawnRateDecrease: 20,
        speedIncrease: 35,
        speedIncreaseInterval: 1000
    },
    HARD: {
        baseEnemySpeed: 200,
        initialSpawnInterval: 2000,
        spawnRateDecrease: 30,
        speedIncrease: 50,
        speedIncreaseInterval: 1000
    }
};

// Screen shake settings
const SCREEN_SHAKE_DURATION = 200; // ms
const SCREEN_SHAKE_INTENSITY = 10; // pixels

// ============ LEADERBOARD FUNCTIONS ============
function getLeaderboard() {
    const data = localStorage.getItem('canvas_apocalypse_leaderboard');
    return data ? JSON.parse(data) : [];
}

function saveScoreToLeaderboard(username, score, timeSurvived) {
    const leaderboard = getLeaderboard();
    leaderboard.push({
        username: username,
        score: Math.floor(score),
        timeSurvived: Math.floor(timeSurvived),
        date: new Date().toLocaleDateString()
    });
    
    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only top 50
    leaderboard.splice(50);
    
    localStorage.setItem('canvas_apocalypse_leaderboard', JSON.stringify(leaderboard));
}

// ============ GAME STATE ============
const gameState = {
    // States: MENU, REGISTER, PLAY, GAME_OVER, LEADERBOARD
    state: 'MENU',
    selectedDifficulty: 'MEDIUM',
    username: '',
    inputBuffer: '',
    
    // Player
    player: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        size: PLAYER_SIZE,
        velX: 0,
        velY: 0,
        speed: PLAYER_BASE_SPEED
    },
    
    // Enemies
    enemies: [],
    spawnTimer: 0,
    currentSpawnInterval: 3000,
    currentEnemySpeed: 150,
    
    // Score and timer
    score: 0,
    timeSurvived: 0,
    highScore: localStorage.getItem('canvas_apocalypse_highscore') || 0,
    
    // Effects
    particles: [],
    screenShake: {
        active: false,
        duration: 0,
        offsetX: 0,
        offsetY: 0
    },
    
    // Background effect
    bgDots: [],
    
    // Difficulty timing
    difficultyTimer: 0
};

// Keyboard input
const keysPressed = {};

// Canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ============ INITIALIZATION ============
function init() {
    gameState.state = 'MENU';
    gameState.selectedDifficulty = 'MEDIUM';
    gameState.score = 0;
    gameState.timeSurvived = 0;
    gameState.enemies = [];
    gameState.particles = [];
    gameState.spawnTimer = 0;
    gameState.difficultyTimer = 0;
    gameState.screenShake.active = false;
    gameState.screenShake.duration = 0;
    
    // Reset player position
    gameState.player.x = CANVAS_WIDTH / 2;
    gameState.player.y = CANVAS_HEIGHT / 2;
    gameState.player.velX = 0;
    gameState.player.velY = 0;
    
    // Initialize background dots
    initializeBackgroundDots();
}

function initializeBackgroundDots() {
    gameState.bgDots = [];
    for (let i = 0; i < 7; i++) {
        gameState.bgDots.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            radius: Math.random() * 2,
            speed: Math.random() * 20 + 10,
            dirX: (Math.random() - 0.5) * 2,
            dirY: (Math.random() - 0.5) * 2,
            opacity: Math.random() * 0.3 + 0.1
        });
    }
}

function startGame(difficulty) {
    gameState.state = 'PLAY';
    gameState.selectedDifficulty = difficulty;
    gameState.score = 0;
    gameState.timeSurvived = 0;
    gameState.enemies = [];
    gameState.particles = [];
    gameState.spawnTimer = 0;
    gameState.difficultyTimer = 0;
    gameState.screenShake.active = false;
    
    const settings = DIFFICULTY_SETTINGS[difficulty];
    gameState.currentSpawnInterval = settings.initialSpawnInterval;
    gameState.currentEnemySpeed = settings.baseEnemySpeed;
    
    gameState.player.x = CANVAS_WIDTH / 2;
    gameState.player.y = CANVAS_HEIGHT / 2;
    gameState.player.velX = 0;
    gameState.player.velY = 0;
    
    // Spawn first enemy
    spawnEnemy();
}

// ============ EVENT LISTENERS ============
document.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;
    
    // Registration input
    if (gameState.state === 'REGISTER') {
        if (e.key === 'Enter' && gameState.inputBuffer.trim().length > 0) {
            gameState.username = gameState.inputBuffer.trim();
            gameState.inputBuffer = '';
            gameState.state = 'MENU';
        } else if (e.key === 'Backspace') {
            gameState.inputBuffer = gameState.inputBuffer.slice(0, -1);
        } else if (e.key.length === 1 && gameState.inputBuffer.length < 15) {
            gameState.inputBuffer += e.key;
        }
        return;
    }
    
    // Leaderboard navigation
    if (gameState.state === 'LEADERBOARD') {
        if (e.key === 'Escape' || e.key === 'l' || e.key === 'L') {
            gameState.state = 'MENU';
        }
        return;
    }
    
    // Menu selection
    if (gameState.state === 'MENU') {
        if (e.key === '1') {
            startGame('EASY');
            return;
        }
        if (e.key === '2') {
            startGame('MEDIUM');
            return;
        }
        if (e.key === '3') {
            startGame('HARD');
            return;
        }
        if (e.key === 'r' || e.key === 'R') {
            gameState.state = 'REGISTER';
            return;
        }
        if (e.key === 'l' || e.key === 'L') {
            gameState.state = 'LEADERBOARD';
            return;
        }
    }
    
    // Restart
    if (gameState.state === 'GAME_OVER' && e.key.toLowerCase() === 'r') {
        gameState.state = 'MENU';
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

// ============ ENEMY FUNCTIONS ============
function spawnEnemy() {
    let x, y, dirX, dirY;
    
    // Random edge spawn (top, bottom, left, right)
    const edge = Math.floor(Math.random() * 4);
    
    if (edge === 0) { // top
        x = Math.random() * CANVAS_WIDTH;
        y = -ENEMY_RADIUS;
    } else if (edge === 1) { // bottom
        x = Math.random() * CANVAS_WIDTH;
        y = CANVAS_HEIGHT + ENEMY_RADIUS;
    } else if (edge === 2) { // left
        x = -ENEMY_RADIUS;
        y = Math.random() * CANVAS_HEIGHT;
    } else { // right
        x = CANVAS_WIDTH + ENEMY_RADIUS;
        y = Math.random() * CANVAS_HEIGHT;
    }
    
    const enemy = {
        x: x,
        y: y,
        radius: ENEMY_RADIUS,
        speed: gameState.currentEnemySpeed,
        vx: 0,
        vy: 0
    };
    
    gameState.enemies.push(enemy);
}

function updateEnemies(deltaTime) {
    gameState.enemies.forEach((enemy, index) => {
        // Calculate direction to player
        const dx = gameState.player.x - enemy.x;
        const dy = gameState.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // Normalize direction vector
            const normX = dx / distance;
            const normY = dy / distance;
            
            // Apply velocity
            enemy.vx = normX * enemy.speed;
            enemy.vy = normY * enemy.speed;
            
            // Update position
            enemy.x += enemy.vx * deltaTime;
            enemy.y += enemy.vy * deltaTime;
        }
    });
}

function drawEnemies() {
    ctx.fillStyle = '#ff3333';
    gameState.enemies.forEach((enemy) => {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        ctx.strokeStyle = 'rgba(255, 51, 51, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

// ============ COLLISION DETECTION ============
function checkCollisions() {
    gameState.enemies.forEach((enemy, index) => {
        // Approximate player as circle for collision (center, half diagonal)
        const playerCenterX = gameState.player.x + PLAYER_SIZE / 2;
        const playerCenterY = gameState.player.y + PLAYER_SIZE / 2;
        const playerRadius = PLAYER_SIZE / Math.sqrt(2);
        
        // Circle to circle collision
        const dx = enemy.x - playerCenterX;
        const dy = enemy.y - playerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < enemy.radius + playerRadius) {
            // Collision detected!
            gameState.state = 'GAME_OVER';
            
            // Save to leaderboard if username is set
            if (gameState.username) {
                saveScoreToLeaderboard(gameState.username, gameState.score, gameState.timeSurvived);
            }
            
            // Check if new high score
            if (gameState.score > gameState.highScore) {
                gameState.highScore = gameState.score;
                localStorage.setItem('canvas_apocalypse_highscore', gameState.score);
            }
            
            // Trigger screen shake and particle explosion
            triggerScreenShake();
            spawnExplosion(enemy.x, enemy.y);
        }
    });
}

// ============ PARTICLE SYSTEM ============
function spawnExplosion(x, y) {
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
        const speed = Math.random() * 150 + 100;
        
        const particle = {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.5, // seconds
            maxLife: 0.5,
            size: Math.random() * 4 + 2
        };
        
        gameState.particles.push(particle);
    }
}

function updateParticles(deltaTime) {
    gameState.particles = gameState.particles.filter((particle) => {
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.life -= deltaTime;
        
        // Apply gravity
        particle.vy += 200 * deltaTime;
        
        return particle.life > 0;
    });
}

function drawParticles() {
    gameState.particles.forEach((particle) => {
        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = `rgba(255, 200, 0, ${alpha * 0.8})`;
        ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    });
}

// ============ SCREEN SHAKE ============
function triggerScreenShake() {
    gameState.screenShake.active = true;
    gameState.screenShake.duration = SCREEN_SHAKE_DURATION;
}

function updateScreenShake(deltaTime) {
    if (gameState.screenShake.active) {
        gameState.screenShake.duration -= deltaTime * 1000;
        
        if (gameState.screenShake.duration <= 0) {
            gameState.screenShake.active = false;
            gameState.screenShake.offsetX = 0;
            gameState.screenShake.offsetY = 0;
        } else {
            gameState.screenShake.offsetX = (Math.random() - 0.5) * SCREEN_SHAKE_INTENSITY;
            gameState.screenShake.offsetY = (Math.random() - 0.5) * SCREEN_SHAKE_INTENSITY;
        }
    }
}

// ============ PLAYER UPDATE ============
function updatePlayer(deltaTime) {
    const moveInput = {
        x: 0,
        y: 0
    };
    
    // WASD and Arrow keys
    if (keysPressed['w'] || keysPressed['arrowup']) moveInput.y -= 1;
    if (keysPressed['s'] || keysPressed['arrowdown']) moveInput.y += 1;
    if (keysPressed['a'] || keysPressed['arrowleft']) moveInput.x -= 1;
    if (keysPressed['d'] || keysPressed['arrowright']) moveInput.x += 1;
    
    // Normalize input
    const inputLength = Math.sqrt(moveInput.x * moveInput.x + moveInput.y * moveInput.y);
    if (inputLength > 0) {
        moveInput.x /= inputLength;
        moveInput.y /= inputLength;
    }
    
    // Apply velocity
    gameState.player.velX = moveInput.x * gameState.player.speed;
    gameState.player.velY = moveInput.y * gameState.player.speed;
    
    // Update position
    gameState.player.x += gameState.player.velX * deltaTime;
    gameState.player.y += gameState.player.velY * deltaTime;
    
    // Clamp to canvas bounds
    gameState.player.x = Math.max(0, Math.min(gameState.player.x, CANVAS_WIDTH - gameState.player.size));
    gameState.player.y = Math.max(0, Math.min(gameState.player.y, CANVAS_HEIGHT - gameState.player.size));
}

function drawPlayer() {
    ctx.fillStyle = '#00ff41';
    ctx.fillRect(gameState.player.x, gameState.player.y, gameState.player.size, gameState.player.size);
    
    // Add glow effect
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(gameState.player.x, gameState.player.y, gameState.player.size, gameState.player.size);
}

// ============ BACKGROUND EFFECT ============
function updateBackground(deltaTime) {
    gameState.bgDots.forEach((dot) => {
        dot.x += dot.dirX * dot.speed * deltaTime;
        dot.y += dot.dirY * dot.speed * deltaTime;
        
        // Wrap around edges
        if (dot.x < 0) dot.x = CANVAS_WIDTH;
        if (dot.x > CANVAS_WIDTH) dot.x = 0;
        if (dot.y < 0) dot.y = CANVAS_HEIGHT;
        if (dot.y > CANVAS_HEIGHT) dot.y = 0;
    });
}

function drawBackground() {
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a1f2e');
    gradient.addColorStop(1, '#162d45');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background dots
    gameState.bgDots.forEach((dot) => {
        ctx.fillStyle = `rgba(0, 255, 65, ${dot.opacity})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

// ============ UI DRAWING ============
function drawUI() {
    ctx.fillStyle = '#00ff41';
    ctx.font = '12px Courier New';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    
    const timeText = `T: ${Math.floor(gameState.timeSurvived)}s`;
    const scoreText = `S: ${Math.floor(gameState.score)}`;
    const highScoreText = `H: ${Math.floor(gameState.highScore)}`;
    
    ctx.fillText(timeText, CANVAS_WIDTH - 15, 15);
    ctx.fillText(scoreText, CANVAS_WIDTH - 15, 30);
    ctx.fillText(highScoreText, CANVAS_WIDTH - 15, 45);
    
    // Enemy count
    ctx.fillText(`E: ${gameState.enemies.length}`, CANVAS_WIDTH - 15, 60);
    
    ctx.textAlign = 'left';
}

function drawGameOverScreen() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#ff3333';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
    
    ctx.fillStyle = '#00ff41';
    ctx.font = '24px Courier New';
    ctx.fillText(`SCORE: ${gameState.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    ctx.fillText(`TIME SURVIVED: ${Math.floor(gameState.timeSurvived)}s`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    
    if (gameState.score === gameState.highScore && gameState.score > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('NEW HIGH SCORE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
        ctx.fillStyle = '#00ff41';
    }
    
    ctx.font = '18px Courier New';
    ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 140);
}

function drawRegistrationScreen() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#00ff41';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText('ENTER USERNAME', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
    
    // Input box
    ctx.fillStyle = '#00ff41';
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 2;
    ctx.fillRect(CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2 + 10, 300, 40);
    
    // Input text
    ctx.fillStyle = '#000000';
    ctx.font = '24px Courier New';
    ctx.fillText(gameState.inputBuffer || '_', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    
    // Instructions
    ctx.fillStyle = '#ffff00';
    ctx.font = '16px Courier New';
    ctx.fillText('Type your username (max 15 chars)', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
    
    ctx.fillStyle = '#00ff41';
    ctx.font = '14px Courier New';
    ctx.fillText('Press Enter to confirm', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 110);
}

function drawLeaderboardScreen() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#00ff41';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    ctx.fillText('LEADERBOARD', CANVAS_WIDTH / 2, 20);
    
    const leaderboard = getLeaderboard();
    
    if (leaderboard.length === 0) {
        ctx.fillStyle = '#ffff00';
        ctx.font = '20px Courier New';
        ctx.fillText('No scores yet. Register and play!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    } else {
        // Header
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('RANK', 50, 80);
        ctx.fillText('PLAYER', 100, 80);
        ctx.fillText('SCORE', 280, 80);
        ctx.fillText('TIME', 420, 80);
        
        // Separator
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 100);
        ctx.lineTo(CANVAS_WIDTH - 40, 100);
        ctx.stroke();
        
        // Scores (show top 10)
        ctx.fillStyle = '#00ff41';
        ctx.font = '12px Courier New';
        ctx.textAlign = 'left';
        
        for (let i = 0; i < Math.min(10, leaderboard.length); i++) {
            const entry = leaderboard[i];
            const y = 120 + i * 25;
            
            // Highlight current player
            if (gameState.username === entry.username) {
                ctx.fillStyle = '#ffff00';
            } else {
                ctx.fillStyle = '#00ff41';
            }
            
            const rank = i + 1;
            ctx.fillText(`${rank}`, 50, y);
            ctx.fillText(entry.username.substr(0, 15), 100, y);
            ctx.fillText(entry.score, 280, y);
            ctx.fillText(`${entry.timeSurvived}s`, 420, y);
        }
    }
    
    // Exit instruction
    ctx.fillStyle = '#00ff41';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC or L to return to menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
}

function drawMenuScreen() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#00ff41';
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText('CANVAS APOCALYPSE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 120);
    
    ctx.fillStyle = '#ffff00';
    ctx.font = '24px Courier New';
    ctx.fillText('Select Difficulty:', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    
    ctx.fillStyle = '#00ff41';
    ctx.font = '20px Courier New';
    ctx.fillText('Press 1 for EASY', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    ctx.fillText('Press 2 for MEDIUM', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
    ctx.fillText('Press 3 for HARD', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 110);
    
    // Display high score
    ctx.fillStyle = '#ff9900';
    ctx.font = '18px Courier New';
    ctx.fillText(`HIGH SCORE: ${gameState.highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 155);
    
    // Current username
    ctx.fillStyle = '#00ffff';
    ctx.font = '14px Courier New';
    ctx.fillText(`User: ${gameState.username || 'Guest'}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 185);
    
    // Bottom buttons
    ctx.fillStyle = '#00ff41';
    ctx.font = '12px Courier New';
    ctx.fillText('Press R to Register', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
    ctx.fillText('Press L for Leaderboard', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 25);
}

// ============ GAME LOOP ============
let lastTime = Date.now();

function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;
    
    // Cap deltaTime to prevent large jumps
    const cappedDeltaTime = Math.min(deltaTime, 0.016); // ~60fps max
    
    // Clear canvas
    drawBackground();
    
    if (gameState.state === 'MENU') {
        drawMenuScreen();
    } else if (gameState.state === 'REGISTER') {
        drawRegistrationScreen();
    } else if (gameState.state === 'LEADERBOARD') {
        drawLeaderboardScreen();
    } else if (gameState.state === 'GAME_OVER') {
        drawParticles();
        drawPlayer();
        drawEnemies();
        drawUI();
        drawGameOverScreen();
    } else if (gameState.state === 'PLAY') {
        // Update
        updatePlayer(cappedDeltaTime);
        updateEnemies(cappedDeltaTime);
        updateParticles(cappedDeltaTime);
        updateScreenShake(cappedDeltaTime);
        updateBackground(cappedDeltaTime);
        
        // Spawning
        gameState.spawnTimer += cappedDeltaTime * 1000; // Convert to ms
        if (gameState.spawnTimer >= gameState.currentSpawnInterval) {
            spawnEnemy();
            gameState.spawnTimer = 0;
        }
        
        // Difficulty scaling
        const settings = DIFFICULTY_SETTINGS[gameState.selectedDifficulty];
        gameState.difficultyTimer += cappedDeltaTime * 1000;
        
        if (gameState.difficultyTimer >= settings.speedIncreaseInterval) {
            gameState.currentEnemySpeed += settings.speedIncrease * cappedDeltaTime;
            gameState.currentSpawnInterval = Math.max(
                1000, // Minimum 1 second spawn interval
                gameState.currentSpawnInterval - settings.spawnRateDecrease
            );
            gameState.difficultyTimer = 0;
        }
        
        // Update speeds for existing enemies
        gameState.enemies.forEach((enemy) => {
            enemy.speed = gameState.currentEnemySpeed;
        });
        
        // Score and timer
        gameState.score += cappedDeltaTime; // Score increases per frame
        gameState.timeSurvived += cappedDeltaTime;
        
        // Check collisions
        checkCollisions();
        
        // Draw
        drawPlayer();
        drawEnemies();
        drawParticles();
        drawUI();
        
        // Apply screen shake offset
        if (gameState.screenShake.active) {
            ctx.translate(gameState.screenShake.offsetX, gameState.screenShake.offsetY);
            ctx.translate(-gameState.screenShake.offsetX, -gameState.screenShake.offsetY);
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// Start the game
init();
requestAnimationFrame(gameLoop);
