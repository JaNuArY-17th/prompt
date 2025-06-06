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
        
        // Override getObjectives method for Chapter 3
        this.tileSystem.getObjectives = () => {
            const destroyedRadarTowers = this.tileSystem.radarTowers ? this.tileSystem.radarTowers.filter(tower => 
                tower.destroyed || tower.health <= 0
            ).length : 0;
            
            const colonelDefeated = !this.commandingColonel || !this.commandingColonel.active || this.commandingColonel.health <= 0;
            
            return {
                mainObjective: {
                    description: "Destroy 2 radar towers",
                    progress: destroyedRadarTowers,
                    total: 2, // Only the 2 radar towers
                    completed: destroyedRadarTowers >= 2
                },
                sideObjectives: [
                    {
                        description: "Eliminate the Commanding Colonel",
                        progress: colonelDefeated ? 1 : 0,
                        total: 1,
                        completed: colonelDefeated
                    },
                    {
                        description: "Kill enemies",
                        progress: this.tileSystem.killedEnemies,
                        total: 200,
                        completed: this.tileSystem.killedEnemies >= 200
                    }
                ]
            };
        };
        
        // Setup shooting configuration
        this.setupShootingSystem();
        
        // Create world
        this.createWorld();
        
        // Create player at starting point of linear path
        this.startPos = this.tileSystem.getWorldPosition(37, 562);
        console.log('Chapter 3 - Player starting position:', this.startPos);
        console.log('World bounds:', this.matter.world.bounds);
        console.log('Camera bounds:', this.cameras.main.bounds);
        
        // Ensure Chapter 3 assets are loaded before creating player
        this.ensureChapter3AssetsLoaded(() => {
            // Create player with Chapter 3 specific assets
            this.player = new Player(this, this.startPos.x, this.startPos.y, 3); // Chapter 3
            this.gameObjects.push(this.player);
            
            console.log(`🎭 Chapter 3 player created with texture: ${this.player.texture.key}`);
            
            // Force Chapter 3 texture after player creation
            this.forceChapter3PlayerTexture();
            
            // Continue with the rest of the scene setup
            this.continueSceneSetup();
        });
        

    }

    createWorld() {
        // Generate and render the tilemap with village-jungle mix theme
        this.tileSystem.generateMap('village_jungle_mix');
        this.tileSystem.renderMap();
    }

    ensureChapter3AssetsLoaded(callback) {
        console.log('🎭 Ensuring Chapter 3 assets are loaded...');
        
        // Check if Chapter 3 textures exist
        const chapter3Texture = 'player_ch3_down_1';
        if (this.textures.exists(chapter3Texture)) {
            console.log('✅ Chapter 3 assets already loaded');
            callback();
            return;
        }
        
        console.log('🔄 Chapter 3 assets not found, force loading...');
        
        // Force load Chapter 3 assets
        const directions = ['up', 'down', 'left', 'right'];
        const frames = [1, 2, 3, 4];
        
        directions.forEach(direction => {
            frames.forEach(frame => {
                const key = `player_ch3_${direction}_${frame}`;
                const path = `assets/chapter1-main/${direction}-${frame}.png`;
                this.load.image(key, path);
            });
        });
        
        this.load.once('complete', () => {
            console.log('✅ Chapter 3 assets loaded successfully');
            callback();
        });
        
        this.load.start();
    }



    continueSceneSetup() {
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

    forceChapter3PlayerTexture() {
        if (!this.player) return;
        
        console.log(`🎭 Attempting to force Chapter 3 texture...`);
        
        // Try using the fixChapterTexture method first
        if (this.player.fixChapterTexture()) {
            console.log(`✅ Successfully fixed Chapter 3 texture using fixChapterTexture method`);
            return;
        }
        
        console.log(`🎭 Chapter 3 texture verification complete`);
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
                // Number of guards based on radar tower (HEAVILY GUARDED)
                let guardCount;
                switch (radarTowerData.id) {
                    case 'radar_tower_1': guardCount = 50; break;  // First radar tower: 50 guards
                    case 'radar_tower_2': guardCount = 60; break;  // Second radar tower: 60 guards
                    default: guardCount = 50;
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
            const eliteGuardCount = 30; // 30 elite guards around the colonel
            
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
        const scatteredEnemyCount = 120; // Add 120 scattered enemies
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
        // Create guards specifically for hostages - more guards for Chapter 3
        const hostageGuardCount = 50; // 50 hostage guards total
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
        
        // Create 2 heavily guarded radar towers and 1 boss warehouse
        this.tileSystem.radarTowers = [];
        this.tileSystem.warehouses = []; // For the boss warehouse
        
        // Radar Tower 1 - Early in the path (village area) - HEAVILY GUARDED
        const radarTower1Pos = this.tileSystem.findSuitableObjectPosition(150, 50);
        if (radarTower1Pos) {
            // Create radar tower using actual radar sprite
            const radarTower1 = this.add.image(radarTower1Pos.worldX, radarTower1Pos.worldY, 'radar_tower');
            radarTower1.setScale(1.2); // Slightly larger
            radarTower1.setDepth(20000 + radarTower1Pos.worldY); // High depth like warehouses
            
            // Add health properties to the sprite
            radarTower1.health = 150; // More health than regular warehouses
            radarTower1.maxHealth = 150;
            radarTower1.destroyed = false;
            radarTower1.id = 'radar_tower_1';
            
            // Add to radar towers group (create if doesn't exist)
            if (!this.radarTowers) {
                this.radarTowers = this.add.group();
            }
            this.radarTowers.add(radarTower1);
            this.gameObjects.push(radarTower1);
            
            this.tileSystem.radarTowers.push({
                id: 'radar_tower_1',
                x: radarTower1Pos.tileX,
                y: radarTower1Pos.tileY,
                worldX: radarTower1Pos.worldX,
                worldY: radarTower1Pos.worldY,
                lightRadius: 35, // Larger detection radius
                entity: radarTower1,
                health: 150,
                maxHealth: 150,
                destroyed: false,
                sprite: radarTower1
            });
            
            console.log('Created HEAVILY GUARDED Radar Tower 1 at:', radarTower1Pos);
            
            // Add supporting radar infrastructure around tower 1
            this.createRadarInfrastructure(radarTower1Pos.worldX, radarTower1Pos.worldY, 'tower_1');
        }
        
        // Radar Tower 2 - Later in the path (jungle area) - HEAVILY GUARDED
        const radarTower2Pos = this.tileSystem.findSuitableObjectPosition(450, 100);
        if (radarTower2Pos) {
            // Create radar tower using actual radar sprite
            const radarTower2 = this.add.image(radarTower2Pos.worldX, radarTower2Pos.worldY, 'radar_tower');
            radarTower2.setScale(1.3); // Even larger
            radarTower2.setDepth(20000 + radarTower2Pos.worldY); // High depth like warehouses
            radarTower2.setTint(0x8888ff); // Light blue tint for stronger tower
            
            // Add health properties to the sprite
            radarTower2.health = 200; // Even more health
            radarTower2.maxHealth = 200;
            radarTower2.destroyed = false;
            radarTower2.id = 'radar_tower_2';
            
            this.radarTowers.add(radarTower2);
            this.gameObjects.push(radarTower2);
            
            this.tileSystem.radarTowers.push({
                id: 'radar_tower_2',
                x: radarTower2Pos.tileX,
                y: radarTower2Pos.tileY,
                worldX: radarTower2Pos.worldX,
                worldY: radarTower2Pos.worldY,
                lightRadius: 40, // Even larger detection radius
                entity: radarTower2,
                health: 200,
                maxHealth: 200,
                destroyed: false,
                sprite: radarTower2
            });
            
            console.log('Created HEAVILY GUARDED Radar Tower 2 at:', radarTower2Pos);
            
            // Add supporting radar infrastructure around tower 2
            this.createRadarInfrastructure(radarTower2Pos.worldX, radarTower2Pos.worldY, 'tower_2');
        }
        
        // Create the Boss Warehouse with Commanding Colonel - FINAL BOSS FIGHT
        const bossWarehousePos = this.tileSystem.findSuitableObjectPosition(550, 150);
        if (bossWarehousePos) {
            // Create the boss warehouse (command center)
            const bossWarehouse = new Granary(this, bossWarehousePos.worldX, bossWarehousePos.worldY, 'boss_command_center');
            bossWarehouse.health = 300; // Very high health
            bossWarehouse.maxHealth = 300;
            bossWarehouse.setScale(1.5); // Much larger
            bossWarehouse.setTint(0xff0000); // Red tint for boss location
            this.granaries.add(bossWarehouse);
            this.gameObjects.push(bossWarehouse);
            
            this.tileSystem.warehouses.push({
                id: 'boss_command_center',
                x: bossWarehousePos.tileX,
                y: bossWarehousePos.tileY,
                worldX: bossWarehousePos.worldX,
                worldY: bossWarehousePos.worldY,
                lightRadius: 50, // Massive detection radius
                entity: bossWarehouse,
                health: 300,
                maxHealth: 300,
                destroyed: false,
                sprite: bossWarehouse
            });
            
            // Create the Commanding Colonel boss INSIDE the warehouse area
            const colonelOffsetX = bossWarehousePos.worldX + (Math.random() - 0.5) * 100;
            const colonelOffsetY = bossWarehousePos.worldY + (Math.random() - 0.5) * 100;
            
            this.commandingColonel = new Enemy(this, colonelOffsetX, colonelOffsetY, 'tank');
            this.commandingColonel.health = 500; // Massive health
            this.commandingColonel.maxHealth = 500;
            this.commandingColonel.damage = 50; // High damage
            this.commandingColonel.setScale(1.8); // Very large size
            this.commandingColonel.setTint(0xff0000); // Red tint for boss
            this.commandingColonel.tileX = bossWarehousePos.tileX;
            this.commandingColonel.tileY = bossWarehousePos.tileY;
            
            this.enemies.add(this.commandingColonel);
            this.gameObjects.push(this.commandingColonel);
            
            console.log('Created Boss Command Center with Commanding Colonel at:', bossWarehousePos);
        }
        
        // Create additional military buildings around the map
        this.createMilitaryBuildings();
        
        // Preload radar tower and boss areas for dev teleportation
        this.tileSystem.preloadRadarTowerAreas();
        
        console.log(`Chapter 3: Created ${this.tileSystem.radarTowers.length} radar towers, 1 boss warehouse, and commanding colonel`);
    }

    createRadarInfrastructure(centerX, centerY, towerId) {
        // Create supporting infrastructure around radar towers
        const infrastructureItems = [
            { type: 'communication_antenna', distance: 80, angle: 0 },
            { type: 'control_bunker', distance: 100, angle: 90 },
            { type: 'power_generator', distance: 90, angle: 180 },
            { type: 'guard_post', distance: 110, angle: 270 },
            { type: 'radar_dish_small', distance: 60, angle: 45 },
            { type: 'radar_dish_small', distance: 60, angle: 135 },
            { type: 'fence_section', distance: 120, angle: 225 },
            { type: 'fence_section', distance: 120, angle: 315 }
        ];

        infrastructureItems.forEach((item, index) => {
            const angleRad = (item.angle * Math.PI) / 180;
            const x = centerX + Math.cos(angleRad) * item.distance;
            const y = centerY + Math.sin(angleRad) * item.distance;

            let sprite;
            let scale = 0.6; // Smaller than main radar tower
            let tint = 0xcccccc; // Light gray for infrastructure

            switch (item.type) {
                case 'communication_antenna':
                case 'radar_dish_small':
                    // Use smaller radar sprites for dishes and antennas
                    sprite = this.add.image(x, y, 'radar_tower');
                    scale = 0.4;
                    tint = 0xaaaaaa;
                    break;
                case 'control_bunker':
                case 'guard_post':
                    // Use house sprites for bunkers and guard posts
                    sprite = this.add.image(x, y, 'house-1');
                    scale = 0.7;
                    tint = 0x666666; // Darker gray for military buildings
                    break;
                case 'power_generator':
                    // Use warehouse sprite for generator
                    sprite = this.add.image(x, y, 'warehouse');
                    scale = 0.5;
                    tint = 0x444444; // Dark gray for machinery
                    break;
                case 'fence_section':
                    // Use stone sprites for fence sections
                    sprite = this.add.image(x, y, 'stone_medium');
                    scale = 0.8;
                    tint = 0x888888; // Medium gray for fencing
                    break;
                default:
                    sprite = this.add.image(x, y, 'stone_small');
                    break;
            }

            if (sprite) {
                sprite.setScale(scale);
                sprite.setTint(tint);
                sprite.setDepth(15000 + y); // Lower depth than main radar tower
                sprite.setAlpha(0.8); // Slightly transparent to show they're secondary
                
                // Add to game objects for cleanup
                this.gameObjects.push(sprite);
                
                console.log(`Created radar infrastructure: ${item.type} for ${towerId} at (${Math.round(x)}, ${Math.round(y)})`);
            }
        });

        console.log(`✅ Radar infrastructure created around ${towerId}`);
    }
    
    createMilitaryBuildings() {
        // Add more military buildings throughout the map for immersion
        const buildingTypes = ['barracks', 'watchtower', 'supply_depot', 'communication_hub'];
        const buildingCount = 8; // Add 8 additional buildings
        
        for (let i = 0; i < buildingCount; i++) {
            // Try to find a good position
            for (let attempt = 0; attempt < 30; attempt++) {
                const randomX = Math.floor(Math.random() * this.tileSystem.mapWidth);
                const randomY = Math.floor(Math.random() * this.tileSystem.mapHeight);
                
                if (this.isWalkableArea(randomX, randomY, 3)) {
                    const worldPos = this.tileSystem.getWorldPosition(randomX, randomY);
                    const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
                    
                    // Create building using Granary entity with different properties
                    const building = new Granary(this, worldPos.x, worldPos.y, buildingType);
                    building.health = 75; // Less health than main objectives
                    building.maxHealth = 75;
                    building.setScale(0.8); // Smaller than main objectives
                    building.setTint(0x888888); // Gray tint for secondary buildings
                    
                    this.granaries.add(building);
                    this.gameObjects.push(building);
                    
                    console.log(`Created military building (${buildingType}) at (${randomX}, ${randomY})`);
                    break;
                }
            }
        }
    }

    createImprovedPuzzleBoards() {
        // Chapter 3 doesn't have puzzle boards - it's focused on combat and destruction
        // This method is kept for compatibility but does nothing
        console.log('Chapter 3: No puzzle boards - combat-focused chapter');
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
        // Same collision setup as Chapter 1
        console.log('Chapter 3 collision handlers set up');
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

                // Check collisions with radar towers (for player bullets only)
                if (!bullet.isEnemy && this.tileSystem && this.tileSystem.radarTowers) {
                    this.tileSystem.radarTowers.forEach(radarTower => {
                        if (radarTower.entity && !radarTower.destroyed && radarTower.health > 0) {
                            const hitDistance = Phaser.Math.Distance.Between(bullet.x, bullet.y, radarTower.entity.x, radarTower.entity.y);
                            if (hitDistance < 40) { // Larger hitbox for radar towers
                                // Manual damage calculation since radar towers are now image sprites
                                radarTower.health -= bullet.damage;
                                radarTower.entity.health = radarTower.health; // Keep entity health in sync
                                
                                // Visual damage effect - tint darker as health decreases
                                const healthPercent = radarTower.health / radarTower.maxHealth;
                                if (healthPercent <= 0.3) {
                                    radarTower.entity.setTint(0xff4444); // Red tint when critically damaged
                                } else if (healthPercent <= 0.6) {
                                    radarTower.entity.setTint(0xffaa44); // Orange tint when moderately damaged
                                }
                                
                                if (radarTower.health <= 0) {
                                    radarTower.destroyed = true;
                                    radarTower.entity.setTint(0x444444); // Dark gray when destroyed
                                    radarTower.entity.setAlpha(0.5); // Semi-transparent when destroyed
                                    console.log(`📡 Radar Tower ${radarTower.id} destroyed!`);
                                }
                                
                                this.createSimpleHitEffect(bullet.x, bullet.y);
                                bullet.destroy();
                            }
                        }
                    });
                }

                // Check collisions with boss warehouse (for player bullets only)
                if (!bullet.isEnemy && this.tileSystem && this.tileSystem.warehouses) {
                    this.tileSystem.warehouses.forEach(warehouse => {
                        if (warehouse.entity && !warehouse.destroyed && warehouse.health > 0) {
                            const hitDistance = Phaser.Math.Distance.Between(bullet.x, bullet.y, warehouse.entity.x, warehouse.entity.y);
                            if (hitDistance < 50) { // Large hitbox for boss warehouse
                                warehouse.entity.takeDamage(bullet.damage);
                                warehouse.health = warehouse.entity.health;
                                if (warehouse.health <= 0) {
                                    warehouse.destroyed = true;
                                }
                                this.createSimpleHitEffect(bullet.x, bullet.y);
                                bullet.destroy();
                            }
                        }
                    });
                }

                // Check collisions with commanding colonel (for player bullets only)
                if (!bullet.isEnemy && this.commandingColonel && this.commandingColonel.active && this.commandingColonel.health > 0) {
                    const hitDistance = Phaser.Math.Distance.Between(bullet.x, bullet.y, this.commandingColonel.x, this.commandingColonel.y);
                    if (hitDistance < 30) { // Hitbox for commanding colonel
                        this.commandingColonel.takeDamage(bullet.damage);
                        this.createSimpleHitEffect(bullet.x, bullet.y);
                        bullet.destroy();
                        
                        // Give extra bullets for hitting the colonel
                        this.addBulletsToInventory(this.shootingConfig.bulletsPerKill * 2);
                    }
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
        
        // Check for Chapter 3 completion every 30 frames
        if (this.updateCounter % 30 === 0) {
            this.checkChapter3Completion();
        }
    }

    checkChapter3Completion() {
        if (!this.tileSystem.radarTowers) return;
        
        // Check if all radar towers are destroyed
        const destroyedRadarTowers = this.tileSystem.radarTowers ? this.tileSystem.radarTowers.filter(tower => 
            tower.destroyed || tower.health <= 0
        ).length : 0;
        
        // Check if commanding colonel is defeated
        const colonelDefeated = !this.commandingColonel || !this.commandingColonel.active || this.commandingColonel.health <= 0;
        
        const totalRadarTowers = this.tileSystem.radarTowers ? this.tileSystem.radarTowers.length : 0;
        
        // Chapter 3 is complete when all radar towers are destroyed AND colonel is defeated
        if (destroyedRadarTowers >= 2 && colonelDefeated) {
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
        console.log('🎉 Chapter 3 completed! All radar towers and boss warehouse destroyed, commanding colonel defeated!');
        
        // Emit victory event for UIScene to handle
        this.events.emit('victoryAchieved', {
            chapter: 3,
            description: 'Final assault completed successfully!',
            objectives: {
                radarTowersDestroyed: this.tileSystem.radarTowers.filter(tower => tower.destroyed).length,
                bossDefeated: !this.commandingColonel || this.commandingColonel.health <= 0
            }
        });
        
        // Mark Chapter 3 as completed
        if (this.game.chapterManager) {
            this.game.chapterManager.completeChapter(3);
            this.game.chapterManager.saveProgress();
        }
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
        // Enemy shooting logic
        this.createSimpleBullet(enemy.x, enemy.y, targetX, targetY, true);
    }

    createSimpleBullet(startX, startY, targetX, targetY, isEnemy) {
        // Create bullet using the bullet asset
        const bullet = this.add.image(startX, startY, 'bullet');
        bullet.setScale(0.05); // Small scale to match environment
        bullet.setDepth(1000); // High depth for visibility
        
        // Set bullet start position for range calculation
        bullet.startX = startX;
        bullet.startY = startY;
        bullet.timeAlive = 0;
        
        // Calculate direction and velocity
        const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
        const direction = Math.atan2(targetY - startY, targetX - startX);
        
        // Set speed based on bullet type
        const speed = isEnemy ? this.shootingConfig.enemyBulletSpeed : this.shootingConfig.bulletSpeed;
        bullet.velocityX = Math.cos(direction) * speed;
        bullet.velocityY = Math.sin(direction) * speed;
        
        // Set bullet properties
        bullet.isEnemy = isEnemy;
        bullet.damage = isEnemy ? this.shootingConfig.enemyDamage : this.shootingConfig.playerDamage;
        
        // Rotate bullet to face direction of travel
        bullet.setRotation(direction);
        
        // Add to bullets group for tracking
        this.bullets.add(bullet);
        
        return bullet;
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