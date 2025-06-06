export class PerformanceOptimizer {
    constructor(scene) {
        this.scene = scene;
        this.frameCounter = 0;
        this.lastFPSCheck = 0;
        this.averageFPS = 60;
        this.performanceLevel = 'high'; // high, medium, low
        
        // Performance settings
        this.settings = {
            high: {
                tileUpdateFrequency: 2,
                minimapUpdateFrequency: 15,
                particleCount: 1.0,
                animationFrameRate: 8,
                cullingDistance: 30
            },
            medium: {
                tileUpdateFrequency: 4,
                minimapUpdateFrequency: 20,
                particleCount: 0.7,
                animationFrameRate: 6,
                cullingDistance: 25
            },
            low: {
                tileUpdateFrequency: 6,
                minimapUpdateFrequency: 30,
                particleCount: 0.5,
                animationFrameRate: 4,
                cullingDistance: 20
            }
        };
        
        this.currentSettings = this.settings[this.performanceLevel];
        console.log('PerformanceOptimizer initialized with', this.performanceLevel, 'performance');
    }
    
    update() {
        // Safety check: ensure scene is active and valid
        if (!this.scene || !this.scene.scene.isActive()) {
            return;
        }
        
        this.frameCounter++;
        
        // Check FPS every 60 frames
        if (this.frameCounter % 60 === 0) {
            this.checkPerformance();
        }
        
        // Apply performance optimizations
        this.optimizeRendering();
        this.optimizeAnimations();
    }
    
    checkPerformance() {
        // Safety check: ensure scene time exists
        if (!this.scene.time) {
            return;
        }
        
        const currentTime = this.scene.time.now;
        if (this.lastFPSCheck > 0) {
            const deltaTime = currentTime - this.lastFPSCheck;
            this.averageFPS = Math.round(60000 / deltaTime * 60); // Approximate FPS
            
            // Check tile memory usage and force cleanup if needed
            if (this.scene.tileSystem) {
                const memStats = this.scene.tileSystem.getMemoryStats();
                
                // Force cleanup if we have too many sprites (emergency measure)
                if (memStats.currentSpriteCount > 2000) {
                    console.warn('⚠️ High sprite count detected:', memStats.currentSpriteCount);
                    this.scene.tileSystem.forceCleanupMemory();
                }
            }
            
            // Adjust performance level based on FPS
            if (this.averageFPS < 30 && this.performanceLevel !== 'low') {
                this.setPerformanceLevel('low');
                console.log('Performance lowered due to low FPS:', this.averageFPS);
            } else if (this.averageFPS > 50 && this.performanceLevel === 'low') {
                this.setPerformanceLevel('medium');
                console.log('Performance improved to medium');
            } else if (this.averageFPS > 55 && this.performanceLevel === 'medium') {
                this.setPerformanceLevel('high');
                console.log('Performance improved to high');
            }
        }
        this.lastFPSCheck = currentTime;
    }
    
    setPerformanceLevel(level) {
        this.performanceLevel = level;
        this.currentSettings = this.settings[level];
        
        // Apply new settings to existing systems
        this.applySettingsToSystems();
    }
    
    applySettingsToSystems() {
        // Update tile system render frequency
        if (this.scene.tileSystem) {
            this.scene.tileSystem.renderRadius = this.currentSettings.cullingDistance;
        }
        
        // Update animation frame rates
        this.updateAnimationFrameRates();
    }
    
    updateAnimationFrameRates() {
        // Update player animation frame rates if they exist
        if (this.scene.player && this.scene.anims) {
            const frameRate = this.currentSettings.animationFrameRate;
            
            ['player_walk_up', 'player_walk_down', 'player_walk_left', 'player_walk_right'].forEach(animKey => {
                try {
                    const anim = this.scene.anims.get(animKey);
                    if (anim) {
                        anim.frameRate = frameRate;
                    }
                } catch (error) {
                    console.warn(`Failed to update animation frame rate for ${animKey}:`, error);
                }
            });
        }
    }
    
    optimizeRendering() {
        // Frustum culling - hide objects far from camera
        if (this.frameCounter % this.currentSettings.tileUpdateFrequency === 0) {
            this.cullDistantObjects();
        }
    }
    
    cullDistantObjects() {
        // Safety check: ensure camera exists
        const camera = this.scene.cameras?.main;
        if (!camera || camera.scrollX === undefined) {
            return;
        }
        
        const cullDistance = this.currentSettings.cullingDistance * 32; // Convert to pixels
        const cameraX = camera.scrollX + camera.width / 2;
        const cameraY = camera.scrollY + camera.height / 2;
        
        // Cull distant game objects (not including player)
        if (this.scene.gameObjects) {
            this.scene.gameObjects.forEach(obj => {
                if (obj === this.scene.player) return; // Never cull player
                
                if (obj && obj.x !== undefined && obj.y !== undefined) {
                    const distance = Phaser.Math.Distance.Between(cameraX, cameraY, obj.x, obj.y);
                    const shouldBeVisible = distance < cullDistance;
                    
                    if (obj.setVisible && obj.visible !== shouldBeVisible) {
                        obj.setVisible(shouldBeVisible);
                    }
                }
            });
        }
    }
    
    optimizeAnimations() {
        // Reduce animation updates for distant objects
        if (this.frameCounter % 10 === 0) {
            this.updateDistantAnimations();
        }
    }
    
    updateDistantAnimations() {
        // Safety check: ensure camera exists
        const camera = this.scene.cameras?.main;
        if (!camera || camera.scrollX === undefined) {
            return;
        }
        
        const cameraX = camera.scrollX + camera.width / 2;
        const cameraY = camera.scrollY + camera.height / 2;
        const animationDistance = 400; // Distance at which to reduce animation quality
        
        if (this.scene.enemies && this.scene.enemies.children) {
            this.scene.enemies.children.entries.forEach(enemy => {
                if (enemy && enemy.active && enemy.anims) {
                    try {
                        const distance = Phaser.Math.Distance.Between(cameraX, cameraY, enemy.x, enemy.y);
                        
                        // Reduce animation frame rate for distant enemies
                        if (distance > animationDistance && enemy.anims.currentAnim) {
                            enemy.anims.currentAnim.frameRate = this.currentSettings.animationFrameRate * 0.5;
                        }
                    } catch (error) {
                        console.warn('Failed to update enemy animation:', error);
                    }
                }
            });
        }
    }
    
    createOptimizedParticles(x, y, texture, config) {
        // Reduce particle count based on performance level
        const optimizedConfig = {
            ...config,
            quantity: Math.floor((config.quantity || 10) * this.currentSettings.particleCount)
        };
        
        return this.scene.add.particles(x, y, texture, optimizedConfig);
    }
    
    getSettings() {
        return this.currentSettings;
    }
    
    getPerformanceLevel() {
        return this.performanceLevel;
    }
    
    getFPS() {
        return this.averageFPS;
    }
} 