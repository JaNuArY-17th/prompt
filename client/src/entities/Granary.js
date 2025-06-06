export class Granary extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y, id) {
        // Choose between warehouse-1 and warehouse-2 based on ID
        const warehouseTexture = (id % 2 === 0) ? 'warehouse-1' : 'warehouse-2';
        super(scene.matter.world, x, y, warehouseTexture, 0);
        
        this.scene = scene;
        this.granaryId = id;
        this.destroyed = false;
        this.health = 100; // Takes multiple hits to destroy
        this.maxHealth = 100;
        this.originalTexture = warehouseTexture; // Store for reference
        
        // Visual setup
        this.setScale(0.8); // Scale down to fit better with the map
        this.setDepth(50);
        
        // Physics setup
        this.setBody({
            type: 'rectangle',
            width: 80,
            height: 80
        }, {
            isStatic: true
        });
        
        // Add to scene
        scene.add.existing(this);
        
        // Create health bar
        this.createHealthBar();
        
        // Create destruction indicator
        this.createIndicator();
        
        console.log(`Granary ${id} created at (${x}, ${y}) using texture: ${warehouseTexture}`);
    }
    
    createHealthBar() {
        const barWidth = 60;
        const barHeight = 8;
        
        // Background
        this.healthBarBg = this.scene.add.rectangle(
            this.x, this.y - 50, barWidth, barHeight, 0x333333
        );
        this.healthBarBg.setStrokeStyle(1, 0xffffff);
        this.healthBarBg.setDepth(200);
        
        // Health fill
        this.healthBarFill = this.scene.add.rectangle(
            this.x, this.y - 50, barWidth - 2, barHeight - 2, 0xff6600
        );
        this.healthBarFill.setDepth(201);
    }
    
    createIndicator() {
        // Create a target symbol above granary
        this.indicator = this.scene.add.text(this.x, this.y - 70, '⚠', {
            fontSize: '24px',
            fontFamily: 'VT323',
            color: '#ff0000'
        });
        this.indicator.setOrigin(0.5);
        this.indicator.setDepth(200);
        
        // Make it pulse
        this.scene.tweens.add({
            targets: this.indicator,
            scale: 1.2,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }
    
    takeDamage(damage) {
        if (this.destroyed) return;
        
        this.health -= damage;
        this.updateHealthBar();
        
        // Flash effect when hit
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (!this.destroyed) {
                this.clearTint();
            }
        });
        
        // Check if destroyed
        if (this.health <= 0) {
            this.destroy();
        }
        
        console.log(`Granary ${this.granaryId} took ${damage} damage. Health: ${this.health}/${this.maxHealth}`);
    }
    
    updateHealthBar() {
        if (this.healthBarFill) {
            const healthPercent = this.health / this.maxHealth;
            this.healthBarFill.width = (60 - 2) * healthPercent;
            
            // Change color based on health
            if (healthPercent > 0.6) {
                this.healthBarFill.setFillStyle(0xff6600); // Orange
            } else if (healthPercent > 0.3) {
                this.healthBarFill.setFillStyle(0xff3300); // Red-orange
            } else {
                this.healthBarFill.setFillStyle(0xff0000); // Red
            }
        }
    }
    
    destroy() {
        if (this.destroyed) return;
        
        this.destroyed = true;
        
        // Change texture to exploded warehouse
        this.setTexture('exploded-warehouse');
        this.setScale(0.8); // Keep same scale
        
        // Update objectives
        if (this.scene.tileSystem) {
            this.scene.tileSystem.destroyGranary(this.granaryId);
        }
        
        // Create destruction effect
        this.createDestructionEffect();
        
        // Remove from tilemap obstacle layer
        const gridPos = this.scene.tileSystem.getGridPosition(this.x, this.y);
        if (gridPos && this.scene.tileSystem.obstacleLayer[gridPos.x]) {
            this.scene.tileSystem.obstacleLayer[gridPos.x][gridPos.y] = null;
        }
        
        // Hide health bar and indicator since warehouse is destroyed
        if (this.healthBarBg) {
            this.healthBarBg.setVisible(false);
        }
        if (this.healthBarFill) {
            this.healthBarFill.setVisible(false);
        }
        if (this.indicator) {
            this.indicator.setVisible(false);
        }
        
        // Don't hide the warehouse completely - show the exploded version
        // Remove physics body since it's destroyed
        this.setStatic(true);
        
        console.log(`Granary ${this.granaryId} destroyed! Now showing exploded warehouse.`);
    }
    
    createDestructionEffect() {
        // Safety check: Don't create effects if scene is shutting down
        if (!this.scene || !this.scene.add || !this.scene.cameras || !this.scene.cameras.main) {
            console.log('Scene shutting down, skipping destruction effect');
            return;
        }
        
        try {
            // Explosion particles
            const particles = this.scene.add.particles(this.x, this.y, 'bullet', {
                speed: { min: 100, max: 200 },
                scale: { start: 1, end: 0 },
                tint: [0xff6600, 0xff3300, 0xff0000, 0x888888],
                lifespan: 1000,
                quantity: 20
            });
            
            // Explosion effect
            const explosion = this.scene.add.circle(this.x, this.y, 10, 0xff6600);
            explosion.setDepth(300);
            
            this.scene.tweens.add({
                targets: explosion,
                scaleX: 8,
                scaleY: 8,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    if (explosion && explosion.destroy) {
                        explosion.destroy();
                    }
                }
            });
            
            // Floating "DESTROYED!" text
            const destroyText = this.scene.add.text(this.x, this.y - 20, 'GRANARY DESTROYED!', {
                fontSize: '18px',
                fontFamily: 'Courier New',
                color: '#ff0000'
            });
            destroyText.setOrigin(0.5);
            destroyText.setDepth(300);
            
            // Animate text
            this.scene.tweens.add({
                targets: destroyText,
                y: destroyText.y - 60,
                alpha: 0,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => {
                    if (destroyText && destroyText.destroy) {
                        destroyText.destroy();
                    }
                    if (particles && particles.destroy) {
                        particles.destroy();
                    }
                }
            });
            
            // Screen shake - with safety check
            if (this.scene.cameras && this.scene.cameras.main && this.scene.cameras.main.shake) {
                this.scene.cameras.main.shake(200, 0.01);
            }
        } catch (error) {
            console.warn('Error creating destruction effect:', error);
        }
    }
    
    destroyCompletely() {
        // Remove from game objects array
        if (this.scene.gameObjects) {
            const index = this.scene.gameObjects.indexOf(this);
            if (index > -1) {
                this.scene.gameObjects.splice(index, 1);
            }
        }
        
        // Remove from granaries group
        if (this.scene.granaries) {
            this.scene.granaries.remove(this);
        }
        
        // Clean up health bar
        if (this.healthBarBg) {
            this.healthBarBg.destroy();
        }
        if (this.healthBarFill) {
            this.healthBarFill.destroy();
        }
        if (this.indicator) {
            this.indicator.destroy();
        }
        
        // Destroy sprite
        super.destroy();
    }
} 