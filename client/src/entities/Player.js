export class Player extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y, chapter = 1) {
        // Use chapter-specific initial texture
        let initialTexture;
        if (chapter === 2) {
            initialTexture = 'player_ch2_down_1';
        } else if (chapter === 3) {
            initialTexture = 'player_ch3_down_1';
        } else {
            initialTexture = 'player_ch3_down_1';
        }
        
        // Debug: Check if the texture exists
        console.log(`🎭 Player constructor - Chapter: ${chapter}, Initial texture: ${initialTexture}`);
        console.log(`🎭 Texture exists: ${scene.textures.exists(initialTexture)}`);
        
        // Fallback if texture doesn't exist - Chapter 3 should NOT fallback to Chapter 1 textures
        if (!scene.textures.exists(initialTexture)) {
            console.warn(`⚠️ Texture ${initialTexture} not found`);
            
            if (chapter === 3) {
                console.error(`❌ Chapter 3 textures not loaded! This should not happen.`);
                // Force create a basic texture so the game doesn't crash
                const tempGraphics = scene.add.graphics();
                tempGraphics.fillStyle(0xff0000); // Red color to make it obvious
                tempGraphics.fillRect(0, 0, 32, 32);
                tempGraphics.generateTexture('temp_ch3_error', 32, 32);
                tempGraphics.destroy();
                initialTexture = 'temp_ch3_error';
            } else {
                console.warn(`🔄 Will attempt to fix texture after scene creation`);
                initialTexture = 'player_down_3';
            }
        }
        
        super(scene.matter.world, x, y, initialTexture); // Start with down-facing idle frame
        
        // Add to scene
        scene.add.existing(this);
        
        // Physics properties (smaller player)
        this.setBody({
            type: 'rectangle',
            width: 20,
            height: 20
        });
        
        // Make sprite smaller - reduced by half
        this.setScale(0.35);
        
        this.setFixedRotation();
        this.setFrictionAir(0.1);
        this.body.label = 'player';
        
        // Player stats
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 2.5; // Reduced speed by half for better control
        
        // Combat properties
        this.meleeRange = 60;
        this.meleeLastUsed = 0;
        this.meleeCooldown = 800;
        this.meleeDamage = 20;
        
        // Shooting properties
        this.shootLastUsed = 0;
        this.shootCooldown = 200;
        this.ammo = 30;
        this.maxAmmo = 30;
        this.reloadTime = 2000;
        this.isReloading = false;
        this.reloadStartTime = 0;
        
        // Movement
        this.velocity = { x: 0, y: 0 };
        this.lastDirection = 'down'; // Track last movement direction for idle animation
        this.isMoving = false;
        
        // Reference to scene
        this.gameScene = scene;
        this.chapter = chapter; // Store chapter for asset selection
        
        // Set proper depth for visibility
        this.setDepth(1000);
        
        // Create player indicator (pointer above player)
        this.createPlayerIndicator();
        
        // Create animations
        this.createAnimations();
        
        console.log(`Player created at ${x}, ${y} for Chapter ${chapter} using texture: ${initialTexture}`);
    }

    // Method to fix the player texture when the correct assets are available
    fixChapterTexture() {
        let correctTexture;
        if (this.chapter === 2) {
            correctTexture = 'player_ch2_down_1';
        } else if (this.chapter === 3) {
            correctTexture = 'player_ch3_down_1';
        } else {
            correctTexture = 'player_down_1';
        }

        console.log(`🔧 Attempting to fix player texture for chapter ${this.chapter}: ${correctTexture}`);
        
        if (this.scene.textures.exists(correctTexture) && this.texture.key !== correctTexture) {
            console.log(`✅ Fixing player texture from ${this.texture.key} to ${correctTexture}`);
            this.setTexture(correctTexture);
            
            // Stop current animation and recreate for correct chapter
            this.stop();
            this.createAnimations();
            
            // Set to idle animation for the correct chapter
            let idleAnim;
            if (this.chapter === 2) {
                idleAnim = 'player_ch2_idle_down';
            } else if (this.chapter === 3) {
                idleAnim = 'player_ch3_idle_down';
            } else {
                idleAnim = 'player_idle_down';
            }
            
            if (this.scene.anims.exists(idleAnim)) {
                this.play(idleAnim);
            }
            
            return true;
        }
        
        return false;
    }

    createPlayerIndicator() {
        // Create a bigger pointer/indicator above the player
        this.indicator = this.scene.add.graphics();
        this.indicator.fillStyle(0x00ff00, 0.9); // Bright green color
        this.indicator.fillCircle(0, 0, 6); // Bigger circle (doubled size)
        this.indicator.lineStyle(3, 0xffffff, 1); // Thicker white outline
        this.indicator.strokeCircle(0, 0, 6);
        
        // Position above player
        this.indicator.x = this.x;
        this.indicator.y = this.y - 30; // Slightly higher above player
        this.indicator.setDepth(50000); // Much higher depth to always be on top
        
        // Add a bigger shadow/glow effect
        this.indicatorShadow = this.scene.add.graphics();
        this.indicatorShadow.fillStyle(0x000000, 0.4); // Slightly more opaque shadow
        this.indicatorShadow.fillCircle(0, 0, 7); // Bigger shadow
        this.indicatorShadow.x = this.x;
        this.indicatorShadow.y = this.y - 29; // Offset slightly for shadow effect
        this.indicatorShadow.setDepth(49999); // Just below the main indicator
    }

    createAnimations() {
        const anims = this.scene.anims;
        
        // Safety check: ensure animation manager exists
        if (!anims) {
            console.warn('Animation manager not available');
            return;
        }
        
        // Use chapter-specific asset prefix
        let prefix, animPrefix;
        if (this.chapter === 2) {
            prefix = 'player_ch2_';
            animPrefix = 'player_ch2_';
        } else if (this.chapter === 3) {
            prefix = 'player_ch3_';
            animPrefix = 'player_ch3_';
        } else {
            prefix = 'player_';
            animPrefix = 'player_';
        }
        
        console.log(`Creating animations for Chapter ${this.chapter} using prefix: ${prefix}`);
        
        // Check if required textures are loaded
        const requiredTextures = [
            `${prefix}up_1`, `${prefix}up_2`, `${prefix}up_3`, `${prefix}up_4`,
            `${prefix}down_1`, `${prefix}down_2`, `${prefix}down_3`, `${prefix}down_4`,
            `${prefix}left_1`, `${prefix}left_2`, `${prefix}left_3`, `${prefix}left_4`,
            `${prefix}right_1`, `${prefix}right_2`, `${prefix}right_3`, `${prefix}right_4`
        ];
        
        for (const texture of requiredTextures) {
            if (!this.scene.textures.exists(texture)) {
                console.warn(`Required texture missing: ${texture}`);
                return;
            }
        }
        
        // Create chapter-specific animation keys
        const walkUpKey = `${animPrefix}walk_up`;
        const walkDownKey = `${animPrefix}walk_down`;
        const walkLeftKey = `${animPrefix}walk_left`;
        const walkRightKey = `${animPrefix}walk_right`;
        const idleUpKey = `${animPrefix}idle_up`;
        const idleDownKey = `${animPrefix}idle_down`;
        const idleLeftKey = `${animPrefix}idle_left`;
        const idleRightKey = `${animPrefix}idle_right`;
        
        // Only create animations if they don't already exist
        if (!anims.exists(walkUpKey)) {
            anims.create({
                key: walkUpKey,
                frames: [
                    { key: `${prefix}up_1` },
                    { key: `${prefix}up_2` },
                    { key: `${prefix}up_3` },
                    { key: `${prefix}up_4` }
                ],
                frameRate: 8,
                repeat: -1
            });
        }
        
        if (!anims.exists(walkDownKey)) {
            anims.create({
                key: walkDownKey,
                frames: [
                    { key: `${prefix}down_1` },
                    { key: `${prefix}down_2` },
                    { key: `${prefix}down_3` },
                    { key: `${prefix}down_4` }
                ],
                frameRate: 8,
                repeat: -1
            });
        }
        
        if (!anims.exists(walkLeftKey)) {
            anims.create({
                key: walkLeftKey,
                frames: [
                    { key: `${prefix}left_1` },
                    { key: `${prefix}left_2` },
                    { key: `${prefix}left_3` },
                    { key: `${prefix}left_4` }
                ],
                frameRate: 8,
                repeat: -1
            });
        }
        
        if (!anims.exists(walkRightKey)) {
            anims.create({
                key: walkRightKey,
                frames: [
                    { key: `${prefix}right_1` },
                    { key: `${prefix}right_2` },
                    { key: `${prefix}right_3` },
                    { key: `${prefix}right_4` }
                ],
                frameRate: 8,
                repeat: -1
            });
        }
        
        // Create idle animations (using first frame of each direction)
        if (!anims.exists(idleUpKey)) {
            anims.create({
                key: idleUpKey,
                frames: [{ key: `${prefix}up_1` }],
                frameRate: 1,
                repeat: 0
            });
        }
        
        if (!anims.exists(idleDownKey)) {
            anims.create({
                key: idleDownKey,
                frames: [{ key: `${prefix}down_1` }],
                frameRate: 1,
                repeat: 0
            });
        }
        
        if (!anims.exists(idleLeftKey)) {
            anims.create({
                key: idleLeftKey,
                frames: [{ key: `${prefix}left_1` }],
                frameRate: 1,
                repeat: 0
            });
        }
        
        if (!anims.exists(idleRightKey)) {
            anims.create({
                key: idleRightKey,
                frames: [{ key: `${prefix}right_1` }],
                frameRate: 1,
                repeat: 0
            });
        }
    }

    update(delta) {
        // Safety check: don't update if sprite is destroyed or inactive
        if (!this.active || !this.scene || !this.anims) {
            return;
        }
        
        // Additional safety check for scene state
        if (this.scene.scene.isActive && !this.scene.scene.isActive()) {
            return;
        }
        
        try {
            this.handleMovement();
            this.updateReload();
            this.updateDepth();
        } catch (error) {
            console.warn('Player update error:', error);
        }
    }

    handleMovement() {
        // Safety check: ensure input system exists
        if (!this.gameScene || !this.gameScene.inputSystem) {
            return;
        }
        
        const cursors = this.gameScene.inputSystem.cursors;
        const keys = this.gameScene.inputSystem.keys;
        
        this.velocity.x = 0;
        this.velocity.y = 0;
        let newDirection = this.lastDirection;
        this.isMoving = false;
        
        // WASD movement with animation handling
        if (keys.W.isDown || cursors.up.isDown) {
            this.velocity.y = -this.speed;
            newDirection = 'up';
            this.isMoving = true;
        }
        if (keys.S.isDown || cursors.down.isDown) {
            this.velocity.y = this.speed;
            newDirection = 'down';
            this.isMoving = true;
        }
        if (keys.A.isDown || cursors.left.isDown) {
            this.velocity.x = -this.speed;
            newDirection = 'left';
            this.isMoving = true;
        }
        if (keys.D.isDown || cursors.right.isDown) {
            this.velocity.x = this.speed;
            newDirection = 'right';
            this.isMoving = true;
        }
        
        // Handle diagonal movement priority (vertical takes precedence for animation)
        if (this.velocity.x !== 0 && this.velocity.y !== 0) {
            // Normalize diagonal movement
            this.velocity.x *= 0.707;
            this.velocity.y *= 0.707;
            
            // For diagonal movement, prioritize vertical direction for animation
            if (this.velocity.y < 0) {
                newDirection = 'up';
            } else if (this.velocity.y > 0) {
                newDirection = 'down';
            }
        }
        
        // Update animations based on movement
        this.updateAnimation(newDirection);
        
        // Apply movement
        this.setVelocity(this.velocity.x, this.velocity.y);
    }
    
    updateAnimation(direction) {
        // Safety check: ensure sprite and animation manager exist
        if (!this.anims || !this.active) {
            return;
        }
        
        // Use chapter-specific animation keys
        const animPrefix = this.chapter === 2 ? 'player_ch2_' : 'player_';
        
        if (this.isMoving) {
            // Play walking animation for the current direction
            const walkAnimKey = `${animPrefix}walk_${direction}`;
            if (this.anims.currentAnim?.key !== walkAnimKey) {
                try {
                    this.play(walkAnimKey);
                } catch (error) {
                    console.warn('Failed to play walk animation:', walkAnimKey, error);
                }
            }
            this.lastDirection = direction;
        } else {
            // Play idle animation for the last direction
            const idleAnimKey = `${animPrefix}idle_${this.lastDirection}`;
            if (this.anims.currentAnim?.key !== idleAnimKey) {
                try {
                    this.play(idleAnimKey);
                } catch (error) {
                    console.warn('Failed to play idle animation:', idleAnimKey, error);
                }
            }
        }
    }

    handleShooting(targetX, targetY) {
        const currentTime = Date.now();
        
        // Check if we can shoot
        if (this.isReloading) {
            return false;
        }
        
        if (this.ammo <= 0) {
            this.startReload();
            return false;
        }
        
        if (currentTime - this.shootLastUsed < this.shootCooldown) {
            return false;
        }
        
        // Use game scene's shooting system
        if (this.gameScene.shoot) {
            console.log('Attempting to shoot from', this.x, this.y, 'to', targetX, targetY);
            
            // Update the scene's current ammo to sync with player
            this.gameScene.currentAmmo = this.ammo;
            this.gameScene.isReloading = this.isReloading;
            
            this.gameScene.shoot(targetX, targetY);
            
            // Sync ammo back from scene after shooting
            this.ammo = this.gameScene.currentAmmo;
            this.shootLastUsed = currentTime;
            
            // Screen shake
            this.gameScene.cameras.main.shake(50, 0.01);
            
            console.log('Player shot! Ammo:', this.ammo);
            return true;
        } else {
            console.warn('GameScene shoot method not found');
        }
        
        return false;
    }
    
    startReload() {
        if (this.isReloading || this.ammo >= this.maxAmmo) {
            return false;
        }
        
        this.isReloading = true;
        this.reloadStartTime = Date.now();
        console.log('Reloading...');
        return true;
    }
    
    updateReload() {
        if (this.isReloading) {
            const currentTime = Date.now();
            if (currentTime - this.reloadStartTime >= this.reloadTime) {
                this.ammo = this.maxAmmo;
                this.isReloading = false;
                console.log('Reload complete!');
            }
        }
    }

    handleMelee() {
        const currentTime = Date.now();
        if (currentTime - this.meleeLastUsed < this.meleeCooldown) {
            return false;
        }
        
        console.log('Melee attack!');
        
        // Get mouse position for melee direction
        const pointer = this.gameScene.input.activePointer;
        const worldPoint = this.gameScene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        // Calculate melee area
        const angle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);
        const meleeX = this.x + Math.cos(angle) * this.meleeRange;
        const meleeY = this.y + Math.sin(angle) * this.meleeRange;
        
        // Check for enemies in melee range using safe approach
        let hitEnemy = false;
        const meleeTargets = [];
        
        // First pass: collect valid enemies with their positions
        if (this.gameScene.enemies && this.gameScene.enemies.children) {
            this.gameScene.enemies.children.entries.forEach(enemy => {
                if (enemy && enemy.active && enemy.health > 0) {
                    try {
                        // Safely capture enemy data
                        const enemyData = {
                            enemy: enemy,
                            x: enemy.x,
                            y: enemy.y,
                            health: enemy.health
                        };
                        
                        const distance = Phaser.Math.Distance.Between(this.x, this.y, enemyData.x, enemyData.y);
                        if (distance <= this.meleeRange) {
                            meleeTargets.push(enemyData);
                        }
                    } catch (error) {
                        console.warn('Failed to check enemy for melee, skipping:', error);
                    }
                }
            });
        }
        
        // Second pass: safely process melee hits
        meleeTargets.forEach(target => {
            if (target.enemy && target.enemy.active && target.enemy.health > 0) {
                try {
                    // Deal damage
                    if (target.enemy.takeDamage) {
                        target.enemy.takeDamage(this.meleeDamage);
                    } else {
                        target.enemy.health -= this.meleeDamage;
                    }
                    
                    hitEnemy = true;
                    
                    // Knockback effect using stored position
                    const knockbackAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
                    const knockbackForce = 15;
                    
                    // Apply knockback if enemy still exists and has the method
                    if (target.enemy.active && target.enemy.setVelocity) {
                        target.enemy.setVelocity(
                            Math.cos(knockbackAngle) * knockbackForce,
                            Math.sin(knockbackAngle) * knockbackForce
                        );
                    }
                } catch (error) {
                    console.warn('Failed to apply melee damage:', error);
                }
            }
        });
        
        // Visual feedback for melee attack
        this.createMeleeEffect(meleeX, meleeY, hitEnemy);
        
        this.meleeLastUsed = currentTime;
        return true;
    }

    createMeleeEffect(x, y, hitEnemy = false) {
        // Create a simple visual effect for melee attack
        const effect = this.gameScene.add.graphics();
        const color = hitEnemy ? 0xff0000 : 0xffffff;
        effect.lineStyle(6, color, 1);
        effect.strokeCircle(0, 0, this.meleeRange);
        effect.x = this.x;
        effect.y = this.y;
        effect.setDepth(50000 + this.y); // High depth to appear above map elements
        
        // Fade out the effect
        this.gameScene.tweens.add({
            targets: effect,
            alpha: 0,
            scaleX: 1.8,
            scaleY: 1.8,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                effect.destroy();
            }
        });
    }

    canReload() {
        return !this.isReloading && this.ammo < this.maxAmmo;
    }
    
    getReloadProgress() {
        if (!this.isReloading) return 1;
        
        const elapsed = Date.now() - this.reloadStartTime;
        return Math.min(elapsed / this.reloadTime, 1);
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        // Visual feedback
        this.setTint(0xff0000);
        this.gameScene.time.delayedCall(100, () => {
            this.clearTint();
        });
        
        // Screen shake
        this.gameScene.cameras.main.shake(100, 0.01);
        
        // Show damage indicator in UI
        const uiScene = this.gameScene.scene.get('UIScene');
        if (uiScene && uiScene.showDamageIndicator) {
            uiScene.showDamageIndicator();
        }
        
        // Check for death
        if (this.health <= 0) {
            this.handleDeath();
        }
        
        return this.health;
    }

    handleDeath() {
        console.log('💀 Player died!');
        
        // Hide player
        this.setActive(false);
        this.setVisible(false);
        
        // Show death screen and pause game
        const uiScene = this.gameScene.scene.get('UIScene');
        if (uiScene) {
            uiScene.showDeathScreen();
        }
        this.gameScene.scene.pause();
    }

    updateDepth() {
        // For isometric games, Y-sorting is crucial for proper depth ordering
        // The key is to use the Y position of the "feet" of the sprite
        // Since sprites have different origins, we need to calculate the bottom position
        
        // Calculate the effective Y position at the bottom of the player
        const effectiveY = this.y;
        
        // Use Y-sorting with a large enough range to avoid conflicts with tile system
        // Tile system uses up to around y*10+x+1, which for 800x800 map could be up to ~8000
        // We'll use 10000 as base to ensure we're above all tiles, then add Y for sorting
        this.setDepth(10000 + effectiveY);
        
        // Update indicator position to follow player
        if (this.indicator) {
            this.indicator.x = this.x;
            this.indicator.y = this.y - 30; // Updated to match new position
        }
        if (this.indicatorShadow) {
            this.indicatorShadow.x = this.x;
            this.indicatorShadow.y = this.y - 29; // Updated to match new position
        }
    }

    destroy() {
        // Clean up the indicator graphics
        if (this.indicator) {
            this.indicator.destroy();
        }
        if (this.indicatorShadow) {
            this.indicatorShadow.destroy();
        }
        
        // Call parent destroy
        super.destroy();
    }
} 