class KittyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.mobileControls = document.getElementById('mobileControls');
        
        // Load images
        this.images = {};
        this.imagesLoaded = 0;
        this.totalImages = 2;
        
        this.loadImages();
        this.setupCanvas();
        this.setupEventListeners();
        this.setupGame();
        this.detectMobile();
        
        this.gameLoop = this.gameLoop.bind(this);
    }
    
    loadImages() {
        const imageList = [
            { name: 'kitty', src: 'kitty.png' },
            { name: 'fish', src: 'fish.png' }
        ];
        
        imageList.forEach(imageInfo => {
            const img = new Image();
            img.onload = () => {
                this.imagesLoaded++;
                if (this.imagesLoaded === this.totalImages) {
                    this.imagesReady = true;
                }
            };
            img.src = imageInfo.src;
            this.images[imageInfo.name] = img;
        });
    }
    
    detectMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            this.mobileControls.style.display = 'block';
        }
    }
    
    setupCanvas() {
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    setupEventListeners() {
        // Start button
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        // Jump controls
        document.addEventListener('keydown', (e) => {
            if ((e.code === 'Space' || e.code === 'ArrowUp') && this.gameState === 'playing') {
                e.preventDefault();
                this.jump();
            }
        });
        
        // Mobile jump
        document.getElementById('jumpBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameState === 'playing') {
                this.jump();
            }
        });
        
        // Canvas touch
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameState === 'playing') {
                this.jump();
            }
        });
    }
    
    setupGame() {
        this.gameState = 'menu'; // menu, playing, gameOver
        this.score = 0;
        this.lives = 3;
        this.gameSpeed = 3;
        this.groundY = 0;
        
        // Load high score
        this.highScore = parseInt(localStorage.getItem('kittyGameHighScore') || '0');
        
        // Player (kitty) - adjusted size and collision box
        this.player = {
            x: 100,
            y: 0,
            width: 50,
            height: 50,
            velocityY: 0,
            isJumping: false,
            jumpPower: 18,
            gravity: 0.8,
            color: '#ff6b6b',
            // Collision box is smaller than visual size for better gameplay
            collisionBox: {
                offsetX: 8,
                offsetY: 8,
                width: 34,
                height: 34
            }
        };
        
        // Game objects
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        this.clouds = [];
        
        // Spawning
        this.obstacleSpawnTimer = 0;
        this.collectibleSpawnTimer = 0;
        
        this.initializeClouds();
    }
    
    initializeClouds() {
        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width * 2,
                y: Math.random() * this.canvas.height * 0.4 + 50,
                width: Math.random() * 80 + 60,
                height: Math.random() * 40 + 30,
                speed: Math.random() * 0.5 + 0.3
            });
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.startScreen.style.display = 'none';
        this.groundY = this.canvas.height - 100;
        this.player.y = this.groundY - this.player.height;
        this.gameLoop();
    }
    
    restartGame() {
        this.setupGame();
        this.startGame();
        this.gameOverScreen.style.display = 'none';
        this.updateUI();
    }
    
    jump() {
        if (!this.player.isJumping) {
            this.player.velocityY = -this.player.jumpPower;
            this.player.isJumping = true;
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Update player physics
        this.player.velocityY += this.player.gravity;
        this.player.y += this.player.velocityY;
        
        // Ground collision
        if (this.player.y >= this.groundY - this.player.height) {
            this.player.y = this.groundY - this.player.height;
            this.player.velocityY = 0;
            this.player.isJumping = false;
        }
        
        // Spawn obstacles
        this.obstacleSpawnTimer++;
        if (this.obstacleSpawnTimer > 120 - this.gameSpeed * 5) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 0;
        }
        
        // Spawn collectibles
        this.collectibleSpawnTimer++;
        if (this.collectibleSpawnTimer > 90) {
            this.spawnCollectible();
            this.collectibleSpawnTimer = 0;
        }
        
        // Update obstacles
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.x -= this.gameSpeed;
            
            // Collision detection
            if (this.checkCollision(this.player, obstacle)) {
                this.takeDamage();
                return false;
            }
            
            return obstacle.x > -obstacle.width;
        });
        
        // Update collectibles
        this.collectibles = this.collectibles.filter(collectible => {
            collectible.x -= this.gameSpeed;
            
            // Collection detection
            if (this.checkCollision(this.player, collectible)) {
                this.collectItem();
                this.createParticles(collectible.x + collectible.width/2, collectible.y + collectible.height/2);
                return false;
            }
            
            return collectible.x > -collectible.width;
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            return particle.life > 0;
        });
        
        // Update clouds
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x < -cloud.width) {
                cloud.x = this.canvas.width;
                cloud.y = Math.random() * this.canvas.height * 0.4 + 50;
            }
        });
        
        // Increase difficulty
        this.gameSpeed += 0.001;
    }
    
    spawnObstacle() {
        this.obstacles.push({
            x: this.canvas.width,
            y: this.groundY - 20,
            width: 20,
            height: 20,
            color: '#8b4513',
            collisionBox: {
                offsetX: 2,
                offsetY: 2,
                width: 16,
                height: 16
            }
        });
    }
    
    spawnCollectible() {
        this.collectibles.push({
            x: this.canvas.width,
            y: this.groundY - Math.random() * 150 - 50,
            width: 35,
            height: 25,
            color: '#4ecdc4',
            collisionBox: {
                offsetX: 3,
                offsetY: 3,
                width: 29,
                height: 19
            }
        });
    }
    
    checkCollision(obj1, obj2) {
        // Use collision boxes for more precise detection
        const box1 = {
            x: obj1.x + (obj1.collisionBox?.offsetX || 0),
            y: obj1.y + (obj1.collisionBox?.offsetY || 0),
            width: obj1.collisionBox?.width || obj1.width,
            height: obj1.collisionBox?.height || obj1.height
        };
        
        const box2 = {
            x: obj2.x + (obj2.collisionBox?.offsetX || 0),
            y: obj2.y + (obj2.collisionBox?.offsetY || 0),
            width: obj2.collisionBox?.width || obj2.width,
            height: obj2.collisionBox?.height || obj2.height
        };
        
        return box1.x < box2.x + box2.width &&
               box1.x + box1.width > box2.x &&
               box1.y < box2.y + box2.height &&
               box1.y + box1.height > box2.y;
    }
    
    takeDamage() {
        this.lives--;
        this.updateUI();
        
        if (this.lives <= 0) {
            this.gameOver();
        }
    }
    
    collectItem() {
        this.score += 10;
        this.updateUI();
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('kittyGameHighScore', this.highScore.toString());
        }
    }
    
    createParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                color: '#4ecdc4'
            });
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = this.score;
        this.gameOverScreen.style.display = 'flex';
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
        
        const hearts = document.querySelectorAll('.heart');
        hearts.forEach((heart, index) => {
            if (index >= this.lives) {
                heart.classList.add('lost');
            } else {
                heart.classList.remove('lost');
            }
        });
    }
    
    render() {
        // Clear canvas with gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw clouds
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.clouds.forEach(cloud => {
            this.drawCloud(cloud.x, cloud.y, cloud.width, cloud.height);
        });
        
        // Draw ground
        this.ctx.fillStyle = '#8bc34a';
        this.ctx.fillRect(0, this.groundY, this.canvas.width, this.canvas.height - this.groundY);
        
        // Draw ground details
        this.ctx.fillStyle = '#689f38';
        for (let x = 0; x < this.canvas.width; x += 20) {
            this.ctx.fillRect(x, this.groundY, 10, 5);
        }
        
        if (this.gameState === 'playing') {
            // Draw player (kitty)
            this.drawKitty(this.player.x, this.player.y, this.player.width, this.player.height);
            
            // Draw obstacles
            this.obstacles.forEach(obstacle => {
                this.drawObstacle(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            });
            
            // Draw collectibles (fish)
            this.collectibles.forEach(collectible => {
                this.drawFish(collectible.x, collectible.y, collectible.width, collectible.height);
            });
            
            // Draw particles
            this.particles.forEach(particle => {
                this.ctx.fillStyle = particle.color;
                this.ctx.globalAlpha = particle.life / 30;
                this.ctx.fillRect(particle.x, particle.y, 4, 4);
                this.ctx.globalAlpha = 1;
            });
        }
    }
    
    drawKitty(x, y, width, height) {
        if (this.imagesReady && this.images.kitty) {
            this.ctx.drawImage(this.images.kitty, x, y, width, height);
        } else {
            // Fallback to original drawing if image not loaded
            // Body
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.fillRect(x + 10, y + 20, width - 20, height - 20);
            
            // Head
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.fillRect(x + 5, y + 5, width - 10, 25);
            
            // Ears
            this.ctx.fillStyle = '#ff5252';
            this.ctx.fillRect(x + 8, y, 12, 15);
            this.ctx.fillRect(x + width - 20, y, 12, 15);
            
            // Eyes
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(x + 15, y + 10, 6, 6);
            this.ctx.fillRect(x + width - 21, y + 10, 6, 6);
            
            // Eyes shine
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(x + 17, y + 11, 2, 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(x + width - 19, y + 11, 2, 2);
            
            // Tail
            this.ctx.fillStyle = '#ff5252';
            this.ctx.fillRect(x - 15, y + 15, 20, 8);
        }
    }
    
    drawObstacle(x, y, width, height) {
        // Tree stump
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(x, y, width, height);
        
        // Tree rings
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(x + 5, y + 5, width - 10, 3);
        this.ctx.fillRect(x + 8, y + 15, width - 16, 3);
        this.ctx.fillRect(x + 3, y + 25, width - 6, 3);
    }
    
    drawFish(x, y, width, height) {
        if (this.imagesReady && this.images.fish) {
            this.ctx.drawImage(this.images.fish, x, y, width, height);
        } else {
            // Fallback to original drawing if image not loaded
            // Fish body
            this.ctx.fillStyle = '#4ecdc4';
            this.ctx.fillRect(x + 5, y + 5, width - 10, height - 10);
            
            // Fish head
            this.ctx.fillStyle = '#26a69a';
            this.ctx.fillRect(x, y + 7, 8, height - 14);
            
            // Fish tail
            this.ctx.fillStyle = '#26a69a';
            this.ctx.fillRect(x + width - 8, y, 8, height);
            
            // Fish eye
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(x + 2, y + 8, 3, 3);
        }
    }
    
    drawCloud(x, y, width, height) {
        this.ctx.fillRect(x + 10, y, width - 20, height);
        this.ctx.fillRect(x, y + height/3, width, height/3);
        
        // Cloud bumps
        this.ctx.fillRect(x + width/4, y - height/4, width/4, height/2);
        this.ctx.fillRect(x + width/2, y - height/3, width/3, height/2);
        this.ctx.fillRect(x + 3*width/4, y - height/5, width/4, height/2);
    }
    
    gameLoop() {
        if (this.gameState === 'playing') {
            this.update();
            this.render();
            requestAnimationFrame(this.gameLoop);
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new KittyGame();
});