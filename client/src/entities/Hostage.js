export class Hostage extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y, id) {
        super(scene.matter.world, x, y, 'player', 0); // Reuse player sprite for now
        
        // Validate scene parameter
        if (!scene) {
            console.error('Hostage constructor: scene parameter is null/undefined');
            throw new Error('Scene is required for Hostage creation');
        }
        
        this.scene = scene;
        this.hostageId = id;
        this.rescued = false;
        
        // Visual setup
        this.setScale(0.8);
        this.setTint(0x00aaff); // Blue tint to distinguish from enemies
        this.setDepth(100);
        
        // Physics setup
        this.setBody({
            type: 'rectangle',
            width: 32,
            height: 48
        }, {
            isStatic: true,
            isSensor: true
        });
        
        // Add to scene
        scene.add.existing(this);
        
        // Create rescue indicator
        this.createRescueIndicator();
        
        console.log(`Hostage ${id} created at (${x}, ${y})`);
    }
    
    createRescueIndicator() {
        // Safety check: ensure scene exists
        if (!this.scene || !this.scene.add) {
            console.warn('Scene not available for hostage indicator creation');
            return;
        }
        
        try {
            // Create a blue square indicator above hostage
            this.indicator = this.scene.add.graphics();
            this.indicator.fillStyle(0x0088ff, 0.9); // Bright blue color
            this.indicator.lineStyle(2, 0xffffff, 1); // White outline
            
            // Draw square (hostage indicator)
            const squareSize = 6;
            this.indicator.fillRect(-squareSize/2, -squareSize/2, squareSize, squareSize);
            this.indicator.strokeRect(-squareSize/2, -squareSize/2, squareSize, squareSize);
            
            // Position above hostage
            this.indicator.x = this.x;
            this.indicator.y = this.y - 35; // Positioned above hostage
            this.indicator.setDepth(50000); // Very high depth to always be on top
            
            // Add a shadow/glow effect
            this.indicatorShadow = this.scene.add.graphics();
            this.indicatorShadow.fillStyle(0x000000, 0.4); // Semi-transparent black shadow
            this.indicatorShadow.fillRect(-squareSize/2, -squareSize/2, squareSize, squareSize);
            this.indicatorShadow.x = this.x;
            this.indicatorShadow.y = this.y - 34; // Slightly offset for shadow effect
            this.indicatorShadow.setDepth(49999); // Just below the main indicator
            
            // Make it bob up and down
            if (this.scene.tweens) {
                this.scene.tweens.add({
                    targets: [this.indicator, this.indicatorShadow],
                    y: [this.y - 40, this.y - 39],
                    duration: 1000,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        } catch (error) {
            console.warn('Failed to create hostage indicator:', error);
        }
    }
    
    update(delta) {
        // Early exit conditions
        if (this.rescued || !this.active) return;
        
        // Comprehensive safety checks
        if (!this.scene) {
            console.warn('Hostage: scene is undefined');
            return;
        }
        
        if (!this.scene.player) {
            console.warn('Hostage: scene.player is undefined');
            return;
        }
        
        // Ensure player has valid coordinates
        if (typeof this.scene.player.x !== 'number' || typeof this.scene.player.y !== 'number') {
            console.warn('Hostage: player coordinates are invalid');
            return;
        }
        
        // Ensure hostage has valid coordinates
        if (typeof this.x !== 'number' || typeof this.y !== 'number') {
            console.warn('Hostage: hostage coordinates are invalid');
            return;
        }
        
        try {
            // Check if player is close enough to rescue
            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                this.scene.player.x, this.scene.player.y
            );
            
            // If player is within rescue range (64 pixels)
            if (distance < 64) {
                this.rescue();
            }
        } catch (error) {
            console.error('Error in hostage update:', error);
        }
    }
    
    rescue() {
        if (this.rescued) return;
        
        // Safety check: ensure scene exists
        if (!this.scene) {
            return;
        }
        
        this.rescued = true;
        
        // Update objectives
        if (this.scene.tileSystem) {
            this.scene.tileSystem.rescueHostage(this.hostageId);
        }
        
        // Visual feedback
        this.createRescueEffect();
        
        // Remove hostage from map after rescue
        if (this.scene.time) {
            this.scene.time.delayedCall(1000, () => {
                this.destroyHostage();
            });
        } else {
            // Fallback if scene.time is not available
            setTimeout(() => {
                this.destroyHostage();
            }, 1000);
        }
        
        console.log(`Hostage ${this.hostageId} rescued!`);
    }
    
    createRescueEffect() {
        // Safety check: ensure scene exists
        if (!this.scene || !this.scene.add) {
            return;
        }
        
        try {
            // Green particles effect
            const particles = this.scene.add.particles(this.x, this.y, 'bullet', {
                speed: { min: 50, max: 100 },
                scale: { start: 0.5, end: 0 },
                tint: 0x00ff00,
                lifespan: 500,
                quantity: 10
            });
            
            // Floating "RESCUED!" text
            const rescueText = this.scene.add.text(this.x, this.y - 20, 'RESCUED!', {
                fontSize: '16px',
                fontFamily: 'Courier New',
                color: '#00ff00'
            });
            rescueText.setOrigin(0.5);
            rescueText.setDepth(300);
            
            // Animate text
            if (this.scene.tweens) {
                this.scene.tweens.add({
                    targets: rescueText,
                    y: rescueText.y - 40,
                    alpha: 0,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => {
                        rescueText.destroy();
                        particles.destroy();
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to create rescue effect:', error);
        }
        
        // Hide indicator
        if (this.indicator) {
            this.indicator.setVisible(false);
        }
        if (this.indicatorShadow) {
            this.indicatorShadow.setVisible(false);
        }
        
        // Make hostage semi-transparent
        this.setAlpha(0.5);
    }
    
    destroyHostage() {
        // Remove from game objects array
        if (this.scene.gameObjects) {
            const index = this.scene.gameObjects.indexOf(this);
            if (index > -1) {
                this.scene.gameObjects.splice(index, 1);
            }
        }
        
        // Remove from hostages group
        if (this.scene.hostages) {
            this.scene.hostages.remove(this);
        }
        
        // Clean up indicator
        if (this.indicator) {
            this.indicator.destroy();
        }
        if (this.indicatorShadow) {
            this.indicatorShadow.destroy();
        }
        
        // Destroy sprite
        this.destroy();
    }
    
    destroy() {
        // Clean up references to prevent memory leaks
        this.scene = null;
        
        if (this.indicator) {
            this.indicator.destroy();
        }
        if (this.indicatorShadow) {
            this.indicatorShadow.destroy();
        }
        super.destroy();
    }

    // Method to handle scene destruction
    onSceneDestroy() {
        console.log(`Hostage ${this.hostageId}: Scene is being destroyed`);
        this.scene = null;
        this.setActive(false);
    }
} 