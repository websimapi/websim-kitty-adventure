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
        
        // Camera system
        this.camera = {
            y: 0,
            targetY: 0,
            smoothing: 0.1
        };
        
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
            onGround: false,
            onPlatform: false,
            // Special abilities from fish
            speedBoost: 0,
            doubleJump: false,
            invincibility: 0,
            // Collision box is smaller than visual size for better gameplay
            collisionBox: {
                offsetX: 8,
                offsetY: 8,
                width: 34,
                height: 34
            }
        };
        
        // Rainbow trail system
        this.trail = [];
        this.maxTrailLength = 15;
        this.trailColors = [
            '#ff0000', // red
            '#ff7f00', // orange
            '#ffff00', // yellow
            '#00ff00', // green
            '#0000ff', // blue
            '#4b0082', // indigo
            '#9400d3'  // violet
        ];
        
        // Game objects
        this.obstacles = [];
        this.collectibles = [];
        this.platforms = [];
        this.particles = [];
        this.clouds = [];
        this.monsters = [];
        
        // Spawning and altitude tracking
        this.obstacleSpawnTimer = 0;
        this.collectibleSpawnTimer = 0;
        this.platformSpawnTimer = 0;
        this.monsterSpawnTimer = 0;
        this.highestPlatform = this.groundY - 150;
        this.altitude = 0;
        
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
        } else if (this.player.doubleJump && this.player.velocityY > -5) {
            // Double jump ability from rainbow fish
            this.player.velocityY = -this.player.jumpPower * 0.8;
            this.player.doubleJump = false;
            this.createParticles(this.player.x + this.player.width/2, this.player.y + this.player.height, '#ff00ff');
        }
    }
    
    updateTrail() {
        // Add current position to trail
        this.trail.unshift({
            x: this.player.x + this.player.width / 2,
            y: this.player.y + this.player.height / 2
        });
        
        // Limit trail length
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }
    }
    
    checkPlatformCollision(player, platform) {
        const playerBox = {
            x: player.x + (player.collisionBox?.offsetX || 0),
            y: player.y + (player.collisionBox?.offsetY || 0),
            width: player.collisionBox?.width || player.width,
            height: player.collisionBox?.height || player.height
        };
        
        return playerBox.x < platform.x + platform.width &&
               playerBox.x + playerBox.width > platform.x &&
               playerBox.y < platform.y + platform.height &&
               playerBox.y + playerBox.height > platform.y;
    }
    
    checkCollision(obj1, obj2) {
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
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Update trail
        this.updateTrail();
        
        // Calculate altitude based on how high above ground the player is
        this.altitude = Math.max(0, this.groundY - this.player.y - this.player.height);
        
        // Update special abilities
        if (this.player.speedBoost > 0) {
            this.player.speedBoost--;
            this.gameSpeed = Math.min(8, this.gameSpeed * 1.5);
        }
        if (this.player.invincibility > 0) {
            this.player.invincibility--;
        }
        
        // Update player physics
        this.player.velocityY += this.player.gravity;
        this.player.y += this.player.velocityY;
        
        // Reset platform collision state
        this.player.onGround = false;
        this.player.onPlatform = false;
        
        // Ground collision - simplified and stable
        if (this.player.y >= this.groundY - this.player.height) {
            this.player.y = this.groundY - this.player.height;
            this.player.velocityY = 0;
            this.player.isJumping = false;
            this.player.onGround = true;
            this.player.doubleJump = false;
        }
        
        // Platform collision detection - fixed to be more stable
        this.platforms.forEach(platform => {
            const playerLeft = this.player.x + this.player.collisionBox.offsetX;
            const playerRight = playerLeft + this.player.collisionBox.width;
            const playerTop = this.player.y + this.player.collisionBox.offsetY;
            const playerBottom = playerTop + this.player.collisionBox.height;
            
            // Check if player is horizontally aligned with platform
            if (playerRight > platform.x && playerLeft < platform.x + platform.width) {
                // Check if player is falling down onto platform from above
                if (this.player.velocityY >= 0 && 
                    playerBottom >= platform.y && 
                    playerBottom <= platform.y + platform.height + 10 &&
                    playerTop < platform.y) {
                    
                    // Land on platform
                    this.player.y = platform.y - this.player.height;
                    this.player.velocityY = 0;
                    this.player.isJumping = false;
                    this.player.onPlatform = true;
                    this.player.onGround = false;
                    this.player.doubleJump = false;
                }
            }
        });
        
        // Update camera to follow player vertically
        this.camera.targetY = Math.max(0, (this.groundY - this.player.y - 300));
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
        
        // Ensure platforms are always available above player - more frequent generation
        this.ensurePlatformsAbove();
        
        // Spawn obstacles
        this.obstacleSpawnTimer++;
        if (this.obstacleSpawnTimer > 120 - this.gameSpeed * 5) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 0;
        }
        
        // Spawn platforms more frequently for better climbing
        this.platformSpawnTimer++;
        if (this.platformSpawnTimer > 60) {
            this.spawnPlatform();
            this.platformSpawnTimer = 0;
        }
        
        // Spawn monsters on platforms
        this.monsterSpawnTimer++;
        if (this.monsterSpawnTimer > 150) {
            this.spawnMonster();
            this.monsterSpawnTimer = 0;
        }
        
        // Spawn collectibles more frequently
        this.collectibleSpawnTimer++;
        if (this.collectibleSpawnTimer > 70) {
            this.spawnCollectible();
            this.collectibleSpawnTimer = 0;
        }
        
        // Update obstacles
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.x -= this.gameSpeed;
            
            if (this.player.invincibility <= 0 && this.checkCollision(this.player, obstacle)) {
                this.takeDamage();
                return false;
            }
            
            return obstacle.x > -obstacle.width;
        });
        
        // Update monsters
        this.monsters = this.monsters.filter(monster => {
            monster.x -= this.gameSpeed;
            
            if (monster.platform) {
                monster.localX += monster.direction * monster.speed;
                if (monster.localX <= 0 || monster.localX >= monster.platform.width - monster.width) {
                    monster.direction *= -1;
                }
                monster.x = monster.platform.x + monster.localX;
            }
            
            if (this.player.invincibility <= 0 && this.checkCollision(this.player, monster)) {
                this.takeDamage();
                this.createParticles(monster.x + monster.width/2, monster.y + monster.height/2, '#ff0000');
                return false;
            }
            
            return monster.x > -monster.width;
        });
        
        // Update platforms
        this.platforms = this.platforms.filter(platform => {
            platform.x -= this.gameSpeed;
            return platform.x > -platform.width;
        });
        
        // Update collectibles
        this.collectibles = this.collectibles.filter(collectible => {
            collectible.x -= this.gameSpeed;
            
            if (this.checkCollision(this.player, collectible)) {
                this.collectSpecialFish(collectible);
                this.createParticles(collectible.x + collectible.width/2, collectible.y + collectible.height/2, collectible.color);
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
    
    spawnPlatform() {
        // More aggressive platform spawning for better climbing
        const playerAltitude = this.altitude;
        const baseHeight = this.groundY - 150;
        
        // Spawn platforms at various heights relative to player
        let platformY;
        if (Math.random() < 0.4 && playerAltitude > 100) {
            // High altitude platforms
            platformY = this.player.y - Math.random() * 200 - 100;
        } else {
            // Regular height platforms
            const maxHeight = Math.max(50, baseHeight - (this.score * 2));
            platformY = Math.random() * (baseHeight - maxHeight) + maxHeight;
        }
        
        // Ensure platform is high enough to be useful
        if (platformY > this.groundY - 100) {
            platformY = this.groundY - 100 - Math.random() * 100;
        }
        
        this.platforms.push({
            x: this.canvas.width + Math.random() * 100,
            y: platformY,
            width: Math.random() * 120 + 80,
            height: 20,
            color: this.getPlatformColor(platformY)
        });
    }
    
    spawnMonster() {
        // Only spawn monsters on existing platforms that are on screen
        const availablePlatforms = this.platforms.filter(p => 
            p.x > this.canvas.width * 0.8 && p.x < this.canvas.width * 1.5
        );
        
        if (availablePlatforms.length === 0) return;
        
        const platform = availablePlatforms[Math.floor(Math.random() * availablePlatforms.length)];
        const altitude = this.groundY - platform.y;
        
        // Different monster types based on altitude
        let monsterType = 'basic';
        let color = '#8B0000';
        let speed = 1;
        
        if (altitude > 600) {
            monsterType = 'flying';
            color = '#4B0082';
            speed = 2;
        } else if (altitude > 300) {
            monsterType = 'jumper';
            color = '#FF4500';
            speed = 1.5;
        }
        
        this.monsters.push({
            x: platform.x,
            y: platform.y - 25,
            width: 25,
            height: 25,
            color: color,
            type: monsterType,
            platform: platform,
            localX: 0,
            direction: Math.random() < 0.5 ? 1 : -1,
            speed: speed,
            collisionBox: {
                offsetX: 3,
                offsetY: 3,
                width: 19,
                height: 19
            }
        });
    }
    
    ensurePlatformsAbove() {
        // More aggressive platform generation - check multiple levels above player
        const playerTopY = this.player.y - 200; // Look closer to player
        const highestExistingPlatform = Math.min(...this.platforms.map(p => p.y), this.highestPlatform);
        
        if (highestExistingPlatform > playerTopY) {
            // Spawn multiple platforms for better coverage
            for (let i = 0; i < 3; i++) {
                const newPlatformY = highestExistingPlatform - Math.random() * 120 - 80;
                this.platforms.push({
                    x: this.canvas.width + Math.random() * 300 + (i * 100),
                    y: newPlatformY,
                    width: Math.random() * 120 + 80,
                    height: 20,
                    color: this.getPlatformColor(newPlatformY)
                });
            }
            this.highestPlatform = Math.min(...this.platforms.map(p => p.y));
        }
    }
    
    getPlatformColor(y) {
        const altitude = this.groundY - y;
        if (altitude > 800) return '#9C27B0'; // Purple for very high
        if (altitude > 600) return '#3F51B5'; // Indigo for high
        if (altitude > 400) return '#2196F3'; // Blue for medium-high
        if (altitude > 200) return '#4CAF50'; // Green for medium
        return '#8BC34A'; // Light green for low
    }
    
    spawnCollectible() {
        let spawnY;
        const currentAltitude = this.altitude;
        
        // Spawn collectibles more strategically based on current altitude
        if (this.platforms.length > 0 && Math.random() < 0.5) {
            // Spawn near platforms, especially high ones
            const nearbyPlatforms = this.platforms.filter(p => 
                p.x > this.canvas.width * 0.5 && p.x < this.canvas.width * 1.2
            );
            if (nearbyPlatforms.length > 0) {
                const platform = nearbyPlatforms[Math.floor(Math.random() * nearbyPlatforms.length)];
                spawnY = platform.y - 40 - Math.random() * 30;
            } else {
                spawnY = this.player.y - Math.random() * 150 - 50;
            }
        } else {
            // Spawn in air at various altitudes
            const minY = Math.max(50, this.player.y - 300);
            const maxY = this.groundY - 50;
            spawnY = Math.random() * (maxY - minY) + minY;
        }
        
        // Determine fish type based on altitude from ground
        const altitude = this.groundY - spawnY;
        let fishType = this.getFishType(altitude);
        
        this.collectibles.push({
            x: this.canvas.width + Math.random() * 200,
            y: spawnY,
            width: 35,
            height: 25,
            color: fishType.color,
            type: fishType.type,
            points: fishType.points,
            ability: fishType.ability,
            collisionBox: {
                offsetX: 3,
                offsetY: 3,
                width: 29,
                height: 19
            }
        });
    }
    
    getFishType(altitude) {
        // Fixed fish type determination with clear altitude brackets
        if (altitude > 600) {
            return {
                type: 'diamond',
                color: '#E1F5FE',
                points: 100,
                ability: 'invincibility'
            };
        } else if (altitude > 400) {
            return {
                type: 'rainbow',
                color: '#FF6B6B',
                points: 50,
                ability: 'doubleJump'
            };
        } else if (altitude > 200) {
            return {
                type: 'golden',
                color: '#FFD700',
                points: 25,
                ability: 'speedBoost'
            };
        } else {
            return {
                type: 'regular',
                color: '#4ecdc4',
                points: 10,
                ability: 'none'
            };
        }
    }
    
    collectSpecialFish(fish) {
        this.score += fish.points;
        
        // Apply special abilities
        switch (fish.ability) {
            case 'speedBoost':
                this.player.speedBoost = 300; // 5 seconds at 60fps
                break;
            case 'doubleJump':
                this.player.doubleJump = true;
                break;
            case 'invincibility':
                this.player.invincibility = 600; // 10 seconds at 60fps
                break;
        }
        
        this.updateUI();
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('kittyGameHighScore', this.highScore.toString());
        }
    }
    
    createParticles(x, y, color = '#4ecdc4') {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                color: color
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
        document.getElementById('altitude').textContent = Math.floor(this.altitude) + 'm';
        
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
        
        // Save context for camera transform
        this.ctx.save();
        this.ctx.translate(0, this.camera.y);
        
        // Draw clouds (adjusted for camera)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.clouds.forEach(cloud => {
            this.drawCloud(cloud.x, cloud.y - this.camera.y * 0.5, cloud.width, cloud.height);
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
            // Draw rainbow trail
            this.drawTrail();
            
            // Draw platforms
            this.platforms.forEach(platform => {
                this.drawPlatform(platform.x, platform.y, platform.width, platform.height, platform.color);
            });
            
            // Draw monsters
            this.monsters.forEach(monster => {
                this.drawMonster(monster);
            });
            
            // Draw player (kitty) with invincibility effect
            if (this.player.invincibility > 0 && Math.floor(this.player.invincibility / 5) % 2 === 0) {
                this.ctx.globalAlpha = 0.5;
            }
            this.drawKitty(this.player.x, this.player.y, this.player.width, this.player.height);
            this.ctx.globalAlpha = 1;
            
            // Draw obstacles
            this.obstacles.forEach(obstacle => {
                this.drawObstacle(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            });
            
            // Draw collectibles (special fish)
            this.collectibles.forEach(collectible => {
                this.drawSpecialFish(collectible);
            });
            
            // Draw particles
            this.particles.forEach(particle => {
                this.ctx.fillStyle = particle.color;
                this.ctx.globalAlpha = particle.life / 30;
                this.ctx.fillRect(particle.x, particle.y, 4, 4);
                this.ctx.globalAlpha = 1;
            });
        }
        
        // Restore context
        this.ctx.restore();
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
    
    drawTrail() {
        this.trail.forEach((point, index) => {
            const opacity = (this.maxTrailLength - index) / this.maxTrailLength;
            const colorIndex = index % this.trailColors.length;
            const size = 8 - (index * 0.4);
            
            this.ctx.fillStyle = this.trailColors[colorIndex];
            this.ctx.globalAlpha = opacity * 0.7;
            this.ctx.fillRect(point.x - size/2, point.y - size/2, size, size);
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawPlatform(x, y, width, height, color = '#4CAF50') {
        // Platform base
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        
        // Platform edge highlight
        this.ctx.fillStyle = this.lightenColor(color, 0.3);
        this.ctx.fillRect(x, y, width, 4);
        
        // Platform shadow
        this.ctx.fillStyle = this.darkenColor(color, 0.3);
        this.ctx.fillRect(x, y + height - 4, width, 4);
        
        // Platform decorations
        this.ctx.fillStyle = this.lightenColor(color, 0.1);
        for (let i = 0; i < width; i += 15) {
            this.ctx.fillRect(x + i, y + 2, 3, height - 4);
        }
    }
    
    drawSpecialFish(fish) {
        if (this.imagesReady && this.images.fish) {
            this.ctx.save();
            
            // Special effects for different fish types
            if (fish.type === 'diamond') {
                // Diamond fish - bright white glow
                this.ctx.shadowColor = '#FFFFFF';
                this.ctx.shadowBlur = 15;
                this.ctx.globalAlpha = 0.9;
            } else if (fish.type === 'rainbow') {
                // Rainbow fish - colorful glow
                this.ctx.shadowColor = fish.color;
                this.ctx.shadowBlur = 10;
            } else if (fish.type === 'golden') {
                // Golden fish - yellow glow
                this.ctx.shadowColor = '#FFD700';
                this.ctx.shadowBlur = 8;
            }
            
            // Draw the fish image
            this.ctx.drawImage(this.images.fish, fish.x, fish.y, fish.width, fish.height);
            
            // Additional visual effects
            if (fish.type === 'rainbow') {
                this.ctx.strokeStyle = '#FF6B6B';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(fish.x - 2, fish.y - 2, fish.width + 4, fish.height + 4);
            } else if (fish.type === 'diamond') {
                // Sparkle effect
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.globalAlpha = 0.8;
                this.ctx.fillRect(fish.x + fish.width/4, fish.y + 2, 4, 4);
                this.ctx.fillRect(fish.x + 3*fish.width/4, fish.y + fish.height/2, 4, 4);
                this.ctx.fillRect(fish.x + fish.width/2, fish.y + 3*fish.height/4, 4, 4);
            } else if (fish.type === 'golden') {
                // Golden shimmer
                this.ctx.fillStyle = '#FFFF00';
                this.ctx.globalAlpha = 0.6;
                this.ctx.fillRect(fish.x + fish.width/3, fish.y + fish.height/3, fish.width/3, fish.height/3);
            }
            
            this.ctx.restore();
        } else {
            // Fallback drawing with better colors
            this.ctx.fillStyle = fish.color;
            this.ctx.fillRect(fish.x + 5, fish.y + 5, fish.width - 10, fish.height - 10);
            this.ctx.fillStyle = fish.type === 'diamond' ? '#FFFFFF' : '#000000';
            this.ctx.fillRect(fish.x + 2, fish.y + 8, 3, 3);
        }
    }
    
    drawMonster(monster) {
        // Monster body
        this.ctx.fillStyle = monster.color;
        this.ctx.fillRect(monster.x, monster.y, monster.width, monster.height);
        
        // Monster details based on type
        if (monster.type === 'flying') {
            // Wings
            this.ctx.fillStyle = '#301934';
            this.ctx.fillRect(monster.x - 5, monster.y + 5, 8, 15);
            this.ctx.fillRect(monster.x + monster.width - 3, monster.y + 5, 8, 15);
        } else if (monster.type === 'jumper') {
            // Spikes
            this.ctx.fillStyle = '#8B0000';
            for (let i = 0; i < monster.width; i += 5) {
                this.ctx.fillRect(monster.x + i, monster.y - 3, 3, 6);
            }
        }
        
        // Eyes
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(monster.x + 5, monster.y + 5, 4, 4);
        this.ctx.fillRect(monster.x + monster.width - 9, monster.y + 5, 4, 4);
    }
    
    lightenColor(color, amount) {
        const num = parseInt(color.replace("#", ""), 16);
        const r = Math.min(255, Math.floor((num >> 16) + 255 * amount));
        const g = Math.min(255, Math.floor((num >> 8 & 0x00FF) + 255 * amount));
        const b = Math.min(255, Math.floor((num & 0x0000FF) + 255 * amount));
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    darkenColor(color, amount) {
        const num = parseInt(color.replace("#", ""), 16);
        const r = Math.max(0, Math.floor((num >> 16) - 255 * amount));
        const g = Math.max(0, Math.floor((num >> 8 & 0x00FF) - 255 * amount));
        const b = Math.max(0, Math.floor((num & 0x0000FF) - 255 * amount));
        return `rgb(${r}, ${g}, ${b})`;
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