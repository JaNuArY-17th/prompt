export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
        
        this.healthBar = null;
        this.healthText = null;
        this.ammoText = null;
        this.scoreText = null;
        this.weaponText = null;
        this.minimap = null;
        this.minimapUpdateCounter = 0;
        this.minimapCachedBackground = null;
        this.minimapVisible = false;
        this.minimapFullscreen = null;
        this.cornerMinimap = null;
        this.cornerMinimapTexture = null;
        this.cornerPlayerDot = null;
        this.cornerMinimapBg = null;
        
        // Dev buttons (temporary - will be removed later)
        this.devButtons = null;
        this.devButtonsContainer = null;
        this.devButtonElements = [];
        
        // Pause system
        this.isPaused = false;
        this.pauseOverlay = null;
        this.pauseText = null;
        
        // Death screen system
        this.isPlayerDead = false;
        this.deathOverlay = null;
        this.deathBanner = null;
        this.deathButtons = null;
        
        // Victory screen system
        this.isVictoryShown = false;
        this.victoryOverlay = null;
        this.victoryBanner = null;
        this.victoryButtons = null;
        
        // Next Chapter button (appears after victory)
        this.nextChapterButton = null;
        this.nextChapterText = null;
    }

    create() {
        // Get reference to the active game scene (either GameScene, Chapter2Scene, or Chapter3Scene)
        this.gameScene = this.scene.get('GameScene') || this.scene.get('Chapter2Scene') || this.scene.get('Chapter3Scene');
        
        // If no scene is active, try to detect which one should be used
        if (!this.gameScene) {
            const gameScene = this.scene.get('GameScene');
            const chapter2Scene = this.scene.get('Chapter2Scene');
            const chapter3Scene = this.scene.get('Chapter3Scene');
            
            if (gameScene && gameScene.scene.isActive()) {
                this.gameScene = gameScene;
            } else if (chapter2Scene && chapter2Scene.scene.isActive()) {
                this.gameScene = chapter2Scene;
            } else if (chapter3Scene && chapter3Scene.scene.isActive()) {
                this.gameScene = chapter3Scene;
            } else {
                console.warn('No active game scene found! Using GameScene as fallback.');
                this.gameScene = gameScene;
            }
        }
        
        console.log('UIScene connected to:', this.gameScene?.scene?.key || 'unknown scene');
        
        this.createHUD();
        
        // Set up events to listen for game state changes
        this.events.on('updateHealth', this.updateHealth, this);
        this.events.on('updateScore', this.updateScore, this);
        
        // Set up keyboard input for minimap toggle and pause
        this.mapKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        
        // Set up pause key handler
        this.escKey.on('down', () => {
            this.handlePause();
        });
        
        // Create always-visible corner minimap (clickable to open fullscreen)
        this.createCornerMinimap();
        
        // Create memory stats display (bottom left, debug info)
        const height = this.cameras.main.height;
        this.memoryText = this.add.text(20, height - 60, '', {
            fontSize: '12px',
            fontFamily: 'VT323',
            color: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 8, y: 5 }
        });
        this.memoryText.setOrigin(0, 1);
        this.memoryText.setScrollFactor(0);
        this.memoryText.setDepth(1000);
        this.memoryText.setVisible(false); // Hidden by default, toggle with 'F3' key
        
        // Add F3 key for memory display toggle
        this.memoryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3);
        
        // Create dev buttons immediately (always show them)
        this.createDevButtons();
        
        // Set up event listeners for the current game scene
        this.setupGameSceneListeners();
        
        // Also set up a periodic check in case the event is missed
        this.worldReadyCheckTimer = this.time.addEvent({
            delay: 1000, // Check every 1 second
            callback: this.checkWorldReadiness,
            callbackScope: this,
            loop: true
        });
    }

    createHUD() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Create main HUD panel background (taller to accommodate bullet inventory)
        this.hudPanel = this.add.rectangle(10, 10, 280, 140, 0x000000, 0.8);
        this.hudPanel.setOrigin(0, 0);
        this.hudPanel.setStrokeStyle(2, 0x00ff00, 0.8);
        this.hudPanel.setScrollFactor(0);

        // Add corner decorations
        this.add.rectangle(15, 15, 8, 8, 0x00ff00).setOrigin(0, 0).setScrollFactor(0);
        this.add.rectangle(282, 15, 8, 8, 0x00ff00).setOrigin(1, 0).setScrollFactor(0);
        this.add.rectangle(15, 142, 8, 8, 0x00ff00).setOrigin(0, 1).setScrollFactor(0);
        this.add.rectangle(282, 142, 8, 8, 0x00ff00).setOrigin(1, 1).setScrollFactor(0);

        // Health section
        this.add.text(25, 25, '♥', {
            fontSize: '20px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 1
        }).setScrollFactor(0);

        this.healthText = this.add.text(50, 25, 'HP: 100/100', {
            fontSize: '16px',
            fontFamily: 'VT323',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.healthText.setScrollFactor(0);

        // Health bar background with inner shadow effect
        const healthBg = this.add.rectangle(140, 35, 120, 18, 0x330000);
        healthBg.setStrokeStyle(2, 0x666666);
        healthBg.setScrollFactor(0);

        // Health bar fill with gradient effect
        this.healthBar = this.add.rectangle(140, 35, 116, 14, 0x00ff00);
        this.healthBar.setScrollFactor(0);

        // Ammo section
        this.add.text(25, 55, '🔫', {
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1
        }).setScrollFactor(0);

        this.ammoText = this.add.text(50, 55, 'AMMO: 10/10', {
            fontSize: '16px',
            fontFamily: 'VT323',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.ammoText.setScrollFactor(0);
        
        // Ammo bar background
        const ammoBg = this.add.rectangle(140, 65, 120, 18, 0x000033);
        ammoBg.setStrokeStyle(2, 0x666666);
        ammoBg.setScrollFactor(0);

        // Ammo bar fill
        this.ammoBar = this.add.rectangle(140, 65, 116, 14, 0x00aaff);
        this.ammoBar.setScrollFactor(0);

        // Bullet inventory section (below ammo)
        this.add.text(25, 105, '📦', {
            fontSize: '16px',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 1
        }).setScrollFactor(0);

        this.bulletInventoryText = this.add.text(50, 105, 'BULLETS: 10/20', {
            fontSize: '14px',
            fontFamily: 'VT323',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.bulletInventoryText.setScrollFactor(0);
        
        // Weapon section (moved down)
        this.add.text(25, 125, '⚡', {
            fontSize: '16px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 1
        }).setScrollFactor(0);

        this.weaponText = this.add.text(50, 125, 'WEAPON: RIFLE', {
            fontSize: '14px',
            fontFamily: 'VT323',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 1
        });
        this.weaponText.setScrollFactor(0);

        // Reload progress bar (initially hidden) - positioned over ammo bar
        this.reloadBarBg = this.add.rectangle(140, 65, 120, 18, 0x333300);
        this.reloadBarBg.setStrokeStyle(2, 0xffff00);
        this.reloadBarBg.setScrollFactor(0);
        this.reloadBarBg.setVisible(false);
        
        this.reloadBar = this.add.rectangle(140, 65, 116, 14, 0xffff00);
        this.reloadBar.setScrollFactor(0);
        this.reloadBar.setVisible(false);

        // Score removed for cleaner UI

        // Chapter text
        this.chapterText = this.add.text(width / 2, 20, 'CHAPTER 1', {
            fontSize: '18px',
            fontFamily: 'VT323',
            color: '#ffff00'
        });
        this.chapterText.setOrigin(0.5, 0);
        this.chapterText.setScrollFactor(0);
        
        // Listen for chapter changes
        this.events.on('chapterChanged', (data) => {
            this.chapterText.setText(data.name);
        });

        // Controls hint
        this.add.text(width / 2, height - 30, 'WASD: Move | Left Click: Shoot | E: Melee | R: Reload | M: Toggle Map | ESC: Pause', {
            fontSize: '12px',
            fontFamily: 'VT323',
            color: '#666666'
        }).setOrigin(0.5).setScrollFactor(0);
        
        // Objectives panel (positioned below player stats, smaller size)
        this.objectivesPanel = this.add.container(10, 160); // Left side, below player stats
        this.createObjectivesPanel();
    }

    updateHealth(current, max) {
        if (this.healthText && this.healthBar) {
            this.healthText.setText(`HP: ${current}/${max}`);
            
            // Update health bar width and color
            const healthPercent = current / max;
            this.healthBar.width = 116 * healthPercent;
            
            // Change color based on health with more vibrant colors
            if (healthPercent > 0.6) {
                this.healthBar.setFillStyle(0x00ff00); // Bright green
            } else if (healthPercent > 0.3) {
                this.healthBar.setFillStyle(0xffaa00); // Orange
            } else {
                this.healthBar.setFillStyle(0xff0000); // Red
            }
            
            // Add pulsing effect when health is low
            if (healthPercent < 0.3) {
                this.healthBar.setAlpha(0.8 + Math.sin(this.time.now * 0.01) * 0.2);
            } else {
                this.healthBar.setAlpha(1.0);
            }
        }
    }

    updateAmmo(current, max, reloadProgress = 0) {
        if (this.ammoText && this.ammoBar) {
            // Show reloading status if reloading
            if (reloadProgress > 0 && reloadProgress < 1) {
                this.ammoText.setText(`AMMO: RELOADING... ${Math.round(reloadProgress * 100)}%`);
                if (this.ammoText.active) {
                    this.ammoText.setColor('#ffff00');
                }
                
                // Show reload progress in ammo bar
                this.ammoBar.width = 116 * reloadProgress;
                this.ammoBar.setFillStyle(0xffff00); // Yellow during reload
            } else {
                this.ammoText.setText(`AMMO: ${current}/${max}`);
                
                // Update ammo bar width and color
                const ammoPercent = current / max;
                this.ammoBar.width = 116 * ammoPercent;
                
                // Change color based on ammo count
                if (current === 0) {
                    if (this.ammoText.active) this.ammoText.setColor('#ff0000'); // Red when empty
                    this.ammoBar.setFillStyle(0xff0000); // Red bar
                } else if (current < max * 0.3) {
                    if (this.ammoText.active) this.ammoText.setColor('#ff8800'); // Orange when low
                    this.ammoBar.setFillStyle(0xff8800); // Orange bar
                } else {
                    if (this.ammoText.active) this.ammoText.setColor('#ffffff'); // White when normal
                    this.ammoBar.setFillStyle(0x00aaff); // Blue bar
                }
            }
        }
        
        // Update reload progress bar (separate visual indicator)
        if (reloadProgress > 0 && reloadProgress < 1) {
            this.reloadBarBg.setVisible(true);
            this.reloadBar.setVisible(true);
            this.reloadBar.width = 116 * reloadProgress;
        } else {
            this.reloadBarBg.setVisible(false);
            this.reloadBar.setVisible(false);
        }
    }

    updateScore(score) {
        if (this.scoreText) {
            this.scoreText.setText(`SCORE: ${score}`);
        }
    }

    updateBulletInventory(current, max) {
        if (this.bulletInventoryText) {
            this.bulletInventoryText.setText(`BULLETS: ${current}/${max}`);
            
            // Change color based on inventory level
            if (this.bulletInventoryText.active) {
                if (current <= 0) {
                    this.bulletInventoryText.setColor('#ff0000'); // Red when empty
                } else if (current <= max * 0.3) {
                    this.bulletInventoryText.setColor('#ffaa00'); // Orange when low
                } else {
                    this.bulletInventoryText.setColor('#ffcc00'); // Yellow when normal
                }
            }
        }
    }

    updateWeapon(weaponName) {
        if (this.weaponText) {
            this.weaponText.setText(`WEAPON: ${weaponName.toUpperCase()}`);
        }
    }

    showDamageIndicator() {
        // Create a red flash effect when player takes damage
        const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0xff0000, 0.3);
        overlay.setOrigin(0, 0);
        overlay.setScrollFactor(0);
        
        this.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                overlay.destroy();
            }
        });
    }
    
    showDeathScreen() {
        if (this.isPlayerDead) return;
        
        this.isPlayerDead = true;
        console.log('💀 Showing death screen...');
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Dark overlay with fade-in
        this.deathOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.9);
        this.deathOverlay.setOrigin(0, 0);
        this.deathOverlay.setScrollFactor(0);
        this.deathOverlay.setDepth(10000);
        this.deathOverlay.setAlpha(0);
        
        // Death panel background
        const panel = this.add.rectangle(width / 2, height / 2, 500, 250, 0x330000, 0.9);
        panel.setStrokeStyle(4, 0xff0000);
        panel.setScrollFactor(0);
        panel.setDepth(10001);
        panel.setAlpha(0);
        
        // Animated death title
        const deathTitle = this.add.text(width / 2, height / 2 - 50, '💀 YOU DIED 💀', {
            fontSize: '42px',
            color: '#ff4444',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        });
        deathTitle.setOrigin(0.5);
        deathTitle.setScrollFactor(0);
        deathTitle.setDepth(10002);
        deathTitle.setScale(0);
        
        // Retry button with styling
        const retryButton = this.add.text(width / 2 - 80, height / 2 + 30, '🔄 RETRY', {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#004400',
            padding: { x: 15, y: 8 },
            stroke: '#008800',
            strokeThickness: 2
        });
        retryButton.setOrigin(0.5);
        retryButton.setScrollFactor(0);
        retryButton.setDepth(10002);
        retryButton.setInteractive({ useHandCursor: true });
        retryButton.setAlpha(0);
        
        // Quit button with styling
        const quitButton = this.add.text(width / 2 + 80, height / 2 + 30, '🚪 QUIT', {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#440000',
            padding: { x: 15, y: 8 },
            stroke: '#880000',
            strokeThickness: 2
        });
        quitButton.setOrigin(0.5);
        quitButton.setScrollFactor(0);
        quitButton.setDepth(10002);
        quitButton.setInteractive({ useHandCursor: true });
        quitButton.setAlpha(0);
        
        // Button hover effects
        retryButton.on('pointerover', () => {
            retryButton.setScale(1.1);
            retryButton.setStyle({ backgroundColor: '#006600' });
        });
        retryButton.on('pointerout', () => {
            retryButton.setScale(1);
            retryButton.setStyle({ backgroundColor: '#004400' });
        });
        
        quitButton.on('pointerover', () => {
            quitButton.setScale(1.1);
            quitButton.setStyle({ backgroundColor: '#660000' });
        });
        quitButton.on('pointerout', () => {
            quitButton.setScale(1);
            quitButton.setStyle({ backgroundColor: '#440000' });
        });
        
        // Click handlers
        retryButton.on('pointerdown', () => {
            this.handleRetry();
        });
        
        quitButton.on('pointerdown', () => {
            this.handleQuitToMenu();
        });
        
        // Animated entrance
        this.tweens.add({
            targets: this.deathOverlay,
            alpha: 1,
            duration: 300
        });
        
        this.tweens.add({
            targets: panel,
            alpha: 1,
            duration: 400,
            delay: 200
        });
        
        this.tweens.add({
            targets: deathTitle,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut',
            delay: 400
        });
        
        this.tweens.add({
            targets: [retryButton, quitButton],
            alpha: 1,
            duration: 300,
            delay: 700,
            stagger: 100
        });
        
        // Store elements for cleanup
        this.deathButtons = [this.deathOverlay, panel, deathTitle, retryButton, quitButton];
    }
    
    handleRetry() {
        console.log('🔄 Retrying...');
        this.removeDeathScreen();
        
        // Get the current scene and scene instance
        let sceneKey = this.gameScene;
        let sceneInstance = null;
        
        // Fallback: check active scenes if no stored reference
        if (!sceneKey) {
            const activeScenes = this.scene.manager.getScenes(true);
            sceneInstance = activeScenes.find(scene => 
                scene.scene.key === 'GameScene' || scene.scene.key === 'Chapter2Scene' || scene.scene.key === 'Chapter3Scene'
            );
            sceneKey = sceneInstance ? sceneInstance.scene.key : 'GameScene';
        } else {
            sceneInstance = this.scene.get(sceneKey);
        }
        
        console.log(`Restarting scene: ${sceneKey}`);
        
        // Resume scene if paused
        this.scene.resume(sceneKey);
        
        // Reset player position before restarting if the scene has the method
        if (sceneInstance && sceneInstance.resetPlayerPosition) {
            sceneInstance.resetPlayerPosition();
        }
        
        // Restart the scene
        this.scene.restart(sceneKey);
        
        // Restart UIScene to ensure clean state
        this.scene.restart('UIScene');
    }
    
    handleQuitToMenu() {
        console.log('🚪 Quitting to menu...');
        this.removeDeathScreen();
        
        // Clean up any minimap textures that might cause errors
        this.destroyFullscreenMinimap();
        
        // Stop all game scenes and go to main menu
        this.scene.stop('GameScene');
        this.scene.stop('Chapter2Scene');
        this.scene.stop('Chapter3Scene');
        this.scene.stop('UIScene');
        this.scene.start('MainMenuScene');
    }
    
    removeDeathScreen() {
        if (this.deathButtons) {
            this.deathButtons.forEach(element => {
                if (element && element.destroy) {
                    element.destroy();
                }
            });
            this.deathButtons = null;
        }
        
        this.isPlayerDead = false;
        this.deathOverlay = null;
        this.deathBanner = null;
    }
    
    showVictoryBanner() {
        if (this.isVictoryShown) return; // Prevent multiple victory banners
        
        this.isVictoryShown = true;
        console.log('🎉 Showing victory banner...');
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create gold overlay
        this.victoryOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
        this.victoryOverlay.setOrigin(0, 0);
        this.victoryOverlay.setScrollFactor(0);
        this.victoryOverlay.setDepth(15000);
        
        // Create victory banner background
        this.victoryBanner = this.add.rectangle(width / 2, height / 2, 700, 400, 0x000000, 0.95);
        this.victoryBanner.setStrokeStyle(6, 0xffd700); // Gold border
        this.victoryBanner.setScrollFactor(0);
        this.victoryBanner.setDepth(15001);
        
        // Victory title with trophy emoji
        const victoryTitle = this.add.text(width / 2, height / 2 - 120, '🏆 MISSION COMPLETE! 🏆', {
            fontSize: '52px',
            fontFamily: 'VT323',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        });
        victoryTitle.setOrigin(0.5);
        victoryTitle.setScrollFactor(0);
        victoryTitle.setDepth(15002);
        
        // Victory message
        const victoryMessage = this.add.text(width / 2, height / 2 - 40, 'All warehouses destroyed!\nThe enemy supply chain is broken.', {
            fontSize: '24px',
            fontFamily: 'VT323',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        });
        victoryMessage.setOrigin(0.5);
        victoryMessage.setScrollFactor(0);
        victoryMessage.setDepth(15002);
        
        // Create buttons container
        this.victoryButtons = [];
        
        // Next Chapter button
        const nextChapterButton = this.add.rectangle(width / 2 - 150, height / 2 + 80, 280, 60, 0x0066cc);
        nextChapterButton.setStrokeStyle(3, 0x004499);
        nextChapterButton.setScrollFactor(0);
        nextChapterButton.setDepth(15002);
        nextChapterButton.setInteractive({ useHandCursor: true });
        
        const nextChapterText = this.add.text(width / 2 - 150, height / 2 + 80, '🚀 NEXT CHAPTER', {
            fontSize: '20px',
            fontFamily: 'VT323',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        nextChapterText.setOrigin(0.5);
        nextChapterText.setScrollFactor(0);
        nextChapterText.setDepth(15003);
        
        // Continue Exploring button
        const continueButton = this.add.rectangle(width / 2 + 150, height / 2 + 80, 280, 60, 0x00aa00);
        continueButton.setStrokeStyle(3, 0x007700);
        continueButton.setScrollFactor(0);
        continueButton.setDepth(15002);
        continueButton.setInteractive({ useHandCursor: true });
        
        const continueText = this.add.text(width / 2 + 150, height / 2 + 80, '🌍 CONTINUE EXPLORING', {
            fontSize: '20px',
            fontFamily: 'VT323',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        continueText.setOrigin(0.5);
        continueText.setScrollFactor(0);
        continueText.setDepth(15003);
        
        // Button hover effects
        nextChapterButton.on('pointerover', () => {
            nextChapterButton.setFillStyle(0x0088ff);
            nextChapterText.setScale(1.05);
        });
        
        nextChapterButton.on('pointerout', () => {
            nextChapterButton.setFillStyle(0x0066cc);
            nextChapterText.setScale(1);
        });
        
        continueButton.on('pointerover', () => {
            continueButton.setFillStyle(0x00cc00);
            continueText.setScale(1.05);
        });
        
        continueButton.on('pointerout', () => {
            continueButton.setFillStyle(0x00aa00);
            continueText.setScale(1);
        });
        
        // Button click handlers
        nextChapterButton.on('pointerdown', () => {
            this.handleNextChapter();
        });
        
        continueButton.on('pointerdown', () => {
            this.handleContinueExploring();
        });
        
        // Store all victory screen elements for cleanup
        this.victoryButtons = [
            this.victoryOverlay,
            this.victoryBanner,
            victoryTitle,
            victoryMessage,
            nextChapterButton,
            nextChapterText,
            continueButton,
            continueText
        ];
        
        // Add dramatic entrance animation
        this.victoryBanner.setScale(0);
        victoryTitle.setAlpha(0);
        victoryMessage.setAlpha(0);
        nextChapterButton.setAlpha(0);
        nextChapterText.setAlpha(0);
        continueButton.setAlpha(0);
        continueText.setAlpha(0);
        
        // Animate banner entrance
        this.tweens.add({
            targets: this.victoryBanner,
            scaleX: 1,
            scaleY: 1,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Fade in text and buttons
                this.tweens.add({
                    targets: [victoryTitle, victoryMessage, nextChapterButton, nextChapterText, continueButton, continueText],
                    alpha: 1,
                    duration: 500,
                    stagger: 150
                });
                
                // Add sparkle effects around the banner
                this.createVictorySparkles();
            }
        });
    }
    
    createVictorySparkles() {
        // Create sparkle effects around the victory banner
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        for (let i = 0; i < 20; i++) {
            this.time.delayedCall(i * 100, () => {
                const sparkle = this.add.text(
                    width / 2 + (Math.random() - 0.5) * 800,
                    height / 2 + (Math.random() - 0.5) * 500,
                    '✨',
                    { fontSize: '24px' }
                );
                sparkle.setScrollFactor(0);
                sparkle.setDepth(15004);
                
                this.tweens.add({
                    targets: sparkle,
                    alpha: 0,
                    scale: 0,
                    duration: 2000,
                    onComplete: () => sparkle.destroy()
                });
            });
        }
    }
    
    handleNextChapter() {
        console.log('🚀 Next Chapter clicked');
        
        const chapterManager = this.game.chapterManager;
        const nextChapter = chapterManager.getNextChapter();
        
        if (nextChapter && nextChapter.unlocked) {
            // Mark current chapter as completed
            chapterManager.completeChapter(chapterManager.currentChapter);
            chapterManager.saveProgress();
            
            // Start next chapter
            chapterManager.startChapter(nextChapter.number);
        } else if (nextChapter && !nextChapter.unlocked) {
            // Show unlock requirement message
            this.showMessage('Complete current chapter to unlock!', '#ff4444');
        } else {
            // No more chapters available
            this.showMessage('Coming Soon...', '#ffaa00');
        }
    }
    
    showMessage(text, color = '#ffaa00') {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const messageText = this.add.text(width / 2, height / 2 + 160, text, {
            fontSize: '32px',
            fontFamily: 'VT323',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        });
        messageText.setOrigin(0.5);
        messageText.setScrollFactor(0);
        messageText.setDepth(15005);
        messageText.setAlpha(0);
        
        this.tweens.add({
            targets: messageText,
            alpha: 1,
            duration: 500,
            onComplete: () => {
                this.time.delayedCall(2000, () => {
                    this.tweens.add({
                        targets: messageText,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => messageText.destroy()
                    });
                });
            }
        });
    }
    
    handleContinueExploring() {
        console.log('🌍 Continue Exploring clicked');
        
        // Hide victory banner and resume game
        this.removeVictoryBanner();
        
        // Unpause the game scene
        if (this.gameScene.scene.isPaused()) {
            this.gameScene.scene.resume();
        }
        
        // Create next chapter button under objectives panel
        this.createNextChapterButton();
        
        console.log('Game resumed - continue exploring!');
    }
    
    removeVictoryBanner() {
        if (this.victoryButtons) {
            this.victoryButtons.forEach(element => {
                if (element && element.destroy) {
                    element.destroy();
                }
            });
            this.victoryButtons = null;
        }
        
        this.isVictoryShown = false;
        this.victoryOverlay = null;
        this.victoryBanner = null;
    }
    
    createNextChapterButton() {
        // Don't create if already exists
        if (this.nextChapterButton) return;
        
        // Position button under the objectives panel on the left side
        const buttonX = 20;  // Left side, with some margin
        const buttonY = 270; // Under objectives panel (objectives end around y=260)
        
        // Create button background
        this.nextChapterButton = this.add.rectangle(buttonX, buttonY, 220, 50, 0x0066cc);
        this.nextChapterButton.setOrigin(0, 0); // Left-aligned
        this.nextChapterButton.setStrokeStyle(3, 0x004499);
        this.nextChapterButton.setScrollFactor(0);
        this.nextChapterButton.setDepth(1000);
        this.nextChapterButton.setInteractive({ useHandCursor: true });
        
        // Create button text
        this.nextChapterText = this.add.text(buttonX + 110, buttonY + 25, '🚀 NEXT CHAPTER', {
            fontSize: '16px',
            fontFamily: 'VT323',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.nextChapterText.setOrigin(0.5);
        this.nextChapterText.setScrollFactor(0);
        this.nextChapterText.setDepth(1001);
        
        // Button hover effects
        this.nextChapterButton.on('pointerover', () => {
            this.nextChapterButton.setFillStyle(0x0088ff);
            this.nextChapterText.setScale(1.05);
        });
        
        this.nextChapterButton.on('pointerout', () => {
            this.nextChapterButton.setFillStyle(0x0066cc);
            this.nextChapterText.setScale(1);
        });
        
        // Button click handler
        this.nextChapterButton.on('pointerdown', () => {
            this.handleNextChapter();
        });
        
        // Add entrance animation
        this.nextChapterButton.setAlpha(0);
        this.nextChapterText.setAlpha(0);
        this.nextChapterButton.setScale(0.8);
        this.nextChapterText.setScale(0.8);
        
        this.tweens.add({
            targets: [this.nextChapterButton, this.nextChapterText],
            alpha: 1,
            scale: 1,
            duration: 600,
            ease: 'Back.easeOut'
        });
        
        console.log('🚀 Next Chapter button created under objectives panel');
    }

    update() {
        // Update UI based on game state
        if (this.gameScene && this.gameScene.player) {
            const player = this.gameScene.player;
            
            this.updateHealth(player.health, player.maxHealth);
            
            // Use the GameScene's ammo system (not player's ammo)
            if (this.gameScene.currentAmmo !== undefined && this.gameScene.shootingConfig) {
                const reloadProgress = this.gameScene.isReloading ? 
                    Math.min(1, (this.gameScene.time.now - this.gameScene.reloadStartTime) / this.gameScene.shootingConfig.reloadTime) : 0;
                this.updateAmmo(this.gameScene.currentAmmo, this.gameScene.shootingConfig.maxAmmo, reloadProgress);
            }
            
            this.updateObjectives();
            
            // Handle minimap toggle
            if (Phaser.Input.Keyboard.JustDown(this.mapKey)) {
                this.toggleMinimap();
            }
            
        // Update corner minimap every 30 frames with live player tracking
        if (!this.minimapUpdateCounter) {
            this.minimapUpdateCounter = 0;
        }
        this.minimapUpdateCounter++;
        
        if (this.minimapUpdateCounter % 30 === 0) {
            this.updateCornerMinimapWithPlayerTracking();
        }
        
        // Update memory stats display (every 60 frames)
        if (this.minimapUpdateCounter % 60 === 0) {
            this.updateMemoryDisplay();
        }
        
        // Handle memory display toggle
        if (Phaser.Input.Keyboard.JustDown(this.memoryKey)) {
            this.toggleMemoryDisplay();
            }
        }
    }
    
    createObjectivesPanel() {
        // Smaller, more compact objectives panel
        const panelBg = this.add.rectangle(0, 0, 250, 100, 0x000000, 0.85);
        panelBg.setStrokeStyle(2, 0x00ff00, 0.8);
        panelBg.setOrigin(0, 0);
        
        // Add corner decorations for objectives panel
        this.add.rectangle(5, 5, 4, 4, 0x00ff00).setOrigin(0, 0);
        this.add.rectangle(245, 5, 4, 4, 0x00ff00).setOrigin(1, 0);
        this.add.rectangle(5, 95, 4, 4, 0x00ff00).setOrigin(0, 1);
        this.add.rectangle(245, 95, 4, 4, 0x00ff00).setOrigin(1, 1);
        
        const title = this.add.text(10, 8, '📋 OBJECTIVES', {
            fontSize: '12px',
            fontFamily: 'VT323',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 1
        });
        title.setOrigin(0, 0);
        
        this.mainObjectiveText = this.add.text(10, 28, '', {
            fontSize: '11px',
            fontFamily: 'VT323',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1
        });
        this.mainObjectiveText.setOrigin(0, 0);
        
        this.sideObjective1Text = this.add.text(10, 48, '', {
            fontSize: '10px',
            fontFamily: 'VT323',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 1
        });
        this.sideObjective1Text.setOrigin(0, 0);
        
        this.sideObjective2Text = this.add.text(10, 68, '', {
            fontSize: '10px',
            fontFamily: 'VT323',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 1
        });
        this.sideObjective2Text.setOrigin(0, 0);
        
        this.objectivesPanel.add([panelBg, title, this.mainObjectiveText, this.sideObjective1Text, this.sideObjective2Text]);
        this.objectivesPanel.setScrollFactor(0);
    }
    
    updateObjectives() {
        if (this.gameScene && this.gameScene.tileSystem) {
            const objectives = this.gameScene.tileSystem.getObjectives();
            
            // Update main objective with icons
            const mainObj = objectives.mainObjective;
            const mainIcon = mainObj.completed ? '✅' : '🎯';
            const mainColor = mainObj.completed ? '#00ff00' : '#ffffff';
            this.mainObjectiveText.setText(`${mainIcon} ${mainObj.description}: ${mainObj.progress}/${mainObj.total}`);
            if (this.mainObjectiveText && this.mainObjectiveText.active) {
            this.mainObjectiveText.setColor(mainColor);
        }
            
            // Update side objectives with icons
            if (objectives.sideObjectives && objectives.sideObjectives.length > 0) {
                const sideObj1 = objectives.sideObjectives[0];
                // Choose appropriate icon based on objective description
                let side1Icon;
                if (sideObj1.description.includes('Kill enemies')) {
                    side1Icon = sideObj1.completed ? '✅' : '⚔️';
                } else if (sideObj1.description.includes('Rescue')) {
                    side1Icon = sideObj1.completed ? '✅' : '👥';
                } else {
                    side1Icon = sideObj1.completed ? '✅' : '🎯';
                }
                const side1Color = sideObj1.completed ? '#00ff00' : '#cccccc';
                this.sideObjective1Text.setText(`${side1Icon} ${sideObj1.description}: ${sideObj1.progress}/${sideObj1.total}`);
                if (this.sideObjective1Text && this.sideObjective1Text.active) {
                this.sideObjective1Text.setColor(side1Color);
            }
            } else {
                this.sideObjective1Text.setText('');
            }
            
            // Update second side objective if it exists
            if (objectives.sideObjectives && objectives.sideObjectives.length > 1) {
                const sideObj2 = objectives.sideObjectives[1];
                // Choose appropriate icon based on objective description
                let side2Icon;
                if (sideObj2.description.includes('intelligence')) {
                    side2Icon = sideObj2.completed ? '✅' : '📄';
                } else if (sideObj2.description.includes('Kill enemies')) {
                    side2Icon = sideObj2.completed ? '✅' : '⚔️';
                } else {
                    side2Icon = sideObj2.completed ? '✅' : '🎯';
                }
                const side2Color = sideObj2.completed ? '#00ff00' : '#cccccc';
                this.sideObjective2Text.setText(`${side2Icon} ${sideObj2.description}: ${sideObj2.progress}/${sideObj2.total}`);
                if (this.sideObjective2Text && this.sideObjective2Text.active) {
                this.sideObjective2Text.setColor(side2Color);
            }
            } else {
                this.sideObjective2Text.setText(''); // Clear if no second objective
            }
        }
    }
    
    createCornerMinimap() {
        const width = this.cameras.main.width;
        const minimapSize = 120; // Compact corner size
        const minimapX = width - minimapSize/2 - 15; // Positioned from right edge
        const minimapY = minimapSize/2 + 15; // Positioned from top edge
        
        // Create corner minimap container
        this.cornerMinimap = this.add.container(minimapX, minimapY);
        this.cornerMinimap.setScrollFactor(0);
        this.cornerMinimap.setDepth(500);
        
        // Minimap background (make it interactive)
        this.cornerMinimapBg = this.add.rectangle(0, 0, minimapSize, minimapSize, 0x000000, 0.8);
        this.cornerMinimapBg.setStrokeStyle(2, 0x00ff00, 0.8);
        this.cornerMinimapBg.setInteractive();
        this.cornerMinimap.add(this.cornerMinimapBg);
        
        // Add hover effect and click handler
        this.cornerMinimapBg.on('pointerover', () => {
            this.cornerMinimapBg.setStrokeStyle(2, 0x00ffff, 1.0); // Cyan highlight on hover
        });
        
        this.cornerMinimapBg.on('pointerout', () => {
            this.cornerMinimapBg.setStrokeStyle(2, 0x00ff00, 0.8); // Return to normal
        });
        
        this.cornerMinimapBg.on('pointerdown', () => {
            this.toggleMinimap();
        });
        
        // Add small text indicator
        const mapLabel = this.add.text(0, -minimapSize/2 - 10, 'MAP', {
            fontSize: '10px',
            fontFamily: 'VT323',
            color: '#00ff00'
        });
        mapLabel.setOrigin(0.5);
        this.cornerMinimap.add(mapLabel);
        
        // Create render texture for minimap content
        this.cornerMinimapTexture = this.add.renderTexture(0, 0, minimapSize - 4, minimapSize - 4);
        this.cornerMinimapTexture.setOrigin(0.5);
        this.cornerMinimap.add(this.cornerMinimapTexture);
        
        // Player dot on corner minimap
        this.cornerPlayerDot = this.add.circle(0, 0, 2, 0xff0000);
        this.cornerMinimap.add(this.cornerPlayerDot);
        
        console.log('Corner minimap created at position:', minimapX, minimapY);
    }
    
    createDevButtons() {
        // DEV BUTTONS - TO BE REMOVED LATER
        console.log('Creating dev buttons (initially disabled)...');
        
        // Position buttons below the corner minimap
        const width = this.cameras.main.width;
        const minimapSize = 120;
        const buttonX = width - 140; // Align with minimap but slightly left
        const buttonY = minimapSize + 40; // Below the minimap
        const buttonWidth = 120;
        const buttonHeight = 30;
        const buttonSpacing = 35;
        
        this.devButtonsContainer = this.add.container(0, 0);
        this.devButtonsContainer.setScrollFactor(0);
        this.devButtonsContainer.setDepth(1100); // Above everything else
        
        // Title for dev buttons
        const devTitle = this.add.text(buttonX, buttonY - 20, 'DEV TELEPORT:', {
            fontSize: '14px',
            fontFamily: 'VT323',
            color: '#ff0000',
            backgroundColor: '#000000',
            padding: { x: 5, y: 2 }
        });
        devTitle.setOrigin(0);
        this.devButtonsContainer.add(devTitle);
        
        // Store button references for enabling/disabling
        this.devButtonElements = [];
        
        // Create teleport buttons for each warehouse and chapter skip
        const warehouseButtons = [
            { name: 'Warehouse 1', index: 0 },
            { name: 'Warehouse 2', index: 1 },
            { name: 'Warehouse 3', index: 2 },
            { name: 'Player Spawn', index: -1 }, // Special case for spawn
            { name: 'Skip to Next Chapter', index: -2 } // Special case for chapter skip
        ];
        
        warehouseButtons.forEach((buttonData, i) => {
            const y = buttonY + (i * buttonSpacing);
            
            // Button background - initially gray/disabled
            const buttonBg = this.add.rectangle(buttonX, y, buttonWidth, buttonHeight, 0x444444, 0.6);
            buttonBg.setOrigin(0, 0);
            buttonBg.setStrokeStyle(2, 0x666666, 0.6);
            buttonBg.setInteractive();
            
            // Button text - initially gray
            const buttonText = this.add.text(buttonX + buttonWidth/2, y + buttonHeight/2, buttonData.name + ' (Loading...)', {
                fontSize: '12px',
                fontFamily: 'VT323',
                color: '#888888'
            });
            buttonText.setOrigin(0.5);
            
            // Store button elements for later enabling
            const buttonElement = {
                background: buttonBg,
                text: buttonText,
                index: buttonData.index,
                originalName: buttonData.name,
                enabled: false
            };
            this.devButtonElements.push(buttonElement);
            
            // Initially disabled click handler with better feedback
            buttonBg.on('pointerdown', () => {
                if (buttonElement.enabled) {
                    if (buttonData.index === -2) {
                        this.skipToNextChapter();
                    } else {
                        this.teleportToWarehouse(buttonData.index);
                    }
                } else {
                    console.warn('⚠️ Dev button clicked but world not ready yet');
                    this.showWorldNotReadyWarning();
                }
            });
            
            this.devButtonsContainer.add(buttonBg);
            this.devButtonsContainer.add(buttonText);
        });
        
        console.log('Dev teleport buttons created (disabled until world ready)');
    }
    
    enableDevButtons() {
        // Enable dev button functionality when world is ready
        if (!this.devButtonElements) {
            console.warn('No dev button elements to enable');
            return;
        }
        
        // Check which chapter is active
        const isChapter2 = this.gameScene && this.gameScene.scene.key === 'Chapter2Scene';
        const isChapter3 = this.gameScene && this.gameScene.scene.key === 'Chapter3Scene';
        
        if (isChapter2) {
            // For Chapter 2, check blackboard houses instead of warehouses
            const blackboardHouses = this.gameScene?.blackboardHouses;
            if (!blackboardHouses || blackboardHouses.children.entries.length === 0) {
                console.error('❌ Cannot enable dev buttons: No blackboard houses available');
                this.updateButtonsToErrorState();
                return;
            }
            console.log('✅ Enabling dev buttons with', blackboardHouses.children.entries.length, 'blackboard houses available (Chapter 2)');
        } else if (isChapter3) {
            // For Chapter 3, check radar towers and boss
            const radarTowers = this.gameScene?.tileSystem?.radarTowers;
            const commandingColonel = this.gameScene?.commandingColonel;
            const warehouses = this.gameScene?.tileSystem?.warehouses; // Boss warehouse
            if (!radarTowers || radarTowers.length === 0 || !commandingColonel || !warehouses || warehouses.length === 0) {
                console.error('❌ Cannot enable dev buttons: No radar towers, commanding colonel, or boss warehouse available');
                this.updateButtonsToErrorState();
                return;
            }
            
            // Check if preloading is complete for Chapter 3
            const tileSystem = this.gameScene.tileSystem;
            if (tileSystem.getPreloadedAreaInfo) {
                const preloadInfo = tileSystem.getPreloadedAreaInfo();
                console.log('📡 Chapter 3 Preload status:', preloadInfo);
                
                const expectedAreas = radarTowers.length + warehouses.length + 1; // +1 for spawn area
                if (preloadInfo.totalAreas < expectedAreas) {
                    console.warn('⚠️ Chapter 3 preloading not complete. Expected:', expectedAreas, 'Got:', preloadInfo.totalAreas);
                    this.updateButtonsToErrorState();
                    return;
                }
            }
            console.log('✅ Enabling dev buttons with', radarTowers.length, 'radar towers, commanding colonel, and boss warehouse available (Chapter 3)');
        } else {
            // For Chapter 1, check warehouses as before
            const warehouses = this.gameScene?.tileSystem?.warehouses;
            if (!warehouses || warehouses.length === 0) {
                console.error('❌ Cannot enable dev buttons: No warehouses available');
                this.updateButtonsToErrorState();
                return;
            }
            
            // Check if preloading is complete
            const tileSystem = this.gameScene.tileSystem;
            if (tileSystem.getPreloadedAreaInfo) {
                const preloadInfo = tileSystem.getPreloadedAreaInfo();
                console.log('🏭 Preload status:', preloadInfo);
                
                if (preloadInfo.totalAreas < warehouses.length + 1) { // +1 for spawn area
                    console.warn('⚠️ Preloading not complete. Expected:', warehouses.length + 1, 'Got:', preloadInfo.totalAreas);
                }
            }
            console.log('✅ Enabling dev buttons with', warehouses.length, 'warehouses available (Chapter 1)');
        }
        
        this.devButtonElements.forEach((buttonElement) => {
            // Check if button elements still exist (prevent errors after quit/restart)
            if (!buttonElement || !buttonElement.text || !buttonElement.background) {
                return;
            }
            
            // Enable the button
            buttonElement.enabled = true;
            
            // Update visual appearance
            buttonElement.background.setFillStyle(0x330000, 0.8);
            buttonElement.background.setStrokeStyle(2, 0xff0000, 0.8);
            
            // Update text (with null checks to prevent errors after quit/restart)
            if (buttonElement.text && buttonElement.text.active) {
                // Update button text based on chapter
                let buttonText = buttonElement.originalName;
                if (isChapter2 && buttonElement.index >= 0 && buttonElement.index < 3) {
                    buttonText = `Blackboard ${buttonElement.index + 1}`;
                } else if (isChapter3 && buttonElement.index >= 0 && buttonElement.index < 3) {
                    // Chapter 3: Radar towers and boss
                    if (buttonElement.index === 0) {
                        buttonText = 'Radar Tower 1';
                    } else if (buttonElement.index === 1) {
                        buttonText = 'Radar Tower 2';
                    } else if (buttonElement.index === 2) {
                        buttonText = 'Final Boss';
                    }
                } else if (buttonElement.index === -2) {
                    // Update skip button text based on current chapter
                    if (isChapter2) {
                        buttonText = 'Skip to Chapter 3';
                    } else if (isChapter3) {
                        buttonText = 'Victory Screen';
                    } else {
                        buttonText = 'Skip to Chapter 2';
                    }
                }
                buttonElement.text.setText(buttonText);
                buttonElement.text.setColor('#ffffff');
            }
            
            // Add hover effects
            buttonElement.background.on('pointerover', () => {
                if (buttonElement.enabled) {
                    buttonElement.background.setFillStyle(0x550000, 1.0);
                    buttonElement.background.setStrokeStyle(2, 0xff3333, 1.0);
                }
            });
            
            buttonElement.background.on('pointerout', () => {
                if (buttonElement.enabled) {
                    buttonElement.background.setFillStyle(0x330000, 0.8);
                    buttonElement.background.setStrokeStyle(2, 0xff0000, 0.8);
                }
            });
        });
        
        console.log('Dev buttons enabled and ready for use');
    }
    
    teleportToWarehouse(objectiveIndex) {
        if (!this.gameScene || !this.gameScene.player || !this.gameScene.tileSystem) {
            console.warn('Cannot teleport: Game components not available');
            return;
        }
        
        // Check which chapter is active
        const isChapter2 = this.gameScene && this.gameScene.scene.key === 'Chapter2Scene';
        const isChapter3 = this.gameScene && this.gameScene.scene.key === 'Chapter3Scene';
        
        let targetX, targetY;
        
        if (objectiveIndex === -1) {
            // Teleport to spawn position (all chapters)
            let spawnGrid;
            if (isChapter2) {
                spawnGrid = { x: 50, y: 450 }; // Chapter 2 spawn position
            } else if (isChapter3) {
                spawnGrid = { x: 37, y: 562 }; // Chapter 3 spawn position (same as Chapter 1)
            } else {
                spawnGrid = { x: 37, y: 562 }; // Chapter 1 spawn position
            }
            const worldPos = this.gameScene.tileSystem.getWorldPosition(spawnGrid.x, spawnGrid.y);
            targetX = worldPos.x;
            targetY = worldPos.y;
            console.log('Teleporting to spawn at grid:', spawnGrid, 'world:', worldPos);
        } else if (isChapter3) {
            // Chapter 3: Teleport to radar towers and final boss
            if (objectiveIndex === 0 || objectiveIndex === 1) {
                // Teleport to radar towers
                const radarTowers = this.gameScene.tileSystem.radarTowers;
                if (!radarTowers || radarTowers.length === 0) {
                    console.error('No radar towers found! Make sure the map is generated first.');
                    return;
                }
                
                if (objectiveIndex >= radarTowers.length) {
                    console.error('Invalid radar tower index:', objectiveIndex, 'Available towers:', radarTowers.length);
                    return;
                }
                
                // Get radar tower data
                const radarTower = radarTowers[objectiveIndex];
                console.log('Teleporting to radar tower:', radarTower);
                targetX = radarTower.worldX;
                targetY = radarTower.worldY;
                console.log('Radar tower position:', targetX, targetY);
            } else if (objectiveIndex === 2) {
                // Teleport to final boss (commanding colonel)
                if (!this.gameScene.commandingColonel) {
                    console.error('No commanding colonel found! Make sure the boss is created first.');
                    return;
                }
                
                console.log('Teleporting to commanding colonel (final boss):', this.gameScene.commandingColonel);
                targetX = this.gameScene.commandingColonel.x;
                targetY = this.gameScene.commandingColonel.y;
                console.log('Commanding colonel position:', targetX, targetY);
            } else {
                console.error('Invalid Chapter 3 objective index:', objectiveIndex);
                return;
            }
        } else if (isChapter2) {
            // Chapter 2: Teleport to blackboard houses
            const blackboardHouses = this.gameScene.blackboardHouses;
            if (!blackboardHouses || blackboardHouses.children.entries.length === 0) {
                console.error('No blackboard houses found! Make sure the map is generated first.');
                return;
            }
            
            if (objectiveIndex >= blackboardHouses.children.entries.length) {
                console.error('Invalid blackboard house index:', objectiveIndex, 'Available houses:', blackboardHouses.children.entries.length);
                return;
            }
            
            // Get blackboard house data
            const house = blackboardHouses.children.entries[objectiveIndex];
            console.log('Teleporting to blackboard house:', house);
            targetX = house.x;
            targetY = house.y;
            console.log('Blackboard house position:', targetX, targetY);
        } else {
            // Chapter 1: Teleport to warehouses (original behavior)
            const warehouses = this.gameScene.tileSystem.warehouses;
            console.log('Available warehouses:', warehouses);
            console.log('Warehouse count:', warehouses ? warehouses.length : 'warehouses is null/undefined');
            
            // Check if warehouses exist and are populated
            if (!warehouses || warehouses.length === 0) {
                console.error('No warehouses found! Make sure the map is generated first.');
                console.log('TileSystem state:', this.gameScene.tileSystem);
                return;
            }
            
            if (objectiveIndex >= warehouses.length) {
                console.error('Invalid warehouse index:', objectiveIndex, 'Available warehouses:', warehouses.length);
                return;
            }
            
            // Get warehouse data
            const warehouse = warehouses[objectiveIndex];
            console.log('Teleporting to warehouse:', warehouse);
            
            if (!warehouse || typeof warehouse.x === 'undefined' || typeof warehouse.y === 'undefined') {
                console.error('Invalid warehouse data:', warehouse);
                return;
            }
            
            const worldPos = this.gameScene.tileSystem.getWorldPosition(warehouse.x, warehouse.y);
            targetX = worldPos.x;
            targetY = worldPos.y;
            console.log('Warehouse grid:', warehouse.x, warehouse.y, 'world:', worldPos);
        }
        
        // ENHANCED TELEPORTATION with pre-rendered area verification
        
        // Verify the target area is pre-rendered (Chapter 1 and 3)
        const tileSystem = this.gameScene.tileSystem;
        if (!isChapter2 && tileSystem.getPreloadedAreaInfo) {
            const preloadInfo = tileSystem.getPreloadedAreaInfo();
            let targetAreaName;
            
            if (objectiveIndex === -1) {
                targetAreaName = 'spawn';
            } else if (isChapter3) {
                if (objectiveIndex === 0) {
                    targetAreaName = 'radar_tower_1';
                } else if (objectiveIndex === 1) {
                    targetAreaName = 'radar_tower_2';
                } else if (objectiveIndex === 2) {
                    targetAreaName = 'boss_command_center';
                }
            } else {
                targetAreaName = `warehouse_${objectiveIndex + 1}`;
            }
            
            console.log(`🎯 Teleporting to ${targetAreaName}. Preloaded areas:`, preloadInfo.totalAreas);
        }
        
        // Set player position
        this.gameScene.player.setPosition(targetX, targetY);
        
        // Center camera on player
        this.gameScene.cameras.main.centerOn(targetX, targetY);
        
        // Force update visible tiles around teleport location
        if (tileSystem.updateVisibleTiles) {
            tileSystem.updateVisibleTiles();
        }
        
        // Update tile system player position
        tileSystem.updatePlayerPosition(targetX, targetY);
        
        // Create teleportation effect
        this.createTeleportEffect(targetX, targetY);
        
        // Log success with chapter-appropriate message
        let successMessage;
        if (objectiveIndex === -1) {
            successMessage = `✅ Successfully teleported to spawn at (${targetX}, ${targetY})`;
        } else if (isChapter2) {
            successMessage = `✅ Successfully teleported to blackboard house ${objectiveIndex + 1} at (${targetX}, ${targetY})`;
        } else if (isChapter3) {
            if (objectiveIndex === 0) {
                successMessage = `✅ Successfully teleported to Radar Tower 1 at (${targetX}, ${targetY})`;
            } else if (objectiveIndex === 1) {
                successMessage = `✅ Successfully teleported to Radar Tower 2 at (${targetX}, ${targetY})`;
            } else if (objectiveIndex === 2) {
                successMessage = `✅ Successfully teleported to Final Boss (Commanding Colonel) at (${targetX}, ${targetY})`;
            }
        } else {
            successMessage = `✅ Successfully teleported to warehouse ${objectiveIndex + 1} at (${targetX}, ${targetY})`;
        }
        console.log(successMessage);
        
        // Show teleport feedback to user
        this.showTeleportFeedback(objectiveIndex, isChapter2, isChapter3);
    }

    skipToNextChapter() {
        // Determine current chapter and next chapter
        const isChapter2 = this.gameScene && this.gameScene.scene.key === 'Chapter2Scene';
        const isChapter3 = this.gameScene && this.gameScene.scene.key === 'Chapter3Scene';
        
        if (isChapter3) {
            console.log('🚀 DEV: Launching Victory Screen...');
            
            // Mark Chapter 3 as completed
            this.game.chapterManager.completeChapter(3);
            this.game.chapterManager.saveProgress();
            
            // Launch the dedicated Victory Scene
            this.scene.start('VictoryScene');
            
            console.log('🎉 Game completed! Victory Scene launched.');
        } else if (isChapter2) {
            console.log('🚀 DEV: Skipping to Chapter 3...');
            
            // Mark Chapter 2 as completed
            this.game.chapterManager.completeChapter(2);
            this.game.chapterManager.saveProgress();
            
            // Start Chapter 3 directly
            const success = this.game.chapterManager.startChapter(3);
            
            if (success) {
                console.log('✅ Successfully skipped to Chapter 3');
                this.showMessage('DEV: Skipped to Chapter 3!', '#00ff00');
            } else {
                console.error('❌ Failed to skip to Chapter 3');
                this.showMessage('Failed to skip to Chapter 3!', '#ff0000');
            }
        } else {
            // Default behavior for Chapter 1 - skip to Chapter 2
            console.log('🚀 DEV: Skipping to Chapter 2...');
            
            // Mark Chapter 1 as completed
            this.game.chapterManager.completeChapter(1);
            this.game.chapterManager.saveProgress();
            
            // Start Chapter 2 directly
            const success = this.game.chapterManager.startChapter(2);
            
            if (success) {
                console.log('✅ Successfully skipped to Chapter 2');
                this.showMessage('DEV: Skipped to Chapter 2!', '#00ff00');
            } else {
                console.error('❌ Failed to skip to Chapter 2');
                this.showMessage('Failed to skip to Chapter 2!', '#ff0000');
            }
        }
    }

    skipToChapter2() {
        // Keep the old method for compatibility, redirect to new method
        this.skipToNextChapter();
    }

    updateCornerMinimapWithPlayerTracking() {
        if (!this.cornerMinimapTexture || !this.gameScene || !this.gameScene.tileSystem) return;
        
        try {
            const tileSystem = this.gameScene.tileSystem;
            const player = this.gameScene.player;
            
            // Update player position in tile system for real-time tracking
            if (player && player.active && typeof player.x === 'number' && typeof player.y === 'number') {
                tileSystem.updatePlayerPosition(player.x, player.y);
            }
            
            const explorationData = tileSystem.getExplorationData();
            if (!explorationData.playerGrid) return;
            
            const mapSize = this.cornerMinimapTexture.width;
            const scale = mapSize / Math.max(tileSystem.mapWidth, tileSystem.mapHeight);
            
            // Clear and redraw
            this.cornerMinimapTexture.clear();
            const graphics = this.add.graphics();
            
            // Draw background terrain
            graphics.fillStyle(0x002200, 0.6);
            graphics.fillRect(0, 0, mapSize, mapSize);
            
            // Draw explored areas (like fullscreen map)
            graphics.fillStyle(0x004400, 0.4);
            for (const tileKey of explorationData.exploredTiles) {
                const [x, y] = tileKey.split(',').map(Number);
                if (x % 8 === 0 && y % 8 === 0) { // Sample for performance
                    const minimapX = (x - tileSystem.mapWidth / 2) * scale;
                    const minimapY = (y - tileSystem.mapHeight / 2) * scale;
                    const screenX = mapSize/2 + minimapX;
                    const screenY = mapSize/2 + minimapY;
                    
                    graphics.fillRect(screenX - 0.5, screenY - 0.5, 1, 1);
                }
            }
            
            // Draw paths efficiently (sample every 8th tile for corner minimap)
            graphics.fillStyle(0x8B4513, 0.9);
            for (let x = 0; x < tileSystem.mapWidth; x += 8) {
                for (let y = 0; y < tileSystem.mapHeight; y += 8) {
                    if (tileSystem.tiles[x] && tileSystem.tiles[x][y] === 'dirt_road_straight') {
                        const minimapX = (x - tileSystem.mapWidth / 2) * scale;
                        const minimapY = (y - tileSystem.mapHeight / 2) * scale;
                        const screenX = mapSize/2 + minimapX;
                        const screenY = mapSize/2 + minimapY;
                        
                        graphics.fillRect(screenX - 0.5, screenY - 0.5, 1, 1);
                    }
                }
            }
            
            // Draw objectives - smaller for corner map
            graphics.fillStyle(0xffff00, 1.0);
            explorationData.warehouses.forEach(warehouse => {
                if (!warehouse.destroyed) {
                    const minimapX = (warehouse.x - tileSystem.mapWidth / 2) * scale;
                    const minimapY = (warehouse.y - tileSystem.mapHeight / 2) * scale;
                    graphics.fillRect(mapSize/2 + minimapX - 1, mapSize/2 + minimapY - 1, 2, 2);
                }
            });
            
            graphics.fillStyle(0x00ffff, 1.0);
            explorationData.puzzleBoards.forEach(puzzle => {
                if (!puzzle.solved) {
                    const minimapX = (puzzle.x - tileSystem.mapWidth / 2) * scale;
                    const minimapY = (puzzle.y - tileSystem.mapHeight / 2) * scale;
                    graphics.fillCircle(mapSize/2 + minimapX, mapSize/2 + minimapY, 1);
                }
            });
            
            this.cornerMinimapTexture.draw(graphics, 0, 0);
            graphics.destroy();
            
            // Update player dot position with real-time tracking
            if (this.cornerPlayerDot && this.cornerPlayerDot.active) {
                const playerMinimapX = (explorationData.playerGrid.x - tileSystem.mapWidth / 2) * scale;
                const playerMinimapY = (explorationData.playerGrid.y - tileSystem.mapHeight / 2) * scale;
                this.cornerPlayerDot.setPosition(playerMinimapX, playerMinimapY);
            }
            
        } catch (error) {
            console.warn('Corner minimap update error:', error);
        }
    }
    
    // Keep the old method for compatibility
    updateCornerMinimap() {
        this.updateCornerMinimapWithPlayerTracking();
    }
    
    toggleMinimap() {
        this.minimapVisible = !this.minimapVisible;
        
        if (this.minimapVisible) {
            this.createFullscreenMinimap();
        } else {
            this.destroyFullscreenMinimap();
        }
    }
    
    createFullscreenMinimap() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const mapSize = Math.min(width, height) * 0.8;
        
        // Create fullscreen minimap overlay
        this.minimapFullscreen = this.add.container(width / 2, height / 2);
        this.minimapFullscreen.setScrollFactor(0);
        this.minimapFullscreen.setDepth(1000);
        
        // Dark overlay background
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
        this.minimapFullscreen.add(overlay);
        
        // Map background
        const mapBg = this.add.rectangle(0, 0, mapSize, mapSize, 0x001100, 0.9);
        mapBg.setStrokeStyle(3, 0x00ff00, 1.0);
        this.minimapFullscreen.add(mapBg);
        
        // Map title
        const title = this.add.text(0, -mapSize/2 - 30, 'TACTICAL MAP', {
            fontSize: '24px',
            fontFamily: 'VT323',
            color: '#00ff00'
        });
        title.setOrigin(0.5);
        this.minimapFullscreen.add(title);
        
        // Create render texture for map content
        this.fullscreenMapTexture = this.add.renderTexture(0, 0, mapSize - 6, mapSize - 6);
        this.fullscreenMapTexture.setOrigin(0.5);
        this.minimapFullscreen.add(this.fullscreenMapTexture);
        
        // Player dot
        this.fullscreenPlayerDot = this.add.circle(0, 0, 6, 0xff0000);
        this.minimapFullscreen.add(this.fullscreenPlayerDot);
        
        // Instructions
        const instructions = this.add.text(0, mapSize/2 + 40, 'Press M or Click to Close', {
            fontSize: '16px',
            fontFamily: 'VT323',
            color: '#ffffff'
        });
        instructions.setOrigin(0.5);
        this.minimapFullscreen.add(instructions);
        
        // Make clickable to close
        overlay.setInteractive();
        overlay.on('pointerdown', () => {
            this.toggleMinimap();
        });
        
        // Generate the map with current player position when opened
        this.updateFullscreenMinimapWithCurrentPosition();
    }
    
    destroyFullscreenMinimap() {
        if (this.minimapFullscreen) {
            this.minimapFullscreen.destroy();
            this.minimapFullscreen = null;
        }
        if (this.fullscreenMapTexture) {
            this.fullscreenMapTexture = null;
        }
        if (this.fullscreenPlayerDot) {
            this.fullscreenPlayerDot = null;
        }
    }
    
    updateFullscreenMinimap() {
        if (!this.fullscreenMapTexture || !this.gameScene || !this.gameScene.tileSystem) return;
        
        try {
            const tileSystem = this.gameScene.tileSystem;
            const explorationData = tileSystem.getExplorationData();
            if (!explorationData.playerGrid) return;
            
            const mapSize = this.fullscreenMapTexture.width;
            const scale = mapSize / Math.max(tileSystem.mapWidth, tileSystem.mapHeight);
            
            // Clear and redraw the entire map
            this.fullscreenMapTexture.clear();
            const graphics = this.add.graphics();
            
            // Draw terrain/forest (dark green)
            graphics.fillStyle(0x003300, 0.3);
            graphics.fillRect(0, 0, mapSize, mapSize);
            
            // Draw the exact map layout using actual tiles
            for (let x = 0; x < tileSystem.mapWidth; x += 4) { // Sample every 4th tile for performance
                for (let y = 0; y < tileSystem.mapHeight; y += 4) {
                    const minimapX = (x - tileSystem.mapWidth / 2) * scale;
                    const minimapY = (y - tileSystem.mapHeight / 2) * scale;
                    const screenX = mapSize/2 + minimapX;
                    const screenY = mapSize/2 + minimapY;
                    
                    // Check what's at this position
                    if (tileSystem.tiles[x] && tileSystem.tiles[x][y]) {
                        const tileType = tileSystem.tiles[x][y];
                        
                        if (tileType === 'dirt_road_straight') {
                            // Path - light brown
                            graphics.fillStyle(0x8B4513, 0.9);
                            graphics.fillRect(screenX - 1, screenY - 1, 2, 2);
                        }
                    }
                    
                    // Check decorations
                    if (tileSystem.decorationLayer[x] && tileSystem.decorationLayer[x][y]) {
                        const decoration = tileSystem.decorationLayer[x][y];
                        
                        if (decoration && decoration.includes('tree')) {
                            // Trees - dark green
                            graphics.fillStyle(0x004400, 0.8);
                            graphics.fillCircle(screenX, screenY, 1);
                        } else if (decoration === 'water') {
                            // Water - blue
                            graphics.fillStyle(0x0066ff, 0.9);
                            graphics.fillCircle(screenX, screenY, 1.5);
                        }
                    }
                }
            }
            
            // Draw objectives (always visible)
            // Warehouses - yellow squares
            graphics.fillStyle(0xffff00, 1.0);
            explorationData.warehouses.forEach(warehouse => {
                if (!warehouse.destroyed) {
                    const minimapX = (warehouse.x - tileSystem.mapWidth / 2) * scale;
                    const minimapY = (warehouse.y - tileSystem.mapHeight / 2) * scale;
                    graphics.fillRect(mapSize/2 + minimapX - 4, mapSize/2 + minimapY - 4, 8, 8);
                }
            });
            
            // Puzzle boards - cyan diamonds
            graphics.fillStyle(0x00ffff, 1.0);
            explorationData.puzzleBoards.forEach(puzzle => {
                if (!puzzle.solved) {
                    const minimapX = (puzzle.x - tileSystem.mapWidth / 2) * scale;
                    const minimapY = (puzzle.y - tileSystem.mapHeight / 2) * scale;
                    const centerX = mapSize/2 + minimapX;
                    const centerY = mapSize/2 + minimapY;
                    
                    // Draw diamond shape
                    graphics.fillTriangle(
                        centerX, centerY - 3,
                        centerX - 3, centerY,
                        centerX, centerY + 3
                    );
                    graphics.fillTriangle(
                        centerX, centerY - 3,
                        centerX + 3, centerY,
                        centerX, centerY + 3
                    );
                }
            });
            
            // Draw side quest areas as question marks
            graphics.fillStyle(0xffaa00, 0.8);
            if (tileSystem.sidePathAreas) {
                tileSystem.sidePathAreas.forEach(area => {
                    const minimapX = (area.centerX - tileSystem.mapWidth / 2) * scale;
                    const minimapY = (area.centerY - tileSystem.mapHeight / 2) * scale;
                    graphics.fillCircle(mapSize/2 + minimapX, mapSize/2 + minimapY, 3);
                });
            }
            
            // Draw the graphics to the render texture (with null check)
            if (this.fullscreenMapTexture && graphics) {
                this.fullscreenMapTexture.draw(graphics, 0, 0);
            }
            if (graphics) {
                graphics.destroy();
            }
            
            // Update player dot position
            const playerMinimapX = (explorationData.playerGrid.x - tileSystem.mapWidth / 2) * scale;
            const playerMinimapY = (explorationData.playerGrid.y - tileSystem.mapHeight / 2) * scale;
            this.fullscreenPlayerDot.setPosition(playerMinimapX, playerMinimapY);
            
        } catch (error) {
            console.warn('Fullscreen minimap update error:', error);
        }
    }

    // Performance optimized method - only updates when map is opened
    updateFullscreenMinimapWithCurrentPosition() {
        if (!this.fullscreenMapTexture || !this.gameScene || !this.gameScene.tileSystem || !this.gameScene.player) return;
        
        try {
            const tileSystem = this.gameScene.tileSystem;
            const player = this.gameScene.player;
            
            // Enhanced player validation
            if (!player || !player.active || typeof player.x !== 'number' || typeof player.y !== 'number') {
                console.warn('Player not ready for fullscreen minimap update');
                return;
            }
            
            // Update the player position in tile system to get current location
            tileSystem.updatePlayerPosition(player.x, player.y);
            
            // Now update the fullscreen minimap with the current position
            this.updateFullscreenMinimap();
            
        } catch (error) {
            console.warn('Fullscreen minimap position update error:', error);
        }
    }

    handlePause() {
        if (this.isPaused) {
            // Resume game
            this.gameScene.scene.resume();
            this.removePauseMenu();
            this.isPaused = false;
            console.log('Game resumed');
        } else {
            // Pause game
            this.gameScene.scene.pause();
            this.showPauseMenu();
            this.isPaused = true;
            console.log('Game paused');
        }
    }
    
    showPauseMenu() {
        // Create pause overlay with very high depth to ensure it's always on top
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        this.pauseOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
        this.pauseOverlay.setOrigin(0, 0);
        this.pauseOverlay.setScrollFactor(0);
        this.pauseOverlay.setDepth(100000); // Very high depth to be above everything
        
        this.pauseText = this.add.text(width / 2, height / 2, 'PAUSED\n\nPress ESC to Resume', {
            fontSize: '40px',
            fontFamily: 'VT323',
            color: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4
        });
        this.pauseText.setOrigin(0.5);
        this.pauseText.setScrollFactor(0);
        this.pauseText.setDepth(100001); // Even higher depth for text
        
        // Add a subtle pulsing effect
        this.tweens.add({
            targets: this.pauseText,
            alpha: 0.7,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    removePauseMenu() {
        if (this.pauseOverlay) {
            this.pauseOverlay.destroy();
            this.pauseOverlay = null;
        }
        
        if (this.pauseText) {
            this.tweens.killTweensOf(this.pauseText);
            this.pauseText.destroy();
            this.pauseText = null;
        }
    }
    
    destroy() {
        // Clean up timers and listeners
        if (this.worldReadyCheckTimer) {
            this.worldReadyCheckTimer.destroy();
            this.worldReadyCheckTimer = null;
        }
        
        this.events.off('updateHealth');
        this.events.off('updateScore');
        
        // Clean up death screen
        this.removeDeathScreen();
        
        // Clean up victory screen
        this.removeVictoryBanner();
        
        // Clean up next chapter button
        if (this.nextChapterButton) {
            this.nextChapterButton.destroy();
            this.nextChapterButton = null;
        }
        if (this.nextChapterText) {
            this.nextChapterText.destroy();
            this.nextChapterText = null;
        }
        
        // Clean up dev buttons
        if (this.devButtonElements) {
            this.devButtonElements.forEach(element => {
                if (element && element.destroy) {
                    element.destroy();
                }
            });
            this.devButtonElements = [];
        }
        
        if (this.devButtonsContainer) {
            this.devButtonsContainer.destroy();
            this.devButtonsContainer = null;
        }
        
        // Clean up minimap textures
        if (this.cornerMinimapTexture) {
            this.cornerMinimapTexture.destroy();
            this.cornerMinimapTexture = null;
        }
        
        if (this.minimapCachedBackground) {
            this.minimapCachedBackground.destroy();
            this.minimapCachedBackground = null;
        }
        
        console.log('UIScene destroyed and cleaned up');
    }

    setupGameSceneListeners() {
        if (!this.gameScene) {
            console.warn('No game scene available for event listeners');
            return;
        }

        // Listen for worldReady event to enable dev button functionality
        this.gameScene.events.on('worldReady', (data) => {
            console.log('🌍 World ready event received, enabling dev button functionality...');
            this.enableDevButtons();
        });
        
        // Listen for victory event
        this.gameScene.events.on('victoryAchieved', () => {
            console.log('🎉 Victory event received, marking chapter as completed...');
            
            // Mark chapter as completed in the chapter manager first
            this.game.chapterManager.completeChapter(this.game.chapterManager.currentChapter);
            this.game.chapterManager.saveProgress();
            
            console.log('✅ Chapter marked as completed, showing victory banner...');
            this.showVictoryBanner();
        });

        // Listen for chapter change events
        this.gameScene.events.on('chapterChanged', (data) => {
            console.log('📖 Chapter changed event received:', data);
            this.events.emit('chapterChanged', data);
        });

        console.log('Event listeners set up for:', this.gameScene.scene.key);
    }

    switchGameScene(newSceneKey) {
        // Clean up old event listeners
        if (this.gameScene) {
            this.gameScene.events.off('worldReady');
            this.gameScene.events.off('victoryAchieved');
            this.gameScene.events.off('chapterChanged');
        }

        // Get reference to new scene
        this.gameScene = this.scene.get(newSceneKey);
        
        if (this.gameScene) {
            console.log('UIScene switched to:', newSceneKey);
            // Set up event listeners for new scene
            this.setupGameSceneListeners();
        } else {
            console.error('Failed to switch to scene:', newSceneKey);
        }
    }
    
    updateMemoryDisplay() {
        if (!this.memoryText || !this.memoryText.visible) return;
        
        if (this.gameScene && this.gameScene.tileSystem) {
            const memStats = this.gameScene.tileSystem.getMemoryStats();
            const perfOptimizer = this.gameScene.performanceOptimizer;
            
            const displayText = [
                `🧠 MEMORY STATS`,
                `Sprites: ${memStats.currentSpriteCount} (Peak: ${memStats.peakSpriteCount})`,
                `Created: ${memStats.spritesCreated} | Destroyed: ${memStats.spritesDestroyed}`,
                `Efficiency: ${(memStats.memoryEfficiency * 100).toFixed(1)}%`,
                `FPS: ${perfOptimizer ? perfOptimizer.getFPS() : 'N/A'}`,
                `Performance: ${perfOptimizer ? perfOptimizer.getPerformanceLevel() : 'N/A'}`
            ].join('\n');
            
            this.memoryText.setText(displayText);
        }
    }
    
    toggleMemoryDisplay() {
        if (this.memoryText) {
            this.memoryText.setVisible(!this.memoryText.visible);
            
            if (this.memoryText.visible) {
                console.log('🧠 Memory display enabled (F3 to toggle)');
                this.updateMemoryDisplay(); // Immediate update when showing
            } else {
                console.log('🧠 Memory display disabled');
            }
        }
    }
    
    createTeleportEffect(x, y) {
        if (!this.gameScene) return;
        
        // Create a dramatic teleport effect at the destination
        const effect = this.gameScene.add.graphics();
        effect.lineStyle(4, 0x00ffff, 1);
        effect.strokeCircle(0, 0, 10);
        effect.lineStyle(2, 0xffffff, 0.8);
        effect.strokeCircle(0, 0, 20);
        effect.x = x;
        effect.y = y;
        effect.setDepth(2000);
        
        // Animated expansion effect
        this.gameScene.tweens.add({
            targets: effect,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                effect.destroy();
            }
        });
        
        // Particle effect
        const particles = this.gameScene.add.particles(x, y, 'bullet', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.4, end: 0 },
            tint: [0x00ffff, 0x0088ff, 0xffffff],
            lifespan: 400,
            quantity: 8
        });
        
        this.gameScene.time.delayedCall(400, () => {
            particles.destroy();
        });
    }
    
    showTeleportFeedback(objectiveIndex, isChapter2 = false, isChapter3 = false) {
        let locationName;
        let color = '#00ffff'; // Default cyan for Chapter 1
        
        if (objectiveIndex === -1) {
            locationName = 'SPAWN AREA';
        } else if (isChapter2) {
            locationName = `BLACKBOARD HOUSE ${objectiveIndex + 1}`;
            color = '#ffff00'; // Yellow for Chapter 2
        } else if (isChapter3) {
            if (objectiveIndex === 0) {
                locationName = 'RADAR TOWER 1';
            } else if (objectiveIndex === 1) {
                locationName = 'RADAR TOWER 2';
            } else if (objectiveIndex === 2) {
                locationName = 'FINAL BOSS';
            }
            color = '#ff0000'; // Red for Chapter 3
        } else {
            locationName = `WAREHOUSE ${objectiveIndex + 1}`;
        }
        
        // Create feedback text
        const feedbackText = this.add.text(
            this.cameras.main.width / 2, 
            this.cameras.main.height / 2 - 100, 
            `🚀 TELEPORTED TO ${locationName}`, 
            {
                fontSize: '24px',
                fontFamily: 'VT323',
                color: color,
                stroke: '#000000',
                strokeThickness: 3,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 3,
                    fill: true
                }
            }
        );
        feedbackText.setOrigin(0.5);
        feedbackText.setScrollFactor(0);
        feedbackText.setDepth(2000);
        
        // Animate the feedback
        feedbackText.setAlpha(0);
        feedbackText.setScale(0.5);
        
        this.tweens.add({
            targets: feedbackText,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Hold for a moment, then fade out
                this.time.delayedCall(1500, () => {
                    this.tweens.add({
                        targets: feedbackText,
                        alpha: 0,
                        y: feedbackText.y - 50,
                        duration: 500,
                        ease: 'Power2.easeIn',
                        onComplete: () => {
                            feedbackText.destroy();
                        }
                    });
                });
            }
        });
        
        // Also log preload info for debugging
        if (this.gameScene.tileSystem.getPreloadedAreaInfo) {
            const info = this.gameScene.tileSystem.getPreloadedAreaInfo();
            console.log('📊 Preloaded area stats:', info);
        }
    }
    
    showWorldNotReadyWarning() {
        // Create a warning message for the user
        const warningText = this.add.text(
            this.cameras.main.width / 2, 
            this.cameras.main.height / 2, 
            '⚠️ WORLD NOT READY\nPlease wait for map generation to complete...', 
            {
                fontSize: '20px',
                fontFamily: 'VT323',
                color: '#ffaa00',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center',
                backgroundColor: '#000000',
                padding: { x: 20, y: 15 }
            }
        );
        warningText.setOrigin(0.5);
        warningText.setScrollFactor(0);
        warningText.setDepth(2000);
        
        // Animate the warning
        warningText.setAlpha(0);
        warningText.setScale(0.5);
        
        this.tweens.add({
            targets: warningText,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Auto-remove after 3 seconds
                this.time.delayedCall(3000, () => {
                    this.tweens.add({
                        targets: warningText,
                        alpha: 0,
                        scaleX: 0.5,
                        scaleY: 0.5,
                        duration: 300,
                        ease: 'Back.easeIn',
                        onComplete: () => {
                            warningText.destroy();
                        }
                    });
                });
            }
        });
    }
    
    updateButtonsToErrorState() {
        if (!this.devButtonElements) return;
        
        this.devButtonElements.forEach((buttonElement) => {
            // Check if button elements still exist (prevent errors after quit/restart)
            if (!buttonElement || !buttonElement.text || !buttonElement.background) {
                return;
            }
            
            // Update visual appearance to error state
            buttonElement.background.setFillStyle(0x440000, 0.8);
            buttonElement.background.setStrokeStyle(2, 0xff4444, 0.8);
            
            // Update text to show error
            if (buttonElement.text.active) {
                buttonElement.text.setText(buttonElement.originalName + ' (ERROR)');
                buttonElement.text.setColor('#ff4444');
            }
            
            buttonElement.enabled = false;
        });
        
        console.log('🔴 Dev buttons set to error state');
    }
    
    // Add a method to check world readiness status
    isWorldReady() {
        if (!this.gameScene || !this.gameScene.tileSystem) {
            return false;
        }
        
        // Check which chapter is active
        const isChapter2 = this.gameScene && this.gameScene.scene.key === 'Chapter2Scene';
        const isChapter3 = this.gameScene && this.gameScene.scene.key === 'Chapter3Scene';
        
        if (isChapter2) {
            // For Chapter 2, check blackboard houses
            const blackboardHouses = this.gameScene.blackboardHouses;
            return blackboardHouses && blackboardHouses.children.entries.length > 0;
        } else if (isChapter3) {
            // For Chapter 3, check radar towers, boss warehouse, and preloading
            const radarTowers = this.gameScene.tileSystem.radarTowers;
            const warehouses = this.gameScene.tileSystem.warehouses; // Boss warehouse
            const commandingColonel = this.gameScene.commandingColonel;
            
            if (!radarTowers || radarTowers.length === 0 || !warehouses || warehouses.length === 0 || !commandingColonel) {
                return false;
            }
            
            // Check if preloading is complete
            const tileSystem = this.gameScene.tileSystem;
            if (tileSystem.getPreloadedAreaInfo) {
                const preloadInfo = tileSystem.getPreloadedAreaInfo();
                const expectedAreas = radarTowers.length + warehouses.length + 1; // +1 for spawn area
                return preloadInfo.totalAreas >= expectedAreas;
            }
        } else {
            // For Chapter 1, check warehouses and preloading
            const warehouses = this.gameScene.tileSystem.warehouses;
            if (!warehouses || warehouses.length === 0) {
                return false;
            }
            
            // Check if preloading is complete
            const tileSystem = this.gameScene.tileSystem;
            if (tileSystem.getPreloadedAreaInfo) {
                const preloadInfo = tileSystem.getPreloadedAreaInfo();
                return preloadInfo.totalAreas >= warehouses.length + 1; // +1 for spawn area
            }
        }
        
        return true;
    }
    
    checkWorldReadiness() {
        // Periodic check to enable dev buttons if world becomes ready
        if (!this.devButtonElements) return;
        
        // Check if any buttons are still disabled
        const hasDisabledButtons = this.devButtonElements.some(btn => !btn.enabled);
        if (!hasDisabledButtons) {
            // All buttons already enabled, stop checking
            if (this.worldReadyCheckTimer) {
                this.worldReadyCheckTimer.destroy();
                this.worldReadyCheckTimer = null;
                console.log('🔄 World readiness check timer stopped - all buttons enabled');
            }
            return;
        }
        
        // Check if world is ready now
        if (this.isWorldReady()) {
            console.log('🔄 World readiness detected via periodic check - enabling buttons');
            this.enableDevButtons();
            
            // Stop the timer
            if (this.worldReadyCheckTimer) {
                this.worldReadyCheckTimer.destroy();
                this.worldReadyCheckTimer = null;
            }
        }
    }
} 
