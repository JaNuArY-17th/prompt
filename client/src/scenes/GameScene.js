import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Hostage } from '../entities/Hostage.js';
import { Granary } from '../entities/Granary.js';
import { InputSystem } from '../systems/InputSystem.js';
import { TileSystem } from '../systems/TileSystem.js';
import { PerformanceOptimizer } from '../systems/PerformanceOptimizer.js';


export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        this.player = null;
        this.enemies = null;
        this.walls = null;
        this.hostages = null;
        this.granaries = null;
        
        this.inputSystem = null;
        this.tileSystem = null;
        
        this.gameObjects = [];
    }

    create() {
        // Create world bounds - for 600x600 isometric tile system 
        // Isometric maps create a diamond shape, so we need appropriate bounds
        this.matter.world.setBounds(-24000, -6000, 48000, 36000);
        
        // Create groups
        this.enemies = this.add.group();
        this.walls = this.add.group();
        this.hostages = this.add.group();
        this.granaries = this.add.group();
        
        // Create bullet arrays for manual tracking
        this.bullets = this.add.group();
        
        // Performance: Reduced update frequency counters
        this.updateCounter = 0;
        this.slowUpdateInterval = 5; // Update some systems every 5 frames instead of every frame
        
        // Create systems
        this.inputSystem = new InputSystem(this);
        this.tileSystem = new TileSystem(this);
        this.performanceOptimizer = new PerformanceOptimizer(this);
        
        // Setup shooting configuration
        this.setupShootingSystem();
        
        // Create world
        this.createWorld();
        
        // Create player at starting point of linear path
        this.startPos = this.tileSystem.getWorldPosition(37, 562);
        console.log('Player starting position:', this.startPos);
        console.log('World bounds:', this.matter.world.bounds);
        console.log('Camera bounds:', this.cameras.main.bounds);
        this.player = new Player(this, this.startPos.x, this.startPos.y, 1); // Chapter 1
        this.gameObjects.push(this.player);
        
        // Debug: Check player position and visibility
        console.log('Player created:', this.player);
        console.log('Player position:', this.player.x, this.player.y);
        console.log('Player visible:', this.player.visible);
        console.log('Player active:', this.player.active);
        console.log('Player depth:', this.player.depth);
        console.log('Player scale:', this.player.scaleX, this.player.scaleY);
        
        // Ensure player is visible and properly positioned
        this.player.setVisible(true);
        this.player.setActive(true);
        this.player.setDepth(10000); // Very high depth to ensure visibility
        
        // Create warehouses and puzzle boards first
        this.createWarehousesAndPuzzles();
        
        // Create enemies (guards for warehouses)
        this.createEnemies();
        
        // Setup camera
        this.setupCamera();
        
        // Start UI scene and connect it to Chapter 1
        this.scene.launch('UIScene');
        
        // Wait a frame for UIScene to initialize, then switch it to GameScene
        this.time.delayedCall(100, () => {
            const uiScene = this.scene.get('UIScene');
            if (uiScene && uiScene.switchGameScene) {
                uiScene.switchGameScene('GameScene');
            }
        });
        
        // Emit event to notify that the game world is ready (including warehouses)
        this.events.emit('worldReady', {
            warehouses: this.tileSystem.warehouses,
            tileSystem: this.tileSystem
        });
        
        // Create collision handlers
        this.setupCollisions();
        
        console.log('GameScene created successfully with tilemap');
    }

    createWorld() {
        // Generate and render the tilemap
        this.tileSystem.generateMap();
        this.tileSystem.renderMap();
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
            this.inventoryBullets = 10;
            this.isReloading = false;
            
            console.log('✅ Player position and stats reset for Chapter 1');
        }
    }

    // Helper function to check if an area is completely clear of obstacles
    isWideOpenArea(centerX, centerY, radius = 5) {
        // Check if the center position and a radius around it are all clear
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                // Check bounds
                if (x < 0 || x >= this.tileSystem.mapWidth || y < 0 || y >= this.tileSystem.mapHeight) {
                    return false;
                }
                
                // Check if position is walkable
                if (!this.tileSystem.isWalkable(x, y)) {
                    return false;
                }
                
                // Check for decorations (trees, rocks, etc.)
                if (this.tileSystem.decorationLayer && this.tileSystem.decorationLayer[x] && this.tileSystem.decorationLayer[x][y]) {
                    return false;
                }
                
                // Check if too close to walls or obstacles (extra safety)
                const distanceToPath = this.tileSystem.getDistanceToNearestPathPoint ? this.tileSystem.getDistanceToNearestPathPoint(x, y) : 100;
                if (distanceToPath < 10) { // Too close to paths/roads
                    return false;
                }
            }
        }
        return true;
    }

    createEnemies() {
        // Create guards for each warehouse based on the docs
        const enemyTypes = ['basic', 'ranged', 'grunt', 'tank'];
        let enemiesCreated = 0;
        
        if (this.tileSystem && this.tileSystem.warehouses) {
            this.tileSystem.warehouses.forEach((warehouseData, warehouseIndex) => {
                // Number of guards based on warehouse (significantly more guards)
                let guardCount;
                switch (warehouseData.id) {
                    case 'warehouse_1': guardCount = 25; break;  // Warehouse 1: 25 guards
                    case 'warehouse_2': guardCount = 35; break;  // Warehouse 2: more guards
                    case 'warehouse_3': guardCount = 45; break;  // Final warehouse: most guards
                    default: guardCount = 25;
                }
                
                // Create guards around each warehouse in wide open areas
                for (let guardIndex = 0; guardIndex < guardCount; guardIndex++) {
                    let guardPlaced = false;
                    
                    // Try multiple attempts to find a good wide open position around the warehouse
                    for (let attempt = 0; attempt < 20 && !guardPlaced; attempt++) {
                        // Calculate guard positions in expanding circles around the warehouse
                        const angle = (guardIndex * (360 / guardCount) + attempt * 15) * (Math.PI / 180);
                        const distance = warehouseData.lightRadius + attempt * 2; // Expand distance with attempts
                        
                        const guardX = Math.round(warehouseData.x + Math.cos(angle) * distance);
                        const guardY = Math.round(warehouseData.y + Math.sin(angle) * distance);
                        
                        // Use more lenient walkable area check for warehouse guards
                        if (this.isWalkableArea(guardX, guardY, 1)) {
                            // Choose enemy type based on warehouse and guard index
                            let enemyType;
                            if (warehouseData.id === 'warehouse_3') {
                                // Final warehouse has strongest enemies
                                enemyType = guardIndex === 0 ? 'tank' : (guardIndex % 2 === 0 ? 'tank' : 'ranged');
                            } else if (warehouseData.id === 'warehouse_2') {
                                // Mid warehouse has mixed enemies
                                enemyType = guardIndex === 0 ? 'tank' : enemyTypes[guardIndex % enemyTypes.length];
                            } else {
                                // First warehouse has basic enemies
                                enemyType = guardIndex === 0 ? 'ranged' : 'basic';
                            }
                            
                            const worldPos = this.tileSystem.getWorldPosition(guardX, guardY);
                            const enemy = new Enemy(this, worldPos.x, worldPos.y, enemyType);
                            this.enemies.add(enemy);
                            this.gameObjects.push(enemy);
                            enemiesCreated++;
                            guardPlaced = true;
                            
                            console.log(`Created ${enemyType} guard ${guardIndex + 1} for ${warehouseData.id} at (${guardX}, ${guardY})`);
                        }
                    }
                    
                    // If no wide open area found, skip this guard
                    if (!guardPlaced) {
                        console.warn(`Could not find wide open area for guard ${guardIndex + 1} of ${warehouseData.id}`);
                    }
                }
            });
        }
        
        // Add scattered enemies throughout the map in open areas
        this.createScatteredEnemies();
        
        // Create dedicated hostage guards
        this.createHostageGuards();
        
        console.log(`Created ${enemiesCreated} enemy guards for ${this.tileSystem.warehouses.length} warehouses`);
    }
    
    createScatteredEnemies() {
        // Add scattered patrol enemies with more lenient spawning rules
        const scatteredEnemyCount = 80; // Add 80 scattered enemies
        let scatteredCreated = 0;
        
        for (let i = 0; i < scatteredEnemyCount; i++) {
            // Try up to 50 times to find a good spawn position
            for (let attempt = 0; attempt < 50; attempt++) {
                const randomX = Math.floor(Math.random() * this.tileSystem.mapWidth);
                const randomY = Math.floor(Math.random() * this.tileSystem.mapHeight);
                
                // Use more lenient area check - just check if basic position is walkable
                if (this.isWalkableArea(randomX, randomY, 2)) { // Much smaller radius requirement
                    // More lenient distance check
                    const distanceToPath = this.tileSystem.getDistanceToNearestPathPoint ? 
                        this.tileSystem.getDistanceToNearestPathPoint(randomX, randomY) : 100;
                    
                    // Much more lenient distance requirements - just avoid being directly on paths
                    if (distanceToPath > 5) {
                        // Choose enemy type based on area difficulty
                        let enemyType = 'basic';
                        if (randomY < 300) { // Northern area (harder)
                            enemyType = Math.random() < 0.5 ? 'ranged' : 'tank';
                        } else if (randomY < 500) { // Middle area
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
        
        // If we didn't create enough enemies, add some guaranteed spawns near player start area
        if (scatteredCreated < 40) {
            this.createGuaranteedEarlyEnemies(40 - scatteredCreated);
        }
        
        console.log(`Created ${scatteredCreated} scattered patrol enemies`);
    }
    
    // Helper function for more lenient walkable area checking
    isWalkableArea(centerX, centerY, radius = 2) {
        // Just check if the center and immediate area (smaller radius) are walkable
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                // Check bounds
                if (x < 0 || x >= this.tileSystem.mapWidth || y < 0 || y >= this.tileSystem.mapHeight) {
                    return false;
                }
                
                // Only check if position is walkable - ignore decorations and paths
                if (!this.tileSystem.isWalkable(x, y)) {
                    return false;
                }
            }
        }
        return true;
    }
    
    createGuaranteedEarlyEnemies(count) {
        // Create enemies in the southern part of the map (near player spawn)
        let created = 0;
        const startY = Math.floor(this.tileSystem.mapHeight * 0.7); // Bottom 30% of map
        
        for (let i = 0; i < count * 5 && created < count; i++) { // Try 5x more attempts
            const randomX = Math.floor(Math.random() * this.tileSystem.mapWidth);
            const randomY = startY + Math.floor(Math.random() * (this.tileSystem.mapHeight - startY));
            
            // Very basic check - just needs to be walkable
            if (this.tileSystem.isWalkable(randomX, randomY)) {
                const worldPos = this.tileSystem.getWorldPosition(randomX, randomY);
                const enemy = new Enemy(this, worldPos.x, worldPos.y, 'basic');
                this.enemies.add(enemy);
                this.gameObjects.push(enemy);
                created++;
                
                console.log(`Created guaranteed early enemy at (${randomX}, ${randomY})`);
            }
        }
        
        console.log(`Created ${created} guaranteed early enemies near spawn area`);
    }
    
    createHostageGuards() {
        // Ensure we have hostages to guard
        if (!this.hostages || this.hostages.children.size === 0) {
            console.log('No hostages found to assign guards to');
            return;
        }
        
        const minGuardsPerHostage = 5;
        const maxGuardsPerHostage = 8;
        let totalGuardsCreated = 0;
        
        this.hostages.children.entries.forEach(hostage => {
            if (!hostage || !hostage.active) return;
            
            const guardsForThisHostage = Math.floor(Math.random() * (maxGuardsPerHostage - minGuardsPerHostage + 1)) + minGuardsPerHostage;
            let guardsPlaced = 0;
            
            console.log(`Assigning ${guardsForThisHostage} guards to hostage at (${Math.round(hostage.x/64)}, ${Math.round(hostage.y/64)})`);
            
            // Create guards in a circle around the hostage
            for (let guardIndex = 0; guardIndex < guardsForThisHostage; guardIndex++) {
                let guardPlaced = false;
                
                // Try multiple positions around the hostage
                for (let attempt = 0; attempt < 25 && !guardPlaced; attempt++) {
                    // Calculate position in expanding circles around hostage
                    const angle = (guardIndex * (360 / guardsForThisHostage) + attempt * 20) * (Math.PI / 180);
                    const distance = 3 + Math.floor(attempt / 5); // Start 3 tiles away, expand outward
                    
                    const hostageGridX = Math.round(hostage.x / 64);
                    const hostageGridY = Math.round(hostage.y / 64);
                    
                    const guardGridX = Math.round(hostageGridX + Math.cos(angle) * distance);
                    const guardGridY = Math.round(hostageGridY + Math.sin(angle) * distance);
                    
                    // Check if position is suitable for guard placement
                    if (this.isWalkableArea(guardGridX, guardGridY, 1)) {
                        // Choose guard type - mix of types with preference for stronger guards
                        let guardType;
                        if (guardIndex === 0) {
                            guardType = 'tank'; // First guard is always a tank
                        } else if (guardIndex === 1) {
                            guardType = 'ranged'; // Second guard is ranged
                        } else {
                            guardType = Math.random() < 0.4 ? 'basic' : (Math.random() < 0.6 ? 'ranged' : 'grunt');
                        }
                        
                        const worldPos = this.tileSystem.getWorldPosition(guardGridX, guardGridY);
                        const guard = new Enemy(this, worldPos.x, worldPos.y, guardType);
                        
                        // Explicitly assign this guard to protect the hostage
                        guard.protectedHostage = hostage;
                        guard.isGuarding = true;
                        guard.guardRange = 8; // Larger guard range for dedicated guards
                        
                        this.enemies.add(guard);
                        this.gameObjects.push(guard);
                        guardsPlaced++;
                        totalGuardsCreated++;
                        guardPlaced = true;
                        
                        console.log(`Created ${guardType} guard ${guardIndex + 1} for hostage at (${guardGridX}, ${guardGridY})`);
                    }
                }
                
                if (!guardPlaced) {
                    console.warn(`Could not place guard ${guardIndex + 1} for hostage - no suitable wide open area found`);
                }
            }
            
            console.log(`Successfully placed ${guardsPlaced}/${guardsForThisHostage} guards for hostage`);
        });
        
        console.log(`Created ${totalGuardsCreated} dedicated hostage guards for ${this.hostages.children.size} hostages`);
    }
    
    createWarehousesAndPuzzles() {
        // Create warehouses from tilemap data
        if (this.tileSystem && this.tileSystem.warehouses) {
            this.tileSystem.warehouses.forEach(warehouseData => {
                const worldPos = this.tileSystem.getWorldPosition(warehouseData.x, warehouseData.y);
                const warehouse = new Granary(this, worldPos.x, worldPos.y, warehouseData.id); // Reuse Granary class for now
                this.granaries.add(warehouse);
                this.gameObjects.push(warehouse);
            });
        }
        
        // Create puzzle boards in better positions (open ground areas)
        this.createImprovedPuzzleBoards();
        
        console.log(`Created ${this.granaries.children.size} warehouses and ${this.hostages.children.size} puzzle boards`);
    }
    
    createImprovedPuzzleBoards() {
        // Create puzzle boards in wide open areas only
        const puzzleLocations = [
            // Near spawn area (safe learning zone)
            { x: 100, y: 650, id: 'puzzle_1', boostType: 'vision' },
            { x: 200, y: 700, id: 'puzzle_2', boostType: 'speed' },
            
            // Mid-map open areas
            { x: 350, y: 450, id: 'puzzle_3', boostType: 'damage' },
            { x: 500, y: 600, id: 'puzzle_4', boostType: 'health' },
            
            // Northern areas (more challenging)
            { x: 600, y: 200, id: 'puzzle_5', boostType: 'vision' },
            { x: 300, y: 150, id: 'puzzle_6', boostType: 'speed' }
        ];
        
        puzzleLocations.forEach(puzzleData => {
            let bestX = puzzleData.x;
            let bestY = puzzleData.y;
            let foundWideOpenArea = false;
            
            // Search in expanding area around the intended location for a wide open spot
            for (let radius = 0; radius <= 50 && !foundWideOpenArea; radius += 10) {
                for (let offsetX = -radius; offsetX <= radius; offsetX += 5) {
                    for (let offsetY = -radius; offsetY <= radius; offsetY += 5) {
                        const testX = puzzleData.x + offsetX;
                        const testY = puzzleData.y + offsetY;
                        
                        // Use more lenient walkable area check for hostages/puzzles
                        if (this.isWalkableArea(testX, testY, 2)) {
                            const distanceToPath = this.tileSystem.getDistanceToNearestPathPoint ? 
                                this.tileSystem.getDistanceToNearestPathPoint(testX, testY) : 100;
                            
                            // More lenient distance requirements for puzzle placement
                            if (distanceToPath > 5 && distanceToPath < 200) {
                                bestX = testX;
                                bestY = testY;
                                foundWideOpenArea = true;
                                break;
                            }
                        }
                    }
                    if (foundWideOpenArea) break;
                }
            }
            
            // Create the puzzle board at the best wide open position found
            const worldPos = this.tileSystem.getWorldPosition(bestX, bestY);
            const puzzle = new Hostage(this, worldPos.x, worldPos.y, puzzleData.id);
            this.hostages.add(puzzle);
            this.gameObjects.push(puzzle);
            
            const areaStatus = foundWideOpenArea ? "wide open area" : "fallback position";
            console.log(`Created puzzle board ${puzzleData.id} (${puzzleData.boostType} boost) at ${areaStatus} (${bestX}, ${bestY})`);
        });
    }

    setupCamera() {
        // Follow player with smoother camera
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08); // Slightly faster follow for smoothness
        this.cameras.main.setZoom(1.587); // Increased zoom by 15% (1.38 × 1.15 = 1.587)
        
        // Set camera bounds to match isometric world bounds
        this.cameras.main.setBounds(-24000, -6000, 48000, 36000);
        
        // Force camera to center on player initially
        this.cameras.main.centerOn(this.player.x, this.player.y);
        
        // Enable camera smoothing
        this.cameras.main.setLerp(0.1, 0.1);
        
        console.log('Camera setup - following player at:', this.player.x, this.player.y);
    }

    setupCollisions() {
        // Simple collision setup - bullets handled by Phaser arcade physics overlap
        console.log('Basic collision setup complete');
    }

    update(time, delta) {
        // Performance optimization: Use slower update frequency for some systems
        this.updateCounter++;
        const isSlowUpdate = this.updateCounter % this.slowUpdateInterval === 0;
        
        // Update performance optimizer first
        if (this.performanceOptimizer) {
            this.performanceOptimizer.update();
        }
        
        // Update player every frame
        if (this.player && this.player.update) {
            this.player.update(time, delta);
        }
        
        // Update enemies less frequently for performance
        if (isSlowUpdate && this.gameObjects) {
            this.gameObjects.forEach(obj => {
                if (obj && obj !== this.player && obj.update && obj.active) {
                    try {
                        obj.update(time, delta);
                    } catch (error) {
                        console.warn('Error updating game object:', error);
                        // Remove problematic object from gameObjects array
                        const index = this.gameObjects.indexOf(obj);
                        if (index > -1) {
                            this.gameObjects.splice(index, 1);
                        }
                    }
                }
            });
        }
        
        // Simple bullet updates
        if (this.bullets && this.bullets.children && this.bullets.children.entries) {
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
                                // Store enemy health before damage to check if it was killed
                                const enemyHealthBefore = enemy.health;
                                enemy.takeDamage(bullet.damage);
                                this.createSimpleHitEffect(bullet.x, bullet.y);
                                
                                // Only give bullets if enemy was actually killed (health went to 0 or below)
                                if (enemyHealthBefore > 0 && enemy.health <= 0) {
                                    this.addBulletsToInventory(this.shootingConfig.bulletsPerKill);
                                }
                                
                                bullet.destroy();
                            }
                        }
                    });
                }

                // Check collisions with warehouses (for player bullets only)
                if (!bullet.isEnemy && this.tileSystem && this.tileSystem.warehouses) {
                    this.tileSystem.warehouses.forEach(warehouse => {
                        if (warehouse.sprite && !warehouse.destroyed && warehouse.health > 0) {
                            const hitDistance = Phaser.Math.Distance.Between(bullet.x, bullet.y, warehouse.sprite.x, warehouse.sprite.y);
                            if (hitDistance < 40) { // Larger hitbox for warehouses
                                this.tileSystem.damageWarehouse(warehouse.id, bullet.damage);
                                this.createSimpleHitEffect(bullet.x, bullet.y);
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
                        this.createSimpleHitEffect(bullet.x, bullet.y);
                        bullet.destroy();
                    }
                }
            }
        });
        }
        
        // Update input system
        if (this.inputSystem) {
            this.inputSystem.update();
        }
        
        // Update tile system visibility less frequently
        if (isSlowUpdate && this.tileSystem) {
            this.tileSystem.updateVisibleTiles();
        }
        
        // Update UI less frequently
        if (isSlowUpdate) {
            this.updateUI();
        }
    }

    handleChapterComplete() {
        // This method is now primarily handled by UIScene via victoryAchieved event
        // but keeping this as a fallback
        console.log('🎉 Chapter 1 completed! All warehouses destroyed! Chapter 2 unlocked!');
    }

    setupShootingSystem() {
        // Shooting specifications
        this.shootingConfig = {
            bulletSpeed: 500, // px/s - player bullets
            enemyBulletSpeed: 200, // px/s - slower enemy bullets
            bulletRange: 300 , // px (6 tiles)
            playerDamage: 25,
            enemyDamage: 15,
            fireRate: 200, // ms cooldown
            maxAmmo: 10,
            reloadTime: 2000, // ms
            maxInventory: 20,
            bulletsPerKill: 3
        };
        
        // Shooting state
        this.lastShotTime = 0;
        this.currentAmmo = this.shootingConfig.maxAmmo;
        this.inventoryBullets = 10; // Start with 10 bullets in inventory
        this.isReloading = false;
        this.reloadStartTime = 0;
        
        console.log('Shooting system initialized with specifications');
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
    }

    enemyShoot(enemy, targetX, targetY) {
        // Simple enemy bullet
        const bullet = this.createSimpleBullet(enemy.x, enemy.y, targetX, targetY, true);
    }

    createSimpleBullet(startX, startY, targetX, targetY, isEnemy) {
        // Create bullet using the bullet asset
        const bullet = this.add.image(startX, startY, 'bullet');
        bullet.setScale(0.05); // Small scale to match environment
        bullet.setDepth(10000);
        
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
        
        console.log(`Bullet created at (${startX}, ${startY}) going to (${targetX}, ${targetY})`);
        return bullet;
    }

    createSimpleHitEffect(x, y) {
        const effect = this.add.circle(x, y, 20, 0xffffff, 0.8);
        effect.setDepth(15000);
        
        this.tweens.add({
            targets: effect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => effect.destroy()
        });
    }

    updateUI() {
        // Send UI update to UI scene
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
        // Create floating text effect
        const text = this.add.text(x, y, `+${amount} bullets`, {
            fontSize: '16px',
            fontFamily: 'Courier New',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(15000);
        
        // Animate the text
        this.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    startReload() {
        if (this.isReloading || this.currentAmmo === this.shootingConfig.maxAmmo || this.inventoryBullets <= 0) {
            if (this.inventoryBullets <= 0) {
                console.log('No bullets in inventory to reload!');
            }
            return;
        }
        
        console.log('Starting reload...');
        this.isReloading = true;
        this.reloadStartTime = this.time.now;
        
        // Update UI
        this.updateUI();
        
        // Complete reload after timer
        this.time.delayedCall(this.shootingConfig.reloadTime, () => {
            // Calculate how many bullets to reload
            const bulletsNeeded = this.shootingConfig.maxAmmo - this.currentAmmo;
            const bulletsToReload = Math.min(bulletsNeeded, this.inventoryBullets);
            
            // Update ammo and inventory
            this.currentAmmo += bulletsToReload;
            this.inventoryBullets -= bulletsToReload;
            
            this.isReloading = false;
            console.log(`Reload complete! Loaded ${bulletsToReload} bullets. Inventory: ${this.inventoryBullets}`);
            this.updateUI();
        });
    }

    destroy() {
        // Clean up all active tweens
        this.tweens.killAll();
        
        // Clean up systems
        if (this.performanceOptimizer) {
            this.performanceOptimizer.destroy && this.performanceOptimizer.destroy();
        }
        
        // Clean up game objects array
        if (this.gameObjects) {
            this.gameObjects.forEach(obj => {
                if (obj && obj.destroy && obj !== this.player) {
                    obj.destroy();
                }
            });
            this.gameObjects = [];
        }
        
        // Call parent destroy
        super.destroy();
    }
} 