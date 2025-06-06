import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Hostage } from '../entities/Hostage.js';
import { Granary } from '../entities/Granary.js';
import { InputSystem } from '../systems/InputSystem.js';
import { TileSystem } from '../systems/TileSystem.js';
import { PerformanceOptimizer } from '../systems/PerformanceOptimizer.js';


export class Chapter3Scene extends Phaser.Scene {
    constructor() {
        super({ key: 'Chapter3Scene' });
        
        this.player = null;
        this.enemies = null;
        this.walls = null;
        this.hostages = null;
        this.granaries = null;
        this.radarTowers = null;
        this.commandingColonel = null;
        
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
        this.radarTowers = this.add.group();
        
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
        console.log('Chapter 3 - Player starting position:', this.startPos);
        console.log('World bounds:', this.matter.world.bounds);
        console.log('Camera bounds:', this.cameras.main.bounds);
        this.player = new Player(this, this.startPos.x, this.startPos.y, 3); // Chapter 3
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
        
        // Create radar towers and commanding colonel
        this.createRadarTowersAndBoss();
        
        // Create enemies (guards for radar towers and colonel)
        this.createEnemies();
        
        // Setup camera
        this.setupCamera();
        
        // Start UI scene and connect it to Chapter 3
        this.scene.launch('UIScene');
        
        // Wait a frame for UIScene to initialize, then switch it to Chapter3Scene
        this.time.delayedCall(100, () => {
            const uiScene = this.scene.get('UIScene');
            if (uiScene && uiScene.switchGameScene) {
                uiScene.switchGameScene('Chapter3Scene');
            }
        });
        
        // Emit event to notify that the game world is ready (including radar towers)
        this.events.emit('worldReady', {
            radarTowers: this.tileSystem.radarTowers,
            commandingColonel: this.commandingColonel,
            tileSystem: this.tileSystem
        });
        
        // Create collision handlers
        this.setupCollisions();
        
        console.log('Chapter3Scene created successfully with tilemap');
    }

    createWorld() {
        // Generate and render the tilemap with village-jungle mix theme
        this.tileSystem.generateMap('village_jungle_mix');
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
            
            console.log('✅ Player position and stats reset for Chapter 3');
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
        // Create guards for each radar tower based on Chapter 3 objectives
        const enemyTypes = ['basic', 'ranged', 'grunt', 'tank'];
        let enemiesCreated = 0;
        
        if (this.tileSystem && this.tileSystem.radarTowers) {
            this.tileSystem.radarTowers.forEach((radarTowerData, towerIndex) => {
                // Number of guards based on radar tower (even more guards than warehouses)
                let guardCount;
                switch (radarTowerData.id) {
                    case 'radar_tower_1': guardCount = 30; break;  // First radar tower: 30 guards
                    case 'radar_tower_2': guardCount = 40; break;  // Second radar tower: 40 guards
                    default: guardCount = 30;
                }
                
                // Create guards around each radar tower in wide open areas
                for (let guardIndex = 0; guardIndex < guardCount; guardIndex++) {
                    let guardPlaced = false;
                    
                    // Try multiple attempts to find a good wide open position around the tower
                    for (let attempt = 0; attempt < 20 && !guardPlaced; attempt++) {
                        // Calculate guard positions in expanding circles around the radar tower
                        const angle = (guardIndex * (360 / guardCount) + attempt * 15) * (Math.PI / 180);
                        const distance = radarTowerData.lightRadius + attempt * 2; // Expand distance with attempts
                        
                        const guardX = Math.round(radarTowerData.x + Math.cos(angle) * distance);
                        const guardY = Math.round(radarTowerData.y + Math.sin(angle) * distance);
                        
                        // Use more lenient walkable area check for radar tower guards
                        if (this.isWalkableArea(guardX, guardY, 1)) {
                            // Choose enemy type based on radar tower and guard index
                            let enemyType;
                            if (radarTowerData.id === 'radar_tower_2') {
                                // Second radar tower has stronger enemies
                                enemyType = guardIndex === 0 ? 'tank' : (guardIndex % 2 === 0 ? 'tank' : 'ranged');
                            } else {
                                // First radar tower has mixed enemies
                                enemyType = guardIndex === 0 ? 'ranged' : enemyTypes[guardIndex % enemyTypes.length];
                            }
                            
                            const worldPos = this.tileSystem.getWorldPosition(guardX, guardY);
                            const enemy = new Enemy(this, worldPos.x, worldPos.y, enemyType);
                            this.enemies.add(enemy);
                            this.gameObjects.push(enemy);
                            enemiesCreated++;
                            guardPlaced = true;
                            
                            console.log(`Created ${enemyType} guard ${guardIndex + 1} for ${radarTowerData.id} at (${guardX}, ${guardY})`);
                        }
                    }
                    
                    // If no wide open area found, skip this guard
                    if (!guardPlaced) {
                        console.warn(`Could not find wide open area for guard ${guardIndex + 1} of ${radarTowerData.id}`);
                    }
                }
            });
        }
        
        // Create guards for the commanding colonel
        this.createColonelGuards();
        
        // Add scattered enemies throughout the map in open areas
        this.createScatteredEnemies();
        
        // Create dedicated hostage guards
        this.createHostageGuards();
        
        console.log(`Created ${enemiesCreated} enemy guards for ${this.tileSystem.radarTowers ? this.tileSystem.radarTowers.length : 0} radar towers`);
    }
    
    createColonelGuards() {
        // Create elite guards around the commanding colonel
        if (this.commandingColonel) {
            const eliteGuardCount = 15; // 15 elite guards around the colonel
            
            for (let guardIndex = 0; guardIndex < eliteGuardCount; guardIndex++) {
                let guardPlaced = false;
                
                // Try multiple attempts to find a good position around the colonel
                for (let attempt = 0; attempt < 20 && !guardPlaced; attempt++) {
                    const angle = (guardIndex * (360 / eliteGuardCount) + attempt * 10) * (Math.PI / 180);
                    const distance = 8 + attempt; // Close formation around colonel
                    
                    const guardX = Math.round(this.commandingColonel.tileX + Math.cos(angle) * distance);
                    const guardY = Math.round(this.commandingColonel.tileY + Math.sin(angle) * distance);
                    
                    if (this.isWalkableArea(guardX, guardY, 1)) {
                        // All colonel guards are elite (tank type)
                        const worldPos = this.tileSystem.getWorldPosition(guardX, guardY);
                        const enemy = new Enemy(this, worldPos.x, worldPos.y, 'tank');
                        this.enemies.add(enemy);
                        this.gameObjects.push(enemy);
                        guardPlaced = true;
                        
                        console.log(`Created elite guard ${guardIndex + 1} for commanding colonel at (${guardX}, ${guardY})`);
                    }
                }
            }
        }
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
                    
                    // Allow enemies much closer to paths
                    if (distanceToPath > 3) { // Much more lenient - only 3 tiles from path
                        const worldPos = this.tileSystem.getWorldPosition(randomX, randomY);
                        const enemyType = ['basic', 'ranged', 'grunt', 'tank'][Math.floor(Math.random() * 4)];
                        const enemy = new Enemy(this, worldPos.x, worldPos.y, enemyType);
                        this.enemies.add(enemy);
                        this.gameObjects.push(enemy);
                        scatteredCreated++;
                        break;
                    }
                }
            }
        }
        
        console.log(`Created ${scatteredCreated} scattered enemies throughout Chapter 3 map`);
    }

    isWalkableArea(centerX, centerY, radius = 2) {
        // More lenient walkable area check
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                if (x < 0 || x >= this.tileSystem.mapWidth || y < 0 || y >= this.tileSystem.mapHeight) {
                    return false;
                }
                if (!this.tileSystem.isWalkable(x, y)) {
                    return false;
                }
            }
        }
        return true;
    }

    createGuaranteedEarlyEnemies(count) {
        // Create enemies guaranteed to be encountered early in the path
        const linearPath = this.tileSystem.linearPath;
        if (!linearPath || linearPath.length === 0) return;
        
        let earlyEnemiesCreated = 0;
        
        // Focus on the first 20% of the path for early encounters
        const earlyPathLength = Math.floor(linearPath.length * 0.2);
        
        for (let i = 0; i < count && earlyEnemiesCreated < count; i++) {
            const pathIndex = Math.floor(Math.random() * earlyPathLength);
            const pathPoint = linearPath[pathIndex];
            
            // Find a walkable position near this path point
            for (let attempt = 0; attempt < 10; attempt++) {
                const offsetX = Math.floor(Math.random() * 10) - 5; // -5 to +5
                const offsetY = Math.floor(Math.random() * 10) - 5;
                
                const enemyX = pathPoint.x + offsetX;
                const enemyY = pathPoint.y + offsetY;
                
                if (this.isWalkableArea(enemyX, enemyY, 1)) {
                    const worldPos = this.tileSystem.getWorldPosition(enemyX, enemyY);
                    const enemyType = ['basic', 'ranged'][Math.floor(Math.random() * 2)]; // Easier enemies early
                    const enemy = new Enemy(this, worldPos.x, worldPos.y, enemyType);
                    this.enemies.add(enemy);
                    this.gameObjects.push(enemy);
                    earlyEnemiesCreated++;
                    break;
                }
            }
        }
        
        console.log(`Created ${earlyEnemiesCreated} guaranteed early enemies`);
    }

    createHostageGuards() {
        // Create guards specifically for hostages - less guards than previous chapters
        const hostageGuardCount = 30; // 30 hostage guards total
        let hostageGuardsCreated = 0;
        
        for (let i = 0; i < hostageGuardCount; i++) {
            // Try up to 40 times to find a good spawn position for hostage guards
            for (let attempt = 0; attempt < 40; attempt++) {
                const randomX = Math.floor(Math.random() * this.tileSystem.mapWidth);
                const randomY = Math.floor(Math.random() * this.tileSystem.mapHeight);
                
                // Check if position is walkable and has room
                if (this.isWalkableArea(randomX, randomY, 2)) {
                    // Check distance from path - hostage guards should be closer to main path
                    const distanceToPath = this.tileSystem.getDistanceToNearestPathPoint ? 
                        this.tileSystem.getDistanceToNearestPathPoint(randomX, randomY) : 100;
                    
                    // Hostage guards closer to path (within 8 tiles)
                    if (distanceToPath <= 8 && distanceToPath >= 2) {
                        const worldPos = this.tileSystem.getWorldPosition(randomX, randomY);
                        
                        // Create a mix of enemy types for hostage guards, slightly stronger than scattered
                        const hostageGuardTypes = ['ranged', 'grunt', 'tank'];
                        const enemyType = hostageGuardTypes[Math.floor(Math.random() * hostageGuardTypes.length)];
                        
                        const enemy = new Enemy(this, worldPos.x, worldPos.y, enemyType);
                        this.enemies.add(enemy);
                        this.gameObjects.push(enemy);
                        hostageGuardsCreated++;
                        break;
                    }
                }
            }
        }
        
        console.log(`Created ${hostageGuardsCreated} hostage guards for Chapter 3`);
    }

    createRadarTowersAndBoss() {
        // Create the map first if not already created
        if (!this.tileSystem.mapGenerated) {
            this.tileSystem.generateMap('village_jungle_mix');
        }
        
        // Create 2 radar towers instead of 3 warehouses
        this.tileSystem.radarTowers = [];
        
        // Radar Tower 1 - Early in the path (village area)
        const radarTower1Pos = this.tileSystem.findSuitableObjectPosition(150, 50); // Earlier position
        if (radarTower1Pos) {
            const radarTower1 = new Granary(this, radarTower1Pos.worldX, radarTower1Pos.worldY, 'radar_tower_1');
            this.radarTowers.add(radarTower1);
            this.gameObjects.push(radarTower1);
            
            this.tileSystem.radarTowers.push({
                id: 'radar_tower_1',
                x: radarTower1Pos.tileX,
                y: radarTower1Pos.tileY,
                worldX: radarTower1Pos.worldX,
                worldY: radarTower1Pos.worldY,
                lightRadius: 25,
                entity: radarTower1
            });
            
            console.log('Created Radar Tower 1 at:', radarTower1Pos);
        }
        
        // Radar Tower 2 - Later in the path (jungle area)
        const radarTower2Pos = this.tileSystem.findSuitableObjectPosition(450, 100); // Later position
        if (radarTower2Pos) {
            const radarTower2 = new Granary(this, radarTower2Pos.worldX, radarTower2Pos.worldY, 'radar_tower_2');
            this.radarTowers.add(radarTower2);
            this.gameObjects.push(radarTower2);
            
            this.tileSystem.radarTowers.push({
                id: 'radar_tower_2',
                x: radarTower2Pos.tileX,
                y: radarTower2Pos.tileY,
                worldX: radarTower2Pos.worldX,
                worldY: radarTower2Pos.worldY,
                lightRadius: 30,
                entity: radarTower2
            });
            
            console.log('Created Radar Tower 2 at:', radarTower2Pos);
        }
        
        // Create the Commanding Colonel boss at the end of the path (jungle area)
        const colonelPos = this.tileSystem.findSuitableObjectPosition(550, 150); // End position
        if (colonelPos) {
            // Create the commanding colonel as a super strong tank enemy
            this.commandingColonel = new Enemy(this, colonelPos.worldX, colonelPos.worldY, 'tank');
            this.commandingColonel.health = 500; // Much more health than regular enemies
            this.commandingColonel.maxHealth = 500;
            this.commandingColonel.damage = 50; // Much more damage
            this.commandingColonel.setScale(1.5); // Larger size
            this.commandingColonel.setTint(0xff0000); // Red tint to distinguish as boss
            this.commandingColonel.tileX = colonelPos.tileX;
            this.commandingColonel.tileY = colonelPos.tileY;
            
            this.enemies.add(this.commandingColonel);
            this.gameObjects.push(this.commandingColonel);
            
            console.log('Created Commanding Colonel boss at:', colonelPos);
        }
        
        console.log(`Chapter 3: Created ${this.tileSystem.radarTowers.length} radar towers and commanding colonel`);
    }

    createImprovedPuzzleBoards() {
        // Chapter 3 doesn't have puzzle boards - it's focused on combat and destruction
        // This method is kept for compatibility but does nothing
        console.log('Chapter 3: No puzzle boards - combat-focused chapter');
    }

    setupCamera() {
        // Set up camera to follow player with smooth movement
        this.cameras.main.setBounds(-24000, -6000, 48000, 36000);
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
        this.cameras.main.setZoom(0.8); // Slightly zoomed out for better visibility
        
        // Set camera bounds to prevent showing empty space
        this.cameras.main.setLerp(0.1, 0.1);
        
        console.log('Chapter 3 camera setup complete');
    }

    setupCollisions() {
        // Same collision setup as Chapter 1
        console.log('Chapter 3 collision handlers set up');
    }

    update(time, delta) {
        // Performance optimization: update at different frequencies
        this.updateCounter++;
        
        // Update input system every frame
        if (this.inputSystem) {
            this.inputSystem.update();
        }
        
        // Update player every frame
        if (this.player && this.player.update) {
            this.player.update(time, delta);
        }
        
        // Update other game objects at reduced frequency
        if (this.updateCounter % this.slowUpdateInterval === 0) {
            // Update enemies
            this.enemies.children.entries.forEach(enemy => {
                if (enemy && enemy.update) {
                    enemy.update(time, delta);
                }
            });
            
            // Update performance optimizer
            if (this.performanceOptimizer) {
                this.performanceOptimizer.optimizeObjects(this.gameObjects);
            }
        }
        
        // Check for game completion every 30 frames
        if (this.updateCounter % 30 === 0) {
            this.checkChapter3Completion();
        }
        
        // Update UI every 10 frames
        if (this.updateCounter % 10 === 0) {
            this.updateUI();
        }
        
        // Clean up bullets that are off-screen
        if (this.updateCounter % 60 === 0) {
            this.cleanupBullets();
        }
        
        // Handle shooting cooldown
        if (this.shootingCooldown > 0) {
            this.shootingCooldown -= delta;
        }
    }

    checkChapter3Completion() {
        if (!this.tileSystem.radarTowers) return;
        
        // Check if all radar towers are destroyed
        const destroyedRadarTowers = this.tileSystem.radarTowers.filter(tower => 
            !tower.entity || !tower.entity.active || tower.entity.health <= 0
        ).length;
        
        // Check if commanding colonel is defeated
        const colonelDefeated = !this.commandingColonel || !this.commandingColonel.active || this.commandingColonel.health <= 0;
        
        const totalRadarTowers = this.tileSystem.radarTowers.length;
        
        // Chapter 3 is complete when all radar towers are destroyed AND colonel is defeated
        if (destroyedRadarTowers === totalRadarTowers && colonelDefeated) {
            console.log('🎉 Chapter 3 completed! All radar towers destroyed and commanding colonel defeated!');
            this.handleChapterComplete();
        } else {
            // Update progress
            console.log(`Chapter 3 progress: ${destroyedRadarTowers}/${totalRadarTowers} radar towers destroyed, Colonel defeated: ${colonelDefeated}`);
        }
    }

    cleanupBullets() {
        const cameraBounds = this.cameras.main.worldView;
        const buffer = 500; // Extra buffer around visible area
        
        this.bullets.children.entries.forEach(bullet => {
            if (bullet && bullet.active) {
                const bulletX = bullet.x;
                const bulletY = bullet.y;
                
                // Remove bullet if it's far outside camera bounds
                if (bulletX < cameraBounds.x - buffer || 
                    bulletX > cameraBounds.x + cameraBounds.width + buffer ||
                    bulletY < cameraBounds.y - buffer || 
                    bulletY > cameraBounds.y + cameraBounds.height + buffer) {
                    bullet.destroy();
                }
            }
        });
    }

    handleChapterComplete() {
        // Mark Chapter 3 as completed
        if (this.scene.scene.game.chapterManager) {
            this.scene.scene.game.chapterManager.completeChapter(3);
        }
        
        // Show completion message and return to menu
        this.time.delayedCall(2000, () => {
            this.scene.start('MainMenuScene');
        });
    }

    setupShootingSystem() {
        // Configure shooting system
        this.shootingConfig = {
            maxAmmo: 30,
            reloadTime: 2000, // 2 seconds
            shootCooldown: 150 // milliseconds between shots
        };
        
        this.currentAmmo = this.shootingConfig.maxAmmo;
        this.isReloading = false;
        this.shootingCooldown = 0;
        this.inventoryBullets = 10; // Start with some extra bullets
        
        console.log('Chapter 3 shooting system configured');
    }

    shoot(targetX, targetY) {
        // Check if we can shoot
        if (this.shootingCooldown > 0 || this.isReloading || this.currentAmmo <= 0) {
            return;
        }
        
        // Create bullet from player position to target
        this.createSimpleBullet(this.player.x, this.player.y, targetX, targetY, false);
        
        // Reduce ammo
        this.currentAmmo--;
        this.shootingCooldown = this.shootingConfig.shootCooldown;
        
        // Auto-reload if out of ammo
        if (this.currentAmmo <= 0 && this.inventoryBullets > 0) {
            this.startReload();
        }
        
        console.log(`Shot fired! Ammo: ${this.currentAmmo}/${this.shootingConfig.maxAmmo}`);
    }

    enemyShoot(enemy, targetX, targetY) {
        // Enemy shooting logic
        this.createSimpleBullet(enemy.x, enemy.y, targetX, targetY, true);
    }

    createSimpleBullet(startX, startY, targetX, targetY, isEnemy) {
        // Calculate direction and speed
        const direction = Math.atan2(targetY - startY, targetX - startX);
        const speed = 800; // pixels per second
        
        // Create bullet sprite
        const bullet = this.add.image(startX, startY, 'bullet');
        bullet.setScale(0.5);
        bullet.setRotation(direction);
        bullet.setDepth(5000);
        
        // Add physics body
        this.matter.add.gameObject(bullet, {
            isSensor: true,
            ignoreGravity: true
        });
        
        // Set velocity
        const velocityX = Math.cos(direction) * speed;
        const velocityY = Math.sin(direction) * speed;
        bullet.setVelocity(velocityX / 60, velocityY / 60); // Convert to per-frame
        
        // Add to bullets group
        this.bullets.add(bullet);
        
        // Set bullet properties
        bullet.isEnemy = isEnemy;
        bullet.damage = isEnemy ? 20 : 25; // Player bullets do more damage
        
        // Destroy bullet after 3 seconds
        this.time.delayedCall(3000, () => {
            if (bullet && bullet.active) {
                bullet.destroy();
            }
        });
        
        // Handle collisions
        bullet.setOnCollide((event) => {
            const { bodyA, bodyB } = event;
            const bulletBody = bullet.body === bodyA ? bodyA : bodyB;
            const otherBody = bullet.body === bodyA ? bodyB : bodyA;
            
            if (otherBody.gameObject) {
                const target = otherBody.gameObject;
                
                // Check if bullet hit appropriate target
                if (isEnemy && target === this.player) {
                    // Enemy bullet hit player
                    if (target.takeDamage) {
                        target.takeDamage(bullet.damage);
                        this.createSimpleHitEffect(bullet.x, bullet.y);
                        bullet.destroy();
                    }
                } else if (!isEnemy && this.enemies.contains(target)) {
                    // Player bullet hit enemy
                    if (target.takeDamage) {
                        target.takeDamage(bullet.damage);
                        this.createSimpleHitEffect(bullet.x, bullet.y);
                        bullet.destroy();
                    }
                } else if (!isEnemy && this.radarTowers.contains(target)) {
                    // Player bullet hit radar tower
                    if (target.takeDamage) {
                        target.takeDamage(bullet.damage);
                        this.createSimpleHitEffect(bullet.x, bullet.y);
                        bullet.destroy();
                    }
                }
            }
        });
    }

    createSimpleHitEffect(x, y) {
        // Create simple hit effect
        const hitEffect = this.add.circle(x, y, 10, 0xff0000, 0.8);
        hitEffect.setDepth(6000);
        
        // Animate the effect
        this.tweens.add({
            targets: hitEffect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                hitEffect.destroy();
            }
        });
    }

    updateUI() {
        // Get UI scene and update it with Chapter 3 data
        const uiScene = this.scene.get('UIScene');
        if (uiScene && uiScene.updateGameData) {
            uiScene.updateGameData({
                player: this.player,
                radarTowers: this.tileSystem.radarTowers,
                commandingColonel: this.commandingColonel,
                currentAmmo: this.currentAmmo,
                maxAmmo: this.shootingConfig.maxAmmo,
                inventoryBullets: this.inventoryBullets,
                isReloading: this.isReloading,
                enemies: this.enemies.children.entries.filter(enemy => enemy.active),
                chapter: 3
            });
        }
    }

    addBulletsToInventory(amount) {
        this.inventoryBullets += amount;
        console.log(`Added ${amount} bullets to inventory. Total: ${this.inventoryBullets}`);
        
        // Create visual effect
        this.createBulletPickupEffect(this.player.x, this.player.y, amount);
    }

    createBulletPickupEffect(x, y, amount) {
        // Create floating text effect
        const text = this.add.text(x, y, `+${amount} AMMO`, {
            fontSize: '16px',
            fontFamily: 'Courier New',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2
        });
        text.setOrigin(0.5);
        text.setDepth(10000);
        
        // Animate the text
        this.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                text.destroy();
            }
        });
    }

    startReload() {
        if (this.isReloading || this.inventoryBullets <= 0) {
            return;
        }
        
        this.isReloading = true;
        console.log('🔄 Reloading...');
        
        // Show reload indicator
        const reloadText = this.add.text(this.player.x, this.player.y - 30, 'RELOADING...', {
            fontSize: '14px',
            fontFamily: 'Courier New',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 2 }
        });
        reloadText.setOrigin(0.5);
        reloadText.setDepth(10001);
        
        // Reload after delay
        this.time.delayedCall(this.shootingConfig.reloadTime, () => {
            const ammoNeeded = this.shootingConfig.maxAmmo - this.currentAmmo;
            const ammoToReload = Math.min(ammoNeeded, this.inventoryBullets);
            
            this.currentAmmo += ammoToReload;
            this.inventoryBullets -= ammoToReload;
            this.isReloading = false;
            
            reloadText.destroy();
            
            console.log(`✅ Reload complete! Ammo: ${this.currentAmmo}/${this.shootingConfig.maxAmmo}, Inventory: ${this.inventoryBullets}`);
        });
    }

    destroy() {
        // Clean up resources
        if (this.inputSystem) {
            this.inputSystem.destroy();
        }
        if (this.tileSystem) {
            this.tileSystem.destroy();
        }
        if (this.performanceOptimizer) {
            this.performanceOptimizer.destroy();
        }
        
        // Clear game objects array
        this.gameObjects = [];
        
        console.log('Chapter3Scene destroyed');
        super.destroy();
    }
} 