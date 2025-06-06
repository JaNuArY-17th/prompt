export class Enemy extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y, type = 'basic') {
        super(scene.matter.world, x, y, 'enemy_down_1'); // Start with down-facing idle frame
        
        // Add to scene
        scene.add.existing(this);
        
        // Physics properties - match player size and setup
        this.setBody({
            type: 'rectangle',
            width: 20,
            height: 20
        });
        
        this.setFixedRotation();
        this.setFrictionAir(0.15);
        this.body.label = 'enemy';
        
        // All enemies same size (same as player's 0.35 scale)
        this.setScale(0.35);
        
        // Enemy properties - adjusted speed to match player's
        this.type = type;
        this.health = 50;
        this.maxHealth = 50;
        this.speed = 2.5; // Match player speed
        this.attackDamage = 10;
        this.attackRange = 150;
        this.meleeRange = 30;
        
        // AI state
        this.state = 'patrol';
        this.target = null;
        this.lastAttackTime = 0;
        this.attackCooldown = 1500;
        this.lastStateChange = 0;
        
        // Shooting properties - all enemies can shoot now
        this.canShoot = true;
        this.shootRange = 120;
        this.shootCooldown = 2000; // Simple 2 second cooldown
        this.lastShootTime = 0;
        
        // Movement
        this.patrolDirection = Math.random() * Math.PI * 2;
        this.patrolTimer = 0;
        this.patrolChangeTime = 3000;
        this.lastDirection = 'down'; // Track last movement direction for idle animation
        this.isMoving = false;
        
        // Reference to scene
        this.gameScene = scene;
        
        // Warehouse protection (replacing hostage protection)
        this.protectedWarehouse = null;
        this.isGuarding = false;
        this.guardRange = 40; // Larger guard range for warehouses // tiles
        
        // Initialize based on type
        this.initializeByType();
        
        // Create animations
        this.createAnimations();
        
        // Create health bar (serves as both indicator and health display)
        this.createHealthBar();
        
        console.log(`Enemy ${type} created at`, x, y);
    }

    initializeByType() {
        // ALL ENEMY TYPES CAN NOW SHOOT!
        this.canShoot = true; // Enable shooting for all enemies
        
        switch (this.type) {
            case 'grunt':
                this.health = 25;
                this.maxHealth = 25;
                this.speed = 2;
                this.attackDamage = 5;
                this.attackRange = 100; // Reduced for more chasing
                this.shootRange = 120; // Reduced from 200
                this.shootCooldown = 5000; // Slower shooting
                this.burstSize = 1; // Single shot
                this.setTint(0xff6666);
                break;
                
            case 'ranged':
                this.health = 30;
                this.maxHealth = 30;
                this.speed = 1;
                this.attackRange = 120; // Reduced for more chasing
                this.attackCooldown = 2000;
                this.shootRange = 140; // Reduced from 250
                this.shootCooldown = 4000; // Slower shooting
                this.burstSize = 2; // Reduced burst
                this.setTint(0x6666ff);
                break;
                
            case 'tank':
                this.health = 100;
                this.maxHealth = 100;
                this.speed = 0.8;
                this.attackDamage = 20;
                this.attackRange = 100; // Reduced for more chasing
                this.shootRange = 120; // Reduced from 180
                this.shootCooldown = 3000; // Slower shooting
                this.burstSize = 2; // Reduced burst
                this.setTint(0x666666);
                // All enemies same size - removed setScale(1.2)
                break;
                
            default: // basic
                this.attackRange = 120; // Reduced for more chasing
                this.shootRange = 130; // Reduced from 220
                this.shootCooldown = 4500; // Slower shooting
                this.burstSize = 1; // Single shot
                break;
        }
    }

    createAnimations() {
        const anims = this.scene.anims;
        
        // Only create animations once per scene
        if (!anims.exists('enemy_walk_up')) {
            // Create walking animations for each direction
            anims.create({
                key: 'enemy_walk_up',
                frames: [
                    { key: 'enemy_up_1' },
                    { key: 'enemy_up_2' },
                    { key: 'enemy_up_3' },
                    { key: 'enemy_up_4' }
                ],
                frameRate: 8,
                repeat: -1
            });
            
            anims.create({
                key: 'enemy_walk_down',
                frames: [
                    { key: 'enemy_down_1' },
                    { key: 'enemy_down_2' },
                    { key: 'enemy_down_3' },
                    { key: 'enemy_down_4' }
                ],
                frameRate: 8,
                repeat: -1
            });
            
            anims.create({
                key: 'enemy_walk_left',
                frames: [
                    { key: 'enemy_left_1' },
                    { key: 'enemy_left_2' },
                    { key: 'enemy_left_3' },
                    { key: 'enemy_left_4' }
                ],
                frameRate: 8,
                repeat: -1
            });
            
            anims.create({
                key: 'enemy_walk_right',
                frames: [
                    { key: 'enemy_right_1' },
                    { key: 'enemy_right_2' },
                    { key: 'enemy_right_3' },
                    { key: 'enemy_right_4' }
                ],
                frameRate: 8,
                repeat: -1
            });
            
            // Create idle animations (using first frame of each direction)
            anims.create({
                key: 'enemy_idle_up',
                frames: [{ key: 'enemy_up_1' }],
                frameRate: 1,
                repeat: 0
            });
            
            anims.create({
                key: 'enemy_idle_down',
                frames: [{ key: 'enemy_down_1' }],
                frameRate: 1,
                repeat: 0
            });
            
            anims.create({
                key: 'enemy_idle_left',
                frames: [{ key: 'enemy_left_1' }],
                frameRate: 1,
                repeat: 0
            });
            
            anims.create({
                key: 'enemy_idle_right',
                frames: [{ key: 'enemy_right_1' }],
                frameRate: 1,
                repeat: 0
            });
        }
    }

    updateAnimation(direction) {
        if (this.isMoving) {
            // Play walking animation for the current direction
            const walkAnimKey = `enemy_walk_${direction}`;
            if (this.anims.currentAnim?.key !== walkAnimKey) {
                this.play(walkAnimKey);
            }
            this.lastDirection = direction;
        } else {
            // Play idle animation for the last direction
            const idleAnimKey = `enemy_idle_${this.lastDirection}`;
            if (this.anims.currentAnim?.key !== idleAnimKey) {
                this.play(idleAnimKey);
            }
        }
    }

    getDirectionFromMovement(moveX, moveY) {
        // Determine direction based on movement vector
        if (Math.abs(moveX) > Math.abs(moveY)) {
            return moveX > 0 ? 'right' : 'left';
        } else {
            return moveY > 0 ? 'down' : 'up';
        }
    }

    update(delta) {
        this.updateAI(delta);
        this.updateDepth();
        this.updateHealthBar();
    }

    updateAI(delta) {
        if (!this.active) return;
        
        const player = this.gameScene.player;
        if (!player || player.health <= 0) return;
        
        const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        
        // Handle flee state first (takes priority when health is low)
        if (this.state === 'flee') {
            this.fleeFromTarget(player);
            // Exit flee state if far enough away or health recovers
            if (distanceToPlayer > this.attackRange * 2) {
                this.state = 'patrol';
            }
            return;
        }
        
        // Simple 4-state AI: patrol, chase, shoot, attack
        if (distanceToPlayer < this.meleeRange) {
            // Close enough for melee attack
            this.state = 'attack';
            this.setVelocity(0, 0);
            this.attack(player);
        } else if (distanceToPlayer < this.shootRange) {
            // Close enough to shoot
            this.state = 'shoot';
            this.setVelocity(0, 0);
            this.shoot(player);
        } else if (distanceToPlayer < this.attackRange) {
            // Close enough to chase
            this.state = 'chase';
            this.chaseTarget(player);
        } else {
            // Too far away, patrol randomly
            this.state = 'patrol';
            this.patrol(delta);
        }
        
        // Update animation based on movement
        if (Math.abs(this.body.velocity.x) < 0.1 && Math.abs(this.body.velocity.y) < 0.1) {
            this.isMoving = false;
            this.updateAnimation(this.lastDirection);
        } else {
            this.isMoving = true;
            const direction = this.getDirectionFromMovement(this.body.velocity.x, this.body.velocity.y);
            this.updateAnimation(direction);
        }
    }

    patrol(delta) {
        this.patrolTimer += delta;
        
        // Simple random patrol - change direction every 2-4 seconds
            if (this.patrolTimer > this.patrolChangeTime) {
                this.patrolDirection = Math.random() * Math.PI * 2;
                this.patrolTimer = 0;
            this.patrolChangeTime = 2000 + Math.random() * 2000;
        }
        
        // Move in patrol direction at half speed
        const moveX = Math.cos(this.patrolDirection) * this.speed * 0.4;
        const moveY = Math.sin(this.patrolDirection) * this.speed * 0.4;
        this.setVelocity(moveX, moveY);
    }

    chaseTarget(target) {
        // Move directly toward target at full speed
        const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        const moveX = Math.cos(angle) * this.speed;
        const moveY = Math.sin(angle) * this.speed;
        this.setVelocity(moveX, moveY);
    }
    
    fleeFromTarget(target) {
        // Move away from target at full speed
        const angle = Phaser.Math.Angle.Between(target.x, target.y, this.x, this.y);
        const moveX = Math.cos(angle) * this.speed * 1.2; // Slightly faster when fleeing
        const moveY = Math.sin(angle) * this.speed * 1.2;
        this.setVelocity(moveX, moveY);
    }

    attack(target) {
        const currentTime = Date.now();
        if (currentTime - this.lastAttackTime < this.attackCooldown) {
            return; // Still on cooldown
        }
        
        // Deal damage to target
        if (target && target.takeDamage) {
        target.takeDamage(this.attackDamage);
        }
        
        // Visual feedback
        this.createAttackEffect();
        this.lastAttackTime = currentTime;
    }
    
    shoot(target) {
        const currentTime = Date.now();
        if (currentTime - this.lastShootTime < this.shootCooldown) {
            return; // Still on cooldown
        }
        
        // Shoot at player using game scene's shooting system
        if (this.gameScene.enemyShoot) {
            this.gameScene.enemyShoot(this, target.x, target.y);
        }
        
        this.lastShootTime = currentTime;
    }

    createAttackEffect() {
        // Create visual effect for attack
        const effect = this.gameScene.add.graphics();
        effect.lineStyle(3, 0xff0000, 1);
        effect.strokeCircle(0, 0, this.meleeRange);
        effect.x = this.x;
        effect.y = this.y;
        effect.setDepth(1000);
        
        this.gameScene.tweens.add({
            targets: effect,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                effect.destroy();
            }
        });
    }

    resetTintByType() {
        // Reset tint based on enemy type without changing other properties
        switch (this.type) {
            case 'grunt':
                this.setTint(0xff6666);
                break;
            case 'ranged':
                this.setTint(0x6666ff);
                break;
            case 'tank':
                this.setTint(0x666666);
                break;
            default: // basic
                this.clearTint();
                break;
        }
    }

    // Removed complex state management - using simple distance-based behavior

    takeDamage(amount) {
        const oldHealth = this.health;
        this.health = Math.max(0, this.health - amount);
        
        // Only proceed if health actually changed
        if (this.health !== oldHealth) {
            console.log(`Enemy took ${amount} damage, health: ${this.health}/${this.maxHealth}`);
            
            // Ensure health bar exists
            if (!this.healthBarBg || !this.healthBarFill) {
                this.createHealthBar();
            }
            
            // Immediately update health bar
            this.updateHealthBar();
            
            // Visual feedback
            this.setTint(0xffffff);
            this.gameScene.time.delayedCall(100, () => {
                this.resetTintByType(); // Reset tint based on type
            });
            
            // Knockback effect (small)
            if (this.target) {
                const angle = Phaser.Math.Angle.Between(this.target.x, this.target.y, this.x, this.y);
                const knockbackForce = 3;
                this.setVelocity(
                    this.body.velocity.x + Math.cos(angle) * knockbackForce,
                    this.body.velocity.y + Math.sin(angle) * knockbackForce
                );
            }
            
            // Check for death
            if (this.health <= 0) {
                this.handleDeath();
            } else if (this.health < this.maxHealth * 0.3) {
                // Switch to flee state if health is low
                this.state = 'flee';
            }
        }
        
        return this.health;
    }

    handleDeath() {
        // Give player 5 health for killing enemy (don't exceed max health)
        if (this.gameScene.player && this.gameScene.player.active) {
            const healthGain = 5;
            const oldHealth = this.gameScene.player.health;
            this.gameScene.player.health = Math.min(this.gameScene.player.maxHealth, this.gameScene.player.health + healthGain);
            
            if (this.gameScene.player.health > oldHealth) {
                console.log(`Player gained ${healthGain} health for killing enemy! Health: ${this.gameScene.player.health}/${this.gameScene.player.maxHealth}`);
                
                // Visual feedback for health gain
                this.createHealthGainEffect();
            }
        }
        
        // Create death effect
        const particles = this.gameScene.add.particles(this.x, this.y, 'bullet', {
            speed: { min: 50, max: 100 },
            scale: { start: 0.3, end: 0 },
            lifespan: 300,
            quantity: 5
        });
        
        // Remove after effect
        this.gameScene.time.delayedCall(300, () => {
            particles.destroy();
        });
        
        // Remove from enemy group
        this.gameScene.enemies.remove(this);
        
        // Remove from game objects array
        const index = this.gameScene.gameObjects.indexOf(this);
        if (index > -1) {
            this.gameScene.gameObjects.splice(index, 1);
        }
        
        // Clean up health bar
        this.destroyHealthBar();
        
        // Destroy this enemy
        this.destroy();
        
        console.log('Enemy destroyed');
    }
    
    createHealthGainEffect() {
        // Create floating +5 health text effect
        const healthText = this.gameScene.add.text(this.gameScene.player.x, this.gameScene.player.y - 30, '+5 HP', {
            fontSize: '16px',
            fill: '#00ff00',
            fontStyle: 'bold'
        });
        healthText.setDepth(60000);
        healthText.setOrigin(0.5);
        
        // Animate the health gain text
        this.gameScene.tweens.add({
            targets: healthText,
            y: healthText.y - 40,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                healthText.destroy();
            }
        });
    }

    updateDepth() {
        // Use Y-sorting to match player and tile system
        this.setDepth(10000 + this.y);
    }
    
    createHealthBar() {
        // Clean up existing health bar first
        this.destroyHealthBar();
        
        // Health bar dimensions - larger and more prominent since it's the main indicator
        const barWidth = 42;
        const barHeight = 8;
        const barOffsetY = -30;
        
        try {
            // Use graphics for better control - make it more prominent as main indicator
            this.healthBarBg = this.gameScene.add.graphics();
            this.healthBarBg.fillStyle(0x222222, 1);
            this.healthBarBg.lineStyle(3, 0x000000, 1); // Thicker border for visibility
            this.healthBarBg.fillRect(-barWidth/2, -barHeight/2, barWidth, barHeight);
            this.healthBarBg.strokeRect(-barWidth/2, -barHeight/2, barWidth, barHeight);
            this.healthBarBg.x = this.x;
            this.healthBarBg.y = this.y + barOffsetY;
            this.healthBarBg.setDepth(50000); // Higher depth since it's the main indicator
            
            // Health fill using graphics
            this.healthBarFill = this.gameScene.add.graphics();
            this.healthBarFill.fillStyle(0xff0000, 1); // Always red for enemies
            this.healthBarFill.fillRect(-barWidth/2 + 2, -barHeight/2 + 2, barWidth - 4, barHeight - 4);
            this.healthBarFill.x = this.x;
            this.healthBarFill.y = this.y + barOffsetY;
            this.healthBarFill.setDepth(50001); // Just above the background
            
            // Always show health bar for enemies (make them more visible)
            this.healthBarBg.setVisible(true);
            this.healthBarFill.setVisible(true);
            
            console.log(`Health bar created for ${this.type} enemy at (${this.x}, ${this.y})`);
            
        } catch (error) {
            console.warn('Error creating health bar:', error);
            this.healthBarBg = null;
            this.healthBarFill = null;
        }
    }
    

    
    updateHealthBar() {
        // Ensure health bar components exist
        if (!this.healthBarBg || !this.healthBarFill) {
            return;
        }
        
        // Validate health values
        if (this.health === undefined || this.maxHealth === undefined || this.maxHealth <= 0) {
            return;
        }
        
        try {
            const barOffsetY = -30;
            const barWidth = 42;
            const barHeight = 8;
            
            // Update position to follow enemy
            this.healthBarBg.x = this.x;
            this.healthBarBg.y = this.y + barOffsetY;
            this.healthBarFill.x = this.x;
            this.healthBarFill.y = this.y + barOffsetY;
            
            // Update health bar fill based on current health
            const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
            const newWidth = (barWidth - 4) * healthPercent; // Account for thicker border
            
            // Always use red color for enemy health bars
            const color = 0xff0000; // Always red
            
            // Redraw the health fill with new width and color
            this.healthBarFill.clear();
            this.healthBarFill.fillStyle(color, 1);
            this.healthBarFill.fillRect(-barWidth/2 + 2, -barHeight/2 + 2, newWidth, barHeight - 4);
            
            // Always show health bar for enemies (always visible)
            this.healthBarBg.setVisible(this.health > 0);
            this.healthBarFill.setVisible(this.health > 0);
            
        } catch (error) {
            console.warn('Error updating health bar:', error);
            // Recreate health bar if there's an error
            this.destroyHealthBar();
            this.createHealthBar();
        }
    }
    
    destroyHealthBar() {
        if (this.healthBarBg) {
            this.healthBarBg.destroy();
            this.healthBarBg = null;
        }
        if (this.healthBarFill) {
            this.healthBarFill.destroy();
            this.healthBarFill = null;
        }
    }
    

} 