export class TileSystem {
    constructor(scene) {
        this.scene = scene;
        this.tileSize = 32; // Scaled down for higher resolution
        this.mapWidth = 600; // Compact width for linear progression
        this.mapHeight = 600; // Square map for better minimap display
        this.tiles = [];
        this.obstacleLayer = [];
        this.decorationLayer = [];
        this.hidingSpots = []; // For bushes and haystacks
        this.enemyZones = []; // For light/danger zones
        this.puzzleBoards = []; // For stat-boosting puzzles
        
        // Linear path configuration
        this.pathWidth = 6; // About 200px (6 tiles * 32px = 192px)
        this.pathPoints = []; // Store path waypoints for linear progression
        
        // Performance optimization: Sprite management with TRUE deletion
        this.tileSprites = new Map(); // Active rendered tiles (will be deleted when out of view)
        this.visibleTiles = new Set(); // Track currently visible tiles
        this.lastCameraX = 0;
        this.lastCameraY = 0;
        this.renderRadius = 25; // Render radius for map
        
        // Memory management tracking
        this.memoryStats = {
            spritesCreated: 0,
            spritesDestroyed: 0,
            currentSpriteCount: 0,
            peakSpriteCount: 0
        };
        
        // Game objectives - changed from hostages to warehouses
        this.warehouses = []; // 3 rice warehouses to destroy
        this.puzzles = []; // Puzzle boards for stat boosts
        this.destroyedWarehouses = 0;
        this.solvedPuzzles = 0;
        this.killedEnemies = 0;
        
        // Player stats (boosted by puzzles)
        this.playerStats = {
            health: 100,
            damage: 20,
            speed: 4,
            visionRange: 4 // Base vision range in tiles
        };

        // Exploration tracking for minimap (this stays permanent)
        this.exploredTiles = new Set();
        this.explorationRadius = 8; // Tiles around player that get explored
        this.lastPlayerGrid = { x: 37, y: 562 }; // Initialize with spawn position (scaled 0.75)
    }

    preloadAssets() {
        // Ground tiles - diverse terrain (from environment folder)
        this.scene.load.image('grass_green', 'assets/environment/grass.png');
        this.scene.load.image('dirt_brown', 'assets/environment/soil.png');
        this.scene.load.image('water_blue', 'assets/environment/water.png');
        
        // Road system - using soil texture for dirt roads
        this.scene.load.image('dirt_road_straight', 'assets/environment/soil.png'); // Soil texture for dirt roads
        this.scene.load.image('dirt_road_corner', 'assets/environment/soil.png'); // Soil texture for dirt roads
        this.scene.load.image('dirt_road_t_junction', 'assets/environment/soil.png'); // Soil texture for dirt roads
        this.scene.load.image('dirt_road_crossing', 'assets/environment/soil.png'); // Soil texture for dirt roads
        
        // Vegetation - rich forest ecosystem and hiding spots (from environment folder)
        this.scene.load.image('tree_oak_large', 'assets/environment/tree-1.png');
        this.scene.load.image('tree_pine_large', 'assets/environment/tree-2.png');
        this.scene.load.image('bush_hiding', 'assets/environment/tree-3.png'); // Different tree for hiding bushes
        this.scene.load.image('haystack', 'assets/environment/tree-3.png'); // Using tree-3 for haystacks
        
        // Buildings - warehouses and houses
        this.scene.load.image('warehouse', 'assets/environment/warehouse-1.png'); 
        this.scene.load.image('exploded-warehouse', 'assets/environment/exploded-warehouse.png'); // Destroyed warehouse texture
        this.scene.load.image('puzzle_board', 'assets/environment/warehouse-2.png'); // Using warehouse-2 for blackboard houses
        this.scene.load.image('cabin_wooden', 'assets/environment/house-1.png'); // Using house assets
        this.scene.load.image('house_small', 'assets/environment/house-1.png'); 
        this.scene.load.image('shed_old', 'assets/environment/house-2.png'); 
        
        // Props and decorations - stone formations and environmental elements
        this.scene.load.image('rock_boulder', 'assets/environment/stone-1.png'); // Large boulder
        this.scene.load.image('stone_small', 'assets/environment/stone-2.png'); // Small stones
        this.scene.load.image('stone_medium', 'assets/environment/stone-3.png'); // Medium stones
        this.scene.load.image('stone_large', 'assets/environment/stone-4.png'); // Large stone formations
        this.scene.load.image('signpost', 'assets/environment/tree-3.png'); // Using tree-3 for signposts
    }

    // Convert grid coordinates to isometric screen coordinates
    gridToIso(gridX, gridY) {
        const isoX = (gridX - gridY) * (this.tileSize / 2);
        const isoY = (gridX + gridY) * (this.tileSize / 4);
        return { x: isoX, y: isoY };
    }

    // Convert isometric screen coordinates to grid coordinates
    isoToGrid(isoX, isoY) {
        const gridX = Math.floor((isoX / (this.tileSize / 2) + isoY / (this.tileSize / 4)) / 2);
        const gridY = Math.floor((isoY / (this.tileSize / 4) - isoX / (this.tileSize / 2)) / 2);
        return { x: gridX, y: gridY };
    }

    generateMap(theme = 'rural_village') {
        // Initialize map
        for (let x = 0; x < this.mapWidth; x++) {
            this.tiles[x] = [];
            this.obstacleLayer[x] = [];
            this.decorationLayer[x] = [];
            for (let y = 0; y < this.mapHeight; y++) {
                this.tiles[x][y] = 'grass_green'; // Base terrain
                this.obstacleLayer[x][y] = null;
                this.decorationLayer[x][y] = null;
            }
        }

        // Generate map based on theme
        if (theme === 'village_night' || this.chapter2Mode) {
            this.generateVillageMap();
        } else if (theme === 'village_jungle_mix') {
            this.generateChapter3Map();
        } else {
            this.generateChapter1Map();
        }
        
        this.mapGenerated = true;
    }

    generateChapter1Map() {
        // Original Chapter 1 generation
        this.createLinearPath();
        this.placeWarehousesAlongPath();
        this.placePuzzleBoardsAlongPath();
        this.createDenseForestAreas();
        this.createHidingSpotsAlongPath();
        this.addEnvironmentalDetails();
        
        console.log('Chapter 1 map generation complete. Path length:', this.pathPoints.length, 'points');
        this.preloadWarehouseAreas();
    }

    generateVillageMap() {
        console.log('🏘️ Generating Chapter 2 village map with linear path...');
        
        // Create the complex winding village path (much more turns than Chapter 1)
        this.createVillageLinearPath();
        
        // Place buildings along the path in village style
        this.placeVillageElementsAlongPath();
        
        // Add blackboard houses (objectives) at strategic locations
        this.placeBlackboardHousesAlongPath();
        
        // Add village vegetation along the path
        this.createVillageVegetationAlongPath();
        
        // Add environmental village details
        this.addVillageDetailsAlongPath();
        
        console.log('🏘️ Complex village linear path generation complete');
    }

    generateChapter3Map() {
        console.log('🌴 Generating Chapter 3 village-jungle mix map with linear path...');
        
        // Create linear path similar to Chapter 1 but with village-jungle mix
        this.createLinearPath();
        
        // Place radar towers instead of warehouses
        this.placeRadarTowersAlongPath();
        
        // Create mixed vegetation (village at start, jungle at end)
        this.createMixedVegetationAlongPath();
        
        // Add environmental details for village-jungle transition
        this.addMixedEnvironmentalDetails();
        
        // Create hiding spots along path
        this.createHidingSpotsAlongPath();
        
        console.log('🌴 Chapter 3 village-jungle mix map generation complete');
    }

    placeRadarTowersAlongPath() {
        // Place 2 radar towers along the path (instead of 3 warehouses)
        this.radarTowers = [];
        
        if (!this.pathPoints || this.pathPoints.length === 0) {
            console.warn('No path points available for radar tower placement');
            return;
        }
        
        // Calculate positions for 2 radar towers along the path
        const pathLength = this.pathPoints.length;
        const tower1Position = Math.floor(pathLength * 0.3); // 30% along path (village area)
        const tower2Position = Math.floor(pathLength * 0.7); // 70% along path (jungle area)
        
        const towerPositions = [tower1Position, tower2Position];
        const towerIds = ['radar_tower_1', 'radar_tower_2'];
        
        towerPositions.forEach((pathIndex, towerIndex) => {
            const pathPoint = this.pathPoints[pathIndex];
            
            // Find a suitable position near the path point
            const towerPos = this.findSuitableObjectPosition(pathIndex, 30);
            if (towerPos) {
                // Create radar tower data structure (similar to warehouse)
                this.radarTowers.push({
                    id: towerIds[towerIndex],
                    x: towerPos.tileX,
                    y: towerPos.tileY,
                    worldX: towerPos.worldX,
                    worldY: towerPos.worldY,
                    lightRadius: 25 + (towerIndex * 5), // Increasing radius
                    health: 100,
                    maxHealth: 100,
                    pathIndex: pathIndex
                });
                
                // Place the radar tower sprite (using warehouse sprite for now)
                this.obstacleLayer[towerPos.tileX][towerPos.tileY] = 'warehouse';
                
                console.log(`Placed ${towerIds[towerIndex]} at path position ${pathIndex} (${towerPos.tileX}, ${towerPos.tileY})`);
            }
        });
        
        console.log(`Placed ${this.radarTowers.length} radar towers for Chapter 3`);
    }

    findSuitableObjectPosition(pathIndex, searchRadius = 30) {
        // Find a suitable position for placing objects (radar towers, warehouses, etc.)
        if (!this.pathPoints || this.pathPoints.length === 0) {
            console.warn('No path points available for object placement');
            return null;
        }
        
        // Use pathIndex as a reference point, or use it as direct coordinates if it's a number
        let centerX, centerY;
        if (typeof pathIndex === 'number' && pathIndex < this.pathPoints.length) {
            const pathPoint = this.pathPoints[pathIndex];
            centerX = pathPoint.x;
            centerY = pathPoint.y;
        } else {
            // Treat pathIndex as direct coordinates
            centerX = pathIndex;
            centerY = searchRadius; // searchRadius becomes Y coordinate in this case
            searchRadius = 30; // Default search radius
        }
        
        // Try to find a suitable position within the search radius
        for (let attempts = 0; attempts < 50; attempts++) {
            const angle = (attempts / 50) * Math.PI * 2;
            const distance = 10 + (attempts / 50) * searchRadius;
            
            const tileX = Math.floor(centerX + Math.cos(angle) * distance);
            const tileY = Math.floor(centerY + Math.sin(angle) * distance);
            
            // Check if position is valid
            if (this.isValidObjectPosition(tileX, tileY)) {
                const worldPos = this.getWorldPosition(tileX, tileY);
                return {
                    tileX: tileX,
                    tileY: tileY,
                    worldX: worldPos.x,
                    worldY: worldPos.y
                };
            }
        }
        
        console.warn(`Could not find suitable position near (${centerX}, ${centerY})`);
        return null;
    }

    isValidObjectPosition(x, y) {
        // Check if position is valid for placing objects
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
            return false;
        }
        
        // Check if position is walkable
        if (!this.isWalkable(x, y)) {
            return false;
        }
        
        // Check if position is not too close to path
        const distanceToPath = this.getDistanceToNearestPathPoint(x, y);
        if (distanceToPath < 8) { // Must be at least 8 tiles from path
            return false;
        }
        
        // Check if position is not occupied by other objects
        if (this.obstacleLayer[x] && this.obstacleLayer[x][y]) {
            return false;
        }
        
        if (this.decorationLayer[x] && this.decorationLayer[x][y]) {
            return false;
        }
        
        return true;
    }

    createMixedVegetationAlongPath() {
        // Create vegetation that transitions from village (houses, small trees) to jungle (dense forest)
        if (!this.pathPoints || this.pathPoints.length === 0) return;
        
        const pathLength = this.pathPoints.length;
        
        this.pathPoints.forEach((pathPoint, index) => {
            const progressRatio = index / pathLength; // 0 = start (village), 1 = end (jungle)
            
            // Village area (first 40% of path)
            if (progressRatio < 0.4) {
                this.createVillageVegetationNearPoint(pathPoint, 15);
            }
            // Transition area (40% - 60% of path)
            else if (progressRatio < 0.6) {
                this.createTransitionVegetationNearPoint(pathPoint, 20);
            }
            // Jungle area (last 40% of path)
            else {
                this.createJungleVegetationNearPoint(pathPoint, 25);
            }
        });
        
        console.log('Created mixed village-jungle vegetation along path');
    }

    createVillageVegetationNearPoint(pathPoint, radius) {
        // Create village-style vegetation (houses, small trees, bushes)
        for (let attempts = 0; attempts < 8; attempts++) {
            const angle = (attempts / 8) * Math.PI * 2;
            const distance = 8 + Math.random() * radius;
            const vegX = Math.floor(pathPoint.x + Math.cos(angle) * distance);
            const vegY = Math.floor(pathPoint.y + Math.sin(angle) * distance);
            
            if (this.isValidVegetationPosition(vegX, vegY)) {
                const rand = Math.random();
                if (rand < 0.3) {
                    this.decorationLayer[vegX][vegY] = 'house_small'; // Village houses
                } else if (rand < 0.6) {
                    this.decorationLayer[vegX][vegY] = 'bush_hiding'; // Small bushes
                } else {
                    this.decorationLayer[vegX][vegY] = 'tree_oak_large'; // Small trees
                }
            }
        }
    }

    createTransitionVegetationNearPoint(pathPoint, radius) {
        // Create transition vegetation (mix of village and jungle elements)
        for (let attempts = 0; attempts < 10; attempts++) {
            const angle = (attempts / 10) * Math.PI * 2;
            const distance = 10 + Math.random() * radius;
            const vegX = Math.floor(pathPoint.x + Math.cos(angle) * distance);
            const vegY = Math.floor(pathPoint.y + Math.sin(angle) * distance);
            
            if (this.isValidVegetationPosition(vegX, vegY)) {
                const rand = Math.random();
                if (rand < 0.2) {
                    this.decorationLayer[vegX][vegY] = 'shed_old'; // Abandoned buildings
                } else if (rand < 0.5) {
                    this.decorationLayer[vegX][vegY] = 'tree_pine_large'; // Mixed trees
                } else if (rand < 0.8) {
                    this.decorationLayer[vegX][vegY] = 'bush_hiding'; // Dense bushes
                } else {
                    this.decorationLayer[vegX][vegY] = 'rock_boulder'; // Rocks
                }
            }
        }
    }

    createJungleVegetationNearPoint(pathPoint, radius) {
        // Create dense jungle vegetation (large trees, rocks, dense bushes)
        for (let attempts = 0; attempts < 12; attempts++) {
            const angle = (attempts / 12) * Math.PI * 2;
            const distance = 12 + Math.random() * radius;
            const vegX = Math.floor(pathPoint.x + Math.cos(angle) * distance);
            const vegY = Math.floor(pathPoint.y + Math.sin(angle) * distance);
            
            if (this.isValidVegetationPosition(vegX, vegY)) {
                const rand = Math.random();
                if (rand < 0.4) {
                    this.decorationLayer[vegX][vegY] = 'tree_pine_large'; // Dense jungle trees
                } else if (rand < 0.7) {
                    this.decorationLayer[vegX][vegY] = 'tree_oak_large'; // More jungle trees
                } else if (rand < 0.9) {
                    this.decorationLayer[vegX][vegY] = 'bush_hiding'; // Dense jungle bushes
                } else {
                    this.decorationLayer[vegX][vegY] = 'rock_boulder'; // Jungle rocks
                }
            }
        }
    }

    addMixedEnvironmentalDetails() {
        // Add environmental details that transition from village to jungle
        this.createSmallLakesNearPath();
        this.addScatteredEnvironmentalObjects();
        this.addStoneFormations();
        
        // Add some village-specific details at the beginning
        this.addVillageDetailsAtStart();
        
        // Add jungle-specific details at the end
        this.addJungleDetailsAtEnd();
        
        console.log('Added mixed environmental details for village-jungle transition');
    }

    addVillageDetailsAtStart() {
        // Add village-specific details in the first 30% of the map
        if (!this.pathPoints || this.pathPoints.length === 0) return;
        
        const villageEndIndex = Math.floor(this.pathPoints.length * 0.3);
        
        for (let i = 0; i < villageEndIndex; i += 15) {
            const pathPoint = this.pathPoints[i];
            
            // Add village props near the path
            for (let attempts = 0; attempts < 5; attempts++) {
                const offsetX = (Math.random() - 0.5) * 30;
                const offsetY = (Math.random() - 0.5) * 30;
                const propX = Math.floor(pathPoint.x + offsetX);
                const propY = Math.floor(pathPoint.y + offsetY);
                
                if (this.isValidPropPosition(propX, propY)) {
                    const rand = Math.random();
                    if (rand < 0.4) {
                        this.decorationLayer[propX][propY] = 'signpost'; // Village signposts
                    } else if (rand < 0.7) {
                        this.decorationLayer[propX][propY] = 'stone_small'; // Village stones
                    } else {
                        this.decorationLayer[propX][propY] = 'haystack'; // Village haystacks
                    }
                }
            }
        }
    }

    addJungleDetailsAtEnd() {
        // Add jungle-specific details in the last 30% of the map
        if (!this.pathPoints || this.pathPoints.length === 0) return;
        
        const jungleStartIndex = Math.floor(this.pathPoints.length * 0.7);
        
        for (let i = jungleStartIndex; i < this.pathPoints.length; i += 10) {
            const pathPoint = this.pathPoints[i];
            
            // Add jungle props near the path
            for (let attempts = 0; attempts < 8; attempts++) {
                const offsetX = (Math.random() - 0.5) * 40;
                const offsetY = (Math.random() - 0.5) * 40;
                const propX = Math.floor(pathPoint.x + offsetX);
                const propY = Math.floor(pathPoint.y + offsetY);
                
                if (this.isValidPropPosition(propX, propY)) {
                    const rand = Math.random();
                    if (rand < 0.5) {
                        this.decorationLayer[propX][propY] = 'rock_boulder'; // Large jungle rocks
                    } else if (rand < 0.8) {
                        this.decorationLayer[propX][propY] = 'stone_large'; // Jungle stone formations
                    } else {
                        this.decorationLayer[propX][propY] = 'stone_medium'; // Medium jungle stones
                    }
                }
            }
        }
    }

    createVillageLinearPath() {
        // Create an extremely winding village path with many more turns than Chapter 1
        this.pathPoints = [];
        this.sidePathAreas = []; // Store village side areas
        
        // Define a very complex village path with many sharp turns, spirals, and loops
        const segments = [
            // Starting village entrance - multiple entry paths
            { startX: 50, startY: 450, endX: 75, endY: 425, type: 'village_entrance' },
            { startX: 75, startY: 425, endX: 65, endY: 400, type: 'path' },
            { startX: 65, startY: 400, endX: 90, endY: 385, type: 'path' },
            
            // First sharp turn sequence
            { startX: 90, startY: 385, endX: 120, endY: 375, type: 'path' },
            { startX: 120, startY: 375, endX: 110, endY: 350, type: 'path' },
            { startX: 110, startY: 350, endX: 140, endY: 340, type: 'path' },
            { startX: 140, startY: 340, endX: 125, endY: 315, type: 'village_square', sideQuest: true },
            
            // Spiral around first village area
            { startX: 125, startY: 315, endX: 160, endY: 320, type: 'path' },
            { startX: 160, startY: 320, endX: 180, endY: 300, type: 'path' },
            { startX: 180, startY: 300, endX: 170, endY: 275, type: 'path' },
            { startX: 170, startY: 275, endX: 145, endY: 270, type: 'path' },
            { startX: 145, startY: 270, endX: 130, endY: 290, type: 'path' },
            { startX: 130, startY: 290, endX: 155, endY: 295, type: 'village_market', sideQuest: true },
            
            // Zigzag through housing district
            { startX: 155, startY: 295, endX: 185, endY: 285, type: 'path' },
            { startX: 185, startY: 285, endX: 175, endY: 260, type: 'path' },
            { startX: 175, startY: 260, endX: 205, endY: 250, type: 'path' },
            { startX: 205, startY: 250, endX: 195, endY: 225, type: 'path' },
            { startX: 195, startY: 225, endX: 225, endY: 215, type: 'path' },
            { startX: 225, startY: 215, endX: 215, endY: 190, type: 'village_house_cluster', sideQuest: true },
            
            // Complex loop around lake area
            { startX: 215, startY: 190, endX: 250, endY: 185, type: 'path' },
            { startX: 250, startY: 185, endX: 275, endY: 200, type: 'path' },
            { startX: 275, startY: 200, endX: 290, endY: 225, type: 'path' },
            { startX: 290, startY: 225, endX: 280, endY: 250, type: 'path' },
            { startX: 280, startY: 250, endX: 255, endY: 260, type: 'path' },
            { startX: 255, startY: 260, endX: 240, endY: 235, type: 'village_lake', sideQuest: true },
            
            // Tight S-curves through residential area
            { startX: 240, startY: 235, endX: 265, endY: 220, type: 'path' },
            { startX: 265, startY: 220, endX: 250, endY: 195, type: 'path' },
            { startX: 250, startY: 195, endX: 275, endY: 180, type: 'path' },
            { startX: 275, startY: 180, endX: 260, endY: 155, type: 'path' },
            { startX: 260, startY: 155, endX: 285, endY: 140, type: 'path' },
            { startX: 285, startY: 140, endX: 270, endY: 115, type: 'village_workshop', sideQuest: true },
            
            // Major spiral around central village
            { startX: 270, startY: 115, endX: 300, endY: 120, type: 'path' },
            { startX: 300, startY: 120, endX: 325, endY: 140, type: 'path' },
            { startX: 325, startY: 140, endX: 345, endY: 165, type: 'path' },
            { startX: 345, startY: 165, endX: 360, endY: 195, type: 'path' },
            { startX: 360, startY: 195, endX: 365, endY: 225, type: 'path' },
            { startX: 365, startY: 225, endX: 355, endY: 255, type: 'path' },
            { startX: 355, startY: 255, endX: 335, endY: 280, type: 'path' },
            { startX: 335, startY: 280, endX: 310, endY: 295, type: 'path' },
            { startX: 310, startY: 295, endX: 285, endY: 300, type: 'village_center', sideQuest: true },
            
            // Double-back zigzag
            { startX: 285, startY: 300, endX: 315, endY: 315, type: 'path' },
            { startX: 315, startY: 315, endX: 330, endY: 290, type: 'path' },
            { startX: 330, startY: 290, endX: 355, endY: 305, type: 'path' },
            { startX: 355, startY: 305, endX: 370, endY: 280, type: 'path' },
            { startX: 370, startY: 280, endX: 395, endY: 295, type: 'path' },
            { startX: 395, startY: 295, endX: 410, endY: 270, type: 'village_temple', sideQuest: true },
            
            // Complex figure-8 pattern
            { startX: 410, startY: 270, endX: 425, endY: 245, type: 'path' },
            { startX: 425, startY: 245, endX: 440, endY: 220, type: 'path' },
            { startX: 440, startY: 220, endX: 455, endY: 245, type: 'path' },
            { startX: 455, startY: 245, endX: 470, endY: 270, type: 'path' },
            { startX: 470, startY: 270, endX: 455, endY: 295, type: 'path' },
            { startX: 455, startY: 295, endX: 440, endY: 320, type: 'path' },
            { startX: 440, startY: 320, endX: 425, endY: 295, type: 'path' },
            { startX: 425, startY: 295, endX: 410, endY: 270, type: 'path' },
            { startX: 410, startY: 270, endX: 430, endY: 285, type: 'village_crossroads', sideQuest: true },
            
            // Serpentine approach to final area
            { startX: 430, startY: 285, endX: 450, endY: 300, type: 'path' },
            { startX: 450, startY: 300, endX: 435, endY: 325, type: 'path' },
            { startX: 435, startY: 325, endX: 455, endY: 340, type: 'path' },
            { startX: 455, startY: 340, endX: 440, endY: 365, type: 'path' },
            { startX: 440, startY: 365, endX: 460, endY: 380, type: 'path' },
            { startX: 460, startY: 380, endX: 445, endY: 405, type: 'path' },
            { startX: 445, startY: 405, endX: 465, endY: 420, type: 'village_outskirts', sideQuest: true },
            
            // Final spiral to exit
            { startX: 465, startY: 420, endX: 485, endY: 435, type: 'path' },
            { startX: 485, startY: 435, endX: 470, endY: 460, type: 'path' },
            { startX: 470, startY: 460, endX: 490, endY: 475, type: 'path' },
            { startX: 490, startY: 475, endX: 475, endY: 500, type: 'path' },
            { startX: 475, startY: 500, endX: 495, endY: 515, type: 'path' },
            { startX: 495, startY: 515, endX: 480, endY: 540, type: 'village_exit' }
        ];
        
        // Generate smooth path through all segments
        segments.forEach((segment, index) => {
            const segmentPoints = this.generatePathSegment(
                segment.startX, segment.startY, 
                segment.endX, segment.endY, 
                12 // Slightly tighter curves for village feel
            );
            
            segmentPoints.forEach(point => {
                point.segmentType = segment.type;
                point.segmentIndex = index;
                point.hasSideQuest = segment.sideQuest || false;
                this.pathPoints.push(point);
            });
            
            // Create village side areas for important segments
            if (segment.sideQuest) {
                this.createVillageSideAreas(segment, index);
            }
        });
        
        // Create the actual walkable village road
        this.pathWidth = 4; // Slightly wider for village roads
        this.pathPoints.forEach((point, index) => {
            this.createVillageRoadArea(point.x, point.y, this.pathWidth);
        });
        
        console.log('Created complex village path with', this.pathPoints.length, 'waypoints and', this.sidePathAreas.length, 'village areas');
    }

    createVillageSideAreas(segment, segmentIndex) {
        // Create village-specific side areas (markets, squares, etc.)
        const areaRadius = 15 + Math.random() * 10; // Village areas are smaller
        
        // Store village area for building placement
        this.sidePathAreas.push({
            centerX: segment.endX,
            centerY: segment.endY,
            radius: areaRadius,
            type: segment.type,
            segmentIndex: segmentIndex,
            discovered: false,
            villageArea: true
        });
    }

    createVillageRoadArea(centerX, centerY, width) {
        // Create village road tiles (similar to createPathArea but with village styling)
        for (let x = centerX - width; x <= centerX + width; x++) {
            for (let y = centerY - width; y <= centerY + width; y++) {
                if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    if (distance <= width) {
                        this.tiles[x][y] = 'dirt_road_straight'; // Village road texture
                        this.obstacleLayer[x][y] = null; // Clear obstacles from road
                    }
                }
            }
        }
    }

    placeVillageElementsAlongPath() {
        // Place houses, buildings, and village structures along the path
        const buildingSpacing = 25; // Buildings every 25 path points
        let buildingsPlaced = 0;
        
        for (let i = 0; i < this.pathPoints.length; i += buildingSpacing) {
            const pathPoint = this.pathPoints[i];
            
            // Place buildings near the path but not on it
            for (let attempts = 0; attempts < 10; attempts++) {
                const offsetX = (Math.random() - 0.5) * 40; // Random offset from path
                const offsetY = (Math.random() - 0.5) * 40;
                const buildingX = Math.floor(pathPoint.x + offsetX);
                const buildingY = Math.floor(pathPoint.y + offsetY);
                
                if (this.isValidVillageBuildingPosition(buildingX, buildingY)) {
                    // Randomly choose building type
                    const buildingTypes = ['house-1', 'house-2', 'warehouse'];
                    const weights = [0.6, 0.3, 0.1]; // 60% house-1, 30% house-2, 10% warehouse
                    
                    let buildingType = 'house-1';
                    const rand = Math.random();
                    if (rand < weights[2]) buildingType = 'warehouse';
                    else if (rand < weights[1] + weights[2]) buildingType = 'house-2';
                    
                    this.obstacleLayer[buildingX][buildingY] = buildingType;
                    buildingsPlaced++;
                    break;
                }
            }
        }
        
        console.log(`🏘️ Placed ${buildingsPlaced} buildings along village path`);
    }

    placeBlackboardHousesAlongPath() {
        // Place blackboard house objectives at strategic path locations
        const blackboardPositions = [];
        const pathLength = this.pathPoints.length;
        
        // Place at 25%, 50%, and 75% through the path
        const percentages = [0.25, 0.5, 0.75];
        
        percentages.forEach((percentage, index) => {
            const pathIndex = Math.floor(pathLength * percentage);
            const pathPoint = this.pathPoints[pathIndex];
            
            // Find a good position near this path point
            for (let attempts = 0; attempts < 15; attempts++) {
                const offsetX = (Math.random() - 0.5) * 60;
                const offsetY = (Math.random() - 0.5) * 60;
                const houseX = Math.floor(pathPoint.x + offsetX);
                const houseY = Math.floor(pathPoint.y + offsetY);
                
                if (this.isValidVillageBuildingPosition(houseX, houseY)) {
                    blackboardPositions.push({ x: houseX, y: houseY });
                    // Don't place a building here - Chapter2Scene will handle the blackboard house creation
                    break;
                }
            }
        });
        
        // Store blackboard positions for Chapter2Scene to use
        this.blackboardPositions = blackboardPositions;
        console.log(`📚 Planned ${blackboardPositions.length} blackboard house positions along path`);
    }

    createVillageVegetationAlongPath() {
        // Add trees and vegetation along the village path (respecting 1000% density)
        const originalTreeCount = Math.floor((this.mapWidth * this.mapHeight) / 60); // 1000% increased density
        const innerPathTreeCount = Math.floor(originalTreeCount * 0.5); // 50% reduction inside path
        const forestBarrierTreeCount = originalTreeCount - innerPathTreeCount; // Rest for forest barriers
        
        let innerTreesPlaced = 0;
        let barrierTreesPlaced = 0;
        
        // First, create dense forest barriers around the entire path to prevent wandering
        this.createForestBarriers();
        
        // Then, place reduced trees near the path (50% of original density)
        this.pathPoints.forEach(pathPoint => {
            if (Math.random() < 0.15 && innerTreesPlaced < innerPathTreeCount) { // Reduced from 0.3 to 0.15 (50% reduction)
                for (let attempts = 0; attempts < 3; attempts++) { // Reduced attempts for less density
                    const offsetX = (Math.random() - 0.5) * 60; // Smaller scatter area
                    const offsetY = (Math.random() - 0.5) * 60;
                    const treeX = Math.floor(pathPoint.x + offsetX);
                    const treeY = Math.floor(pathPoint.y + offsetY);
                    
                    if (this.isValidVillageVegetationPosition(treeX, treeY) && 
                        this.getDistanceToNearestPathPoint(treeX, treeY) > 12) { // Keep trees away from path
                        const treeType = Math.random() < 0.6 ? 'tree_oak_large' : 'tree_pine_large';
                        this.decorationLayer[treeX][treeY] = treeType;
                        innerTreesPlaced++;
                        break;
                    }
                }
            }
        });
        
        // Fill remaining inner tree quota with sparse placement
        while (innerTreesPlaced < innerPathTreeCount) {
            const x = Math.floor(Math.random() * (this.mapWidth - 20)) + 10;
            const y = Math.floor(Math.random() * (this.mapHeight - 20)) + 10;
            
            if (this.isValidVillageVegetationPosition(x, y) && 
                this.getDistanceToNearestPathPoint(x, y) > 15) { // Keep away from path
                const treeType = Math.random() < 0.6 ? 'tree_oak_large' : 'tree_pine_large';
                this.decorationLayer[x][y] = treeType;
                innerTreesPlaced++;
            }
        }
        
        console.log(`🌳 Created ${innerTreesPlaced} trees along village path (50% reduced density)`);
        console.log(`🌲 Created forest barriers to contain the path`);
    }

    createForestBarriers() {
        // Create dense forest walls around the map edges and path boundaries
        const barrierWidth = 25; // Width of forest barrier
        let barrierTreesPlaced = 0;
        
        // Create forest barriers around map edges
        for (let x = 0; x < this.mapWidth; x++) {
            for (let y = 0; y < this.mapHeight; y++) {
                const distanceFromEdge = Math.min(x, y, this.mapWidth - x - 1, this.mapHeight - y - 1);
                const distanceFromPath = this.getDistanceToNearestPathPoint(x, y);
                
                // Create barrier if:
                // 1. Close to map edge, OR
                // 2. Far from the path (to create containment walls)
                if (distanceFromEdge < barrierWidth || 
                    (distanceFromPath > 80 && Math.random() < 0.4)) {
                    
                    if (this.isValidVillageVegetationPosition(x, y)) {
                        // Dense forest - prefer oak trees for walls
                        const treeType = Math.random() < 0.8 ? 'tree_oak_large' : 'tree_pine_large';
                        this.decorationLayer[x][y] = treeType;
                        barrierTreesPlaced++;
                    }
                }
            }
        }
        
        // Create additional barrier walls between path segments to prevent shortcuts
        this.createPathSegmentBarriers();
        
        console.log(`🌲 Created ${barrierTreesPlaced} forest barrier trees`);
    }

    createPathSegmentBarriers() {
        // Create forest barriers between distant path segments to prevent shortcuts
        const segmentGroups = [];
        
        // Group path points into segments
        for (let i = 0; i < this.pathPoints.length; i += 50) {
            const segmentCenter = this.pathPoints[Math.min(i + 25, this.pathPoints.length - 1)];
            segmentGroups.push(segmentCenter);
        }
        
        // Create barriers between non-adjacent segments
        for (let i = 0; i < segmentGroups.length; i++) {
            for (let j = i + 2; j < segmentGroups.length; j++) { // Skip adjacent segments
                const seg1 = segmentGroups[i];
                const seg2 = segmentGroups[j];
                
                // Create barrier line between segments if they're close enough to shortcut
                const distance = Math.sqrt((seg1.x - seg2.x) ** 2 + (seg1.y - seg2.y) ** 2);
                if (distance < 100 && distance > 40) { // Close enough to shortcut but not adjacent
                    this.createBarrierLine(seg1.x, seg1.y, seg2.x, seg2.y);
                }
            }
        }
    }

    createBarrierLine(x1, y1, x2, y2) {
        // Create a line of trees between two points to block shortcuts
        const steps = Math.floor(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2));
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.floor(x1 + (x2 - x1) * t);
            const y = Math.floor(y1 + (y2 - y1) * t);
            
            // Add some randomness to make it look natural
            const offsetX = Math.floor((Math.random() - 0.5) * 8);
            const offsetY = Math.floor((Math.random() - 0.5) * 8);
            const finalX = x + offsetX;
            const finalY = y + offsetY;
            
            if (finalX >= 0 && finalX < this.mapWidth && finalY >= 0 && finalY < this.mapHeight &&
                this.getDistanceToNearestPathPoint(finalX, finalY) > 20) { // Don't block the actual path
                
                if (this.isValidVillageVegetationPosition(finalX, finalY)) {
                    const treeType = Math.random() < 0.7 ? 'tree_oak_large' : 'tree_pine_large';
                    this.decorationLayer[finalX][finalY] = treeType;
                }
            }
        }
    }

    addVillageDetailsAlongPath() {
        // Add environmental details (stones, props) near the village path
        let propsPlaced = 0;
        const villageProps = [
            'rock_boulder', 'stone_small', 'stone_medium', 'stone_large', 
            'signpost', 'flowers_red', 'flowers_yellow'
        ];
        
        // Place props near path points
        this.pathPoints.forEach((pathPoint, index) => {
            if (index % 15 === 0) { // Every 15th path point
                for (let attempts = 0; attempts < 3; attempts++) {
                    const offsetX = (Math.random() - 0.5) * 50;
                    const offsetY = (Math.random() - 0.5) * 50;
                    const propX = Math.floor(pathPoint.x + offsetX);
                    const propY = Math.floor(pathPoint.y + offsetY);
                    
                    if (this.isValidVillageVegetationPosition(propX, propY)) {
                        const propType = villageProps[Math.floor(Math.random() * villageProps.length)];
                        this.decorationLayer[propX][propY] = propType;
                        propsPlaced++;
                        break;
                    }
                }
            }
        });
        
        // Add some small lakes in village side areas
        this.sidePathAreas.forEach(area => {
            if (area.type === 'village_lake' && Math.random() < 0.7) {
                const lakeRadius = 4 + Math.random() * 3; // Small village lakes
                this.createVillageLake(Math.floor(area.centerX), Math.floor(area.centerY), Math.floor(lakeRadius));
            }
        });
        
        console.log(`🎨 Added ${propsPlaced} village props along path`);
    }

    createVillageLakes() {
        // Create small lakes scattered around the village
        const lakeCount = 3; // 3 small lakes
        let lakesCreated = 0;
        
        for (let i = 0; i < lakeCount * 3 && lakesCreated < lakeCount; i++) {
            // Try to place lakes away from center and roads
            const x = Math.floor(Math.random() * (this.mapWidth - 80)) + 40;
            const y = Math.floor(Math.random() * (this.mapHeight - 80)) + 40;
            
            // Create small circular lake
            const lakeRadius = Math.floor(Math.random() * 8) + 6; // 6-14 tile radius
            
            if (this.isValidLakePosition(x, y, lakeRadius)) {
                this.createVillageLake(x, y, lakeRadius);
                lakesCreated++;
            }
        }
        
        console.log(`🏞️ Created ${lakesCreated} village lakes`);
    }

    createVillageLake(centerX, centerY, radius) {
        // Create circular lake using water tiles
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    
                    if (distance <= radius) {
                        // Use water tile
                        this.tiles[x][y] = 'water_blue';
                        
                        // Clear any obstacles or decorations in water
                        this.obstacleLayer[x][y] = null;
                        this.decorationLayer[x][y] = null;
                    }
                }
            }
        }
    }

    isValidLakePosition(centerX, centerY, radius) {
        // Check if area is suitable for a lake
        const buffer = radius + 5; // Extra space around lake
        
        // Check bounds
        if (centerX - buffer < 0 || centerX + buffer >= this.mapWidth || 
            centerY - buffer < 0 || centerY + buffer >= this.mapHeight) {
            return false;
        }
        
        // Check for roads, buildings, or other lakes in area
        for (let x = centerX - buffer; x <= centerX + buffer; x++) {
            for (let y = centerY - buffer; y <= centerY + buffer; y++) {
                if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                    // Don't place near roads
                    if (this.tiles[x][y] === 'dirt_road_straight') {
                        return false;
                    }
                    
                    // Don't place near buildings
                    if (this.obstacleLayer[x][y]) {
                        return false;
                    }
                    
                    // Don't place near existing water
                    if (this.tiles[x][y] === 'water_blue') {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    createVillageRoads() {
        // Create a grid-like road system for the village
        const roadWidth = 3;
        
        // Main horizontal roads
        for (let y = 50; y < this.mapHeight - 50; y += 80) {
            for (let x = 20; x < this.mapWidth - 20; x++) {
                for (let w = 0; w < roadWidth; w++) {
                    if (y + w < this.mapHeight) {
                        this.tiles[x][y + w] = 'dirt_road_straight';
                    }
                }
            }
        }
        
        // Main vertical roads
        for (let x = 60; x < this.mapWidth - 60; x += 100) {
            for (let y = 20; y < this.mapHeight - 20; y++) {
                for (let w = 0; w < roadWidth; w++) {
                    if (x + w < this.mapWidth) {
                        this.tiles[x + w][y] = 'dirt_road_straight';
                    }
                }
            }
        }
        
        console.log('🛤️ Village roads created');
    }

    createVillageBuildings() {
        // Create lots of houses scattered around the village - much more dense
        const houseCount = Math.floor((this.mapWidth * this.mapHeight) / 400); // ~62 houses for 500x500 (doubled)
        let housesCreated = 0;
        
        for (let i = 0; i < houseCount * 4 && housesCreated < houseCount; i++) {
            const x = Math.floor(Math.random() * (this.mapWidth - 40)) + 20;
            const y = Math.floor(Math.random() * (this.mapHeight - 40)) + 20;
            
            if (this.isValidVillageBuildingPosition(x, y)) {
                // Randomly choose house type
                const houseTypes = ['house-1', 'house-2'];
                const houseType = houseTypes[Math.floor(Math.random() * houseTypes.length)];
                
                this.obstacleLayer[x][y] = houseType;
                housesCreated++;
            }
        }
        
        console.log(`🏠 Created ${housesCreated} village houses`);
    }

    createVillageWarehouses() {
        // Add many more warehouses/storage buildings
        const warehouseCount = 25; // Increased from 8 to 25
        let warehousesCreated = 0;
        
        for (let i = 0; i < warehouseCount * 3 && warehousesCreated < warehouseCount; i++) {
            const x = Math.floor(Math.random() * (this.mapWidth - 60)) + 30;
            const y = Math.floor(Math.random() * (this.mapHeight - 60)) + 30;
            
            if (this.isValidVillageBuildingPosition(x, y)) {
                this.obstacleLayer[x][y] = 'warehouse';
                warehousesCreated++;
            }
        }
        
        console.log(`🏭 Created ${warehousesCreated} village warehouses`);
    }

    createVillageVegetation() {
        // Add scattered trees (1000% increase - 10x density as requested)
        const treeCount = Math.floor((this.mapWidth * this.mapHeight) / 60); // ~400 trees for 500x500 (1000% increase from original)
        let treesCreated = 0;
        
        for (let i = 0; i < treeCount * 4 && treesCreated < treeCount; i++) {
            const x = Math.floor(Math.random() * (this.mapWidth - 20)) + 10;
            const y = Math.floor(Math.random() * (this.mapHeight - 20)) + 10;
            
            if (this.isValidVillageVegetationPosition(x, y)) {
                // Use the same tree assets as Chapter 1
                const treeType = Math.random() < 0.6 ? 'tree_oak_large' : 'tree_pine_large';
                
                this.decorationLayer[x][y] = treeType;
                treesCreated++;
            }
        }
        
        console.log(`🌳 Created ${treesCreated} scattered trees (1000% increased density!)`);
    }

    addVillageDetails() {
        // Add environmental props with variety of stones
        const propCount = 30; // Doubled for more detail
        let propsCreated = 0;
        
        const villageProps = [
            'rock_boulder', 'stone_small', 'stone_medium', 'stone_large', 
            'signpost', 'flowers_red', 'flowers_yellow'
        ];
        
        for (let i = 0; i < propCount * 3 && propsCreated < propCount; i++) {
            const x = Math.floor(Math.random() * (this.mapWidth - 10)) + 5;
            const y = Math.floor(Math.random() * (this.mapHeight - 10)) + 5;
            
            if (this.isValidVillageVegetationPosition(x, y)) {
                const propType = villageProps[Math.floor(Math.random() * villageProps.length)];
                this.decorationLayer[x][y] = propType;
                propsCreated++;
            }
        }
        
        console.log(`🌸 Added ${propsCreated} village environmental details (including stones)`);
        
        // Add lakes to the village
        this.createVillageLakes();
    }

    isValidVillageBuildingPosition(x, y) {
        // Check if position is clear for building
        if (x < 5 || x >= this.mapWidth - 5 || y < 5 || y >= this.mapHeight - 5) {
            return false;
        }
        
        // Check 3x3 area is clear
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;
                
                if (checkX >= 0 && checkX < this.mapWidth && checkY >= 0 && checkY < this.mapHeight) {
                    // Don't build on roads
                    if (this.tiles[checkX][checkY] === 'dirt_road_straight') {
                        return false;
                    }
                    
                    // Don't build on existing obstacles
                    if (this.obstacleLayer[checkX][checkY]) {
                        return false;
                    }
                    
                    // Don't build on existing decorations
                    if (this.decorationLayer[checkX][checkY]) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    isValidVillageVegetationPosition(x, y) {
        // Check if position is clear for vegetation
        if (x < 2 || x >= this.mapWidth - 2 || y < 2 || y >= this.mapHeight - 2) {
            return false;
        }
        
        // Don't place on roads
        if (this.tiles[x][y] === 'dirt_road_straight') {
            return false;
        }
        
        // Don't place on existing obstacles or decorations
        if (this.obstacleLayer[x][y] || this.decorationLayer[x][y]) {
            return false;
        }
        
        // Don't place too close to buildings
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;
                
                if (checkX >= 0 && checkX < this.mapWidth && checkY >= 0 && checkY < this.mapHeight) {
                    if (this.obstacleLayer[checkX][checkY]) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    preloadWarehouseAreas() {
        // LIGHTWEIGHT warehouse preloading - only 10x10 areas for performance
        console.log('🏭 Lightweight preloading of warehouse areas (10x10 each)...');
        
        if (!this.warehouses || this.warehouses.length === 0) {
            console.warn('⚠️ No warehouses to preload');
            return;
        }
        
        const preloadRadius = 5; // 10x10 area (5 tiles in each direction)
        let totalTilesPreloaded = 0;
        
        // Store preloaded areas for tracking
        this.preloadedAreas = this.preloadedAreas || [];
        
        this.warehouses.forEach((warehouse, index) => {
            console.log(`🏭 Preloading warehouse ${index + 1} (${warehouse.id}) at (${warehouse.x}, ${warehouse.y}) - 10x10 area`);
            
            // Calculate small area bounds around warehouse
            const minX = Math.max(0, warehouse.x - preloadRadius);
            const maxX = Math.min(this.mapWidth - 1, warehouse.x + preloadRadius);
            const minY = Math.max(0, warehouse.y - preloadRadius);
            const maxY = Math.min(this.mapHeight - 1, warehouse.y + preloadRadius);
            
            let areaTilesLoaded = 0;
            
            // FORCE RENDER only immediate warehouse area
            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    // Force render base tiles
                    this.forceRenderTile(x, y, 'base');
                    areaTilesLoaded++;
                    
                    // Force render obstacles (including the warehouse itself)
                    if (this.obstacleLayer[x][y]) {
                        this.forceRenderTile(x, y, 'obstacle');
                        areaTilesLoaded++;
                    }
                    
                    // Force render decorations
                    if (this.decorationLayer[x][y]) {
                        this.forceRenderTile(x, y, 'decoration');
                        areaTilesLoaded++;
                    }
                }
            }
            
            // Mark area as preloaded
            this.preloadedAreas.push({
                warehouseId: warehouse.id,
                warehouseIndex: index,
                centerX: warehouse.x,
                centerY: warehouse.y,
                radius: preloadRadius,
                tilesLoaded: areaTilesLoaded
            });
            
            totalTilesPreloaded += areaTilesLoaded;
            console.log(`✅ Warehouse ${index + 1} area preloaded: ${areaTilesLoaded} tiles (10x10)`);
        });
        
        // Also preload small spawn area
        const spawnX = 37;
        const spawnY = 562;
        const spawnRadius = 10; // Smaller spawn area
        
        console.log(`🏠 Preloading spawn area at (${spawnX}, ${spawnY}) - 20x20 area`);
        
        const spawnMinX = Math.max(0, spawnX - spawnRadius);
        const spawnMaxX = Math.min(this.mapWidth - 1, spawnX + spawnRadius);
        const spawnMinY = Math.max(0, spawnY - spawnRadius);
        const spawnMaxY = Math.min(this.mapHeight - 1, spawnY + spawnRadius);
        
        let spawnTilesLoaded = 0;
        for (let x = spawnMinX; x <= spawnMaxX; x++) {
            for (let y = spawnMinY; y <= spawnMaxY; y++) {
                this.forceRenderTile(x, y, 'base');
                spawnTilesLoaded++;
                if (this.obstacleLayer[x][y]) {
                    this.forceRenderTile(x, y, 'obstacle');
                    spawnTilesLoaded++;
                }
                if (this.decorationLayer[x][y]) {
                    this.forceRenderTile(x, y, 'decoration');
                    spawnTilesLoaded++;
                }
            }
        }
        
        // Mark spawn area as preloaded
        this.preloadedAreas.push({
            warehouseId: 'spawn',
            warehouseIndex: -1,
            centerX: spawnX,
            centerY: spawnY,
            radius: spawnRadius,
            tilesLoaded: spawnTilesLoaded
        });
        
        totalTilesPreloaded += spawnTilesLoaded;
        
        console.log(`✅ LIGHTWEIGHT PRELOADING COMPLETE: ${totalTilesPreloaded} total tiles across ${this.warehouses.length + 1} locations`);
        console.log('🎯 Performance-optimized warehouse loading ready!');
    }
    
    // FORCE RENDER: Bypasses visibility system for guaranteed loading
    forceRenderTile(x, y, layer) {
        const tileKey = `${x},${y},${layer}`;
        
        // Skip if already rendered
        if (this.tileSprites.has(tileKey)) {
            return;
        }
        
        // Create new tile sprite (similar to renderTileIfNeeded but forced)
        const worldCenterX = (this.mapWidth * this.tileSize) / 2;
        const worldCenterY = (this.mapHeight * this.tileSize) / 2;
        const isoPos = this.gridToIso(x, y);
        
        let sprite;
        let textureKey;
        let depth;
        
        switch (layer) {
            case 'base':
                textureKey = this.tiles[x][y];
                depth = -1000 + y * 10 + x;
                break;
            case 'obstacle':
                textureKey = this.obstacleLayer[x][y];
                // Warehouses get higher depth to prevent player walking on top
                if (textureKey === 'warehouse') {
                    depth = 20000 + y * 10 + x; // Much higher than player depth (10000 + y)
                } else if (textureKey === 'house-1' || textureKey === 'house-2' || 
                          textureKey === 'cabin_wooden' || textureKey === 'house_small' || textureKey === 'shed_old') {
                    // Houses use the same depth as stones (decoration layer depth)
                    const worldPos = this.getWorldPosition(x, y);
                    depth = 10000 + worldPos.y;
                } else {
                    depth = y * 10 + x;
                }
                break;
            case 'decoration':
                textureKey = this.decorationLayer[x][y];
                const worldPos = this.getWorldPosition(x, y);
                depth = 10000 + worldPos.y;
                break;
        }
        
        if (textureKey) {
            sprite = this.scene.add.image(
                worldCenterX + isoPos.x,
                worldCenterY + isoPos.y,
                textureKey
            );
            sprite.setOrigin(0.5, 0.8);
            sprite.setDepth(depth);
            
            // Special handling for warehouses
            if (textureKey === 'warehouse') {
                const warehouse = this.warehouses.find(w => w.x === x && w.y === y);
                if (warehouse && !warehouse.sprite) {
                    warehouse.sprite = sprite;
                    // Create health bar for warehouse
                    this.createWarehouseHealthBar(warehouse);
                    console.log(`🏭 Warehouse sprite linked for ${warehouse.id}`);
                }
            }
            
            // Add collision for obstacles and some decorations
            if (layer === 'obstacle') {
                this.scene.matter.add.gameObject(sprite, {
                    isStatic: true,
                    shape: {
                        type: 'rectangle',
                        width: this.tileSize * 0.8,
                        height: this.tileSize * 0.8
                    }
                });
            } else if (layer === 'decoration' && 
                       (textureKey.includes('tree') || textureKey.includes('signpost') || textureKey.includes('rock_boulder') || 
                        textureKey.includes('house-1') || textureKey.includes('house-2'))) {
                const collisionRadius = textureKey.includes('house') ? this.tileSize * 0.4 : this.tileSize * 0.2;
                this.scene.matter.add.gameObject(sprite, {
                    isStatic: true,
                    shape: {
                        type: 'circle',
                        radius: collisionRadius
                    }
                });
            }
            
            this.tileSprites.set(tileKey, sprite);
            this.visibleTiles.add(tileKey);
            
            // Update memory tracking
            this.memoryStats.spritesCreated++;
            this.memoryStats.currentSpriteCount++;
            if (this.memoryStats.currentSpriteCount > this.memoryStats.peakSpriteCount) {
                this.memoryStats.peakSpriteCount = this.memoryStats.currentSpriteCount;
            }
        }
    }
    
    // Get preloaded area info (for debugging)
    getPreloadedAreaInfo() {
        return {
            areas: this.preloadedAreas || [],
            totalAreas: (this.preloadedAreas || []).length,
            totalTilesPreloaded: (this.preloadedAreas || []).reduce((sum, area) => sum + area.tilesLoaded, 0)
        };
    }

    createLinearPath() {
        // Create a more winding path with curves, loops, and side branches for hidden areas
        this.pathPoints = [];
        this.sidePathAreas = []; // Store potential side quest areas
        
        // Define an extremely winding path route with many more curves and branches
        const segments = [
            // Starting area - multiple starting branches (scaled by 0.75)
            { startX: 37, startY: 562, endX: 90, endY: 547, type: 'start' },
            { startX: 90, startY: 547, endX: 135, endY: 532, type: 'path' },
            
            // First branch junction
            { startX: 135, startY: 532, endX: 112, endY: 510, type: 'path_branch', sideQuest: true },
            { startX: 112, startY: 510, endX: 165, endY: 487, type: 'path' },
            
            // Tight S-curves
            { startX: 165, startY: 487, endX: 135, endY: 465, type: 'path' },
            { startX: 135, startY: 465, endX: 187, endY: 442, type: 'path' },
            { startX: 187, startY: 442, endX: 150, endY: 420, type: 'path_branch', sideQuest: true },
            
            // First loop section
            { startX: 150, startY: 420, endX: 225, endY: 435, type: 'path' },
            { startX: 225, startY: 435, endX: 262, endY: 465, type: 'path' },
            { startX: 262, startY: 465, endX: 240, endY: 495, type: 'path' },
            { startX: 240, startY: 495, endX: 210, endY: 480, type: 'path_branch', sideQuest: true },
            
            // Spiral approach to first combat
            { startX: 210, startY: 480, endX: 262, endY: 450, type: 'path' },
            { startX: 262, startY: 450, endX: 285, endY: 420, type: 'path' },
            { startX: 285, startY: 420, endX: 255, endY: 390, type: 'path' },
            { startX: 255, startY: 390, endX: 225, endY: 375, type: 'combat1', sideQuest: true },
            
            // Complex winding after first combat
            { startX: 225, startY: 375, endX: 187, endY: 360, type: 'path' },
            { startX: 187, startY: 360, endX: 150, endY: 337, type: 'path' },
            { startX: 150, startY: 337, endX: 120, endY: 315, type: 'path_branch', sideQuest: true },
            { startX: 120, startY: 315, endX: 97, endY: 292, type: 'path_hidden', sideQuest: true },
            
            // Return path with multiple curves
            { startX: 97, startY: 292, endX: 135, endY: 285, type: 'path' },
            { startX: 135, startY: 285, endX: 172, endY: 277, type: 'path' },
            { startX: 172, startY: 277, endX: 210, endY: 292, type: 'path' },
            { startX: 210, startY: 292, endX: 240, endY: 315, type: 'path_branch', sideQuest: true },
            
            // Major eastward swing with detours
            { startX: 240, startY: 315, endX: 300, endY: 307, type: 'path' },
            { startX: 300, startY: 307, endX: 360, endY: 322, type: 'path' },
            { startX: 360, startY: 322, endX: 412, endY: 337, type: 'path_branch', sideQuest: true },
            { startX: 412, startY: 337, endX: 465, endY: 360, type: 'path' },
            
            // Large loop with hidden area
            { startX: 465, startY: 360, endX: 510, endY: 390, type: 'path' },
            { startX: 510, startY: 390, endX: 540, endY: 420, type: 'path' },
            { startX: 540, startY: 420, endX: 525, endY: 450, type: 'path_branch', sideQuest: true },
            { startX: 525, startY: 450, endX: 487, endY: 435, type: 'path' },
            
            // Second combat area approach
            { startX: 487, startY: 435, endX: 450, endY: 412, type: 'path' },
            { startX: 450, startY: 412, endX: 435, endY: 390, type: 'combat2', sideQuest: true },
            
            // Complex return westward
            { startX: 435, startY: 390, endX: 390, endY: 375, type: 'path' },
            { startX: 390, startY: 375, endX: 345, endY: 360, type: 'path' },
            { startX: 345, startY: 360, endX: 300, endY: 345, type: 'path_branch', sideQuest: true },
            { startX: 300, startY: 345, endX: 262, endY: 330, type: 'path' },
            
            // Multiple small loops and curves
            { startX: 262, startY: 330, endX: 240, endY: 307, type: 'path' },
            { startX: 240, startY: 307, endX: 210, endY: 285, type: 'path_secret', sideQuest: true },
            { startX: 210, startY: 285, endX: 180, endY: 262, type: 'path' },
            { startX: 180, startY: 262, endX: 150, endY: 240, type: 'path' },
            
            // Final approach with multiple branches
            { startX: 150, startY: 240, endX: 187, endY: 217, type: 'path_branch', sideQuest: true },
            { startX: 187, startY: 217, endX: 225, endY: 195, type: 'path' },
            { startX: 225, startY: 195, endX: 262, endY: 172, type: 'path' },
            { startX: 262, startY: 172, endX: 300, endY: 150, type: 'path_branch', sideQuest: true },
            
            // Pre-final boss winding
            { startX: 300, startY: 150, endX: 337, endY: 127, type: 'path' },
            { startX: 337, startY: 127, endX: 375, endY: 112, type: 'path' },
            { startX: 375, startY: 112, endX: 412, endY: 97, type: 'path_branch', sideQuest: true },
            
            // Final combat with multiple exits
            { startX: 412, startY: 97, endX: 450, endY: 82, type: 'combat3', sideQuest: true },
            { startX: 450, startY: 82, endX: 487, endY: 67, type: 'path' },
            { startX: 487, startY: 67, endX: 525, endY: 52, type: 'path_branch', sideQuest: true },
            { startX: 525, startY: 52, endX: 562, endY: 37, type: 'exit' }
        ];
        
        // Generate smooth path through all segments
        segments.forEach((segment, index) => {
            const segmentPoints = this.generatePathSegment(
                segment.startX, segment.startY, 
                segment.endX, segment.endY, 
                15 // Points per segment for smooth curves
            );
            
            segmentPoints.forEach(point => {
                point.segmentType = segment.type;
                point.segmentIndex = index;
                point.hasSideQuest = segment.sideQuest || false;
                this.pathPoints.push(point);
            });
            
            // Create side branches for exploration and hidden content
            if (segment.sideQuest) {
                this.createSideBranches(segment, index);
            }
        });
        
        // Create the actual walkable path
        this.pathPoints.forEach((point, index) => {
            this.createPathArea(point.x, point.y, this.pathWidth);
        });
        
        console.log('Created winding path with', this.pathPoints.length, 'waypoints and', this.sidePathAreas.length, 'side areas');
    }
    
    createSideBranches(segment, segmentIndex) {
        // Create 1-3 side branches for each marked segment, with overlap checking
        const numBranches = Math.random() < 0.5 ? 1 : (Math.random() < 0.8 ? 2 : 3);
        
        for (let i = 0; i < numBranches; i++) {
            const branchStart = {
                x: segment.startX + (segment.endX - segment.startX) * (0.2 + i * 0.3),
                y: segment.startY + (segment.endY - segment.startY) * (0.2 + i * 0.3)
            };
            
            // Create multiple branch attempts with different angles and lengths
            let branchCreated = false;
            let attempts = 0;
            
            while (!branchCreated && attempts < 5) {
                // Vary branch directions more - not just perpendicular
                const angle = Math.atan2(segment.endY - segment.startY, segment.endX - segment.startX);
                const angleVariation = (Math.PI / 3) + (Math.random() * Math.PI / 3); // 60-120 degrees
                const branchAngle = angle + angleVariation * (Math.random() < 0.5 ? 1 : -1);
                const branchLength = 30 + Math.random() * 80; // Variable length 30-110
                
                const branchEnd = {
                    x: branchStart.x + Math.cos(branchAngle) * branchLength,
                    y: branchStart.y + Math.sin(branchAngle) * branchLength
                };
                
                // Ensure branch stays in bounds
                branchEnd.x = Math.max(40, Math.min(this.mapWidth - 40, branchEnd.x));
                branchEnd.y = Math.max(40, Math.min(this.mapHeight - 40, branchEnd.y));
                
                // Check for overlap with existing paths and branches
                const minDistanceFromMain = 25; // Minimum distance from main path
                const minDistanceFromBranches = 30; // Minimum distance from other branches
                
                let validBranch = true;
                
                // Check distance from main path points
                for (const pathPoint of this.pathPoints) {
                    const distance = Math.sqrt((branchEnd.x - pathPoint.x) ** 2 + (branchEnd.y - pathPoint.y) ** 2);
                    if (distance < minDistanceFromMain) {
                        validBranch = false;
                        break;
                    }
                }
                
                // Check distance from existing side areas
                if (validBranch) {
                    for (const existingArea of this.sidePathAreas) {
                        const distance = Math.sqrt((branchEnd.x - existingArea.centerX) ** 2 + (branchEnd.y - existingArea.centerY) ** 2);
                        if (distance < minDistanceFromBranches) {
                            validBranch = false;
                            break;
                        }
                    }
                }
                
                if (validBranch) {
                    // Create curved branch path instead of straight line
                    const branchPoints = this.generateCurvedBranch(
                        branchStart.x, branchStart.y,
                        branchEnd.x, branchEnd.y,
                        10 // Points for smooth curve
                    );
                    
                    // Create smaller side paths
                    branchPoints.forEach(point => {
                        this.createPathArea(point.x, point.y, Math.floor(this.pathWidth * 0.5)); // Even narrower side paths
                    });
                    
                    // Store side area for future content
                    this.sidePathAreas.push({
                        centerX: branchEnd.x,
                        centerY: branchEnd.y,
                        radius: 20,
                        type: segment.type,
                        segmentIndex: segmentIndex,
                        discovered: false,
                        branchPoints: branchPoints // Store for minimap display
                    });
                    
                    branchCreated = true;
                }
                
                attempts++;
            }
        }
    }
    
    generateCurvedBranch(startX, startY, endX, endY, numPoints) {
        const points = [];
        
        // Add curve to the branch using a control point
        const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 40;
        const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 40;
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            
            // Quadratic Bezier curve
            const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
            const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
            
            points.push({ x: Math.floor(x), y: Math.floor(y) });
        }
        
        return points;
    }
    
    generatePathSegment(startX, startY, endX, endY, numPoints) {
        const points = [];
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            
            // Use smooth interpolation with slight curve
            const curveStrength = 0.3;
            const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 100 * curveStrength;
            const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 100 * curveStrength;
            
            // Quadratic bezier curve for smooth paths
            const x = Math.round((1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX);
            const y = Math.round((1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY);
            
            // Ensure point is within map bounds
            const clampedX = Math.max(this.pathWidth, Math.min(this.mapWidth - this.pathWidth, x));
            const clampedY = Math.max(this.pathWidth, Math.min(this.mapHeight - this.pathWidth, y));
            
            points.push({ x: clampedX, y: clampedY });
        }
        
        return points;
    }
    
    createPathArea(centerX, centerY, width) {
        const halfWidth = Math.floor(width / 2);
        
        for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
            for (let y = centerY - halfWidth; y <= centerY + halfWidth; y++) {
                if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                    // Clear path area
                    this.tiles[x][y] = 'dirt_road_straight';
                    this.obstacleLayer[x][y] = null;
                    this.decorationLayer[x][y] = null;
                }
            }
        }
    }

    placeWarehousesAlongPath() {
        console.log('🏭 Starting warehouse placement along path...');
        console.log('Total path points:', this.pathPoints.length);
        
        // Find combat areas along the path and place warehouses
        const combat1Points = this.pathPoints.filter(p => p.segmentType === 'combat1');
        const combat2Points = this.pathPoints.filter(p => p.segmentType === 'combat2');
        const combat3Points = this.pathPoints.filter(p => p.segmentType === 'combat3');
        
        console.log('Combat1 points found:', combat1Points.length);
        console.log('Combat2 points found:', combat2Points.length);
        console.log('Combat3 points found:', combat3Points.length);
        
        if (combat1Points.length > 0) {
            const point = combat1Points[Math.floor(combat1Points.length / 2)];
            console.log('Placing warehouse_1 at:', Math.floor(point.x), Math.floor(point.y));
            this.createWarehouse(Math.floor(point.x), Math.floor(point.y), 'warehouse_1', 30);
        } else {
            console.warn('❌ No combat1 points found for warehouse_1');
        }
        
        if (combat2Points.length > 0) {
            const point = combat2Points[Math.floor(combat2Points.length / 2)];
            console.log('Placing warehouse_2 at:', Math.floor(point.x), Math.floor(point.y));
            this.createWarehouse(Math.floor(point.x), Math.floor(point.y), 'warehouse_2', 35);
        } else {
            console.warn('❌ No combat2 points found for warehouse_2');
        }
        
        if (combat3Points.length > 0) {
            const point = combat3Points[Math.floor(combat3Points.length / 2)];
            console.log('Placing warehouse_3 at:', Math.floor(point.x), Math.floor(point.y));
            this.createWarehouse(Math.floor(point.x), Math.floor(point.y), 'warehouse_3', 40);
        } else {
            console.warn('❌ No combat3 points found for warehouse_3');
        }
        
        console.log('✅ Warehouse placement complete. Total warehouses:', this.warehouses.length);
    }
    
    placePuzzleBoardsAlongPath() {
        // Place puzzle boards at strategic points between combat areas
        const pathLength = this.pathPoints.length;
        
        // Puzzle 1 - Early in the journey (vision boost)
        const puzzle1Index = Math.floor(pathLength * 0.15);
        if (puzzle1Index < pathLength) {
            const point = this.pathPoints[puzzle1Index];
            this.createPuzzleBoard(Math.floor(point.x + 10), Math.floor(point.y + 10), 'puzzle_1', 'vision');
        }
        
        // Puzzle 2 - Middle of journey (speed boost)
        const puzzle2Index = Math.floor(pathLength * 0.5);
        if (puzzle2Index < pathLength) {
            const point = this.pathPoints[puzzle2Index];
            this.createPuzzleBoard(Math.floor(point.x - 10), Math.floor(point.y + 10), 'puzzle_2', 'speed');
        }
        
        // Puzzle 3 - Near the end (damage boost)
        const puzzle3Index = Math.floor(pathLength * 0.8);
        if (puzzle3Index < pathLength) {
            const point = this.pathPoints[puzzle3Index];
            this.createPuzzleBoard(Math.floor(point.x + 10), Math.floor(point.y - 10), 'puzzle_3', 'damage');
        }
        
        console.log('Placed', this.puzzleBoards.length, 'puzzle boards along the path');
    }
    
    createDenseForestAreas() {
        // Fill areas outside the path with moderate forest (reduced density)
        for (let x = 0; x < this.mapWidth; x++) {
            for (let y = 0; y < this.mapHeight; y++) {
                // Skip if already part of the path
                if (this.tiles[x][y] === 'dirt_road_straight') continue;
                
                // Check distance to nearest path point
                const nearestPathDistance = this.getDistanceToNearestPathPoint(x, y);
                
                // Create natural clearings using noise
                const clearingNoise = Math.sin(x * 0.1) * Math.cos(y * 0.12) + Math.sin(x * 0.05) * Math.cos(y * 0.08);
                const isClearing = clearingNoise > 0.4;
                
                if (nearestPathDistance > this.pathWidth * 2) {
                    // Far from path - moderate forest (reduced by 10%: 0.55 * 0.9 = 0.495)
                    if (!isClearing && Math.random() < 0.495) {
                        this.decorationLayer[x][y] = Math.random() < 0.6 ? 'tree_oak_large' : 'tree_pine_large';
                    }
                } else if (nearestPathDistance > this.pathWidth) {
                    // Near path - light forest (reduced by 10%: 0.25 * 0.9 = 0.225)
                    if (!isClearing && Math.random() < 0.225) {
                        this.decorationLayer[x][y] = Math.random() < 0.5 ? 'tree_oak_large' : 'bush_hiding';
                    }
                }
            }
        }
    }
    
    getDistanceToNearestPathPoint(x, y) {
        let minDistance = Infinity;
        
        for (const point of this.pathPoints) {
            const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
            if (distance < minDistance) {
                minDistance = distance;
            }
        }
        
        return minDistance;
    }
    
    createHidingSpotsAlongPath() {
        // Place hiding spots strategically along the path
        const pathLength = this.pathPoints.length;
        const hidingSpotInterval = Math.max(1, Math.floor(pathLength / 15)); // About 15 hiding spots
        
        for (let i = 0; i < pathLength; i += hidingSpotInterval) {
            if (i < this.pathPoints.length) {
                const point = this.pathPoints[i];
                
                // Place hiding spots slightly off the path
                const offsets = [
                    { x: 8, y: 8 }, { x: -8, y: 8 }, 
                    { x: 8, y: -8 }, { x: -8, y: -8 }
                ];
                
                const offset = offsets[Math.floor(Math.random() * offsets.length)];
                // Ensure integer coordinates
                const hidingX = Math.floor(point.x + offset.x);
                const hidingY = Math.floor(point.y + offset.y);
                
                if (this.isValidHidingPosition(hidingX, hidingY)) {
                    const hidingType = Math.random() < 0.6 ? 'bush_hiding' : 'haystack';
                    this.decorationLayer[hidingX][hidingY] = hidingType;
                    this.hidingSpots.push({
                        x: hidingX,
                        y: hidingY,
                        type: hidingType
                    });
                }
            }
        }
        
        console.log('Placed', this.hidingSpots.length, 'hiding spots along the path');
    }
    
    addEnvironmentalDetails() {
        // Add small lakes near the path
        this.createSmallLakesNearPath();
        
        // Add rivers and streams
        this.createRiversAndStreams();
        
        // Add some clearings with grass
        this.createClearingsAlongPath();
        
        // Add scattered rocks and environmental objects
        this.addScatteredEnvironmentalObjects();
    }
    
    createSmallLakesNearPath() {
        // Create smaller, fewer lakes in open areas away from forest
        const numLakes = 4; // Reduced back to 4
        const pathLength = this.pathPoints.length;
        
        for (let i = 0; i < numLakes; i++) {
            const pathIndex = Math.floor((i + 1) * pathLength / (numLakes + 1));
            if (pathIndex < this.pathPoints.length) {
                const pathPoint = this.pathPoints[pathIndex];
                
                // Place lake offset from path with bounds checking
                const offsetX = (Math.random() - 0.5) * 60; // Reduced spread
                const offsetY = (Math.random() - 0.5) * 60; // Reduced spread
                
                const lakeX = Math.max(20, Math.min(this.mapWidth - 25, pathPoint.x + offsetX));
                const lakeY = Math.max(20, Math.min(this.mapHeight - 25, pathPoint.y + offsetY));
                
                // Make lakes smaller and avoid forest areas
                const distanceToPath = this.getDistanceToNearestPathPoint(lakeX, lakeY);
                if (distanceToPath > 25 && distanceToPath < 80) { // Only in open areas near but not on path
                    const lakeWidth = 8 + Math.random() * 6; // 8-14 width (smaller)
                    const lakeHeight = 6 + Math.random() * 4; // 6-10 height (smaller)
                    this.createLake(lakeX, lakeY, lakeWidth, lakeHeight);
                }
            }
        }
        
        // Add fewer, smaller random lakes only in clear areas
        for (let i = 0; i < 3; i++) {
            const randX = Math.random() * (this.mapWidth - 100) + 50;
            const randY = Math.random() * (this.mapHeight - 100) + 50;
            
            // Check if in clear area (far from path but not in deep forest)
            const distanceToPath = this.getDistanceToNearestPathPoint(randX, randY);
            if (distanceToPath > 50 && distanceToPath < 120) {
                const lakeWidth = 5 + Math.random() * 6; // 5-11 width (much smaller)
                const lakeHeight = 4 + Math.random() * 5; // 4-9 height (much smaller)
                this.createLake(randX, randY, lakeWidth, lakeHeight);
            }
        }
    }
    
    createClearingsAlongPath() {
        // Create small clearings around combat areas
        const combatPoints = this.pathPoints.filter(p => 
            p.segmentType === 'combat1' || p.segmentType === 'combat2' || p.segmentType === 'combat3'
        );
        
        combatPoints.forEach(point => {
            // Create a small clearing around combat areas
            for (let x = point.x - 15; x <= point.x + 15; x++) {
                for (let y = point.y - 15; y <= point.y + 15; y++) {
                    if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                        const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
                        if (distance <= 15 && Math.random() < 0.7) {
                            // Clear some trees to create combat space
                            this.decorationLayer[x][y] = null;
                            this.tiles[x][y] = 'grass_green';
                        }
                    }
                }
            }
        });
    }
    
    addScatteredEnvironmentalObjects() {
        // Add rocks, signposts, and other details - increased frequency and variety
        const pathLength = this.pathPoints.length;
        
        // Objects near path - increased frequency
        for (let i = 0; i < pathLength; i += 15) { // Reduced from 30 to 15 for more frequent placement
            if (i < this.pathPoints.length) {
                const point = this.pathPoints[i];
                
                // More rocks than signposts for natural look
                const objects = ['rock_boulder', 'rock_boulder', 'rock_boulder', 'signpost'];
                const object = objects[Math.floor(Math.random() * objects.length)];
                
                // Ensure integer coordinates with wider spread
                const objX = Math.floor(point.x + (Math.random() - 0.5) * 40);
                const objY = Math.floor(point.y + (Math.random() - 0.5) * 40);
                
                if (this.isValidPropPosition(objX, objY)) {
                    this.decorationLayer[objX][objY] = object;
                }
            }
        }
        
        // Add stone clusters throughout the map
        this.addStoneFormations();
        
        // Add scattered individual rocks in forest areas
        this.addScatteredRocks();
    }
    
    addStoneFormations() {
        // Add larger stone formations and clusters
        const formations = [
            { centerX: 112, centerY: 150, size: 8 },   // Near final area (scaled 0.75)
            { centerX: 510, centerY: 262, size: 6 },   // Forest area (scaled 0.75)
            { centerX: 90, centerY: 375, size: 7 },    // Mid-map (scaled 0.75)
            { centerX: 450, centerY: 450, size: 5 },   // Eastern forest (scaled 0.75)
            { centerX: 150, centerY: 487, size: 6 },   // Western area (scaled 0.75)
            { centerX: 337, centerY: 300, size: 9 },   // Central area (scaled 0.75)
            { centerX: 562, centerY: 187, size: 5 },   // Northern area (scaled 0.75)
            { centerX: 37, centerY: 562, size: 4 },    // Near spawn (scaled 0.75)
        ];
        
        formations.forEach(formation => {
            // Create a cluster of rocks around the center point
            for (let i = 0; i < formation.size; i++) {
                const angle = (i / formation.size) * Math.PI * 2;
                const radius = 15 + Math.random() * 20; // 15-35 tile radius
                
                const rockX = Math.floor(formation.centerX + Math.cos(angle) * radius);
                const rockY = Math.floor(formation.centerY + Math.sin(angle) * radius);
                
                if (this.isValidPropPosition(rockX, rockY)) {
                    this.decorationLayer[rockX][rockY] = 'rock_boulder';
                }
                
                // Add some random additional rocks nearby
                if (Math.random() < 0.4) {
                    const nearbyX = rockX + Math.floor((Math.random() - 0.5) * 10);
                    const nearbyY = rockY + Math.floor((Math.random() - 0.5) * 10);
                    
                    if (this.isValidPropPosition(nearbyX, nearbyY)) {
                        this.decorationLayer[nearbyX][nearbyY] = 'rock_boulder';
                    }
                }
            }
        });
    }
    
    addScatteredRocks() {
        // Add individual rocks scattered throughout the map
        const numScatteredRocks = 150; // Significantly increased from implicit ~25
        
        for (let i = 0; i < numScatteredRocks; i++) {
            const rockX = Math.floor(Math.random() * this.mapWidth);
            const rockY = Math.floor(Math.random() * this.mapHeight);
            
            // Check if position is valid and not too close to path
            const distanceToPath = this.getDistanceToNearestPathPoint(rockX, rockY);
            if (distanceToPath > 8 && this.isValidPropPosition(rockX, rockY)) {
                this.decorationLayer[rockX][rockY] = 'rock_boulder';
            }
        }
    }
    
    createRiversAndStreams() {
        // Add smaller, more contained water features separate from forest areas (scaled 0.75)
        this.createWindingRiver(37, 75, 150, 225, 1); // Small river in clear area
        this.createWindingRiver(450, 112, 562, 262, 1); // Small stream in open area
        
        // Add very small streams only in clear areas (scaled 0.75)
        this.createStream(75, 450, 150, 487, 1); // Small connecting stream
        this.createStream(487, 375, 525, 450, 1); // Another small stream
    }
    
    createWindingRiver(startX, startY, endX, endY, width) {
        // Create a winding river from start to end point
        const totalDistance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const segments = Math.ceil(totalDistance / 20); // Segment every ~20 tiles
        
        const points = [{ x: startX, y: startY }];
        
        // Generate winding path points
        for (let i = 1; i < segments; i++) {
            const progress = i / segments;
            const baseX = startX + (endX - startX) * progress;
            const baseY = startY + (endY - startY) * progress;
            
            // Add some random winding
            const windingX = baseX + (Math.random() - 0.5) * 40;
            const windingY = baseY + (Math.random() - 0.5) * 40;
            
            // Keep within map bounds
            const clampedX = Math.max(5, Math.min(this.mapWidth - 5, windingX));
            const clampedY = Math.max(5, Math.min(this.mapHeight - 5, windingY));
            
            points.push({ x: clampedX, y: clampedY });
        }
        
        points.push({ x: endX, y: endY });
        
        // Draw water between all points
        for (let i = 0; i < points.length - 1; i++) {
            this.drawWaterLine(points[i], points[i + 1], width);
        }
    }
    
    createStream(startX, startY, endX, endY, width) {
        // Create a simple stream (less winding than rivers)
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const steps = Math.ceil(distance / 5); // Denser sampling for smooth streams
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const x = Math.floor(startX + (endX - startX) * progress);
            const y = Math.floor(startY + (endY - startY) * progress);
            
            // Add slight randomness for natural look
            const finalX = x + Math.floor((Math.random() - 0.5) * 3);
            const finalY = y + Math.floor((Math.random() - 0.5) * 3);
            
            // Place water with width
            for (let wx = -width; wx <= width; wx++) {
                for (let wy = -width; wy <= width; wy++) {
                    const waterX = finalX + wx;
                    const waterY = finalY + wy;
                    
                    if (waterX >= 0 && waterX < this.mapWidth && waterY >= 0 && waterY < this.mapHeight) {
                        // Check if far enough from path to avoid blocking
                        const distanceToPath = this.getDistanceToNearestPathPoint(waterX, waterY);
                        if (distanceToPath > 5) {
                            this.tiles[waterX][waterY] = 'water_blue';
                        }
                    }
                }
            }
        }
    }
    
    drawWaterLine(start, end, width) {
        // Draw water line between two points
        const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const steps = Math.ceil(distance / 2);
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const x = Math.floor(start.x + (end.x - start.x) * progress);
            const y = Math.floor(start.y + (end.y - start.y) * progress);
            
            // Place water with width
            for (let wx = -width; wx <= width; wx++) {
                for (let wy = -width; wy <= width; wy++) {
                    const waterX = x + wx;
                    const waterY = y + wy;
                    
                    if (waterX >= 0 && waterX < this.mapWidth && waterY >= 0 && waterY < this.mapHeight) {
                        // Check if far enough from path to avoid blocking
                        const distanceToPath = this.getDistanceToNearestPathPoint(waterX, waterY);
                        if (distanceToPath > 5) {
                            this.tiles[waterX][waterY] = 'water_blue';
                        }
                    }
                }
            }
        }
    }
    
    createMainRoad() {
        // Create curved, winding road from bottom to top for 600x600 map
        const centerX = 300; // Center of 600-wide map
        const roadWidth = 19; // Scaled road width for 600x600 map
        
        // Create path waypoints that curve left and right
        const waypoints = [];
        for (let i = 0; i <= 20; i++) {
            const progress = i / 20;
            const y = Math.floor(progress * this.mapHeight);
            
            // Create S-curve pattern with multiple turns like the image
            let xOffset;
            if (progress < 0.15) {
                // Start straight
                xOffset = 0;
            } else if (progress < 0.35) {
                // Curve right (scaled 0.75)
                xOffset = Math.sin((progress - 0.15) * Math.PI * 2.5) * 150;
            } else if (progress < 0.5) {
                // Curve left (scaled 0.75)
                xOffset = 150 - Math.sin((progress - 0.35) * Math.PI * 3.33) * 300;
            } else if (progress < 0.65) {
                // Sharp curve right (scaled 0.75)
                xOffset = -150 + Math.sin((progress - 0.5) * Math.PI * 3.33) * 225;
            } else if (progress < 0.8) {
                // Gentle curve left (scaled 0.75)
                xOffset = 75 - Math.sin((progress - 0.65) * Math.PI * 2) * 187;
            } else {
                // Final approach - curve to center (scaled 0.75)
                xOffset = -112 + (progress - 0.8) * 562; // Straighten toward center
            }
            
            waypoints.push({
                x: Math.max(30, Math.min(570, centerX + xOffset)),
                y: y
            });
        }
        
        // Create road segments between waypoints
        for (let i = 0; i < waypoints.length - 1; i++) {
            this.createRoadSegment(waypoints[i], waypoints[i + 1], roadWidth);
        }
        
        // Add crossings at major intersections (scaled 0.75)
        const crossingYs = [150, 300, 450];
        crossingYs.forEach(crossY => {
            const roadX = this.getRoadXAtY(crossY, waypoints);
            this.createRoadCrossing(roadX, crossY, roadWidth * 1.5);
        });
    }
    
    createRoadSegment(start, end, width) {
        const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const steps = Math.ceil(distance / 2); // Dense sampling for smooth curves
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const x = Math.floor(start.x + (end.x - start.x) * progress);
            const y = Math.floor(start.y + (end.y - start.y) * progress);
            
            // Create road with specified width
            for (let offsetX = -Math.floor(width/2); offsetX <= Math.floor(width/2); offsetX++) {
                for (let offsetY = -Math.floor(width/4); offsetY <= Math.floor(width/4); offsetY++) {
                    const roadX = x + offsetX;
                    const roadY = y + offsetY;
                    
                    if (roadX >= 0 && roadX < this.mapWidth && roadY >= 0 && roadY < this.mapHeight) {
                        this.tiles[roadX][roadY] = 'dirt_road_straight';
                    }
                }
            }
        }
    }
    
    createRoadCrossing(x, y, size) {
        const halfSize = Math.floor(size / 2);
        for (let offsetX = -halfSize; offsetX <= halfSize; offsetX++) {
            for (let offsetY = -halfSize; offsetY <= halfSize; offsetY++) {
                const crossX = x + offsetX;
                const crossY = y + offsetY;
                
                if (crossX >= 0 && crossX < this.mapWidth && crossY >= 0 && crossY < this.mapHeight) {
                    this.tiles[crossX][crossY] = 'dirt_road_crossing';
                }
            }
        }
    }
    
    getRoadXAtY(targetY, waypoints) {
        // Find the road X position at a given Y coordinate
        for (let i = 0; i < waypoints.length - 1; i++) {
            if (targetY >= waypoints[i].y && targetY <= waypoints[i + 1].y) {
                const progress = (targetY - waypoints[i].y) / (waypoints[i + 1].y - waypoints[i].y);
                return Math.floor(waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * progress);
            }
        }
        return waypoints[waypoints.length - 1].x; // Default to last waypoint
    }
    
    createSmallLakes() {
        // Lakes scattered throughout the 600x600 map
        const lakes = [
            { x: 150, y: 500, width: 60, height: 45 },    // Near spawn area
            { x: 350, y: 450, width: 75, height: 60 },    // Central area
            { x: 112, y: 350, width: 45, height: 45 },    // Forest area
            { x: 450, y: 300, width: 90, height: 75 },    // Eastern area
            { x: 187, y: 250, width: 60, height: 45 },    // Mid-map
            { x: 525, y: 150, width: 45, height: 60 },    // Near final area
            // Additional smaller lakes
            { x: 75, y: 450, width: 67, height: 52 },     // Western area
            { x: 500, y: 400, width: 52, height: 37 },    // Eastern forest
            { x: 37, y: 200, width: 82, height: 67 },     // Northern area
            { x: 400, y: 200, width: 60, height: 45 },    // Central-north
            { x: 225, y: 100, width: 63, height: 56 },    // Final area
        ];
        
        lakes.forEach(lake => this.createLake(lake.x, lake.y, lake.width, lake.height));
    }
    
    createLake(startX, startY, width, height) {
        // Ensure all coordinates are integers
        const intStartX = Math.floor(startX);
        const intStartY = Math.floor(startY);
        const intWidth = Math.ceil(width);
        const intHeight = Math.ceil(height);
        
        for (let x = intStartX; x < intStartX + intWidth && x < this.mapWidth; x++) {
            for (let y = intStartY; y < intStartY + intHeight && y < this.mapHeight; y++) {
                if (x >= 0 && y >= 0) {
                    this.tiles[x][y] = 'water_blue';
                }
            }
        }
    }
    
    createWarehouseAreas() {
        // Warehouse positions for 600x600 map
        // Warehouse 1 - Near spawn area
        this.createWarehouse(225, 475, 'warehouse_1', 45);
        
        // Warehouse 2 - Mid-map area
        this.createWarehouse(375, 300, 'warehouse_2', 60);
        
        // Warehouse 3 - Near final area
        this.createWarehouse(450, 75, 'warehouse_3', 75);
    }
    
    createWarehouse(x, y, id, lightRadius) {
        // Place warehouse building - warehouses can be placed on paths
        if (this.isValidWarehousePosition(x, y)) {
            this.obstacleLayer[x][y] = 'warehouse';
            
            // Warehouses now have health and can be damaged
            const warehouse = {
                id: id,
                x: x,
                y: y,
                lightRadius: lightRadius,
                destroyed: false,
                health: 150, // Warehouses have substantial health
                maxHealth: 150,
                sprite: null, // Will be set when rendered
                healthBarBg: null,
                healthBarFill: null
            };
            
            this.warehouses.push(warehouse);
            
            // Create enemy zone (light area)
            this.enemyZones.push({
                x: x,
                y: y,
                radius: lightRadius,
                type: 'warehouse_light',
                warehouseId: id
            });
            
            console.log(`✅ Warehouse ${id} created at (${x}, ${y}) with ${warehouse.health} health and light radius ${lightRadius}`);
        } else {
            console.warn(`❌ Cannot place warehouse ${id} at (${x}, ${y}) - invalid position`);
        }
    }
    
    isValidWarehousePosition(x, y) {
        // Warehouses can be placed on paths or grass, but not on water
        return x >= 0 && x < this.mapWidth && 
               y >= 0 && y < this.mapHeight && 
               this.tiles[x][y] !== 'water_blue' &&
               !this.obstacleLayer[x][y]; // Don't place on existing obstacles
    }
    
    createPuzzlePaths() {
        // Side paths leading to puzzle boards for 600x600 map
        // Puzzle 1 - Vision boost (near spawn)
        this.createSidePath(200, 500, 112, 'right');
        this.createPuzzleBoard(312, 512, 'puzzle_1', 'vision');
        
        // Puzzle 2 - Speed boost (forest segment)
        this.createSidePath(150, 375, 150, 'left');
        this.createPuzzleBoard(37, 387, 'puzzle_2', 'speed');
        
        // Puzzle 3 - Damage boost (northern area)
        this.createSidePath(375, 150, 187, 'right');
        this.createPuzzleBoard(562, 162, 'puzzle_3', 'damage');
    }
    
    createSidePath(startX, startY, length, direction) {
        const dirX = direction === 'right' ? 1 : -1;
        
        for (let i = 0; i < length; i++) {
            const x = startX + (i * dirX);
            const y = startY;
            
                if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                this.tiles[x][y] = 'dirt_road_straight';
                // Add some width
                if (y > 0) this.tiles[x][y - 1] = 'dirt_brown';
                if (y < this.mapHeight - 1) this.tiles[x][y + 1] = 'dirt_brown';
            }
        }
    }
    
    createPuzzleBoard(x, y, id, boostType) {
        if (this.isValidBuildingPosition(x, y)) {
            this.obstacleLayer[x][y] = 'puzzle_board';
            this.puzzleBoards.push({
                id: id,
                x: x,
                y: y,
                boostType: boostType,
                solved: false
            });
        }
    }
    
    createHidingSpots() {
        // Strategic hiding spots throughout the 600x600 map
        const hidingSpots = [
            // Near Warehouse 1 (spawn area)
            { x: 200, y: 450, type: 'bush_hiding' },
            { x: 250, y: 500, type: 'haystack' },
            { x: 175, y: 525, type: 'bush_hiding' },
            { x: 275, y: 425, type: 'haystack' },
            { x: 150, y: 475, type: 'bush_hiding' },
            
            // Forest/mid-map segment
            { x: 125, y: 350, type: 'bush_hiding' },
            { x: 450, y: 375, type: 'bush_hiding' },
            { x: 175, y: 400, type: 'haystack' },
            { x: 100, y: 325, type: 'bush_hiding' },
            { x: 500, y: 350, type: 'haystack' },
            { x: 300, y: 300, type: 'bush_hiding' },
            { x: 425, y: 400, type: 'haystack' },
            { x: 75, y: 375, type: 'bush_hiding' },
            
            // Near Warehouse 2 (mid-map)
            { x: 350, y: 275, type: 'haystack' },
            { x: 400, y: 325, type: 'bush_hiding' },
            { x: 325, y: 350, type: 'bush_hiding' },
            { x: 425, y: 250, type: 'haystack' },
            { x: 375, y: 375, type: 'bush_hiding' },
            
            // Northern area
            { x: 150, y: 200, type: 'haystack' },
            { x: 475, y: 225, type: 'bush_hiding' },
            { x: 200, y: 175, type: 'haystack' },
            { x: 112, y: 150, type: 'bush_hiding' },
            { x: 525, y: 200, type: 'haystack' },
            { x: 275, y: 125, type: 'bush_hiding' },
            { x: 400, y: 175, type: 'haystack' },
            
            // Near Final Warehouse
            { x: 425, y: 100, type: 'haystack' },
            { x: 475, y: 125, type: 'bush_hiding' },
            { x: 400, y: 50, type: 'haystack' },
            { x: 500, y: 75, type: 'bush_hiding' },
            { x: 375, y: 100, type: 'haystack' }
        ];
        
        hidingSpots.forEach(spot => {
            if (this.isValidHidingPosition(spot.x, spot.y)) {
                this.decorationLayer[spot.x][spot.y] = spot.type;
                this.hidingSpots.push({
                    x: spot.x,
                    y: spot.y,
                    type: spot.type
                });
            }
        });
    }
    
    createEnvironmentalZones() {
        // Add trees to create forest segments for 600x600 map (reduced by 10% for performance)
        this.createForestArea(75, 300, 450, 200, 0.27);    // Main forest (0.3 * 0.9)
        this.createForestArea(0, 150, 600, 200, 0.135);    // Northern area with sparse trees (0.15 * 0.9)
        
        // Additional forest areas for the 600x600 map
        this.createForestArea(37, 475, 225, 100, 0.225);   // Spawn area forest (0.25 * 0.9)
        this.createForestArea(400, 500, 175, 75, 0.18);    // Spawn area forest 2 (0.2 * 0.9)
        this.createForestArea(112, 250, 150, 150, 0.315);  // Dense forest near warehouse 2 (0.35 * 0.9)
        this.createForestArea(450, 275, 150, 125, 0.27);   // Forest near warehouse 2 (0.3 * 0.9)
        this.createForestArea(225, 50, 300, 100, 0.36);    // Dense forest near final warehouse (0.4 * 0.9)
        
        // Add scattered vegetation
        this.addScatteredVegetation();
        
        // Add random houses across the map
        this.addRandomHouses();
    }

    // Legacy methods kept for compatibility but not used in new vertical map
    createNarrativeAreas() {
        // This method is replaced by createVerticalProgression() 
        console.log('Using new vertical progression instead of narrative areas');
    }
    
    createProgressionRoad() {
        // This method is replaced by createMainRoad()
        console.log('Using new main road system');
    }
    
    createWaterFeatures() {
        // This method is replaced by createSmallLakes()
        console.log('Using new small lakes system');
    }

    createSettlements() {
        // Small settlements scattered throughout the 600x600 map
        // Near spawn area (Y: 500-550)
        this.createBuilding(187, 512, 'cabin_wooden', 4, 4);
        this.createBuilding(450, 525, 'house_small', 3, 3);
        this.createBuilding(112, 537, 'shed_old', 2, 2);
        this.createBuilding(525, 500, 'cabin_wooden', 3, 3);
        
        // Checkpoint near Warehouse 1 (Y: 425-475)
        this.createBuilding(225, 437, 'shed_old', 2, 2);
        this.createBuilding(400, 462, 'cabin_wooden', 3, 3);
        this.createBuilding(75, 450, 'house_small', 2, 2);
        this.createBuilding(500, 450, 'shed_old', 2, 2);
        
        // Forest settlements (Y: 350-400)
        this.createBuilding(112, 362, 'cabin_wooden', 2, 2);
        this.createBuilding(475, 387, 'house_small', 3, 3);
        this.createBuilding(37, 375, 'shed_old', 2, 2);
        this.createBuilding(550, 362, 'cabin_wooden', 2, 2);
        
        // Mid-map outpost (Y: 250-325)
        this.createBuilding(187, 262, 'shed_old', 3, 3);
        this.createBuilding(450, 312, 'cabin_wooden', 4, 4);
        this.createBuilding(75, 287, 'house_small', 2, 2);
        this.createBuilding(525, 275, 'shed_old', 2, 2);
        
        // Northern area outposts (Y: 150-200)
        this.createBuilding(150, 162, 'shed_old', 2, 2);
        this.createBuilding(425, 187, 'cabin_wooden', 2, 2);
        this.createBuilding(300, 175, 'house_small', 2, 2);
        
        // Final approach structures (Y: 50-125)
        this.createBuilding(225, 62, 'shed_old', 3, 3);
        this.createBuilding(475, 112, 'house_small', 4, 4);
        this.createBuilding(112, 87, 'cabin_wooden', 2, 2);
        this.createBuilding(550, 75, 'shed_old', 2, 2);
        
        console.log('Created settlements throughout 600x600 map');
    }
    
    createBuilding(x, y, buildingType, width, height) {
        for (let dx = 0; dx < width; dx++) {
            for (let dy = 0; dy < height; dy++) {
                const posX = x + dx;
                const posY = y + dy;
                if (this.isValidBuildingPosition(posX, posY)) {
                    this.obstacleLayer[posX][posY] = buildingType;
                }
            }
        }
    }
    
    addDiverseVegetation() {
        // Dense forest areas with mixed vegetation (scaled 2x and optimized, reduced by 10% for performance)
        this.createForestArea(16, 16, 12, 16, 0.72); // Starting forest (0.8 * 0.9)
        this.createForestArea(36, 60, 16, 20, 0.63); // Entry forest (0.7 * 0.9)
        this.createForestArea(80, 70, 16, 20, 0.81); // Deep forest (0.9 * 0.9)
        this.createForestArea(4, 70, 12, 24, 0.54); // Western woods (0.6 * 0.9)
        this.createForestArea(90, 16, 8, 16, 0.45); // Mountain forest (0.5 * 0.9)
        
        // Additional forest areas for bigger map (reduced by 10% for performance)
        this.createForestArea(20, 80, 20, 16, 0.63); // Southern forest (0.7 * 0.9)
        this.createForestArea(60, 10, 16, 12, 0.54); // Northern woods (0.6 * 0.9)
        
        // Scattered trees, flowers, and weeds
        this.addScatteredVegetation();
        this.addFlowersAndWeeds();
    }
    
    createForestArea(startX, startY, width, height, density) {
        for (let x = startX; x < startX + width; x++) {
            for (let y = startY; y < startY + height; y++) {
                if (Math.random() < density && this.isValidVegetationPosition(x, y)) {
                    // Mix of large blocking trees and small decorative trees
                    if (Math.random() < 0.3) {
                        // Large blocking trees
                        this.obstacleLayer[x][y] = Math.random() < 0.6 ? 'tree_oak_large' : 'tree_pine_large';
                    } else {
                        // Small decorative trees
                        this.decorationLayer[x][y] = Math.random() < 0.5 ? 'tree_oak_small' : 'tree_pine_small';
                    }
                }
            }
        }
    }
    
    addScatteredVegetation() {
        // Add trees throughout the map for atmosphere (for 600x600 map, reduced by 10% for performance)
        for (let i = 0; i < 1013; i++) { // Reduced vegetation count: 1125 * 0.9 = 1012.5 ≈ 1013
            const x = Phaser.Math.Between(1, this.mapWidth - 2);
            const y = Phaser.Math.Between(1, this.mapHeight - 2);
            
            if (this.isValidVegetationPosition(x, y) && Math.random() < 0.27) { // Reduced density: 0.3 * 0.9 = 0.27
                // Mix of different tree types for variety
                const treeType = Math.random();
                if (treeType < 0.4) {
                    this.decorationLayer[x][y] = 'tree_oak_large';
                } else if (treeType < 0.8) {
                    this.decorationLayer[x][y] = 'tree_pine_large';
                } else {
                    this.decorationLayer[x][y] = 'rock_boulder'; // Add some rocks for variety
                }
            }
        }
    }
    
    isValidBuildingPosition(x, y) {
        return x >= 0 && x < this.mapWidth && 
               y >= 0 && y < this.mapHeight && 
               this.tiles[x][y] !== 'water_blue' &&
               this.tiles[x][y] !== 'dirt_road_straight';
    }
    
    isValidVegetationPosition(x, y) {
        return x >= 0 && x < this.mapWidth && 
               y >= 0 && y < this.mapHeight && 
               this.tiles[x][y] !== 'water_blue' &&
               this.tiles[x][y] !== 'dirt_road_straight' &&
               !this.obstacleLayer[x][y];
    }

    isValidHidingPosition(x, y) {
        // Check if position is valid for hiding spots
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
            return false;
        }
        
        // Don't place on water or roads
        if (this.tiles[x][y] === 'water_blue' || 
            this.tiles[x][y].includes('road')) {
            return false;
        }
        
        // Don't place on existing obstacles
        if (this.obstacleLayer[x][y] !== null) {
            return false;
        }
        
        return true;
    }

    addNarrativeProps() {
        // Add story progression markers along the vertical path
        
        // Starting area tutorial prompts
        this.addStoryProp(45, 290, 'signpost'); // Tutorial start
        
        // Warehouse approach warnings
        this.addStoryProp(40, 240, 'rock_boulder'); // Warehouse 1 warning
        this.addStoryProp(50, 140, 'signpost');     // Warehouse 2 warning
        this.addStoryProp(45, 40, 'rock_boulder');  // Final warehouse warning
        
        // Puzzle path markers
        this.addStoryProp(35, 275, 'signpost');  // Puzzle 1 hint
        this.addStoryProp(15, 175, 'signpost');  // Puzzle 2 hint
        this.addStoryProp(85, 75, 'signpost');   // Puzzle 3 hint
        
        // Add random scattered props for atmosphere
        this.addRandomProps();
    }
    
    addStoryProp(x, y, propType) {
        if (this.isValidPropPosition(x, y)) {
            this.decorationLayer[x][y] = propType;
        }
    }
    
    addRandomProps() {
        // Add scattered boulders and natural features (optimized)
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(6, this.mapWidth - 6);
            const y = Phaser.Math.Between(6, this.mapHeight - 6);
            
            if (this.isValidPropPosition(x, y) && Math.random() < 0.4) {
                const props = ['rock_boulder', 'supplies_crate'];
                this.decorationLayer[x][y] = props[Math.floor(Math.random() * props.length)];
            }
        }
    }
    
    isValidPropPosition(x, y) {
        return x >= 0 && x < this.mapWidth && 
               y >= 0 && y < this.mapHeight && 
               this.tiles[x][y] !== 'water_blue' &&
               this.tiles[x][y] !== 'dirt_road_straight' &&
               !this.obstacleLayer[x][y] &&
               !this.decorationLayer[x][y];
    }
    
    // Legacy method - no longer used in warehouse system
    createGranary(x, y, id) {
        return this.createWarehouse(x, y, id, 6);
    }
    
    // Legacy method - no longer used in warehouse system  
    createHostages() {
        console.log('Hostage system replaced with puzzle boards');
    }
    
    // Legacy method - no longer used in warehouse system
    addFlowersAndWeeds() {
        console.log('Flower/weed system simplified for performance');
    }
    
    // New warehouse and puzzle system methods
    // Take damage to warehouse
    damageWarehouse(warehouseId, damage) {
        const warehouse = this.warehouses.find(w => w.id === warehouseId);
        if (warehouse && !warehouse.destroyed && warehouse.health > 0) {
            const oldHealth = warehouse.health;
            warehouse.health = Math.max(0, warehouse.health - damage);
            
            console.log(`🏭 Warehouse ${warehouseId} took ${damage} damage! Health: ${warehouse.health}/${warehouse.maxHealth}`);
            
            // Update health bar if it exists
            this.updateWarehouseHealthBar(warehouse);
            
            // Visual feedback - flash red
            if (warehouse.sprite) {
                warehouse.sprite.setTint(0xff0000);
                this.scene.time.delayedCall(150, () => {
                    if (warehouse.sprite && !warehouse.destroyed) {
                        warehouse.sprite.clearTint();
                    }
                });
            }
            
            // Check if warehouse is destroyed
            if (warehouse.health <= 0) {
                this.destroyWarehouse(warehouseId);
            }
            
            return warehouse.health;
        }
        return 0;
    }
    
    destroyWarehouse(warehouseId) {
        const warehouse = this.warehouses.find(w => w.id === warehouseId);
        if (warehouse && !warehouse.destroyed) {
            warehouse.destroyed = true;
            warehouse.health = 0;
            this.destroyedWarehouses++;
            
            // Completely replace warehouse with exploded version
            if (warehouse.sprite && this.scene && this.scene.add) {
                try {
                    // Store the position from original sprite
                    const originalX = warehouse.sprite.x;
                    const originalY = warehouse.sprite.y;
                    const tileKey = `${warehouse.x},${warehouse.y},obstacle`;
                    
                    console.log(`🏭💥 Destroying warehouse at (${warehouse.x}, ${warehouse.y})`);
                    console.log(`🔍 Before destruction - tileSprites size: ${this.tileSprites.size}, visibleTiles size: ${this.visibleTiles.size}`);
                    
                    // FIRST: Remove ALL traces of the old warehouse sprite
                    // Remove physics body from original sprite
                    if (warehouse.sprite.body) {
                        this.scene.matter.world.remove(warehouse.sprite.body);
                    }
                    
                    // Remove from ALL tracking systems
                    this.tileSprites.delete(tileKey);
                    this.visibleTiles.delete(tileKey);
                    
                    // Destroy the original warehouse sprite completely
                    warehouse.sprite.destroy();
                    warehouse.sprite = null;
                    
                    // SECOND: Update the tile data to exploded warehouse AFTER removing old sprite
                    this.obstacleLayer[warehouse.x][warehouse.y] = 'exploded-warehouse';
                    
                    // THIRD: Create new exploded warehouse sprite (simple approach)
                    const explodedSprite = this.scene.add.image(originalX, originalY, 'exploded-warehouse');
                    explodedSprite.setOrigin(0.5, 0.8);
                    explodedSprite.setDepth(20000 + warehouse.y * 10 + warehouse.x);
                    
                    // Add collision for exploded warehouse (still not walkable)
                    this.scene.matter.add.gameObject(explodedSprite, {
                        isStatic: true,
                        shape: {
                            type: 'rectangle',
                            width: this.tileSize * 0.8,
                            height: this.tileSize * 0.8
                        }
                    });
                    
                    // Update the warehouse object to reference the new sprite
                    warehouse.sprite = explodedSprite;
                    
                    // DO NOT add back to tile tracking - let the rendering system handle it
                    // This prevents duplicate tracking issues
                    
                    console.log(`🔍 After destruction - tileSprites size: ${this.tileSprites.size}, visibleTiles size: ${this.visibleTiles.size}`);
                    console.log(`🏭💥 Warehouse ${warehouseId} completely replaced with exploded-warehouse`);
                } catch (error) {
                    console.warn('Warning: Could not replace warehouse with exploded version:', error);
                    // Fallback: just tint the warehouse red if replacement fails
                    if (warehouse.sprite) {
                        warehouse.sprite.setTint(0x660000);
                    }
                }
            }
            
            // Hide health bar
            if (warehouse.healthBarBg) {
                try {
                    warehouse.healthBarBg.setVisible(false);
                } catch (error) {
                    console.warn('Warning: Could not hide warehouse health bar:', error);
                }
            }
            if (warehouse.healthBarFill) {
                try {
                    warehouse.healthBarFill.setVisible(false);
                } catch (error) {
                    console.warn('Warning: Could not hide warehouse health fill:', error);
                }
            }
            
            // Create destruction effect
            this.createWarehouseDestructionEffect(warehouse);
            
            // Check for victory condition
            if (this.destroyedWarehouses >= 3) {
                console.log('🎉 All warehouses destroyed! Mission complete!');
                // Notify the game scene about victory
                if (this.scene && this.scene.events) {
                    this.scene.events.emit('victoryAchieved');
                }
            }
            
            console.log(`🏭💥 Warehouse ${warehouseId} destroyed! Progress: ${this.destroyedWarehouses}/3`);
            return true;
        }
        return false;
    }
    
    createWarehouseDestructionEffect(warehouse) {
        // Check if scene is still valid before creating effects
        if (!this.scene || !this.scene.add || !this.scene.time || !warehouse.sprite) {
            return; // Scene is being destroyed, skip effects
        }
        
        try {
            // Create explosion particles
            const particles = this.scene.add.particles(warehouse.sprite.x, warehouse.sprite.y, 'bullet', {
                speed: { min: 100, max: 200 },
                scale: { start: 0.5, end: 0 },
                tint: [0xff0000, 0xff4400, 0xffaa00],
                lifespan: 1000,
                quantity: 15
            });
            
            // Remove particles after effect
            this.scene.time.delayedCall(1000, () => {
                if (particles && particles.destroy) {
                    particles.destroy();
                }
            });
        } catch (error) {
            console.warn('Warning: Could not create destruction effect - scene may be destroying:', error);
        }
    }
    
    updateWarehouseHealthBar(warehouse) {
        if (!warehouse.healthBarBg || !warehouse.healthBarFill) {
            return; // Health bar not created yet
        }
        
        const healthPercent = Math.max(0, Math.min(1, warehouse.health / warehouse.maxHealth));
        const barWidth = 80;
        const barHeight = 8;
        
        // Update health bar fill color based on health
        let color = 0x00ff00; // Green
        if (healthPercent < 0.66) color = 0xffaa00; // Orange
        if (healthPercent < 0.33) color = 0xff0000; // Red
        
        // Redraw the health fill with new width and color
        warehouse.healthBarFill.clear();
        warehouse.healthBarFill.fillStyle(color, 1);
        warehouse.healthBarFill.fillRect(-barWidth/2 + 2, -barHeight/2 + 2, (barWidth - 4) * healthPercent, barHeight - 4);
    }
    
    createWarehouseHealthBar(warehouse) {
        if (!warehouse.sprite) return;
        
        const barWidth = 80;
        const barHeight = 8;
        const barOffsetY = -50;
        
        // Background
        warehouse.healthBarBg = this.scene.add.graphics();
        warehouse.healthBarBg.fillStyle(0x222222, 1);
        warehouse.healthBarBg.lineStyle(2, 0x000000, 1);
        warehouse.healthBarBg.fillRect(-barWidth/2, -barHeight/2, barWidth, barHeight);
        warehouse.healthBarBg.strokeRect(-barWidth/2, -barHeight/2, barWidth, barHeight);
        warehouse.healthBarBg.x = warehouse.sprite.x;
        warehouse.healthBarBg.y = warehouse.sprite.y + barOffsetY;
        warehouse.healthBarBg.setDepth(25000);
        
        // Health fill
        warehouse.healthBarFill = this.scene.add.graphics();
        warehouse.healthBarFill.fillStyle(0x00ff00, 1); // Start with green
        warehouse.healthBarFill.fillRect(-barWidth/2 + 2, -barHeight/2 + 2, barWidth - 4, barHeight - 4);
        warehouse.healthBarFill.x = warehouse.sprite.x;
        warehouse.healthBarFill.y = warehouse.sprite.y + barOffsetY;
        warehouse.healthBarFill.setDepth(25001);
        
        console.log(`🏭❤️ Health bar created for warehouse ${warehouse.id}`);
    }
    
    solvePuzzle(puzzleId) {
        const puzzle = this.puzzleBoards.find(p => p.id === puzzleId);
        if (puzzle && !puzzle.solved) {
            puzzle.solved = true;
            this.solvedPuzzles++;
            
            // Apply stat boost based on puzzle type
            switch (puzzle.boostType) {
                case 'vision':
                    this.playerStats.visionRange += 2;
                    console.log(`Vision boosted! New range: ${this.playerStats.visionRange} tiles`);
                    break;
                case 'speed':
                    this.playerStats.speed += 1;
                    console.log(`Speed boosted! New speed: ${this.playerStats.speed}`);
                    break;
                case 'damage':
                    this.playerStats.damage += 10;
                    console.log(`Damage boosted! New damage: ${this.playerStats.damage}`);
                    break;
                case 'health':
                    this.playerStats.health += 20;
                    console.log(`Health boosted! New max health: ${this.playerStats.health}`);
                    break;
            }
            
            console.log(`Puzzle ${puzzleId} solved! Progress: ${this.solvedPuzzles}/${this.puzzleBoards.length}`);
            return true;
        }
        return false;
    }
    
    // Legacy methods for compatibility
    destroyGranary(granaryId) {
        return this.destroyWarehouse(granaryId);
    }
    
    rescueHostage(hostageId) {
        // No longer used in new warehouse system
        return false;
    }
    
    incrementKilledEnemies() {
        this.killedEnemies++;
    }
    
    getObjectives() {
        return {
            mainObjective: {
                description: "Destroy 3 rice warehouses",
                progress: this.destroyedWarehouses,
                total: 3,
                completed: this.destroyedWarehouses >= 3
            },
            sideObjectives: [
                {
                    description: "Kill enemies",
                    progress: this.killedEnemies,
                    total: 45,
                    completed: this.killedEnemies >= 40
                }
            ]
        };
    }

    getPlayerStats() {
        return { ...this.playerStats };
    }

    // Helper method to check if player is in enemy light zone
    isInEnemyZone(playerX, playerY) {
        for (const zone of this.enemyZones) {
            const distance = Math.sqrt(
                Math.pow(playerX - zone.x, 2) + 
                Math.pow(playerY - zone.y, 2)
            );
            if (distance <= zone.radius) {
                return { inZone: true, zone: zone };
            }
        }
        return { inZone: false, zone: null };
    }

    // Helper method to check if position is a hiding spot
    isHidingSpot(x, y) {
        return this.hidingSpots.find(spot => spot.x === x && spot.y === y) || null;
    }

    // Performance optimized render method with viewport culling
    renderMap() {
        // Clear existing sprite references
        this.tileSprites.clear();
        this.visibleTiles.clear();
        
        // Initial render of visible area
        this.updateVisibleTiles();
    }

    // Update visible tiles based on camera position - called from GameScene
    updateVisibleTiles() {
        const camera = this.scene.cameras.main;
        const cameraX = camera.scrollX + camera.width / 2;
        const cameraY = camera.scrollY + camera.height / 2;
        
        // Only update if camera moved significantly (increased threshold for performance)
        const deltaX = Math.abs(cameraX - this.lastCameraX);
        const deltaY = Math.abs(cameraY - this.lastCameraY);
        
        if (deltaX < this.tileSize * 2 && deltaY < this.tileSize * 2) {
            return; // Camera hasn't moved enough to warrant update (increased from 1 tile to 2 tiles)
        }
        
        this.lastCameraX = cameraX;
        this.lastCameraY = cameraY;
        
        // Calculate viewport bounds in grid coordinates
        const worldCenterX = (this.mapWidth * this.tileSize) / 2;
        const worldCenterY = (this.mapHeight * this.tileSize) / 2;

        const centerGrid = this.getGridPosition(cameraX, cameraY);
        const minX = Math.max(0, centerGrid.x - this.renderRadius);
        const maxX = Math.min(this.mapWidth - 1, centerGrid.x + this.renderRadius);
        const minY = Math.max(0, centerGrid.y - this.renderRadius);
        const maxY = Math.min(this.mapHeight - 1, centerGrid.y + this.renderRadius);
        
        // DELETE tiles that are no longer visible (true deletion for memory efficiency)
        for (const tileKey of this.visibleTiles) {
            const [x, y, layer] = tileKey.split(',').map(Number);
            if (x < minX || x > maxX || y < minY || y > maxY) {
                this.deleteTileSprite(tileKey);
                this.visibleTiles.delete(tileKey);
            }
        }
        
        // Render newly visible tiles
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                this.renderTileIfNeeded(x, y, 'base');
                if (this.obstacleLayer[x][y]) {
                    this.renderTileIfNeeded(x, y, 'obstacle');
                }
                if (this.decorationLayer[x][y]) {
                    this.renderTileIfNeeded(x, y, 'decoration');
                }
            }
        }
    }

    renderTileIfNeeded(x, y, layer) {
        const tileKey = `${x},${y},${layer}`;
        
        if (this.visibleTiles.has(tileKey)) {
            // Tile already visible and rendered, no action needed
            return;
        }
        
        // Create new tile sprite
        const worldCenterX = (this.mapWidth * this.tileSize) / 2;
        const worldCenterY = (this.mapHeight * this.tileSize) / 2;
                    const isoPos = this.gridToIso(x, y);
        
        let sprite;
        let textureKey;
        let depth;
        
        switch (layer) {
            case 'base':
                textureKey = this.tiles[x][y];
                depth = -1000 + y * 10 + x;
                break;
            case 'obstacle':
                textureKey = this.obstacleLayer[x][y];
                // Warehouses get higher depth to prevent player walking on top
                if (textureKey === 'warehouse') {
                    depth = 20000 + y * 10 + x; // Much higher than player depth (10000 + y)
                } else if (textureKey === 'house-1' || textureKey === 'house-2' || 
                          textureKey === 'cabin_wooden' || textureKey === 'house_small' || textureKey === 'shed_old') {
                    // Houses use the same depth as stones (decoration layer depth)
                    const worldPos = this.getWorldPosition(x, y);
                    depth = 10000 + worldPos.y;
                } else {
                    depth = y * 10 + x;
                }
                break;
            case 'decoration':
                textureKey = this.decorationLayer[x][y];
                // Use Y-sorting for decorations to match player depth system
                const worldPos = this.getWorldPosition(x, y);
                depth = 10000 + worldPos.y;
                break;
        }
        
        if (textureKey) {
            sprite = this.scene.add.image(
                        worldCenterX + isoPos.x,
                        worldCenterY + isoPos.y,
                textureKey
                    );
            sprite.setOrigin(0.5, 0.8);
            sprite.setDepth(depth);
            
            // Special handling for warehouses
            if (textureKey === 'warehouse') {
                const warehouse = this.warehouses.find(w => w.x === x && w.y === y);
                if (warehouse && !warehouse.sprite && !warehouse.destroyed) {
                    warehouse.sprite = sprite;
                    // Create health bar for warehouse
                    this.createWarehouseHealthBar(warehouse);
                    console.log(`🏭 Warehouse sprite linked for ${warehouse.id}`);
                } else if (warehouse && warehouse.destroyed) {
                    // Don't create warehouse sprites for destroyed warehouses
                    console.log(`⚠️ Attempted to create warehouse sprite for destroyed warehouse ${warehouse.id} - destroying and skipping`);
                    sprite.destroy(); // Destroy the sprite that was created
                    return; // Exit early to prevent adding to tracking
                }
            } else if (textureKey === 'exploded-warehouse') {
                // Special handling for exploded warehouses - don't recreate if already exists
                const warehouse = this.warehouses.find(w => w.x === x && w.y === y);
                if (warehouse && warehouse.destroyed && !warehouse.sprite) {
                    warehouse.sprite = sprite;
                    console.log(`🏭💥 Exploded warehouse sprite linked for ${warehouse.id}`);
                }
            }
                    
            // Add collision for obstacles and some decorations
            if (layer === 'obstacle') {
                this.scene.matter.add.gameObject(sprite, {
                        isStatic: true,
                        shape: {
                            type: 'rectangle',
                            width: this.tileSize * 0.8,
                            height: this.tileSize * 0.8
                        }
                    });
            } else if (layer === 'decoration' && 
                       (textureKey.includes('tree') || textureKey.includes('signpost') || textureKey.includes('rock_boulder') || 
                        textureKey.includes('house-1') || textureKey.includes('house-2'))) {
                // Add collision for trees, signposts, rocks, and houses
                const collisionRadius = textureKey.includes('house') ? this.tileSize * 0.4 : this.tileSize * 0.2;
                this.scene.matter.add.gameObject(sprite, {
                            isStatic: true,
                            shape: {
                                type: 'circle',
                                radius: collisionRadius
                            }
                        });
                    }
            
            this.tileSprites.set(tileKey, sprite);
            this.visibleTiles.add(tileKey);
            
            // Update memory tracking
            this.memoryStats.spritesCreated++;
            this.memoryStats.currentSpriteCount++;
            if (this.memoryStats.currentSpriteCount > this.memoryStats.peakSpriteCount) {
                this.memoryStats.peakSpriteCount = this.memoryStats.currentSpriteCount;
            }
        }
    }

    // TRUE DELETION: Actually destroy sprite and free memory
    deleteTileSprite(tileKey) {
        const sprite = this.tileSprites.get(tileKey);
        if (sprite) {
            // Remove physics body if it exists
            if (sprite.body) {
                this.scene.matter.world.remove(sprite.body);
            }
            
            // Destroy the sprite (removes from scene and frees memory)
            sprite.destroy();
            
            // Remove from our tracking
            this.tileSprites.delete(tileKey);
            
            // Update memory tracking
            this.memoryStats.spritesDestroyed++;
            this.memoryStats.currentSpriteCount--;
            
            // Log memory stats periodically (every 100 deletions)
            if (this.memoryStats.spritesDestroyed % 100 === 0) {
                console.log('🗑️ Tile Memory Stats:', {
                    created: this.memoryStats.spritesCreated,
                    destroyed: this.memoryStats.spritesDestroyed,
                    current: this.memoryStats.currentSpriteCount,
                    peak: this.memoryStats.peakSpriteCount
                });
            }
        }
    }

    // Get current memory usage statistics
    getMemoryStats() {
        return {
            ...this.memoryStats,
            memoryEfficiency: this.memoryStats.spritesDestroyed / Math.max(this.memoryStats.spritesCreated, 1),
            cacheSize: this.tileSprites.size
        };
    }

    // Force cleanup of all non-visible tiles (emergency memory cleanup)
    forceCleanupMemory() {
        console.log('🧹 Force cleaning tile memory...');
        console.log(`🔍 Before cleanup - tileSprites: ${this.tileSprites.size}, visibleTiles: ${this.visibleTiles.size}`);
        
        const beforeCount = this.tileSprites.size;
        let cleanedCount = 0;
        
        // Delete all sprites not in current visible set
        for (const [tileKey, sprite] of this.tileSprites) {
            if (!this.visibleTiles.has(tileKey)) {
                console.log(`🗑️ Cleaning non-visible tile: ${tileKey}`);
                this.deleteTileSprite(tileKey);
                cleanedCount++;
            }
        }
        
        const afterCount = this.tileSprites.size;
        console.log(`🧹 Cleaned ${cleanedCount} sprites (${beforeCount - afterCount} actual). Current: ${afterCount}`);
        
        // Additional debug: check for orphaned warehouse sprites
        let warehouseCount = 0;
        for (const [tileKey, sprite] of this.tileSprites) {
            if (sprite.texture && (sprite.texture.key === 'warehouse' || sprite.texture.key === 'exploded-warehouse')) {
                warehouseCount++;
                console.log(`🏭 Found warehouse/exploded sprite: ${tileKey}, texture: ${sprite.texture.key}`);
            }
        }
        console.log(`🏭 Total warehouse/exploded sprites in memory: ${warehouseCount}`);
    }

    // Check if a position is walkable
    isWalkable(gridX, gridY) {
        if (gridX < 0 || gridX >= this.mapWidth || gridY < 0 || gridY >= this.mapHeight) {
            return false;
        }
        
        // Water is not walkable
        if (this.tiles[gridX][gridY] === 'water_blue') {
            return false;
        }
        
        // Buildings are not walkable
        if (this.obstacleLayer[gridX][gridY]) {
            return false;
        }
        
        // Large trees, rocks, stones, signposts, and houses are not walkable
        if (this.decorationLayer[gridX][gridY] && 
            (this.decorationLayer[gridX][gridY].includes('tree_oak_large') || 
             this.decorationLayer[gridX][gridY].includes('tree_pine_large') ||
             this.decorationLayer[gridX][gridY].includes('rock_boulder') ||
             this.decorationLayer[gridX][gridY].includes('stone_small') ||
             this.decorationLayer[gridX][gridY].includes('stone_medium') ||
             this.decorationLayer[gridX][gridY].includes('stone_large') ||
             this.decorationLayer[gridX][gridY].includes('signpost') ||
             this.decorationLayer[gridX][gridY].includes('house-1') ||
             this.decorationLayer[gridX][gridY].includes('house-2'))) {
            return false;
        }
        
        return true;
    }

    // Get world position from grid coordinates
    getWorldPosition(gridX, gridY) {
        // Use absolute world coordinates instead of relative to camera
        const worldCenterX = (this.mapWidth * this.tileSize) / 2;
        const worldCenterY = (this.mapHeight * this.tileSize) / 2;
        const isoPos = this.gridToIso(gridX, gridY);
        return {
            x: worldCenterX + isoPos.x,
            y: worldCenterY + isoPos.y
        };
    }

    // Get grid position from world coordinates
    getGridPosition(worldX, worldY) {
        const worldCenterX = (this.mapWidth * this.tileSize) / 2;
        const worldCenterY = (this.mapHeight * this.tileSize) / 2;
        const isoX = worldX - worldCenterX;
        const isoY = worldY - worldCenterY;
        return this.isoToGrid(isoX, isoY);
    }
    
    // Update exploration around player position
    updateExploration(playerX, playerY) {
        const playerGrid = this.getGridPosition(playerX, playerY);
        
        for (let x = playerGrid.x - this.explorationRadius; x <= playerGrid.x + this.explorationRadius; x++) {
            for (let y = playerGrid.y - this.explorationRadius; y <= playerGrid.y + this.explorationRadius; y++) {
                if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                    const distance = Math.sqrt(Math.pow(x - playerGrid.x, 2) + Math.pow(y - playerGrid.y, 2));
                    if (distance <= this.explorationRadius) {
                        this.exploredTiles.add(`${x},${y}`);
                    }
                }
            }
        }
    }
    
    // Get exploration data for minimap
    getExplorationData() {
        return {
            exploredTiles: this.exploredTiles,
            mapWidth: this.mapWidth,
            mapHeight: this.mapHeight,
            playerGrid: this.lastPlayerGrid,
            warehouses: this.warehouses,
            puzzleBoards: this.puzzleBoards
        };
    }
    
    // Update player position for minimap
    updatePlayerPosition(worldX, worldY) {
        this.lastPlayerGrid = this.getGridPosition(worldX, worldY);
        this.updateExploration(worldX, worldY);
    }
    
    addRandomHouses() {
        // Add random houses across the map as environmental decorations
        const houseCount = 35; // Number of houses to place (increased from 15 to 35)
        const houseTypes = ['house-1', 'house-2']; // Alternate between the two house types
        let housesPlaced = 0;
        
        for (let attempt = 0; attempt < 500 && housesPlaced < houseCount; attempt++) {
            const x = Math.floor(Math.random() * this.mapWidth);
            const y = Math.floor(Math.random() * this.mapHeight);
            
            // Check if position is suitable (open ground, not near main path or warehouses)
            if (this.isValidHousePosition(x, y)) {
                const houseType = houseTypes[housesPlaced % houseTypes.length];
                this.decorationLayer[x][y] = houseType;
                housesPlaced++;
                
                // Clear a small area around the house (make sure it doesn't conflict with vegetation)
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const checkX = x + dx;
                        const checkY = y + dy;
                        if (checkX >= 0 && checkX < this.mapWidth && checkY >= 0 && checkY < this.mapHeight) {
                            if (dx !== 0 || dy !== 0) { // Don't clear the house itself
                                this.decorationLayer[checkX][checkY] = null;
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`Placed ${housesPlaced} random houses on the map`);
    }
    
    isValidHousePosition(x, y) {
        // Check if position is on grass (not on road or water)
        if (this.tiles[x][y] !== 'grass_green') {
            return false;
        }
        
        // Check if there's already something here
        if (this.decorationLayer[x][y] || this.obstacleLayer[x][y]) {
            return false;
        }
        
        // Check distance from warehouses (don't place too close)
        for (const warehouse of this.warehouses) {
            const distance = Math.sqrt(Math.pow(x - warehouse.x, 2) + Math.pow(y - warehouse.y, 2));
            if (distance < 25) { // Keep houses at least 25 tiles from warehouses (reduced from 30)
                return false;
            }
        }
        
        // Check distance from main path (don't place on or too close to the path)
        for (const point of this.pathPoints) {
            const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
            if (distance < 6) { // Keep houses at least 6 tiles from main path (reduced from 8)
                return false;
            }
        }
        
        // Check that there's some space around it
        for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;
                if (checkX >= 0 && checkX < this.mapWidth && checkY >= 0 && checkY < this.mapHeight) {
                    if (this.tiles[checkX][checkY] === 'dirt_road_straight') {
                        return false; // Too close to road
                    }
                }
            }
        }
        
        return true;
    }
} 