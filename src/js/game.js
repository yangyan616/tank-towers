import { Enemy } from './enemy.js';
import { Tower } from './tower.js';
import { Projectile } from './projectile.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.cash = 100;
        this.lives = 10;
        this.wave = 1;
        this.totalWaves = 20; // Total number of waves in the game
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.selectedTower = null;
        this.gameOver = false;
        this.waveInProgress = false;
        this.enemiesPerWave = 10;
        this.enemiesSpawned = 0;
        this.spawnInterval = null;
        this.selectedExistingTower = null;
        
        // Start screen state
        this.gameStarted = false;
        
        // Tower shop visibility
        this.towerShopVisible = true;
        
        // Victory state
        this.victoryAchieved = false;
        this.victoryEffects = [];
        this.confettiColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        
        // Game over state
        this.gameOverEffects = [];
        this.gameOverTime = 0;
        this.gameOverColors = ['#ff4444', '#ff7777', '#ffaaaa', '#ffdddd'];
        
        // Wave progress bar properties
        this.waveProgressBarWidth = 200;
        this.waveProgressBarHeight = 15;
        this.waveMarkers = [];
        this.waveAnnouncement = null;
        
        // Visual effects
        this.screenShake = { intensity: 0, duration: 0, time: 0 };
        this.impactEffects = [];
        
        // Background decorations
        this.gridSize = 40;
        this.backgroundParticles = [];
        this.initBackgroundParticles();
        
        // UI Elements
        this.cashUI = document.getElementById('cash');
        this.livesUI = document.getElementById('livesCount');
        this.waveUI = document.getElementById('waveCount');
        this.sellButton = document.getElementById('sellButton');
        this.upgradeButton = document.getElementById('upgradeButton');
        
        // Tower data
        this.towerTypes = {
            basic: {
                cost: 10,
                damage: 1,
                range: 100,
                fireRate: 1000, // ms between shots
                color: '#4287f5',
                unlocked: true
            },
            rapid: {
                cost: 25,
                damage: 0.5,
                range: 80,
                fireRate: 400, // ms between shots
                color: '#42f5a7',
                unlocked: true
            },
            heavy: {
                cost: 50,
                damage: 3,
                range: 120,
                fireRate: 1500, // ms between shots
                color: '#f54242',
                unlocked: true
            },
            ice: {
                cost: 75,
                damage: 0.8,
                range: 110,
                fireRate: 800, // ms between shots
                color: '#42c5ff',
                unlocked: false,
                special: 'slow',
                slowFactor: 0.5, // Slows enemies to 50% speed
                slowDuration: 3000, // 3 seconds of slowdown
                unlockWave: 5 // Unlocks after defeating the first boss (wave 5)
            },
            flamer: {
                cost: 100,
                damage: 1.2,
                range: 90,
                fireRate: 300, // ms between shots
                color: '#ff7700',
                unlocked: false,
                special: 'dot', // Damage over time
                burnDamage: 0.3, // Additional damage per tick
                burnDuration: 4000, // 4 seconds of burn
                unlockWave: 10 // Unlocks after defeating the second boss (wave 10)
            },
            bomber: {
                cost: 150,
                damage: 2,
                range: 150,
                fireRate: 2000, // ms between shots
                color: '#b042ff',
                unlocked: false, 
                special: 'splash',
                splashRadius: 60, // Area of effect radius
                splashDamage: 1, // Damage dealt to all enemies in splash radius
                unlockWave: 15 // Unlocks after defeating the third boss (wave 15)
            }
        };
        
        // Track special effect states
        this.activeEffects = {
            slowed: [], // Array of enemies currently slowed
            burning: [] // Array of enemies currently burning
        };
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Start the game loop
        this.lastTime = 0;
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    initBackgroundParticles() {
        // Create floating particles in the background
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            this.backgroundParticles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 3 + 1,
                speedX: Math.random() * 0.2 - 0.1,
                speedY: Math.random() * 0.2 - 0.1,
                opacity: Math.random() * 0.2 + 0.1
            });
        }
    }
    
    drawBackground() {
        // Draw grid lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let x = 0; x < this.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let y = 0; y < this.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
        
        // Draw bottom target area
        const gradient = this.ctx.createLinearGradient(0, this.height - 60, 0, this.height);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0.2)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, this.height - 60, this.width, 60);
        
        // Draw floating particles
        for (let particle of this.backgroundParticles) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Update particle position
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Wrap particles around the screen
            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
        }
    }
    
    initEventListeners() {
        // Start button
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        // Mouse move for cursor styling over buttons
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Update stored mouse position for other uses
            this.mouseX = x;
            this.mouseY = y;
            
            // Check if mouse is over restart button
            if (this.gameOver && this.restartButtonBounds) {
                const bounds = this.restartButtonBounds;
                if (
                    x >= bounds.x && 
                    x <= bounds.x + bounds.width && 
                    y >= bounds.y && 
                    y <= bounds.y + bounds.height
                ) {
                    this.canvas.style.cursor = 'pointer';
                    return;
                }
            }
            
            // Otherwise set cursor based on game state
            if (this.selectedTower) {
                this.canvas.style.cursor = 'crosshair';
            } else {
                this.canvas.style.cursor = 'default';
            }
        });
        
        // Tower placement and selling
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Handle game over restart button
            if (this.gameOver && this.restartButtonBounds) {
                const bounds = this.restartButtonBounds;
                if (
                    x >= bounds.x && 
                    x <= bounds.x + bounds.width && 
                    y >= bounds.y && 
                    y <= bounds.y + bounds.height
                ) {
                    // Visual click effect
                    this.buttonClickEffect = {
                        x: this.width / 2,
                        y: bounds.y + bounds.height / 2,
                        radius: 5,
                        maxRadius: 40,
                        alpha: 1,
                        duration: 300, // ms
                        startTime: performance.now()
                    };
                    
                    // Wait a moment to show the click effect before restarting
                    setTimeout(() => {
                        this.restartGame();
                    }, 150);
                    
                    return;
                }
            }
            
            if (!this.gameStarted || this.gameOver) return; // Ignore clicks if game not started or is over
            
            if (this.selectedTower) {
                // Check if we have enough cash
                if (this.cash >= this.towerTypes[this.selectedTower].cost) {
                    // Check if position is valid (not too close to other towers)
                    if (this.isValidTowerPosition(x, y)) {
                        this.placeTower(x, y, this.selectedTower);
                        this.cash -= this.towerTypes[this.selectedTower].cost;
                        this.updateUI();
                    }
                }
            } else {
                // If neither sell mode nor tower selected, check if clicking on existing tower
                this.selectTowerAtPosition(x, y);
            }
        });
        
        // Tower shop toggle button
        const toggleShopButton = document.getElementById('toggleShopButton');
        if (toggleShopButton) {
            toggleShopButton.addEventListener('click', () => {
                this.toggleTowerShop();
            });
        }
        
        // Tower selection buttons
        document.getElementById('basicTower').addEventListener('click', () => {
            this.selectedTower = 'basic';
            this.selectedExistingTower = null;
            if (this.sellButton) {
                this.sellButton.classList.remove('active');
            }
            this.updateUI();
        });
        
        document.getElementById('rapidTower').addEventListener('click', () => {
            this.selectedTower = 'rapid';
            this.selectedExistingTower = null;
            if (this.sellButton) {
                this.sellButton.classList.remove('active');
            }
            this.updateUI();
        });
        
        document.getElementById('heavyTower').addEventListener('click', () => {
            this.selectedTower = 'heavy';
            this.selectedExistingTower = null;
            if (this.sellButton) {
                this.sellButton.classList.remove('active');
            }
            this.updateUI();
        });
        
        // New tower buttons - only active when unlocked
        const iceTowerButton = document.getElementById('iceTower');
        if (iceTowerButton) {
            iceTowerButton.addEventListener('click', () => {
                if (this.towerTypes.ice.unlocked) {
                    this.selectedTower = 'ice';
                    this.selectedExistingTower = null;
                    if (this.sellButton) {
                        this.sellButton.classList.remove('active');
                    }
                    this.updateUI();
                } else {
                    // Show a message that the tower is locked
                    this.showFloatingText('Unlock by defeating Wave 5 Boss', this.width/2, this.height/2, "#ffcc66");
                }
            });
        }
        
        const flamerTowerButton = document.getElementById('flamerTower');
        if (flamerTowerButton) {
            flamerTowerButton.addEventListener('click', () => {
                if (this.towerTypes.flamer.unlocked) {
                    this.selectedTower = 'flamer';
                    this.selectedExistingTower = null;
                    if (this.sellButton) {
                        this.sellButton.classList.remove('active');
                    }
                    this.updateUI();
                } else {
                    // Show a message that the tower is locked
                    this.showFloatingText('Unlock by defeating Wave 10 Boss', this.width/2, this.height/2, "#ffcc66");
                }
            });
        }
        
        const bomberTowerButton = document.getElementById('bomberTower');
        if (bomberTowerButton) {
            bomberTowerButton.addEventListener('click', () => {
                if (this.towerTypes.bomber.unlocked) {
                    this.selectedTower = 'bomber';
                    this.selectedExistingTower = null;
                    if (this.sellButton) {
                        this.sellButton.classList.remove('active');
                    }
                    this.updateUI();
                } else {
                    // Show a message that the tower is locked
                    this.showFloatingText('Unlock by defeating Wave 15 Boss', this.width/2, this.height/2, "#ffcc66");
                }
            });
        }
        
        // Sell mode button
        if (this.sellButton) {
            this.sellButton.addEventListener('click', () => {
                // If a tower is selected, sell it immediately
                if (this.selectedExistingTower !== null) {
                    this.sellTowerAtPosition(0, 0); // The coordinates don't matter here as we're using selectedExistingTower
                } else {
                    // If no tower is selected, show a message or visual cue
                    console.log("Select a tower to sell first");
                    // Could add a visual indicator here if desired
                }
            });
        }
        
        // Upgrade button
        if (this.upgradeButton) {
            this.upgradeButton.addEventListener('click', () => {
                // If a tower is selected, attempt to upgrade it
                if (this.selectedExistingTower !== null) {
                    this.upgradeTower();
                } else {
                    // If no tower is selected, show a message
                    this.showFloatingText("Select a tower to upgrade first", this.width/2, this.height/2, "#ffcc66");
                }
            });
        }
        
        // Start wave when clicking on canvas if no wave in progress
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!this.gameStarted) return; // Ignore right-clicks if game not started
            
            if (!this.waveInProgress && !this.victoryAchieved) {
                this.startWave();
            }
        });
        
        // Clear selections on right-click or escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.selectedTower = null;
                this.selectedExistingTower = null;
                this.updateUI();
            }
            
            // Toggle tower shop with 'T' key
            if (e.key === 't' || e.key === 'T') {
                this.toggleTowerShop();
            }
        });
        
        this.canvas.addEventListener('contextmenu', (e) => {
            if (this.selectedTower || this.selectedExistingTower) {
                e.preventDefault();
                this.selectedTower = null;
                this.selectedExistingTower = null;
                this.updateUI();
            }
        });
        
        // Add keyboard shortcut for restart (R key)
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'r' || e.key === 'R') && this.gameOver) {
                this.restartGame();
            }
        });
    }
    
    selectTowerAtPosition(x, y) {
        for (let i = 0; i < this.towers.length; i++) {
            const tower = this.towers[i];
            const distance = Math.sqrt(Math.pow(tower.x - x, 2) + Math.pow(tower.y - y, 2));
            
            if (distance <= tower.size + 10) {
                this.selectedExistingTower = i;
                // Update upgrade button state based on upgrade availability
                this.updateUpgradeButtonState();
                return;
            }
        }
        this.selectedExistingTower = null;
        // Hide upgrade button when no tower is selected
        if (this.upgradeButton) {
            this.upgradeButton.classList.remove('active');
            this.upgradeButton.style.display = 'none';
        }
    }
    
    sellTowerAtPosition(x, y) {
        // First check if there's a selected existing tower - this is the primary way to sell now
        if (this.selectedExistingTower !== null) {
            const tower = this.towers[this.selectedExistingTower];
            
            // Find the tower type to determine original cost
            let towerType = '';
            if (tower.fireRate <= 400) {
                towerType = 'rapid';
            } else if (tower.damage >= 3) {
                towerType = 'heavy';
            } else {
                towerType = 'basic';
            }
            
            // Calculate base refund (75% of the original cost)
            let refundAmount = Math.floor(this.towerTypes[towerType].cost * 0.75);
            
            // Add upgrade refunds - give 50% of the upgrade costs back
            if (tower.upgradeLevel > 0) {
                // Calculate the sum of the upgrade costs
                let upgradeCosts = 0;
                
                // Base upgrade costs per type
                const baseCosts = {
                    "Basic Tank": 15,
                    "Semi Auto": 30,
                    "Super Shooter": 60,
                    "Ice Tank": 90,
                    "Flamer": 120,
                    "Bomber": 180
                };
                
                // Calculate total spent on upgrades based on tower's current level
                for (let i = 0; i < tower.upgradeLevel; i++) {
                    const levelMultiplier = [1, 2, 3]; // Cost multiplier for levels 1, 2, 3
                    upgradeCosts += baseCosts[tower.type] * levelMultiplier[i];
                }
                
                // Add 50% of upgrade costs to refund
                refundAmount += Math.floor(upgradeCosts * 0.5);
            }
            
            // Add refund to cash
            this.cash += refundAmount;
            
            // Show selling animation/effect
            this.showSellingEffect(tower.x, tower.y, refundAmount);
            
            // Remove the tower
            this.towers.splice(this.selectedExistingTower, 1);
            
            // Reset selection
            this.selectedExistingTower = null;
            
            // Update UI
            this.updateUI();
            return;
        }
        
        // Secondary way - direct click (kept for compatibility)
        // Find a tower at the clicked position
        for (let i = 0; i < this.towers.length; i++) {
            const tower = this.towers[i];
            const distance = Math.sqrt(Math.pow(tower.x - x, 2) + Math.pow(tower.y - y, 2));
            
            if (distance <= tower.size + 10) {
                // Find the tower type to determine original cost
                let towerType = '';
                if (tower.fireRate <= 400) {
                    towerType = 'rapid';
                } else if (tower.damage >= 3) {
                    towerType = 'heavy';
                } else {
                    towerType = 'basic';
                }
                
                // Calculate base refund (75% of the original cost)
                let refundAmount = Math.floor(this.towerTypes[towerType].cost * 0.75);
                
                // Add upgrade refunds - give 50% of the upgrade costs back
                if (tower.upgradeLevel > 0) {
                    // Calculate the sum of the upgrade costs
                    let upgradeCosts = 0;
                    
                    // Base upgrade costs per type
                    const baseCosts = {
                        "Basic Tank": 15,
                        "Semi Auto": 30,
                        "Super Shooter": 60,
                        "Ice Tank": 90,
                        "Flamer": 120,
                        "Bomber": 180
                    };
                    
                    // Calculate total spent on upgrades based on tower's current level
                    for (let i = 0; i < tower.upgradeLevel; i++) {
                        const levelMultiplier = [1, 2, 3]; // Cost multiplier for levels 1, 2, 3
                        upgradeCosts += baseCosts[tower.type] * levelMultiplier[i];
                    }
                    
                    // Add 50% of upgrade costs to refund
                    refundAmount += Math.floor(upgradeCosts * 0.5);
                }
                
                // Add refund to cash
                this.cash += refundAmount;
                
                // Remove the tower
                this.towers.splice(i, 1);
                
                // Update UI
                this.updateUI();
                
                // Show selling animation/effect
                this.showSellingEffect(tower.x, tower.y, refundAmount);
                
                // Reset selection
                this.selectedTower = null;
                this.selectedExistingTower = null;
                this.sellButton.classList.remove('active');
                
                return;
            }
        }
    }
    
    showSellingEffect(x, y, amount) {
        // Create a temporary text element to show the refund amount
        const textElement = {
            x: x,
            y: y,
            text: `+$${amount}`,
            color: '#66ff66',
            opacity: 1,
            life: 1000, // ms
            currentLife: 0
        };
        
        // Add to active effects
        this.activeTextEffects = this.activeTextEffects || [];
        this.activeTextEffects.push(textElement);
    }
    
    isValidTowerPosition(x, y) {
        // Check if tower is not too close to another tower
        for (const tower of this.towers) {
            const distance = Math.sqrt(Math.pow(tower.x - x, 2) + Math.pow(tower.y - y, 2));
            if (distance < 40) { // Minimum distance between towers
                return false;
            }
        }
        
        // Make sure tower is not placed at the very top (enemy spawn area)
        if (y < 50) {
            return false;
        }
        
        // Make sure tower is not placed at the very bottom (player base area)
        if (y > this.height - 50) {
            return false;
        }
        
        return true;
    }
    
    placeTower(x, y, type) {
        const towerData = this.towerTypes[type];
        const tower = new Tower(
            x, 
            y, 
            towerData.damage, 
            towerData.range, 
            towerData.fireRate,
            towerData.color
        );
        this.towers.push(tower);
    }
    
    startWave() {
        this.waveInProgress = true;
        this.enemiesSpawned = 0;
        
        // Wave-related announcements and visual cues
        if (this.wave % 5 === 0) {
            // Create a "Boss Wave" announcement effect
            this.showWaveAnnouncement(`BOSS WAVE ${this.wave}!`, '#ff5555');
        } else {
            // Create a standard wave announcement
            this.showWaveAnnouncement(`WAVE ${this.wave}`, '#ffcc00');
        }
        
        // Increase difficulty with each wave
        const enemySpeed = Math.min(1 + this.wave * 0.1, 3);
        let enemyHealth = this.wave;
        
        // Determine if this is a boss wave (every 5th wave)
        const isBossWave = this.wave % 5 === 0;
        if (isBossWave) {
            // Boss waves have fewer enemies but they are much stronger
            this.enemiesPerWave = 5;
            enemyHealth = this.wave * 2; // Boss enemies have double health
        } else {
            // Regular waves
            this.enemiesPerWave = 10 + Math.floor(this.wave / 2); // More enemies as waves progress
        }
        
        // Set spawn interval based on wave number (faster spawns in later waves)
        const spawnDelay = Math.max(300, 1000 - (this.wave * 30)); // Gradually decrease from 1000ms to 300ms
        
        this.spawnInterval = setInterval(() => {
            if (this.enemiesSpawned < this.enemiesPerWave) {
                // Spawn enemy at random x position at the top of the screen
                const x = Math.random() * (this.width - 40) + 20;
                
                // Create special enemies on boss waves
                if (isBossWave) {
                    // Create a boss enemy with special properties
                    const boss = new Enemy(x, -20, enemySpeed * 0.8, enemyHealth);
                    boss.size = 30; // Bigger size for boss enemies
                    this.enemies.push(boss);
                } else {
                    // Standard enemy
                    const enemy = new Enemy(x, -20, enemySpeed, enemyHealth);
                    this.enemies.push(enemy);
                }
                
                this.enemiesSpawned++;
            } else {
                clearInterval(this.spawnInterval);
            }
        }, spawnDelay);
    }
    
    // Method to show wave announcements
    showWaveAnnouncement(text, color) {
        // Create the announcement effect
        const announcement = {
            text: text,
            color: color,
            alpha: 0,
            scale: 2,
            life: 0,
            maxLife: 2000 // Exactly 2000 milliseconds (2 seconds)
        };
        
        // Store the announcement
        this.waveAnnouncement = announcement;
    }
    
    updateUI() {
        this.cashUI.textContent = this.cash;
        this.livesUI.textContent = this.lives;
        this.waveUI.textContent = this.wave;
        
        // Update cursor based on mode
        if (this.selectedTower) {
            this.canvas.style.cursor = "crosshair";
        } else {
            this.canvas.style.cursor = "default";
        }
        
        // Update upgrade button state
        this.updateUpgradeButtonState();
    }
    
    checkWaveComplete() {
        if (this.waveInProgress && this.enemies.length === 0 && this.enemiesSpawned >= this.enemiesPerWave) {
            this.waveInProgress = false;
            const completedWave = this.wave; // Store the completed wave number before incrementing
            this.wave++;
            this.updateUI();
            
            // Show wave completion message
            if (this.wave > this.totalWaves) {
                // Game win condition
                this.showWaveAnnouncement("YOU WIN! GAME COMPLETE!", "#00ff00");
                
                // Set victory state
                this.victoryAchieved = true;
                
                // Create confetti particles for celebration
                this.initVictoryEffects();
                
                // Play victory sound if we had one
                // this.playSound('victory');
                
                // Add screen shake for dramatic effect
                this.addScreenShake(5, 1000);
            } else {
                // Normal wave completion
                const wasBossWave = completedWave % 5 === 0;
                
                // Award cash for completing wave
                let cashReward = 20 + this.wave * 5;
                
                // Check if we need to unlock a tower based on the completed wave
                let unlockedTower = null;
                if (wasBossWave) {
                    // Special handling for boss waves - unlock towers!
                    switch(completedWave) {
                        case 5: // First boss (wave 5)
                            if (!this.towerTypes.ice.unlocked) {
                                this.towerTypes.ice.unlocked = true;
                                unlockedTower = 'Ice Tank';
                                
                                // Enable the button
                                const iceButton = document.getElementById('iceTower');
                                if (iceButton) {
                                    iceButton.classList.remove('locked-tower');
                                    iceButton.disabled = false;
                                    iceButton.querySelector('.unlock-text').textContent = 'Special: Slows enemies by 50%';
                                }
                            }
                            break;
                        case 10: // Second boss (wave 10)
                            if (!this.towerTypes.flamer.unlocked) {
                                this.towerTypes.flamer.unlocked = true;
                                unlockedTower = 'Flamer';
                                
                                // Enable the button
                                const flamerButton = document.getElementById('flamerTower');
                                if (flamerButton) {
                                    flamerButton.classList.remove('locked-tower');
                                    flamerButton.disabled = false;
                                    flamerButton.querySelector('.unlock-text').textContent = 'Special: Burn damage over time';
                                }
                            }
                            break;
                        case 15: // Third boss (wave 15)
                            if (!this.towerTypes.bomber.unlocked) {
                                this.towerTypes.bomber.unlocked = true;
                                unlockedTower = 'Bomber';
                                
                                // Enable the button
                                const bomberButton = document.getElementById('bomberTower');
                                if (bomberButton) {
                                    bomberButton.classList.remove('locked-tower');
                                    bomberButton.disabled = false;
                                    bomberButton.querySelector('.unlock-text').textContent = 'Special: Splash damage in area';
                                }
                            }
                            break;
                    }
                    
                    // Extra rewards for boss waves
                    cashReward *= 2; // Double cash for boss waves
                    
                    // Show appropriate announcement
                    if (unlockedTower) {
                        this.showWaveAnnouncement(`BOSS DEFEATED! ${unlockedTower} UNLOCKED!`, "#00ffff");
                        
                        // Add special effects for tower unlock
                        this.addScreenShake(10, 500);
                        
                        // Show unlock text effect
                        this.showFloatingText(`NEW TOWER: ${unlockedTower}!`, this.width/2, this.height/2 - 40, "#ffffff");
                    } else {
                        this.showWaveAnnouncement(`BOSS DEFEATED! +$${cashReward}`, "#00ffff");
                    }
                }
                
                // Apply cash reward
                this.cash += cashReward;
                
                // Update UI with new cash value
                this.updateUI();
                
                // Display cash effect
                this.showFloatingText(`+$${cashReward}`, this.width/2, this.height/2, "#ffff00");
            }
        }
    }
    
    // Method to show floating text
    showFloatingText(text, x, y, color) {
        // Create text elements that float upward
        if (!this.activeTextEffects) {
            this.activeTextEffects = [];
        }
        
        this.activeTextEffects.push({
            text: text,
            x: x,
            y: y,
            color: color,
            opacity: 1,
            life: 1500, // 1.5 seconds
            currentLife: 0,
            scale: 1.5
        });
    }
    
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Apply screen shake effect
        if (this.screenShake.time < this.screenShake.duration) {
            this.screenShake.time += deltaTime;
            
            // Calculate shake amount based on remaining time
            const shakeProgress = 1 - (this.screenShake.time / this.screenShake.duration);
            const shakeAmount = this.screenShake.intensity * shakeProgress;
            
            // Apply random offset to canvas
            const shakeX = (Math.random() * 2 - 1) * shakeAmount;
            const shakeY = (Math.random() * 2 - 1) * shakeAmount;
            
            this.ctx.save();
            this.ctx.translate(shakeX, shakeY);
        }
        
        // Draw background elements
        this.drawBackground();
        
        // If game hasn't started, we just draw a simplified background
        if (!this.gameStarted) {
            // Just draw the background and any animated background elements
            // Actual game content will be hidden behind the start screen
        }
        // Normal game loop when game is active and not over
        else if (!this.gameOver) {
            // Update and draw enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                enemy.update(deltaTime);
                enemy.draw(this.ctx);
                
                // Check if enemy reached the bottom
                if (enemy.y > this.height) {
                    this.enemies.splice(i, 1);
                    this.lives--;
                    this.updateUI();
                    
                    if (this.lives <= 0) {
                        this.gameOver = true;
                        this.initGameOverEffects(); // Initialize game over effects
                    }
                }
                
                // Check if enemy health is depleted
                if (enemy.health <= 0) {
                    this.enemies.splice(i, 1);
                    this.cash += 5;
                    this.updateUI();
                }
            }
            
            // Update and draw towers
            for (let i = 0; i < this.towers.length; i++) {
                const tower = this.towers[i];
                tower.update(deltaTime, this.enemies);
                
                // Set isSelected flag for tower
                tower.isSelected = (i === this.selectedExistingTower);
                
                // Set hover effect for towers when selecting
                if (this.selectedExistingTower === null) {
                    const mouseX = this.mouseX || 0;
                    const mouseY = this.mouseY || 0;
                    const distance = Math.sqrt(Math.pow(tower.x - mouseX, 2) + Math.pow(tower.y - mouseY, 2));
                    tower.isHovered = distance <= tower.size + 10;
                } else {
                    tower.isHovered = false;
                }
                
                tower.draw(this.ctx);
                
                // Store reference to game in window for mouse position access
                window.game = this;
                
                // Check if tower can fire
                if (tower.canFire()) {
                    const target = tower.findTarget(this.enemies);
                    if (target) {
                        const projectile = tower.fire(target);
                        if (projectile) {
                            this.projectiles.push(projectile);
                        }
                    }
                }
            }
            
            // Update and draw projectiles
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.projectiles[i];
                projectile.update(deltaTime);
                projectile.draw(this.ctx);
                
                // Check for hits
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    if (projectile.checkHit(enemy)) {
                        enemy.takeDamage(projectile.damage);
                        
                        // Track which tower fired this projectile for kill count
                        if (enemy.health <= 0) {
                            // Find the tower that fired this projectile by matching the color
                            const sourceTower = this.towers.find(tower => tower.color === projectile.color);
                            if (sourceTower) {
                                sourceTower.killCount++;
                            }
                        }
                        
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
                
                // Remove projectiles that are out of bounds
                if (
                    projectile.x < 0 || 
                    projectile.x > this.width || 
                    projectile.y < 0 || 
                    projectile.y > this.height
                ) {
                    this.projectiles.splice(i, 1);
                }
            }
            
            // Draw tower range if tower is selected for placement
            if (this.selectedTower) {
                const mouseX = this.mouseX || 0;
                const mouseY = this.mouseY || 0;
                const range = this.towerTypes[this.selectedTower].range;
                
                this.ctx.beginPath();
                this.ctx.arc(mouseX, mouseY, range, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this.ctx.fill();
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.stroke();
                
                // Draw tower preview
                this.drawTowerPreview(mouseX, mouseY);
            }
            
            // Draw range of selected existing tower
            if (this.selectedExistingTower !== null) {
                const tower = this.towers[this.selectedExistingTower];
                
                this.ctx.beginPath();
                this.ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this.ctx.fill();
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.stroke();
                
                // Draw sell info for selected tower
                this.drawSellInfo(tower);
            }
            
            // Draw any text effects
            if (this.activeTextEffects && this.activeTextEffects.length > 0) {
                for (let i = this.activeTextEffects.length - 1; i >= 0; i--) {
                    const effect = this.activeTextEffects[i];
                    effect.currentLife += deltaTime;
                    
                    if (effect.currentLife >= effect.life) {
                        this.activeTextEffects.splice(i, 1);
                        continue;
                    }
                    
                    // Calculate fade out
                    const opacity = 1 - (effect.currentLife / effect.life);
                    
                    // Draw text floating upward
                    this.ctx.font = 'bold 16px Arial';
                    this.ctx.fillStyle = `${effect.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(
                        effect.text, 
                        effect.x, 
                        effect.y - (effect.currentLife / effect.life) * 30
                    );
                }
            }
            
            // Check if wave is complete
            this.checkWaveComplete();
            
            // Display "Start Wave" message if no wave in progress
            if (!this.waveInProgress && !this.victoryAchieved) {
                this.ctx.font = '24px Arial';
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Right click to start next wave', this.width / 2, 90);
            }
            
            // Draw wave progress bar
            this.drawWaveProgressBar();
            
            // Draw wave announcement (always on top)
            this.drawWaveAnnouncement();
            
            // Draw impact effects
            for (let i = this.impactEffects.length - 1; i >= 0; i--) {
                const effect = this.impactEffects[i];
                
                // Update effect life
                effect.life -= deltaTime;
                if (effect.life <= 0) {
                    this.impactEffects.splice(i, 1);
                    continue;
                }
                
                // Update position
                effect.x += effect.directionX;
                effect.y += effect.directionY;
                
                // Calculate opacity based on remaining life
                const opacity = effect.life / effect.maxLife;
                
                // Draw effect
                if (effect.type === 'flash') {
                    // Draw flash effect (circle that fades out)
                    const flashSize = effect.size * (1 + (1 - opacity) * 2);
                    this.ctx.beginPath();
                    this.ctx.arc(effect.x, effect.y, flashSize, 0, Math.PI * 2);
                    this.ctx.fillStyle = `rgba(255, 255, 200, ${opacity * 0.4})`;
                    this.ctx.fill();
                } else {
                    // Draw particle effect
                    this.ctx.beginPath();
                    this.ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                    this.ctx.fillStyle = effect.color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
                    this.ctx.fill();
                }
            }
            
            // Draw wave progress bar
            this.drawWaveProgressBar();
            
            // Draw victory effects if player has won
            if (this.victoryAchieved) {
                this.drawVictoryEffects();
            }
        } else {
            // Draw game over effects screen
            this.drawGameOverEffects();
        }
        
        // Restore context if screen shake was applied
        if (this.screenShake.time < this.screenShake.duration) {
            this.ctx.restore();
        }
        
        // Draw wave announcement
        this.drawWaveAnnouncement();
        
        // Update victory effects (confetti animation)
        this.updateVictoryEffects(deltaTime);
        
        // Update game over effects
        this.updateGameOverEffects(deltaTime);
        
        // Continue game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    drawTowerPreview(x, y) {
        const towerData = this.towerTypes[this.selectedTower];
        
        // Check if position is valid
        if (this.isValidTowerPosition(x, y) && this.cash >= towerData.cost) {
            this.ctx.globalAlpha = 0.7;
        } else {
            this.ctx.globalAlpha = 0.3;
        }
        
        // Draw a simplified tower preview
        this.ctx.fillStyle = towerData.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw barrel
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(x, y - 3, 25, 6);
        
        this.ctx.globalAlpha = 1.0;
    }
    
    drawSellInfo(tower) {
        // Find the tower type to determine original cost
        let towerType = '';
        if (tower.fireRate <= 400) {
            towerType = 'rapid';
        } else if (tower.damage >= 3) {
            towerType = 'heavy';
        } else {
            towerType = 'basic';
        }
        
        // Calculate 75% of the original cost
        const sellValue = Math.floor(this.towerTypes[towerType].cost * 0.75);
        
        // Draw sell value info box above tower
        const boxWidth = 140;
        const boxHeight = 80;
        let boxX = tower.x - boxWidth / 2;
        let boxY = tower.y - tower.range - boxHeight - 10;
        
        // Keep box on screen
        if (boxY < 10) boxY = tower.y + tower.range + 10;
        if (boxX < 10) boxX = 10;
        if (boxX + boxWidth > this.width - 10) boxX = this.width - boxWidth - 10;
        
        // Draw box with semi-transparent background
        this.ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
        this.roundRect(this.ctx, boxX, boxY, boxWidth, boxHeight, 5, true);
        
        // Draw border
        this.ctx.strokeStyle = tower.upgradeLevel >= tower.maxUpgradeLevel ? '#ffcc44' : '#66aaff';
        this.ctx.lineWidth = 2;
        this.roundRect(this.ctx, boxX, boxY, boxWidth, boxHeight, 5, false, true);
        
        // Show tower level with stars
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${tower.type} - Level ${tower.upgradeLevel > 0 ? tower.upgradeLevel : 1}`, boxX + boxWidth / 2, boxY + 20);
        
        // Draw stars if upgraded
        if (tower.upgradeLevel > 0) {
            const starsX = boxX + boxWidth / 2 - ((tower.upgradeLevel * 15) / 2) + 7.5;
            const starsY = boxY + 35;
            
            for (let i = 0; i < tower.upgradeLevel; i++) {
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.font = '14px Arial';
                this.ctx.fillText('★', starsX + (i * 15), starsY);
            }
        }
        
        // Draw sell text
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#ff6666';
        this.ctx.fillText('Sell Tower', boxX + boxWidth / 2, boxY + 55);
        
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#66ff66';
        this.ctx.fillText(`+$${sellValue}`, boxX + boxWidth / 2, boxY + 75);
    }
    
    // Helper method for drawing rounded rectangles
    roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) {
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
    }
    
    // Add screen shake effect
    addScreenShake(intensity, duration) {
        this.screenShake = {
            intensity: intensity,
            duration: duration,
            time: 0
        };
    }
    
    // Add an impact effect at the given position
    addImpactEffect(x, y, size) {
        // Create particles flying outward
        const particleCount = 8 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i + Math.random() * 0.5;
            const speed = 1 + Math.random() * 2;
            const life = 300 + Math.random() * 200;
            
            this.impactEffects.push({
                x: x,
                y: y,
                directionX: Math.cos(angle) * speed,
                directionY: Math.sin(angle) * speed,
                size: 3 + Math.random() * 2,
                color: `hsl(${Math.floor(Math.random() * 30)}, 100%, 50%)`,
                life: life,
                maxLife: life
            });
        }
        
        // Create a flash effect
        this.impactEffects.push({
            x: x,
            y: y,
            directionX: 0,
            directionY: 0,
            size: size,
            color: '#ffffff',
            life: 150,
            maxLife: 150,
            type: 'flash'
        });
    }
    
    // Draw wave progress bar
    drawWaveProgressBar() {
        // Position the bar under the money display at the top of the screen
        const barX = 10; // Align with left edge
        const barY = 50; // Position under the money/UI bar
        
        // Draw a refined "WAVES" label with shadow
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'bottom';
        
        // Add text shadow for better readability
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        this.ctx.shadowBlur = 3;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillText('WAVES', barX, barY - 3);
        this.ctx.shadowBlur = 0;
        
        // Create gradient background for the bar
        const gradient = this.ctx.createLinearGradient(barX, barY, barX + this.waveProgressBarWidth, barY);
        gradient.addColorStop(0, '#1e4a8a'); // Brighter blue
        gradient.addColorStop(0.5, '#2a5aad'); // Mid blue
        gradient.addColorStop(1, '#3a6aff'); // Vivid blue end
        
        // Draw bar background with shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetY = 2;
        this.ctx.fillStyle = 'rgba(30, 30, 40, 0.7)';
        this.roundRect(this.ctx, barX - 2, barY - 2, this.waveProgressBarWidth + 4, this.waveProgressBarHeight + 4, 6, true);
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw progress bar with inner glow effect
        this.ctx.fillStyle = gradient;
        this.roundRect(this.ctx, barX, barY, this.waveProgressBarWidth, this.waveProgressBarHeight, 5, true);
        
        // Add a subtle highlight at the top of the bar
        const highlightGradient = this.ctx.createLinearGradient(barX, barY, barX, barY + 5);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        this.ctx.fillStyle = highlightGradient;
        this.ctx.fillRect(barX + 1, barY + 1, this.waveProgressBarWidth - 2, 3);
        
        // Draw wave markers with improved style
        for (let i = 1; i <= this.totalWaves; i++) {
            const markerX = barX + (i / this.totalWaves) * this.waveProgressBarWidth;
            
            // Special styling for milestone waves (every 5th wave)
            if (i % 5 === 0) {
                // Prominent milestone markers
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(markerX, barY + this.waveProgressBarHeight / 2, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add tick marks below milestone waves
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.fillRect(markerX - 1, barY + this.waveProgressBarHeight + 1, 2, 2);
            } else {
                // Subtle markers for regular waves
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                this.ctx.fillRect(markerX, barY + 2, 1, this.waveProgressBarHeight - 4);
            }
        }
        
        // Draw current progress marker with enhanced style
        const currentPos = barX + (this.wave / this.totalWaves) * this.waveProgressBarWidth;
        
        // Animate current wave marker (subtle pulse)
        const pulseScale = 1 + Math.sin(performance.now() * 0.005) * 0.1;
        
        // Draw outer glow for current position
        this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        this.ctx.shadowBlur = 8;
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(currentPos, barY + this.waveProgressBarHeight / 2, 7 * pulseScale, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw inner glow
        this.ctx.shadowBlur = 4;
        this.ctx.fillStyle = 'rgba(255, 225, 50, 0.7)';
        this.ctx.beginPath();
        this.ctx.arc(currentPos, barY + this.waveProgressBarHeight / 2, 5 * pulseScale, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw core marker
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(currentPos, barY + this.waveProgressBarHeight / 2, 3 * pulseScale, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add filled portion of the progress bar up to current wave
        this.ctx.fillStyle = 'rgba(80, 200, 255, 0.5)';
        this.roundRect(this.ctx, barX, barY, 
            (this.wave / this.totalWaves) * this.waveProgressBarWidth, 
            this.waveProgressBarHeight, 5, true, false);
            
        // Draw wave number in a stylish format
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Add shadow for better readability
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        this.ctx.shadowBlur = 2;
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`${this.wave}/${this.totalWaves}`, 
            barX + this.waveProgressBarWidth / 2, 
            barY + this.waveProgressBarHeight / 2);
        this.ctx.shadowBlur = 0;
            
        // Draw boss wave indicators
        const bossWaves = [5, 10, 15, 20]; // Waves that have boss enemies
        for (const bossWave of bossWaves) {
            if (bossWave > this.wave) { // Only show future boss waves
                const bossX = barX + (bossWave / this.totalWaves) * this.waveProgressBarWidth;
                
                // Draw boss indicator as a small red diamond
                this.ctx.fillStyle = '#ff5555';
                this.ctx.beginPath();
                this.ctx.arc(bossX, barY + this.waveProgressBarHeight/2, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    // Draw wave announcement
    drawWaveAnnouncement() {
        if (!this.waveAnnouncement) return;
        
        // Update life with deltaTime for precise timing
        const deltaTime = this.lastTime ? (performance.now() - this.lastTime) : 16.67;
        this.waveAnnouncement.life += deltaTime;
        
        // Animation phases
        if (this.waveAnnouncement.life < 400) {
            // Fade in and grow
            this.waveAnnouncement.alpha = Math.min(1, this.waveAnnouncement.life / 300);
            this.waveAnnouncement.scale = 2 - (this.waveAnnouncement.life / 300);
        } else if (this.waveAnnouncement.life > this.waveAnnouncement.maxLife - 400) {
            // Fade out and shrink
            const remainingLife = this.waveAnnouncement.maxLife - this.waveAnnouncement.life;
            this.waveAnnouncement.alpha = Math.max(0, remainingLife / 400);
            this.waveAnnouncement.scale = 1 - ((400 - remainingLife) / 400) * 0.5;
        } else {
            // Stable display
            this.waveAnnouncement.alpha = 1;
            this.waveAnnouncement.scale = 1;
        }
        
        // Remove when done
        if (this.waveAnnouncement.life >= this.waveAnnouncement.maxLife) {
            this.waveAnnouncement = null;
            return;
        }
        
        // Draw announcement
        const scale = this.waveAnnouncement.scale;
        this.ctx.save();
        this.ctx.translate(this.width / 2, this.height / 3);
        this.ctx.scale(scale, scale);
        
        // Draw text with glow
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Enhanced wave announcement with multiple effects
        // Draw outer glow (large)
        this.ctx.font = 'bold 48px Arial';
        this.ctx.shadowColor = this.waveAnnouncement.color;
        this.ctx.shadowBlur = 25;
        this.ctx.fillStyle = `rgba(255, 255, 255, ${this.waveAnnouncement.alpha * 0.5})`;
        this.ctx.fillText(this.waveAnnouncement.text, 0, 0);
        
        // Draw middle glow
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = `rgba(255, 255, 255, ${this.waveAnnouncement.alpha * 0.7})`;
        this.ctx.fillText(this.waveAnnouncement.text, 0, 0);
        
        // Draw main text with colored border
        this.ctx.shadowBlur = 0;
        
        // Draw text outline/stroke
        this.ctx.strokeStyle = this.waveAnnouncement.color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(this.waveAnnouncement.text, 0, 0);
        
        // Draw main text
        this.ctx.fillStyle = `rgba(255, 255, 255, ${this.waveAnnouncement.alpha})`;
        this.ctx.fillText(this.waveAnnouncement.text, 0, 0);
        
        // Draw decorative elements for boss waves
        if (this.waveAnnouncement.text.includes('BOSS')) {
            // Draw skull or warning indicators for boss waves
            const textWidth = this.ctx.measureText(this.waveAnnouncement.text).width;
            
            // Draw warning symbols on each side
            this.ctx.font = '40px Arial';
            this.ctx.fillText('⚠️', -textWidth/2 - 50, 0);
            this.ctx.fillText('⚠️', textWidth/2 + 50, 0);
        }
        
        this.ctx.restore();
    }
    
    // Initialize victory effects (confetti, etc.)
    initVictoryEffects() {
        // Clear any existing effects
        this.victoryEffects = [];
        
        // Create confetti particles
        const confettiCount = 200;
        
        for (let i = 0; i < confettiCount; i++) {
            const color = this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)];
            const x = Math.random() * this.width;
            const y = -20 - Math.random() * 100; // Start above the canvas
            const size = 5 + Math.random() * 10;
            const shape = Math.random() > 0.5 ? 'circle' : 'rect';
            const speedX = (Math.random() - 0.5) * 4;
            const speedY = 1 + Math.random() * 3;
            const rotationSpeed = (Math.random() - 0.5) * 0.2;
            const rotation = Math.random() * Math.PI * 2;
            const lifetime = 4000 + Math.random() * 4000; // 4-8 seconds
            
            this.victoryEffects.push({
                x,
                y,
                size,
                color,
                shape,
                speedX,
                speedY,
                rotation,
                rotationSpeed,
                lifetime,
                maxLifetime: lifetime,
                delay: Math.random() * 3000 // Stagger the confetti over 3 seconds
            });
        }
        
        // Add some trophy/star particles too
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * this.width;
            const y = -20 - Math.random() * 100; // Start above the canvas
            const size = 15 + Math.random() * 15;
            const speedX = (Math.random() - 0.5) * 2;
            const speedY = 0.5 + Math.random() * 1;
            const rotationSpeed = (Math.random() - 0.5) * 0.1;
            const rotation = Math.random() * Math.PI * 2;
            const lifetime = 4000 + Math.random() * 4000; // 4-8 seconds
            
            this.victoryEffects.push({
                x,
                y,
                size,
                color: '#ffdd00', // Gold color
                shape: 'star',
                speedX,
                speedY,
                rotation,
                rotationSpeed,
                lifetime,
                maxLifetime: lifetime,
                delay: 1000 + Math.random() * 3000 // Delayed after initial confetti
            });
        }
    }
    
    // Update victory effects (confetti animation)
    updateVictoryEffects(deltaTime) {
        // Update each particle
        for (let i = this.victoryEffects.length - 1; i >= 0; i--) {
            const particle = this.victoryEffects[i];
            
            // Handle delayed particle spawn
            if (particle.delay > 0) {
                particle.delay -= deltaTime;
                continue;
            }
            
            // Update lifetime
            particle.lifetime -= deltaTime;
            
            // Remove expired particles
            if (particle.lifetime <= 0 || particle.y > this.height + 50) {
                this.victoryEffects.splice(i, 1);
                continue;
            }
            
            // Add gravity and physics
            particle.speedY += 0.05; // Gravity
            
            // Add some horizontal drift like real confetti
            particle.speedX += (Math.random() - 0.5) * 0.1;
            
            // Update position
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Rotation update
            particle.rotation += particle.rotationSpeed;
            
            // Bounce off the sides
            if (particle.x < 0 || particle.x > this.width) {
                particle.speedX *= -0.8;
            }
            
            // Air resistance
            particle.speedX *= 0.99;
            particle.speedY *= 0.99;
        }
        
        // Continuously create new confetti if celebrating
        if (this.victoryAchieved && this.victoryEffects.length < 100 && Math.random() > 0.95) {
            const color = this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)];
            const x = Math.random() * this.width;
            const y = -20;
            const size = 5 + Math.random() * 10;
            const shape = Math.random() > 0.7 ? 'circle' : 'rect';
            
            this.victoryEffects.push({
                x,
                y,
                size,
                color,
                shape,
                speedX: (Math.random() - 0.5) * 4,
                speedY: 1 + Math.random() * 2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                lifetime: 4000 + Math.random() * 2000,
                maxLifetime: 4000 + Math.random() * 2000,
                delay: 0
            });
        }
    }
    
    // Draw victory effects (confetti, text, etc.)
    drawVictoryEffects() {
        // Don't draw anything if victory hasn't been achieved
        if (!this.victoryAchieved) return;
        
        // Draw all confetti particles
        for (const particle of this.victoryEffects) {
            // Skip particles that are still delayed
            if (particle.delay > 0) continue;
            
            // Calculate opacity based on lifetime
            const opacity = Math.min(1, particle.lifetime / 1000);
            
            // Save context for rotation
            this.ctx.save();
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation);
            
            // Set fill style with opacity
            this.ctx.fillStyle = particle.color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
            
            // Draw based on shape
            if (particle.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (particle.shape === 'rect') {
                this.ctx.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
            } else if (particle.shape === 'star') {
                this.drawStar(0, 0, 5, particle.size / 2, particle.size / 4);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        }
        
        // Draw victory text and UI
        this.drawVictoryScreen();
    }
    
    // Draw star shape for trophy particles
    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        
        this.ctx.beginPath();
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        
        this.ctx.lineTo(cx + Math.cos(Math.PI / 2 * 3) * outerRadius, cy + Math.sin(Math.PI / 2 * 3) * outerRadius);
        this.ctx.closePath();
    }
    
    // Draw victory screen UI
    drawVictoryScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Victory title text
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Glow effect
        this.ctx.shadowColor = '#ffcc00';
        this.ctx.shadowBlur = 20;
        
        // Text outline
        this.ctx.strokeStyle = '#ffcc00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeText('VICTORY!', this.width / 2, this.height / 3);
        
        // Main text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('VICTORY!', this.width / 2, this.height / 3);
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
        
        // Stats display
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`You defeated all ${this.totalWaves} waves!`, this.width / 2, this.height / 2);
        
        // Calculate total towers and kills
        const totalTowers = this.towers.length;
        let totalKills = 0;
        
        this.towers.forEach(tower => {
            totalKills += tower.killCount || 0;
        });
        
        // Show stats
        this.ctx.fillText(`Towers Built: ${totalTowers}`, this.width / 2, this.height / 2 + 40);
        this.ctx.fillText(`Enemies defeated: ${totalKills}`, this.width / 2, this.height / 2 + 80);
        this.ctx.fillText(`Final cash: $${this.cash}`, this.width / 2, this.height / 2 + 120);
        
        // Play again prompt
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Refresh the page to play again', this.width / 2, this.height - 100);
        
        // Pulsing effect for the prompt
        const pulseAmount = (Math.sin(performance.now() * 0.003) * 0.2 + 0.8);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${pulseAmount})`;
        this.ctx.font = 'bold 22px Arial';
        this.ctx.fillText('YOU ARE VICTORIOUS!', this.width / 2, this.height - 150);
    }
    
    // Toggle tower shop visibility
    toggleTowerShop() {
        this.towerShopVisible = !this.towerShopVisible;
        
        // Get the tower buttons container
        const towerButtons = document.getElementById('towerButtons');
        
        if (this.towerShopVisible) {
            // Show the tower shop
            towerButtons.style.display = 'flex';
            
            // Add a small animation
            towerButtons.style.opacity = '0';
            towerButtons.style.transform = 'translateX(20px)';
            
            // Animate it sliding in
            setTimeout(() => {
                towerButtons.style.transition = 'all 0.3s ease-out';
                towerButtons.style.opacity = '1';
                towerButtons.style.transform = 'translateX(0)';
            }, 10);
        } else {
            // Hide the tower shop with animation
            towerButtons.style.transition = 'all 0.3s ease-in';
            towerButtons.style.opacity = '0';
            towerButtons.style.transform = 'translateX(20px)';
            
            // Actually hide it after animation completes
            setTimeout(() => {
                towerButtons.style.display = 'none';
            }, 300);
        }
        
        // Add a floating text notification
        const message = this.towerShopVisible ? "Tower Shop Opened" : "Tower Shop Closed";
        const color = this.towerShopVisible ? "#66ccff" : "#ffcc66";
        this.showFloatingText(message, this.width - 100, 50, color);
    }
    
    // Initialize game over effects
    initGameOverEffects() {
        // Clear any existing effects
        this.gameOverEffects = [];
        this.gameOverTime = 0;
        
        // Create explosion particles
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Generate explosion particles
        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 5;
            const distance = Math.random() * 200;
            const size = 3 + Math.random() * 15;
            const color = this.gameOverColors[Math.floor(Math.random() * this.gameOverColors.length)];
            
            this.gameOverEffects.push({
                x: centerX,
                y: centerY,
                targetX: centerX + Math.cos(angle) * distance,
                targetY: centerY + Math.sin(angle) * distance,
                currentStep: 0,
                totalSteps: 50 + Math.random() * 30,
                size: size,
                color: color,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                opacity: 1,
                type: Math.random() > 0.7 ? 'triangle' : (Math.random() > 0.5 ? 'rect' : 'circle')
            });
        }
        
        // Create "Game Over" letters that fall into place
        const text = "GAME OVER";
        const letterSpacing = 45;
        const startX = centerX - (text.length * letterSpacing) / 2 + letterSpacing / 2;
        
        for (let i = 0; i < text.length; i++) {
            this.gameOverEffects.push({
                x: startX + i * letterSpacing,
                y: -50, // Start above the screen
                targetY: centerY - 20,
                char: text[i],
                currentStep: i * 3, // Stagger the letters
                totalSteps: 40 + i * 3,
                bounce: 0,
                bounceDir: 1,
                type: 'letter',
                rotation: (Math.random() - 0.5) * 0.5,
                rotationTarget: 0
            });
        }
        
        // Add skull icon
        this.gameOverEffects.push({
            x: centerX,
            y: -100,
            targetY: centerY - 120,
            type: 'skull',
            currentStep: 0,
            totalSteps: 60,
            size: 60,
            rotation: 0,
            opacity: 0
        });
        
        // Add screen shake
        this.addScreenShake(15, 1500);
    }
    
    // Update game over effects
    updateGameOverEffects(deltaTime) {
        if (!this.gameOver) return;
        
        // Increment overall game over time
        this.gameOverTime += deltaTime;
        
        // Update each effect
        for (const effect of this.gameOverEffects) {
            if (effect.currentStep < effect.totalSteps) {
                effect.currentStep++;
            }
            
            // Calculate progress (0 to 1)
            const progress = Math.min(1, effect.currentStep / effect.totalSteps);
            
            // Update based on effect type
            if (effect.type === 'letter') {
                // Ease-in-out for smooth motion
                const easeProgress = easeInOutCubic(progress);
                
                // Letter falls from top and bounces slightly
                effect.y = effect.targetY + Math.sin(progress * Math.PI) * 20 * (1 - progress);
                
                // Add a small bounce effect
                if (progress >= 1) {
                    effect.bounce += effect.bounceDir * 0.1;
                    if (Math.abs(effect.bounce) > 2) {
                        effect.bounceDir *= -0.8;
                    }
                    effect.y += effect.bounce;
                }
                
                // Rotate letter to upright position
                effect.rotation = effect.rotation * (1 - easeProgress) + effect.rotationTarget * easeProgress;
            } 
            else if (effect.type === 'skull') {
                // Skull falls in after small delay
                if (progress > 0.2) {
                    const skullProgress = Math.min(1, (progress - 0.2) / 0.8);
                    effect.y = effect.y * (1 - skullProgress) + effect.targetY * skullProgress;
                    effect.opacity = skullProgress;
                    
                    // Add rotation as it falls
                    effect.rotation = Math.sin(progress * Math.PI * 3) * 0.2 * (1 - skullProgress);
                }
            }
            else {
                // Particle moves from center to target position
                const easeProgress = easeOutCubic(progress);
                
                effect.x = effect.x + (effect.targetX - effect.x) * 0.05;
                effect.y = effect.y + (effect.targetY - effect.y) * 0.05;
                
                // Add some gravity to particles
                effect.targetY += 0.1;
                
                // Fade out particles over time
                effect.opacity = 1 - easeProgress;
                
                // Rotate particles
                effect.rotation += effect.rotationSpeed;
            }
        }
        
        // Helper function for easing
        function easeOutCubic(x) {
            return 1 - Math.pow(1 - x, 3);
        }
        
        function easeInOutCubic(x) {
            return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        }
    }
    
    // Draw game over effects
    drawGameOverEffects() {
        if (!this.gameOver) return;
        
        // Draw dark overlay with a pulsing effect
        const alpha = 0.6 + Math.sin(this.gameOverTime * 0.001) * 0.05;
        this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw each effect
        for (const effect of this.gameOverEffects) {
            this.ctx.save();
            
            // Apply opacity
            const opacity = effect.opacity !== undefined ? effect.opacity : 1;
            
            // Different rendering based on effect type
            if (effect.type === 'letter') {
                // Setup text style
                this.ctx.translate(effect.x, effect.y);
                this.ctx.rotate(effect.rotation);
                
                // Text shadow for glow effect
                this.ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
                this.ctx.shadowBlur = 15;
                
                // Draw letter
                this.ctx.font = 'bold 64px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillStyle = `rgba(255, 50, 50, ${opacity})`;
                this.ctx.fillText(effect.char, 0, 0);
                
                // Add a highlight to make it look more dramatic
                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = `rgba(255, 200, 200, ${opacity * 0.6})`;
                this.ctx.fillText(effect.char, 0, -2);
            }
            else if (effect.type === 'skull') {
                this.ctx.translate(effect.x, effect.y);
                this.ctx.rotate(effect.rotation);
                this.ctx.scale(effect.size / 50, effect.size / 50);
                
                // Draw skull emoji or custom skull
                this.ctx.font = '50px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                
                // Shadow for dramatic effect
                this.ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
                this.ctx.shadowBlur = 15;
                
                this.ctx.fillText('💀', 0, 0);
            }
            else {
                // Draw particles (circles, rectangles, triangles)
                this.ctx.translate(effect.x, effect.y);
                this.ctx.rotate(effect.rotation);
                
                // Set fill style with opacity
                this.ctx.fillStyle = `${effect.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
                
                if (effect.type === 'circle') {
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, effect.size / 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                else if (effect.type === 'rect') {
                    this.ctx.fillRect(-effect.size / 2, -effect.size / 2, effect.size, effect.size);
                }
                else if (effect.type === 'triangle') {
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -effect.size / 2);
                    this.ctx.lineTo(effect.size / 2, effect.size / 2);
                    this.ctx.lineTo(-effect.size / 2, effect.size / 2);
                    this.ctx.closePath();
                    this.ctx.fill();
                }
            }
            
            this.ctx.restore();
        }
        
        // Display game stats after a delay
        if (this.gameOverTime > 2000) {
            // Calculate fade-in for stats
            const statsFade = Math.min(1, (this.gameOverTime - 2000) / 1000);
            
            // Stats background
            const statsY = this.height / 2 + 50;
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * statsFade})`;
            this.roundRect(this.ctx, this.width / 2 - 150, statsY, 300, 120, 10, true);
            
            // Stats text
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = `rgba(255, 255, 255, ${statsFade})`;
            this.ctx.fillText(`You survived ${this.wave} waves`, this.width / 2, statsY + 30);
            
            // Calculate total enemies defeated
            let totalKills = 0;
            this.towers.forEach(tower => {
                totalKills += tower.killCount || 0;
            });
            
            this.ctx.fillText(`Enemies defeated: ${totalKills}`, this.width / 2, statsY + 60);
            this.ctx.fillText(`Final cash: $${this.cash}`, this.width / 2, statsY + 90);
            
            // Draw restart button
            if (this.gameOverTime > 3000) {
                // Determine button dimensions and position
                const buttonWidth = 180;
                const buttonHeight = 50;
                const buttonX = this.width / 2 - buttonWidth / 2;
                const buttonY = this.height - 120;
                
                // Check if mouse is over button for hover effect
                let isHovered = false;
                if (this.mouseX && this.mouseY) {
                    isHovered = (
                        this.mouseX >= buttonX && 
                        this.mouseX <= buttonX + buttonWidth && 
                        this.mouseY >= buttonY && 
                        this.mouseY <= buttonY + buttonHeight
                    );
                }
                
                // Draw a pulsing effect behind the button
                const pulse = Math.sin(this.gameOverTime * 0.003) * 0.2 + 0.8;
                this.ctx.fillStyle = `rgba(255, 0, 0, ${0.2 * pulse * statsFade})`;
                this.roundRect(this.ctx, buttonX - 5, buttonY - 5, buttonWidth + 10, buttonHeight + 10, 15, true);
                
                // Draw the button background with hover effect
                const buttonGradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
                if (isHovered) {
                    // Brighter gradient when hovering
                    buttonGradient.addColorStop(0, '#e74c4c');
                    buttonGradient.addColorStop(1, '#c43c3c');
                    // Add a highlight when hovering
                    this.ctx.shadowColor = 'rgba(255, 80, 80, 0.6)';
                    this.ctx.shadowBlur = 10;
                } else {
                    buttonGradient.addColorStop(0, '#c43c3c');
                    buttonGradient.addColorStop(1, '#a43030');
                }
                this.ctx.fillStyle = buttonGradient;
                this.roundRect(this.ctx, buttonX, buttonY, buttonWidth, buttonHeight, 10, true);
                
                // Draw button border
                this.ctx.strokeStyle = isHovered ? '#ff8888' : '#ff6666';
                this.ctx.lineWidth = isHovered ? 3 : 2;
                this.roundRect(this.ctx, buttonX, buttonY, buttonWidth, buttonHeight, 10, false, true);
                
                // Reset shadow
                this.ctx.shadowBlur = 0;
                
                // Draw button text
                this.ctx.font = 'bold 22px Arial';
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillText('RESTART GAME', this.width / 2, buttonY + buttonHeight / 2 + 7);
                
                // Add keyboard shortcut hint below the button
                this.ctx.font = '14px Arial';
                this.ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * statsFade})`;
                this.ctx.fillText('or press R key', this.width / 2, buttonY + buttonHeight + 20);
                
                // Store button position for click handling
                this.restartButtonBounds = {
                    x: buttonX,
                    y: buttonY,
                    width: buttonWidth,
                    height: buttonHeight
                };
            }
        }
        
        // Draw button click effect if active
        if (this.buttonClickEffect) {
            const now = performance.now();
            const elapsed = now - this.buttonClickEffect.startTime;
            
            if (elapsed < this.buttonClickEffect.duration) {
                // Calculate progress (0 to 1)
                const progress = elapsed / this.buttonClickEffect.duration;
                
                // Calculate current radius and opacity
                const radius = this.buttonClickEffect.radius + 
                    (this.buttonClickEffect.maxRadius - this.buttonClickEffect.radius) * progress;
                const alpha = 1 - progress;
                
                // Draw ripple effect
                this.ctx.beginPath();
                this.ctx.arc(this.buttonClickEffect.x, this.buttonClickEffect.y, radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            } else {
                // Effect is done, clear it
                this.buttonClickEffect = null;
            }
        }
    }
    
    // Start the game (hide start screen)
    startGame() {
        this.gameStarted = true;
        
        // Hide the start screen with animation
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.transition = 'opacity 0.5s ease-out';
            startScreen.style.opacity = '0';
            
            // Remove from DOM after animation completes
            setTimeout(() => {
                startScreen.style.display = 'none';
            }, 500);
        }
        
        // Add a welcome announcement
        this.showWaveAnnouncement('PREPARE FOR BATTLE!', '#4CAF50');
        
        // Add a small screen shake for effect
        this.addScreenShake(5, 500);
    }
    
    // Restart the game after game over
    restartGame() {
        // Reset game state
        this.cash = 100;
        this.lives = 10;
        this.wave = 1;
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.selectedTower = null;
        this.gameOver = false;
        this.waveInProgress = false;
        this.enemiesPerWave = 10;
        this.enemiesSpawned = 0;
        this.spawnInterval = null;
        this.selectedExistingTower = null;
        this.gameOverEffects = [];
        this.gameOverTime = 0;
        this.victoryAchieved = false;
        this.victoryEffects = [];
        
        // Clear any active text effects
        this.activeTextEffects = [];
        
        // Reset unlocked towers
        this.resetTowerUnlocks();
        
        // Update UI
        this.updateUI();
        
        // Show welcome message
        this.showWaveAnnouncement('READY FOR BATTLE!', '#4CAF50');
        
        // Add a small screen shake for effect
        this.addScreenShake(5, 500);
    }
    
    // Reset tower unlocks to initial state
    resetTowerUnlocks() {
        // Reset the unlocked state of special towers
        this.towerTypes.ice.unlocked = false;
        this.towerTypes.flamer.unlocked = false;
        this.towerTypes.bomber.unlocked = false;
        
        // Reset the UI elements for locked towers
        const iceTower = document.getElementById('iceTower');
        if (iceTower) {
            iceTower.classList.add('locked-tower');
            iceTower.disabled = true;
            
            const unlockText = iceTower.querySelector('.unlock-text');
            if (unlockText) {
                unlockText.textContent = 'Unlocks after defeating Wave 5 Boss';
            }
        }
        
        const flamerTower = document.getElementById('flamerTower');
        if (flamerTower) {
            flamerTower.classList.add('locked-tower');
            flamerTower.disabled = true;
            
            const unlockText = flamerTower.querySelector('.unlock-text');
            if (unlockText) {
                unlockText.textContent = 'Unlocks after defeating Wave 10 Boss';
            }
        }
        
        const bomberTower = document.getElementById('bomberTower');
        if (bomberTower) {
            bomberTower.classList.add('locked-tower');
            bomberTower.disabled = true;
            
            const unlockText = bomberTower.querySelector('.unlock-text');
            if (unlockText) {
                unlockText.textContent = 'Unlocks after defeating Wave 15 Boss';
            }
        }
    }
    
    // Update the upgrade button state based on selected tower
    updateUpgradeButtonState() {
        if (!this.upgradeButton) return;
        
        // Show upgrade button when a tower is selected
        this.upgradeButton.style.display = 'block';
        
        if (this.selectedExistingTower !== null) {
            const tower = this.towers[this.selectedExistingTower];
            const upgradeCost = tower.getUpgradeCost();
            
            // Update button text with cost
            if (upgradeCost !== null) {
                this.upgradeButton.textContent = `Upgrade ($${upgradeCost})`;
                
                // Enable/disable based on whether player can afford it
                if (this.cash >= upgradeCost) {
                    this.upgradeButton.disabled = false;
                    this.upgradeButton.classList.remove('disabled');
                } else {
                    this.upgradeButton.disabled = true;
                    this.upgradeButton.classList.add('disabled');
                }
            } else {
                // Tower is at max level
                this.upgradeButton.textContent = "Max Level";
                this.upgradeButton.disabled = true;
                this.upgradeButton.classList.add('disabled');
            }
        } else {
            // No tower selected
            this.upgradeButton.style.display = 'none';
        }
    }
    
    // Upgrade the selected tower
    upgradeTower() {
        if (this.selectedExistingTower === null) return;
        
        const tower = this.towers[this.selectedExistingTower];
        const upgradeCost = tower.getUpgradeCost();
        
        // Check if we can upgrade
        if (upgradeCost === null) {
            // Tower is already at max level
            this.showFloatingText("Max level reached!", tower.x, tower.y - 30, "#ffcc66");
            return;
        }
        
        // Check if we have enough cash
        if (this.cash < upgradeCost) {
            // Not enough cash
            this.showFloatingText("Not enough cash!", tower.x, tower.y - 30, "#ff6666");
            return;
        }
        
        // Deduct the cash
        this.cash -= upgradeCost;
        
        // Upgrade the tower
        tower.upgrade();
        
        // Add upgrade visual effects
        this.addScreenShake(3, 300);
        this.showFloatingText(`Upgraded to Level ${tower.upgradeLevel}!`, tower.x, tower.y - 30, "#66ffaa");
        this.showFloatingText(`-$${upgradeCost}`, tower.x, tower.y - 50, "#ff9999");
        
        // Update UI
        this.updateUI();
        this.updateUpgradeButtonState();
    }
}

// Get mouse position for tower placement preview
document.getElementById('gameCanvas').addEventListener('mousemove', (e) => {
    const rect = document.getElementById('gameCanvas').getBoundingClientRect();
    window.game.mouseX = e.clientX - rect.left;
    window.game.mouseY = e.clientY - rect.top;
});

// Initialize the game
window.game = new Game(); 