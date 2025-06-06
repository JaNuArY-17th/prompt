export class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VictoryScene' });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Dark background with subtle animation
        this.cameras.main.setBackgroundColor('#000000');
        
        // Create animated background stars
        this.createStarField();
        
        // Main victory title with glow effect
        const victoryTitle = this.add.text(width / 2, height / 4, 'CHIẾN THẮNG!', {
            fontSize: '72px',
            fontFamily: 'VT323',
            color: '#00ff00',
            stroke: '#003300',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Add glow effect to title
        victoryTitle.setShadow(0, 0, '#00ff00', 10, true, true);

        // Subtitle in Vietnamese
        const subtitle = this.add.text(width / 2, height / 4 + 80, 'Nhiệm vụ hoàn thành xuất sắc!', {
            fontSize: '32px',
            fontFamily: 'VT323',
            color: '#ffff00'
        }).setOrigin(0.5);

        // Mission accomplished text
        const missionText = this.add.text(width / 2, height / 2 - 20, 'MỆNH LỆNH ĐỘC LẬP\nĐÃ ĐƯỢC THỰC HIỆN THÀNH CÔNG', {
            fontSize: '28px',
            fontFamily: 'VT323',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Victory stats or flavor text
        const statsText = this.add.text(width / 2, height / 2 + 60, [
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '  Tất cả khu vực đã được giải phóng',
            '  Các trạm radar đã bị phá hủy',
            '  Chỉ huy địch đã bị tiêu diệt',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        ].join('\n'), {
            fontSize: '20px',
            fontFamily: 'VT323',
            color: '#00ffff',
            align: 'center'
        }).setOrigin(0.5);

        // Return to menu button
        const menuButton = this.add.text(width / 2, height - 150, 'QUAY VỀ MENU CHÍNH', {
            fontSize: '24px',
            fontFamily: 'VT323',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // New game button
        const newGameButton = this.add.text(width / 2, height - 100, 'CHƠI LẠI TỪ ĐẦU', {
            fontSize: '24px',
            fontFamily: 'VT323',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // Make buttons interactive
        menuButton.setInteractive({ useHandCursor: true });
        newGameButton.setInteractive({ useHandCursor: true });

        // Button hover effects
        menuButton.on('pointerover', () => {
            menuButton.setBackgroundColor('#00ff00');
            menuButton.setColor('#000000');
        });
        
        menuButton.on('pointerout', () => {
            menuButton.setBackgroundColor('#333333');
            menuButton.setColor('#ffffff');
        });

        newGameButton.on('pointerover', () => {
            newGameButton.setBackgroundColor('#ffff00');
            newGameButton.setColor('#000000');
        });
        
        newGameButton.on('pointerout', () => {
            newGameButton.setBackgroundColor('#333333');
            newGameButton.setColor('#ffffff');
        });

        // Button click handlers
        menuButton.on('pointerdown', () => {
            console.log('🖱️ Menu button clicked');
            this.returnToMenu();
        });

        newGameButton.on('pointerdown', () => {
            console.log('🖱️ New game button clicked');
            this.startNewGame();
        });

        // Keyboard controls
        this.input.keyboard.on('keydown-ESC', () => {
            this.returnToMenu();
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            this.startNewGame();
        });

        // Create victory animation effects
        this.createVictoryEffects();

        // Instructions
        this.add.text(width / 2, height - 30, 'ESC: Menu chính • ENTER: Chơi lại', {
            fontSize: '16px',
            fontFamily: 'VT323',
            color: '#888888'
        }).setOrigin(0.5);

        console.log('🎉 Victory Scene created successfully!');
    }

    createStarField() {
        // Create animated star background
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        for (let i = 0; i < 100; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                Phaser.Math.Between(1, 3),
                0xffffff,
                Phaser.Math.FloatBetween(0.3, 0.8)
            );

            // Add twinkling animation
            this.tweens.add({
                targets: star,
                alpha: 0.1,
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000)
            });
        }
    }

    createVictoryEffects() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Create falling particles effect
        const emitter = this.add.particles(width / 2, -50, 'pixel', {
            x: { min: -100, max: 100 },
            y: { min: -50, max: 0 },
            speedY: { min: 50, max: 150 },
            scale: { min: 0.5, max: 2 },
            tint: [0x00ff00, 0xffff00, 0xff9900, 0x00ffff],
            alpha: { start: 1, end: 0 },
            lifespan: 4000,
            frequency: 100
        });

        // If no 'pixel' texture exists, create simple rectangles as particles
        if (!this.textures.exists('pixel')) {
            // Create multiple colored rectangles for particle effect
            for (let i = 0; i < 50; i++) {
                const colors = [0x00ff00, 0xffff00, 0xff9900, 0x00ffff];
                const particle = this.add.rectangle(
                    Phaser.Math.Between(width / 4, 3 * width / 4),
                    Phaser.Math.Between(-100, -50),
                    4, 4,
                    Phaser.Utils.Array.GetRandom(colors)
                );

                this.tweens.add({
                    targets: particle,
                    y: height + 50,
                    alpha: 0,
                    duration: Phaser.Math.Between(3000, 6000),
                    delay: Phaser.Math.Between(0, 3000),
                    onComplete: () => {
                        particle.destroy();
                    }
                });
            }
        }
    }

    returnToMenu() {
        console.log('🏠 Returning to main menu...');
        
        // Stop all running scenes except MainMenuScene
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.stop('Chapter2Scene');
        this.scene.stop('Chapter3Scene');
        this.scene.stop('BlackboardPuzzleScene');
        
        // Start MainMenuScene
        this.scene.start('MainMenuScene');
        
        // Use a small delay before stopping this scene to ensure MainMenuScene starts properly
        this.time.delayedCall(100, () => {
            this.scene.stop('VictoryScene');
        });
    }

    startNewGame() {
        console.log('🎮 Starting new game...');
        
        // Reset game progress if ChapterManager exists
        if (this.game.chapterManager) {
            this.game.chapterManager.resetProgress();
        }

        // Reset game state
        this.game.gameState = {
            currentChapter: 1,
            playerHealth: 100,
            playerMaxHealth: 100,
            score: 0,
            weapons: {
                current: 'pistol',
                ammo: {
                    pistol: 30,
                    rifle: 120,
                    shotgun: 20
                }
            }
        };

        // Stop all running scenes
        this.scene.stop('UIScene');
        this.scene.stop('MainMenuScene');
        this.scene.stop('Chapter2Scene');
        this.scene.stop('Chapter3Scene');
        this.scene.stop('BlackboardPuzzleScene');
        
        // Start Chapter 1 with UI Scene
        this.scene.start('GameScene');
        this.scene.start('UIScene');
        
        // Use a small delay before stopping this scene to ensure new scenes start properly
        this.time.delayedCall(100, () => {
            this.scene.stop('VictoryScene');
        });
    }
} 