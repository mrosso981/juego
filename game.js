// Game configuration
const config = {
    canvas: null,
    ctx: null,
    width: 800,
    height: 600,
    gameSpeed: 5,
    baseSpeed: 5,
    speedIncrease: 0.001,
    currentSpeed: 5,
    score: 0,
    lives: 3,
    gameRunning: false,
    gameOver: false,
    lastFrameTime: 0,
    deltaTime: 0
};

// Game objects
const player = {
    x: 400,
    y: 450,
    width: 50,
    height: 60,
    lane: 1, // 0 = left, 1 = center, 2 = right
    lanes: [150, 400, 650],
    targetX: 400,
    speed: 15,
    color: '#FF6B6B',
    jumping: false,
    jumpHeight: 0,
    maxJumpHeight: 150
};

const gorilla = {
    x: 400,
    y: -100,
    width: 80,
    height: 100,
    speed: 3,
    color: '#8B4513',
    animationOffset: 0,
    roarFrame: 0
};

const obstacles = [];
const coins = [];
const particles = [];

// Background elements
const backgroundElements = [];
const clouds = [];

// Initialize game
function initGame() {
    config.canvas = document.getElementById('gameCanvas');
    config.ctx = config.canvas.getContext('2d');
    config.canvas.width = config.width;
    config.canvas.height = config.height;

    // Initialize background
    initBackground();
    initClouds();

    // Event listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);

    // Initial render
    drawStartScreen();
}

function initBackground() {
    backgroundElements.length = 0;
    for (let i = 0; i < 20; i++) {
        backgroundElements.push({
            x: Math.random() * config.width,
            y: Math.random() * config.height,
            size: Math.random() * 5 + 2,
            speed: Math.random() * 2 + 1,
            color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`
        });
    }
}

function initClouds() {
    clouds.length = 0;
    for (let i = 0; i < 5; i++) {
        clouds.push({
            x: Math.random() * config.width,
            y: Math.random() * 200,
            width: Math.random() * 100 + 80,
            height: Math.random() * 50 + 40,
            speed: Math.random() * 0.5 + 0.3,
            opacity: Math.random() * 0.3 + 0.2
        });
    }
}

function startGame() {
    config.gameRunning = true;
    config.gameOver = false;
    config.score = 0;
    config.lives = 3;
    config.currentSpeed = config.baseSpeed;
    config.lastFrameTime = performance.now();
    
    player.lane = 1;
    player.x = player.lanes[1];
    player.targetX = player.lanes[1];
    player.jumping = false;
    player.jumpHeight = 0;
    
    gorilla.y = -100;
    gorilla.x = player.x;
    
    obstacles.length = 0;
    coins.length = 0;
    particles.length = 0;
    
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    updateScore();
    updateLives();
    
    gameLoop();
}

function restartGame() {
    startGame();
}

function gameLoop(currentTime = performance.now()) {
    if (!config.gameRunning || config.gameOver) return;
    
    config.deltaTime = (currentTime - config.lastFrameTime) / 16.67; // Normalize to 60fps
    config.lastFrameTime = currentTime;
    
    update();
    draw();
    
    requestAnimationFrame(gameLoop);
}

function update() {
    if (config.gameOver) return;
    
    // Update game speed
    config.currentSpeed += config.speedIncrease;
    
    // Update player position (smooth lane switching)
    const diff = player.targetX - player.x;
    player.x += diff * 0.2;
    
    // Update player jump
    if (player.jumping) {
        player.jumpHeight += 8;
        if (player.jumpHeight >= player.maxJumpHeight) {
            player.jumping = false;
        }
    } else if (player.jumpHeight > 0) {
        player.jumpHeight -= 8;
        if (player.jumpHeight < 0) player.jumpHeight = 0;
    }
    
    // Update gorilla (chases player more aggressively)
    const distanceToPlayer = player.y - gorilla.y;
    let gorillaSpeed = config.currentSpeed * 0.75;
    
    // Gorilla speeds up when close to player
    if (distanceToPlayer < 150) {
        gorillaSpeed = config.currentSpeed * 0.95;
    }
    
    gorilla.y += gorillaSpeed;
    gorilla.x += (player.x - gorilla.x) * 0.03;
    gorilla.animationOffset += 0.12;
    gorilla.roarFrame += 0.18;
    
    // Check if gorilla caught player
    if (gorilla.y > player.y - 50 && gorilla.y < player.y + 100) {
        const distance = Math.abs(gorilla.x - player.x);
        if (distance < 60 && !player.jumping) {
            loseLife();
            gorilla.y = -200;
            createExplosion(player.x, player.y);
        }
    }
    
    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.y += config.currentSpeed;
        
        // Check collision
        if (!player.jumping && checkCollision(player, obstacle)) {
            loseLife();
            obstacles.splice(i, 1);
            createExplosion(obstacle.x, obstacle.y);
            continue;
        }
        
        // Remove off-screen obstacles
        if (obstacle.y > config.height + 50) {
            obstacles.splice(i, 1);
            config.score += 10;
            updateScore();
        }
    }
    
    // Update coins
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.y += config.currentSpeed;
        coin.rotation += 0.2;
        
        // Check collision
        if (checkCollision(player, coin)) {
            config.score += 50;
            updateScore();
            coins.splice(i, 1);
            createCoinParticles(coin.x, coin.y);
            continue;
        }
        
        // Remove off-screen coins
        if (coin.y > config.height + 50) {
            coins.splice(i, 1);
        }
    }
    
    // Spawn obstacles and coins
    if (Math.random() < 0.02) {
        spawnObstacle();
    }
    if (Math.random() < 0.015) {
        spawnCoin();
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.3; // gravity
        particle.life--;
        particle.alpha = particle.life / particle.maxLife;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // Update background elements
    backgroundElements.forEach(element => {
        element.y += element.speed * config.currentSpeed * 0.1;
        if (element.y > config.height) {
            element.y = -20;
            element.x = Math.random() * config.width;
        }
    });
    
    // Update clouds
    clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > config.width + cloud.width) {
            cloud.x = -cloud.width;
            cloud.y = Math.random() * 200;
        }
    });
    
    // Reset gorilla if too far behind
    if (gorilla.y > config.height + 100) {
        gorilla.y = -150;
        gorilla.x = player.x + (Math.random() - 0.5) * 200;
    }
}

function draw() {
    // Clear canvas
    config.ctx.clearRect(0, 0, config.width, config.height);
    
    // Draw gradient background
    const gradient = config.ctx.createLinearGradient(0, 0, 0, config.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#98D8C8');
    gradient.addColorStop(1, '#F7DC6F');
    config.ctx.fillStyle = gradient;
    config.ctx.fillRect(0, 0, config.width, config.height);
    
    // Draw clouds
    drawClouds();
    
    // Draw road/lanes
    drawRoad();
    
    // Draw background elements
    drawBackgroundElements();
    
    // Draw coins
    coins.forEach(coin => drawCoin(coin));
    
    // Draw obstacles
    obstacles.forEach(obstacle => drawObstacle(obstacle));
    
    // Draw gorilla
    drawGorilla();
    
    // Draw player
    drawPlayer();
    
    // Draw particles
    particles.forEach(particle => drawParticle(particle));
    
    // Draw UI overlay
    drawUI();
}

function drawRoad() {
    // Road
    config.ctx.fillStyle = '#555';
    config.ctx.fillRect(0, config.height * 0.6, config.width, config.height * 0.4);
    
    // Lane lines
    config.ctx.strokeStyle = '#fff';
    config.ctx.lineWidth = 4;
    config.ctx.setLineDash([20, 20]);
    
    for (let i = 0; i < 3; i++) {
        const x = player.lanes[i];
        config.ctx.beginPath();
        config.ctx.moveTo(x, 0);
        config.ctx.lineTo(x, config.height);
        config.ctx.stroke();
    }
    
    config.ctx.setLineDash([]);
}

function drawClouds() {
    clouds.forEach(cloud => {
        config.ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
        config.ctx.beginPath();
        config.ctx.arc(cloud.x, cloud.y, cloud.width / 2, 0, Math.PI * 2);
        config.ctx.arc(cloud.x + cloud.width * 0.3, cloud.y, cloud.height / 2, 0, Math.PI * 2);
        config.ctx.arc(cloud.x + cloud.width * 0.6, cloud.y, cloud.width / 2.5, 0, Math.PI * 2);
        config.ctx.fill();
    });
}

function drawBackgroundElements() {
    backgroundElements.forEach(element => {
        config.ctx.fillStyle = element.color;
        config.ctx.beginPath();
        config.ctx.arc(element.x, element.y, element.size, 0, Math.PI * 2);
        config.ctx.fill();
    });
}

function drawPlayer() {
    const y = player.y - player.jumpHeight;
    
    // Shadow
    config.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    config.ctx.beginPath();
    config.ctx.ellipse(player.x, player.y + 30, player.width * 0.6, 10, 0, 0, Math.PI * 2);
    config.ctx.fill();
    
    // Body
    config.ctx.fillStyle = player.color;
    config.ctx.fillRect(player.x - player.width / 2, y - player.height, player.width, player.height);
    
    // Head
    config.ctx.fillStyle = '#FFDBAC';
    config.ctx.beginPath();
    config.ctx.arc(player.x, y - player.height - 15, 15, 0, Math.PI * 2);
    config.ctx.fill();
    
    // Arms (animation)
    const armSwing = Math.sin(Date.now() * 0.01) * 10;
    config.ctx.fillStyle = player.color;
    config.ctx.fillRect(player.x - player.width / 2 - 8, y - player.height + 10, 8, 25 + armSwing);
    config.ctx.fillRect(player.x + player.width / 2, y - player.height + 10, 8, 25 - armSwing);
    
    // Legs
    config.ctx.fillStyle = '#4A4A4A';
    config.ctx.fillRect(player.x - player.width / 2 + 5, y - 15, 8, 20);
    config.ctx.fillRect(player.x + player.width / 2 - 13, y - 15, 8, 20);
}

function drawGorilla() {
    if (gorilla.y < -50) return;
    
    const y = gorilla.y;
    const bodyOffset = Math.sin(gorilla.animationOffset) * 3;
    
    // Shadow with pulsing effect
    const shadowSize = gorilla.width * 0.7 + Math.sin(gorilla.animationOffset * 3) * 5;
    config.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    config.ctx.beginPath();
    config.ctx.ellipse(gorilla.x, y + 50, shadowSize, 18, 0, 0, Math.PI * 2);
    config.ctx.fill();
    
    // Body with gradient
    const bodyGradient = config.ctx.createLinearGradient(
        gorilla.x - gorilla.width / 2, y - gorilla.height,
        gorilla.x + gorilla.width / 2, y
    );
    bodyGradient.addColorStop(0, '#6B4423');
    bodyGradient.addColorStop(1, '#8B4513');
    config.ctx.fillStyle = bodyGradient;
    config.ctx.fillRect(gorilla.x - gorilla.width / 2, y - gorilla.height + bodyOffset, gorilla.width, gorilla.height);
    
    // Chest (lighter fur)
    config.ctx.fillStyle = '#A0522D';
    config.ctx.beginPath();
    config.ctx.ellipse(gorilla.x, y - gorilla.height * 0.4 + bodyOffset, gorilla.width * 0.4, gorilla.height * 0.3, 0, 0, Math.PI * 2);
    config.ctx.fill();
    
    // Head
    config.ctx.fillStyle = '#654321';
    config.ctx.beginPath();
    config.ctx.arc(gorilla.x, y - gorilla.height - 20 + bodyOffset, 28, 0, Math.PI * 2);
    config.ctx.fill();
    
    // Snout
    config.ctx.fillStyle = '#8B7355';
    config.ctx.beginPath();
    config.ctx.ellipse(gorilla.x, y - gorilla.height - 15 + bodyOffset, 12, 8, 0, 0, Math.PI * 2);
    config.ctx.fill();
    
    // Eyes (glowing red)
    const eyeGlow = Math.sin(gorilla.roarFrame * 2) * 0.5 + 0.5;
    config.ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + eyeGlow * 0.7})`;
    config.ctx.beginPath();
    config.ctx.arc(gorilla.x - 10, y - gorilla.height - 25 + bodyOffset, 8, 0, Math.PI * 2);
    config.ctx.arc(gorilla.x + 10, y - gorilla.height - 25 + bodyOffset, 8, 0, Math.PI * 2);
    config.ctx.fill();
    
    config.ctx.fillStyle = '#FF0000';
    config.ctx.beginPath();
    config.ctx.arc(gorilla.x - 10, y - gorilla.height - 25 + bodyOffset, 5, 0, Math.PI * 2);
    config.ctx.arc(gorilla.x + 10, y - gorilla.height - 25 + bodyOffset, 5, 0, Math.PI * 2);
    config.ctx.fill();
    
    // Arms (swinging aggressively)
    const armSwing = Math.sin(gorilla.animationOffset * 2.5) * 20;
    config.ctx.fillStyle = gorilla.color;
    
    // Left arm
    config.ctx.save();
    config.ctx.translate(gorilla.x - gorilla.width / 2 - 6, y - gorilla.height + 25 + bodyOffset);
    config.ctx.rotate(armSwing * Math.PI / 180);
    config.ctx.fillRect(-6, 0, 15, 45);
    config.ctx.restore();
    
    // Right arm
    config.ctx.save();
    config.ctx.translate(gorilla.x + gorilla.width / 2 + 6, y - gorilla.height + 25 + bodyOffset);
    config.ctx.rotate(-armSwing * Math.PI / 180);
    config.ctx.fillRect(-9, 0, 15, 45);
    config.ctx.restore();
    
    // Legs
    config.ctx.fillStyle = '#5C3A1F';
    config.ctx.fillRect(gorilla.x - gorilla.width / 2 + 5, y - 10 + bodyOffset, 18, 25);
    config.ctx.fillRect(gorilla.x + gorilla.width / 2 - 23, y - 10 + bodyOffset, 18, 25);
    
    // Roar effect (pulsing circles)
    const roarIntensity = Math.sin(gorilla.roarFrame) * 0.5 + 0.5;
    if (roarIntensity > 0.3) {
        config.ctx.strokeStyle = `rgba(255, 0, 0, ${roarIntensity * 0.6})`;
        config.ctx.lineWidth = 4;
        for (let i = 1; i <= 3; i++) {
            const radius = 35 + i * 8 + Math.sin(gorilla.roarFrame * 3) * 5;
            config.ctx.beginPath();
            config.ctx.arc(gorilla.x, y - gorilla.height - 20 + bodyOffset, radius, 0, Math.PI * 2);
            config.ctx.stroke();
        }
    }
    
    // Threat indicator when close to player (pulsing border)
    const distanceToPlayer = Math.abs(gorilla.y - player.y);
    if (distanceToPlayer < 150) {
        const threatAlpha = (150 - distanceToPlayer) / 150;
        const pulse = Math.sin(gorilla.roarFrame * 4) * 0.3 + 0.7;
        config.ctx.strokeStyle = `rgba(255, 0, 0, ${threatAlpha * pulse * 0.8})`;
        config.ctx.lineWidth = 8;
        config.ctx.strokeRect(0, 0, config.width, config.height);
    }
}

function drawObstacle(obstacle) {
    const y = obstacle.y;
    
    // Shadow
    config.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    config.ctx.beginPath();
    config.ctx.ellipse(obstacle.x, y + obstacle.height / 2, obstacle.width * 0.6, 8, 0, 0, Math.PI * 2);
    config.ctx.fill();
    
    // Obstacle body
    config.ctx.fillStyle = obstacle.color;
    config.ctx.fillRect(obstacle.x - obstacle.width / 2, y - obstacle.height, obstacle.width, obstacle.height);
    
    // Obstacle top
    config.ctx.fillStyle = '#8B4513';
    config.ctx.beginPath();
    config.ctx.arc(obstacle.x, y - obstacle.height, obstacle.width / 2, 0, Math.PI * 2);
    config.ctx.fill();
}

function drawCoin(coin) {
    config.ctx.save();
    config.ctx.translate(coin.x, coin.y);
    config.ctx.rotate(coin.rotation);
    
    // Coin glow
    const gradient = config.ctx.createRadialGradient(0, 0, 0, 0, 0, coin.size);
    gradient.addColorStop(0, `rgba(255, 215, 0, ${coin.alpha})`);
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    config.ctx.fillStyle = gradient;
    config.ctx.beginPath();
    config.ctx.arc(0, 0, coin.size * 1.5, 0, Math.PI * 2);
    config.ctx.fill();
    
    // Coin
    config.ctx.fillStyle = '#FFD700';
    config.ctx.beginPath();
    config.ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
    config.ctx.fill();
    
    config.ctx.strokeStyle = '#FFA500';
    config.ctx.lineWidth = 2;
    config.ctx.stroke();
    
    config.ctx.restore();
}

function drawParticle(particle) {
    config.ctx.save();
    config.ctx.globalAlpha = particle.alpha;
    config.ctx.fillStyle = particle.color;
    config.ctx.beginPath();
    config.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    config.ctx.fill();
    config.ctx.restore();
}

function drawUI() {
    // Speed indicator
    config.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    config.ctx.font = '20px Arial';
    config.ctx.fillText(`Velocidad: ${Math.floor(config.currentSpeed * 10)}`, 10, 30);
}

function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    obstacles.push({
        x: player.lanes[lane],
        y: -50,
        width: 40,
        height: 50,
        color: '#A0522D'
    });
}

function spawnCoin() {
    const lane = Math.floor(Math.random() * 3);
    coins.push({
        x: player.lanes[lane],
        y: -50,
        size: 15,
        rotation: 0,
        alpha: 1
    });
}

function checkCollision(obj1, obj2) {
    const obj1Y = obj1.y - (obj1.jumpHeight || 0);
    return obj1.x - obj1.width / 2 < obj2.x + obj2.width / 2 &&
           obj1.x + obj1.width / 2 > obj2.x - obj2.width / 2 &&
           obj1Y - obj1.height < obj2.y + (obj2.height || obj2.size) &&
           obj1Y > obj2.y - (obj2.height || obj2.size);
}

function createExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 5 + 2,
            color: `hsl(${Math.random() * 60}, 100%, 50%)`,
            life: 30,
            maxLife: 30,
            alpha: 1
        });
    }
}

function createCoinParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: Math.random() * 3 + 2,
            color: '#FFD700',
            life: 20,
            maxLife: 20,
            alpha: 1
        });
    }
}

function loseLife() {
    config.lives--;
    updateLives();
    
    if (config.lives <= 0) {
        gameOver();
    } else {
        // Brief invincibility
        player.jumping = true;
        player.jumpHeight = 50;
        setTimeout(() => {
            player.jumping = false;
        }, 1000);
    }
}

function gameOver() {
    config.gameOver = true;
    config.gameRunning = false;
    document.getElementById('finalScore').textContent = config.score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function updateScore() {
    document.getElementById('score').textContent = config.score;
}

function updateLives() {
    document.getElementById('lives').textContent = config.lives;
}

function drawStartScreen() {
    draw();
}

// Gesture control functions
function moveLeft() {
    if (player.lane > 0) {
        player.lane--;
        player.targetX = player.lanes[player.lane];
    }
}

function moveRight() {
    if (player.lane < 2) {
        player.lane++;
        player.targetX = player.lanes[player.lane];
    }
}

function moveForward() {
    // Jump action
    if (!player.jumping && player.jumpHeight === 0) {
        player.jumping = true;
        player.jumpHeight = 0;
    }
}

// Export control functions
window.moveLeft = moveLeft;
window.moveRight = moveRight;
window.moveForward = moveForward;
window.gameConfig = config;

// Initialize when page loads
window.addEventListener('load', initGame);

