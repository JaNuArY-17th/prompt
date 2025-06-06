import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { InputSystem } from '../systems/InputSystem.js';
import { TileSystem } from '../systems/TileSystem.js';
import { PerformanceOptimizer } from '../systems/PerformanceOptimizer.js';

export class Chapter2Scene extends Phaser.Scene {
    constructor() {
        super({ key: 'Chapter2Scene' });
        
        this.player = null;
        this.enemies = null;
        this.walls = null;
        this.blackboardHouses = null;
        this.interactionPrompt = null;
        
        this.inputSystem = null;
        this.tileSystem = null;
        
        this.gameObjects = [];
        
        // Chapter 2 specific objectives
        this.chapter2Progress = {
            blackboardsCompleted: 0,
            enemiesKilled: 0,
            totalBlackboards: 3,
            totalEnemies: 30
        };
    }

    create() {
        console.log('🏗️ Creating Chapter 2: The Illiteracy Enemy - Sister Sáu Nhung\'s Mission');
        
        // Create world bounds for village
        this.matter.world.setBounds(-20000, -6000, 40000, 30000);
        
        // Create groups
        this.enemies = this.add.group();
        this.walls = this.add.group();
        this.blackboardHouses = this.add.group();
        this.bullets = this.add.group();
        
        // Performance counters
        this.updateCounter = 0;
        this.slowUpdateInterval = 5;
        
        // Create systems with Chapter 2 configuration
        this.inputSystem = new InputSystem(this);
        this.tileSystem = new TileSystem(this);
        this.performanceOptimizer = new PerformanceOptimizer(this);
        
        // Configure TileSystem for village theme
        this.tileSystem.mapWidth = 500;
        this.tileSystem.mapHeight = 500;
        this.tileSystem.chapter2Mode = true; // Flag for village generation
        
        // Override getObjectives method for Chapter 2
        this.tileSystem.getObjectives = () => {
            return {
                mainObjective: {
                    description: "Complete 3 blackboard puzzles",
                    progress: this.chapter2Progress.blackboardsCompleted,
                    total: this.chapter2Progress.totalBlackboards,
                    completed: this.chapter2Progress.blackboardsCompleted >= this.chapter2Progress.totalBlackboards
                },
                sideObjectives: [
                    {
                        description: "Kill enemies",
                        progress: this.chapter2Progress.enemiesKilled,
                        total: this.chapter2Progress.totalEnemies,
                        completed: this.chapter2Progress.enemiesKilled >= this.chapter2Progress.totalEnemies
                    }
                ]
            };
        };
        
        // Setup Chapter 2 specific systems
        this.setupShootingSystem();
        this.createVillage();
        
        // Create player at village entrance
        this.startPos = this.tileSystem.getWorldPosition(50, 450);
        this.player = new Player(this, this.startPos.x, this.startPos.y, 2); // Chapter 2 - Sister Sáu Nhung
        this.gameObjects.push(this.player);
        
        // Ensure player visibility
        this.player.setVisible(true);
        this.player.setActive(true);
        // Player will handle its own depth via updateDepth() method
        
        // Create Chapter 2 objectives
        this.createBlackboardHouses();
        this.createEnemies();
        
        // Setup input for blackboard interaction
        this.setupBlackboardInteraction();
        
        // Setup camera
        this.setupCamera();
        
        // Start UI scene and connect it to Chapter 2
        this.scene.launch('UIScene');
        
        // Wait a frame for UIScene to initialize, then switch it to Chapter 2
        this.time.delayedCall(100, () => {
            const uiScene = this.scene.get('UIScene');
            if (uiScene && uiScene.switchGameScene) {
                uiScene.switchGameScene('Chapter2Scene');
            }
        });
        
        // Update chapter display
        this.updateChapterDisplay();
        
        // Emit world ready event
        this.events.emit('worldReady', {
            blackboardHouses: this.blackboardHouses,
            tileSystem: this.tileSystem,
            chapter: 2
        });
        
        this.setupCollisions();
        
        console.log('🎓 Chapter 2 scene created successfully');
    }

    createVillage() {
        // Generate village layout with more buildings, less forest
        this.tileSystem.generateMap(); // Use existing generation for now
        this.tileSystem.renderMap();
    }

    createBlackboardHouses() {
        // Use blackboard positions generated by TileSystem along the linear path
        let housePositions = this.tileSystem.blackboardPositions || [
            // Fallback positions if TileSystem didn't generate them (make sure they're within map bounds)
            { x: 150, y: 150 },
            { x: 250, y: 200 },
            { x: 200, y: 280 } // Fixed: moved third position from y:350 to y:280 to be within map bounds
        ];
        
        // Ensure all positions are within map bounds (500x500)
        housePositions = housePositions.map((pos, index) => {
            const adjustedPos = {
                x: Math.max(50, Math.min(450, pos.x)), // Keep within x: 50-450
                y: Math.max(50, Math.min(450, pos.y))  // Keep within y: 50-450
            };
            if (adjustedPos.x !== pos.x || adjustedPos.y !== pos.y) {
                console.log(`📍 Adjusted blackboard ${index + 1} position from (${pos.x}, ${pos.y}) to (${adjustedPos.x}, ${adjustedPos.y})`);
            }
            return adjustedPos;
        });
        
        console.log(`📚 Creating ${housePositions.length} blackboard houses at path-generated positions`);
        
        housePositions.forEach((pos, index) => {
            const worldPos = this.tileSystem.getWorldPosition(pos.x, pos.y);
            
            // Create blackboard houses using warehouse sprites with 1.5 scale
            let warehouseSprite;
            if (index === 0) {
                // First blackboard: warehouse-1 sprite
                warehouseSprite = this.add.image(worldPos.x, worldPos.y, 'warehouse-1');
            } else if (index === 1) {
                // Second blackboard: warehouse-2 sprite
                warehouseSprite = this.add.image(worldPos.x, worldPos.y, 'warehouse-2');
            } else {
                // Third blackboard: normal warehouse sprite
                warehouseSprite = this.add.image(worldPos.x, worldPos.y, 'warehouse');
            }
            
            // Set scale - 1.5x for first two, normal for third
            if (index < 2) {
                warehouseSprite.setScale(1.5);
            } else {
                warehouseSprite.setScale(1.0);
            }
            
            warehouseSprite.setDepth(10000 + worldPos.y); // Same depth as decoration layer
            
            // Set up the house properties for game logic
            warehouseSprite.completed = false;
            warehouseSprite.id = `blackboard_${index + 1}`;
            warehouseSprite.x = worldPos.x;
            warehouseSprite.y = worldPos.y;
            warehouseSprite.gridX = pos.x;
            warehouseSprite.gridY = pos.y;
            
            // Add glowing effect around the house to indicate it's interactive
            const glow = this.add.circle(worldPos.x, worldPos.y, 60, 0xFFFF00, 0.2); // Larger glow for warehouse sprites
            glow.setDepth(10000 + worldPos.y - 1); // Behind the house
            
            // Add pulsing animation to make it stand out
            this.tweens.add({
                targets: glow,
                scaleX: 1.3,
                scaleY: 1.3,
                alpha: 0.1,
                duration: 2500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            // Add floating blackboard icon above the warehouse
            const blackboardIcon = this.add.text(worldPos.x, worldPos.y - 40, '📚', {
                fontSize: '32px'
            }).setOrigin(0.5).setDepth(10000 + worldPos.y + 1);
            
            // Add subtle bounce animation to the icon
            this.tweens.add({
                targets: blackboardIcon,
                y: worldPos.y - 50,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            // Store additional visual elements with house
            warehouseSprite.glow = glow;
            warehouseSprite.icon = blackboardIcon;
            
            this.blackboardHouses.add(warehouseSprite);
        });
        
        console.log('🏠 Created 3 blackboard houses using warehouse sprites in the village');
    }

    createEnemies() {
        // Apply Chapter 1 enemy system to Chapter 2 - guards for blackboard houses and scattered enemies
        const enemyTypes = ['basic', 'ranged', 'grunt', 'tank'];
        let enemiesCreated = 0;
        
        // Create guards for each blackboard house (treating them like warehouses from Chapter 1)
        if (this.blackboardHouses && this.blackboardHouses.children.entries.length > 0) {
            this.blackboardHouses.children.entries.forEach((house, houseIndex) => {
                // Number of guards based on house position (progressive difficulty)
                let guardCount;
                switch (houseIndex) {
                    case 0: guardCount = 15; break;  // First house: 15 guards
                    case 1: guardCount = 20; break;  // Second house: more guards
                    case 2: guardCount = 25; break;  // Final house: most guards
                    default: guardCount = 15;
                }
                
                // Create guards around each blackboard house in expanding circles
                for (let guardIndex = 0; guardIndex < guardCount; guardIndex++) {
                    let guardPlaced = false;
                    
                    // Try multiple attempts to find a good position around the house
                    for (let attempt = 0; attempt < 20 && !guardPlaced; attempt++) {
                        // Calculate guard positions in expanding circles around the house
                        const angle = (guardIndex * (360 / guardCount) + attempt * 15) * (Math.PI / 180);
                        const distance = 50 + attempt * 3; // Expand distance with attempts
                        
                        const guardX = Math.round(house.gridX + Math.cos(angle) * distance);
                        const guardY = Math.round(house.gridY + Math.sin(angle) * distance);
                        
                        // Use Chapter 1 style walkable area check for guards
                        if (this.isWalkableArea(guardX, guardY, 1)) {
                            // Choose enemy type based on house difficulty
                            let enemyType;
                            if (houseIndex === 2) {
                                // Final house has strongest enemies
                                enemyType = guardIndex === 0 ? 'tank' : (guardIndex % 2 === 0 ? 'tank' : 'ranged');
                            } else if (houseIndex === 1) {
                                // Mid house has mixed enemies
                                enemyType = guardIndex === 0 ? 'tank' : enemyTypes[guardIndex % enemyTypes.length];
                            } else {
                                // First house has basic enemies
                                enemyType = guardIndex === 0 ? 'ranged' : 'basic';
                            }
                            
                            const worldPos = this.tileSystem.getWorldPosition(guardX, guardY);
                            const enemy = new Enemy(this, worldPos.x, worldPos.y, enemyType);
                            this.enemies.add(enemy);
                            this.gameObjects.push(enemy);
                            enemiesCreated++;
                            guardPlaced = true;
                            
                            console.log(`Created ${enemyType} guard ${guardIndex + 1} for blackboard house ${houseIndex + 1} at (${guardX}, ${guardY})`);
                        }
                    }
                    
                    if (!guardPlaced) {
                        console.warn(`Could not find suitable area for guard ${guardIndex + 1} of blackboard house ${houseIndex + 1}`);
                    }
                }
            });
        }
        
        // Add scattered enemies throughout the map using Chapter 1 system
        this.createScatteredEnemies();
        
        console.log(`Created ${enemiesCreated} enemy guards for ${this.blackboardHouses.children.entries.length} blackboard houses`);
    }
    
    createScatteredEnemies() {
        // Chapter 1 style scattered patrol enemies
        const scatteredEnemyCount = 80; // Add 80 scattered enemies
        let scatteredCreated = 0;
        
        for (let i = 0; i < scatteredEnemyCount; i++) {
            // Try up to 50 times to find a good spawn position
            for (let attempt = 0; attempt < 50; attempt++) {
                const randomX = Math.floor(Math.random() * this.tileSystem.mapWidth);
                const randomY = Math.floor(Math.random() * this.tileSystem.mapHeight);
                
                // Use Chapter 1 style area check
                if (this.isWalkableArea(randomX, randomY, 2)) {
                    // Distance check from path points
                    const distanceToPath = this.tileSystem.getDistanceToNearestPathPoint ? 
                        this.tileSystem.getDistanceToNearestPathPoint(randomX, randomY) : 100;
                    
                    // Don't spawn directly on paths
                    if (distanceToPath > 8) {
                        // Choose enemy type based on area difficulty (like Chapter 1)
                        let enemyType = 'basic';
                        if (randomY < 200) { // Northern area (harder)
                            enemyType = Math.random() < 0.5 ? 'ranged' : 'tank';
                        } else if (randomY < 350) { // Middle area
                            enemyType = Math.random() < 0.7 ? 'basic' : 'ranged';
                        } // Southern area stays basic
                        
                        const worldPos = this.tileSystem.getWorldPosition(randomX, randomY);
                        const enemy = new Enemy(this, worldPos.x, worldPos.y, enemyType);
                        this.enemies.add(enemy);
                        this.gameObjects.push(enemy);
                        scatteredCreated++;
                        
                        console.log(`Created scattered ${enemyType} enemy at (${randomX}, ${randomY})`);
                        break; // Successfully placed, move to next enemy
                    }
                }
            }
        }
        
        // If we didn't create enough enemies, add some guaranteed spawns
        if (scatteredCreated < 40) {
            this.createGuaranteedEarlyEnemies(40 - scatteredCreated);
        }
        
        console.log(`Created ${scatteredCreated} scattered patrol enemies using Chapter 1 system`);
    }
    
    // Helper function from Chapter 1 for walkable area checking
    isWalkableArea(centerX, centerY, radius = 2) {
        // Check if the center and immediate area are walkable
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                // Check bounds
                if (x < 0 || x >= this.tileSystem.mapWidth || y < 0 || y >= this.tileSystem.mapHeight) {
                    return false;
                }
                
                // Only check if position is walkable
                if (!this.tileSystem.isWalkable(x, y)) {
                    return false;
                }
            }
        }
        return true;
    }
    
    createGuaranteedEarlyEnemies(count) {
        // Create enemies in the starting area of the path
        let created = 0;
        const startPathIndex = 0;
        const earlyPathRange = Math.min(100, this.tileSystem.pathPoints.length);
        
        for (let i = 0; i < count * 5 && created < count; i++) {
            // Pick from early path points
            const pathIndex = Math.floor(Math.random() * earlyPathRange);
            const pathPoint = this.tileSystem.pathPoints[pathIndex];
            
            if (pathPoint) {
                const offsetX = (Math.random() - 0.5) * 40;
                const offsetY = (Math.random() - 0.5) * 40;
                const randomX = Math.floor(pathPoint.x + offsetX);
                const randomY = Math.floor(pathPoint.y + offsetY);
                
                // Basic check - just needs to be walkable
                if (this.tileSystem.isWalkable(randomX, randomY)) {
                    const worldPos = this.tileSystem.getWorldPosition(randomX, randomY);
                    const enemy = new Enemy(this, worldPos.x, worldPos.y, 'basic');
                    this.enemies.add(enemy);
                    this.gameObjects.push(enemy);
                    created++;
                    
                    console.log(`Created guaranteed early enemy at (${randomX}, ${randomY})`);
                }
            }
        }
        
        console.log(`Created ${created} guaranteed early enemies near path start`);
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.tileSystem.mapWidth && 
               y >= 0 && y < this.tileSystem.mapHeight;
    }

    setupBlackboardInteraction() {
        // Add E key for interaction
        this.interactionKey = this.input.keyboard.addKey('E');
        
        // Create interaction prompt (initially hidden)
        this.interactionPrompt = this.add.text(0, 0, 'Press E to interact with blackboard', {
            fontSize: '14px',
            fontFamily: 'VT323',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });
        this.interactionPrompt.setOrigin(0.5);
        this.interactionPrompt.setDepth(50000); // UI elements at high depth
        this.interactionPrompt.setVisible(false);
        this.interactionPrompt.setScrollFactor(0);
    }

    checkBlackboardInteraction() {
        if (!this.player || !this.blackboardHouses) return;

        let nearestHouse = null;
        let minDistance = Infinity;
        const interactionRange = 60; // pixels

        // Find nearest blackboard house
        this.blackboardHouses.children.entries.forEach(house => {
            if (house.completed) return; // Skip completed houses

            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                house.x, house.y
            );

            if (distance < interactionRange && distance < minDistance) {
                // Check if there are enemies nearby
                if (!this.areEnemiesNearby(house.x, house.y, 80)) {
                    nearestHouse = house;
                    minDistance = distance;
                }
            }
        });

        // Show/hide interaction prompt
        if (nearestHouse) {
            this.interactionPrompt.setVisible(true);
            this.interactionPrompt.setPosition(
                this.cameras.main.centerX,
                this.cameras.main.centerY - 100
            );

            // Check for E key press
            if (this.interactionKey.isDown) {
                this.openBlackboardPuzzle(nearestHouse);
            }
        } else {
            this.interactionPrompt.setVisible(false);
        }
    }

    areEnemiesNearby(x, y, range) {
        let enemiesNearby = false;
        
        this.enemies.children.entries.forEach(enemy => {
            if (enemy.active) {
                const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                if (distance < range) {
                    enemiesNearby = true;
                }
            }
        });
        
        return enemiesNearby;
    }

    openBlackboardPuzzle(house) {
        console.log(`📝 Opening blackboard puzzle for ${house.id}`);
        
        // Store the current house being interacted with
        this.currentBlackboardHouse = house;
        
        // Pause the current scene and launch the blackboard puzzle
        this.scene.pause();
        this.scene.launch('BlackboardPuzzleScene', { returnScene: 'Chapter2Scene', houseId: house.id });
        
        // Listen for puzzle completion
        this.events.once('blackboardPuzzleCompleted', (data) => {
            this.scene.resume();
            if (data.success) {
                this.completeBlackboardPuzzle(house);
            }
        });
    }

    completeBlackboardPuzzle(house) {
        if (house.completed) return;

        house.completed = true;
        this.chapter2Progress.blackboardsCompleted++;

        // Visual feedback for warehouse sprite
        house.setTint(0x90EE90); // Light green tint for completed warehouse
        
        // Stop the glow animation and make it solid green
        if (house.glow) {
            this.tweens.killTweensOf(house.glow);
            house.glow.setFillStyle(0x00ff00, 0.6); // Solid green glow
        }
        
        // Add completion text above the warehouse
        this.add.text(house.x, house.y - 80, '✅ COMPLETED!', {
            fontSize: '20px',
            color: '#00ff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(50000); // UI feedback at high depth

        console.log(`📝 Blackboard ${house.id} completed! (${this.chapter2Progress.blackboardsCompleted}/${this.chapter2Progress.totalBlackboards})`);
        
        this.checkChapterComplete();
    }

    updateChapterDisplay() {
        // Emit chapter change event to UIScene
        this.events.emit('chapterChanged', { 
            name: 'CHAPTER 2',
            progress: this.chapter2Progress
        });
    }

    resetPlayerPosition() {
        if (this.player && this.startPos) {
            console.log('🔄 Resetting player to start position:', this.startPos);
            this.player.setPosition(this.startPos.x, this.startPos.y);
            this.player.setVelocity(0, 0);
            this.player.health = this.player.maxHealth;
            this.player.setVisible(true);
            this.player.setActive(true);
            
            // Reset ammo and reload state
            this.currentAmmo = this.shootingConfig.maxAmmo;
            this.inventoryBullets = 7;
            this.isReloading = false;
            
            // Reset chapter progress
            this.chapter2Progress = {
                blackboardsCompleted: 0,
                enemiesKilled: 0,
                totalBlackboards: 3,
                totalEnemies: 30
            };
            
            console.log('✅ Player position and stats reset for Chapter 2');
        }
    }

    setupCamera() {
        // Follow player with smoother camera (same as Chapter 1)
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08); // Slightly faster follow for smoothness
        this.cameras.main.setZoom(1.587); // Same zoom as Chapter 1
        
        // Set camera bounds to match isometric world bounds
        this.cameras.main.setBounds(-24000, -6000, 48000, 36000);
        
        // Force camera to center on player initially
        this.cameras.main.centerOn(this.player.x, this.player.y);
        
        // Enable camera smoothing
        this.cameras.main.setLerp(0.1, 0.1);
        
        console.log('Camera setup - following player at:', this.player.x, this.player.y);
    }

    setupCollisions() {
        // Player interactions with objectives would go here
        // For now, using proximity detection in update loop
    }

    checkChapterComplete() {
        if (this.chapter2Progress.blackboardsCompleted >= this.chapter2Progress.totalBlackboards) {
            console.log('🎉 Chapter 2 completed! All blackboard puzzles solved.');
            this.handleChapterComplete();
        }
    }

    handleChapterComplete() {
        // Mark chapter as completed in the chapter manager
        this.game.chapterManager.completeChapter(2);
        
        // Show victory screen
        const uiScene = this.scene.get('UIScene');
        if (uiScene) {
            uiScene.showVictoryBanner();
        }
    }

    setupShootingSystem() {
        // Chapter 2 pistol specifications - 7 bullets per round, max 14 inventory
        this.shootingConfig = {
            bulletSpeed: 500, // px/s - player bullets
            enemyBulletSpeed: 200, // px/s - slower enemy bullets
            bulletRange: 300, // px (6 tiles)
            playerDamage: 25,
            enemyDamage: 15,
            fireRate: 150, // ms cooldown (faster for pistol)
            maxAmmo: 7, // Pistol magazine size
            reloadTime: 1500, // ms (faster reload for pistol)
            maxInventory: 14, // Maximum bullets in inventory
            bulletsPerKill: 3
        };
        
        // Shooting state
        this.lastShotTime = 0;
        this.currentAmmo = this.shootingConfig.maxAmmo; // Start with full magazine
        this.inventoryBullets = 7; // Start with 7 bullets in inventory (1 extra magazine)
        this.isReloading = false;
        this.reloadStartTime = 0;
        
        console.log('Chapter 2 pistol system initialized - 7 bullets per magazine, max 14 inventory');
    }

    enemyShoot(enemy, targetX, targetY) {
        // Enemy shooting system (from Chapter 1)
        return this.createSimpleBullet(enemy.x, enemy.y, targetX, targetY, true);
    }

    createSimpleHitEffect(x, y) {
        // Create hit effect (from Chapter 1)
        const effect = this.add.circle(x, y, 8, 0xff4444);
        effect.setDepth(10001);
        
        // Animate the effect
        this.tweens.add({
            targets: effect,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 200,
            onComplete: () => {
                effect.destroy();
            }
        });
        
        return effect;
    }

    updateUI() {
        // Send UI update to UI scene (from Chapter 1)
        const uiScene = this.scene.get('UIScene');
        if (uiScene && uiScene.updateAmmo) {
            const reloadProgress = this.isReloading ? 
                Math.min(1, (this.time.now - this.reloadStartTime) / this.shootingConfig.reloadTime) : 0;
            
            uiScene.updateAmmo(this.currentAmmo, this.shootingConfig.maxAmmo, reloadProgress);
        }
        
        // Update bullet inventory indicator
        if (uiScene && uiScene.updateBulletInventory) {
            uiScene.updateBulletInventory(this.inventoryBullets, this.shootingConfig.maxInventory);
        }
    }

    addBulletsToInventory(amount) {
        // Add bullets to inventory (from Chapter 1)
        const oldInventory = this.inventoryBullets;
        this.inventoryBullets = Math.min(this.inventoryBullets + amount, this.shootingConfig.maxInventory);
        const actualAdded = this.inventoryBullets - oldInventory;
        
        if (actualAdded > 0) {
            console.log(`Added ${actualAdded} bullets to inventory! Total: ${this.inventoryBullets}/${this.shootingConfig.maxInventory}`);
            this.updateUI();
            
            // Visual feedback for bullet pickup
            this.createBulletPickupEffect(this.player.x, this.player.y - 30, actualAdded);
        }
    }

    createBulletPickupEffect(x, y, amount) {
        // Visual feedback for bullet pickup (from Chapter 1)
        const text = this.add.text(x, y, `+${amount} bullets`, {
            fontSize: '14px',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        });
        text.setOrigin(0.5);
        text.setDepth(50000);
        
        // Animate the pickup text
        this.tweens.add({
            targets: text,
            y: y - 40,
            alpha: 0,
            duration: 1500,
            onComplete: () => {
                text.destroy();
            }
        });
    }

    shoot(targetX, targetY) {
        // Check if reloading
        if (this.isReloading) return;
        
        // Check ammo
        if (this.currentAmmo <= 0) {
            this.startReload();
            return;
        }
        
        // Cooldown check
        if (this.time.now - this.lastShotTime < this.shootingConfig.fireRate) return;
        
        // Create bullet
        const bullet = this.createSimpleBullet(this.player.x, this.player.y, targetX, targetY, false);
        
        // Update ammo and shooting state
        this.currentAmmo--;
        this.lastShotTime = this.time.now;
        
        // Update UI
        this.updateUI();
        
        console.log(`Chapter 2 pistol shot fired! Ammo: ${this.currentAmmo}`);
    }

    createSimpleBullet(startX, startY, targetX, targetY, isEnemy) {
        // Create bullet using the bullet asset
        const bullet = this.add.image(startX, startY, 'bullet');
        bullet.setScale(0.05); // Small scale to match environment
                    bullet.setDepth(10000); // Same as Chapter 1 bullets
        
        // Calculate direction and velocity
        const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
        bullet.setRotation(angle); // Rotate bullet to face direction
        const speed = isEnemy ? this.shootingConfig.enemyBulletSpeed : this.shootingConfig.bulletSpeed;
        bullet.velocityX = Math.cos(angle) * speed;
        bullet.velocityY = Math.sin(angle) * speed;
        
        // Tint bullets differently for enemies
        if (isEnemy) {
            bullet.setTint(0xff4444); // Red tint for enemy bullets
        } else {
            bullet.setTint(0xffff44); // Yellow tint for player bullets
        }
        
        // Bullet properties
        bullet.startX = startX;
        bullet.startY = startY;
        bullet.timeAlive = 0;
        bullet.isEnemy = isEnemy;
        bullet.damage = isEnemy ? this.shootingConfig.enemyDamage : this.shootingConfig.playerDamage;
        
        // Add to bullets group
        this.bullets.add(bullet);
        
        return bullet;
    }

    startReload() {
        if (this.isReloading || this.currentAmmo === this.shootingConfig.maxAmmo || this.inventoryBullets <= 0) {
            if (this.inventoryBullets <= 0) {
                console.log('No bullets in inventory to reload!');
            }
            return;
        }
        
        console.log('Starting pistol reload...');
        this.isReloading = true;
        this.reloadStartTime = this.time.now;
        
        // Update UI
        this.updateUI();
        
        // Complete reload after timer (Chapter 1 style)
        this.time.delayedCall(this.shootingConfig.reloadTime, () => {
            // Calculate how many bullets to reload
            const bulletsNeeded = this.shootingConfig.maxAmmo - this.currentAmmo;
            const bulletsToReload = Math.min(bulletsNeeded, this.inventoryBullets);
            
            // Update ammo and inventory
            this.currentAmmo += bulletsToReload;
            this.inventoryBullets -= bulletsToReload;
            
            this.isReloading = false;
            console.log(`Pistol reload complete! Loaded ${bulletsToReload} bullets. Inventory: ${this.inventoryBullets}`);
            this.updateUI();
        });
    }

    update(time, delta) {
        // Update player
        if (this.player) {
            this.player.update(time, delta);
        }
        
        // Update enemies and track kills
        if (this.enemies) {
            this.enemies.children.entries.forEach(enemy => {
                if (enemy && enemy.active) {
                    enemy.update(time, delta);
                    
                    // Check if enemy was just killed
                    if (enemy.health <= 0 && !enemy.counted) {
                        enemy.counted = true;
                        this.chapter2Progress.enemiesKilled++;
                        console.log(`Enemy killed! Progress: ${this.chapter2Progress.enemiesKilled}/${this.chapter2Progress.totalEnemies}`);
                    }
                }
            });
        }
        
        // Update bullets
        this.updateBullets(delta);
        
        // Update reload progress
        this.updateReload();
        
        // Check blackboard interactions
        this.checkBlackboardInteraction();
        
        // Update systems
        if (this.updateCounter % this.slowUpdateInterval === 0) {
            if (this.tileSystem && this.tileSystem.updateVisibleTiles) {
                this.tileSystem.updateVisibleTiles();
            }
        }
        
        this.updateCounter++;
    }

    updateBullets(delta) {
        if (!this.bullets || !this.bullets.children || !this.bullets.children.entries) {
            return;
        }
        
        this.bullets.children.entries.forEach(bullet => {
            if (bullet && bullet.active) {
                // Move bullet
                bullet.x += bullet.velocityX * delta / 1000;
                bullet.y += bullet.velocityY * delta / 1000;
                bullet.timeAlive += delta;

                // Remove if out of range or too old
                const distance = Phaser.Math.Distance.Between(bullet.startX, bullet.startY, bullet.x, bullet.y);
                if (distance > this.shootingConfig.bulletRange || bullet.timeAlive > 5000) {
                    bullet.destroy();
                    return;
                }

                // Check collisions with enemies (for player bullets)
                if (!bullet.isEnemy && this.enemies && this.enemies.children && this.enemies.children.entries) {
                    this.enemies.children.entries.forEach(enemy => {
                        if (enemy && enemy.active && enemy.health > 0) {
                            const hitDistance = Phaser.Math.Distance.Between(bullet.x, bullet.y, enemy.x, enemy.y);
                            if (hitDistance < 25) {
                                enemy.takeDamage(bullet.damage);
                                bullet.destroy();
                            }
                        }
                    });
                }

                // Check collisions with player (for enemy bullets)
                if (bullet.isEnemy && this.player && this.player.active) {
                    const hitDistance = Phaser.Math.Distance.Between(bullet.x, bullet.y, this.player.x, this.player.y);
                    if (hitDistance < 25) {
                        this.player.takeDamage(bullet.damage);
                        bullet.destroy();
                    }
                }
            }
        });
    }

    updateReload() {
        if (this.isReloading) {
            const currentTime = this.time.now;
            if (currentTime - this.reloadStartTime >= this.shootingConfig.reloadTime) {
                this.currentAmmo = this.shootingConfig.maxAmmo;
                this.isReloading = false;
                console.log('Chapter 2 reload complete!');
            }
        }
    }
    
    destroy() {
        // Clean up Chapter 2 specific resources
        if (this.gameObjects) {
            this.gameObjects.forEach(obj => {
                if (obj && obj.destroy) {
                    obj.destroy();
                }
            });
        }
        
        super.destroy();
    }
} 