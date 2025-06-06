import { TileSystem } from '../systems/TileSystem.js';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // Create loading bar
        this.createLoadingBar();
        
        // Load tile assets using TileSystem
        this.tileSystem = new TileSystem(this);
        this.tileSystem.preloadAssets();
        
        // Load player animation assets
        this.loadPlayerAssets();
        
        // Load enemy animation assets
        this.loadEnemyAssets();
        
        // Load new environment assets
        this.loadNewEnvironmentAssets();
        
        // Create placeholder graphics for entities
        this.createPlaceholderAssets();
    }

    createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Progress bar background
        const progressBg = this.add.rectangle(width / 2, height / 2, 400, 20, 0x444444);
        progressBg.setStrokeStyle(2, 0xffffff);
        
        // Progress bar fill
        const progressBar = this.add.rectangle(width / 2 - 198, height / 2, 4, 16, 0x00ff00);
        
        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Update progress bar
        this.load.on('progress', (value) => {
            progressBar.width = 396 * value;
        });
        
        this.load.on('complete', () => {
            loadingText.setText('Press SPACE to Start');
        });
    }

    loadPlayerAssets() {
        // Load Chapter 1 player animation frames for all 4 directions
        // Up direction
        this.load.image('player_up_1', 'assets/chapter1-main/up-1.png');
        this.load.image('player_up_2', 'assets/chapter1-main/up-2.png');
        this.load.image('player_up_3', 'assets/chapter1-main/up-3.png');
        this.load.image('player_up_4', 'assets/chapter1-main/up-4.png');
        
        // Down direction
        this.load.image('player_down_1', 'assets/chapter1-main/down-1.png');
        this.load.image('player_down_2', 'assets/chapter1-main/down-2.png');
        this.load.image('player_down_3', 'assets/chapter1-main/down-3.png');
        this.load.image('player_down_4', 'assets/chapter1-main/down-4.png');
        
        // Left direction
        this.load.image('player_left_1', 'assets/chapter1-main/left-1.png');
        this.load.image('player_left_2', 'assets/chapter1-main/left-2.png');
        this.load.image('player_left_3', 'assets/chapter1-main/left-3.png');
        this.load.image('player_left_4', 'assets/chapter1-main/left-4.png');
        
        // Right direction
        this.load.image('player_right_1', 'assets/chapter1-main/right-1.png');
        this.load.image('player_right_2', 'assets/chapter1-main/right-2.png');
        this.load.image('player_right_3', 'assets/chapter1-main/right-3.png');
        this.load.image('player_right_4', 'assets/chapter1-main/right-4.png');

        // Load Chapter 2 player assets (Sister Sáu Nhung)
        // Up direction
        this.load.image('player_ch2_up_1', 'assets/chapter2-main/up-1.png');
        this.load.image('player_ch2_up_2', 'assets/chapter2-main/up-2.png');
        this.load.image('player_ch2_up_3', 'assets/chapter2-main/up-3.png');
        this.load.image('player_ch2_up_4', 'assets/chapter2-main/up-4.png');
        
        // Down direction
        this.load.image('player_ch2_down_1', 'assets/chapter2-main/down-1.png');
        this.load.image('player_ch2_down_2', 'assets/chapter2-main/down-2.png');
        this.load.image('player_ch2_down_3', 'assets/chapter2-main/down-3.png');
        this.load.image('player_ch2_down_4', 'assets/chapter2-main/down-4.png');
        
        // Left direction
        this.load.image('player_ch2_left_1', 'assets/chapter2-main/left-1.png');
        this.load.image('player_ch2_left_2', 'assets/chapter2-main/left-2.png');
        this.load.image('player_ch2_left_3', 'assets/chapter2-main/left-3.png');
        this.load.image('player_ch2_left_4', 'assets/chapter2-main/left-4.png');
        
        // Right direction
        this.load.image('player_ch2_right_1', 'assets/chapter2-main/right-1.png');
        this.load.image('player_ch2_right_2', 'assets/chapter2-main/right-2.png');
        this.load.image('player_ch2_right_3', 'assets/chapter2-main/right-3.png');
        this.load.image('player_ch2_right_4', 'assets/chapter2-main/right-4.png');

        // Load Chapter 3 player assets
        // Up direction
        this.load.image('player_ch3_up_1', 'assets/chapter3-main/up-1.png');
        this.load.image('player_ch3_up_2', 'assets/chapter3-main/up-2.png');
        this.load.image('player_ch3_up_3', 'assets/chapter3-main/up-3.png');
        this.load.image('player_ch3_up_4', 'assets/chapter3-main/up-4.png');
        
        // Down direction
        this.load.image('player_ch3_down_1', 'assets/chapter3-main/down-1.png');
        this.load.image('player_ch3_down_2', 'assets/chapter3-main/down-2.png');
        this.load.image('player_ch3_down_3', 'assets/chapter3-main/down-3.png');
        this.load.image('player_ch3_down_4', 'assets/chapter3-main/down-4.png');
        
        // Left direction
        this.load.image('player_ch3_left_1', 'assets/chapter3-main/left-1.png');
        this.load.image('player_ch3_left_2', 'assets/chapter3-main/left-2.png');
        this.load.image('player_ch3_left_3', 'assets/chapter3-main/left-3.png');
        this.load.image('player_ch3_left_4', 'assets/chapter3-main/left-4.png');
        
        // Right direction
        this.load.image('player_ch3_right_1', 'assets/chapter3-main/right-1.png');
        this.load.image('player_ch3_right_2', 'assets/chapter3-main/right-2.png');
        this.load.image('player_ch3_right_3', 'assets/chapter3-main/right-3.png');
        this.load.image('player_ch3_right_4', 'assets/chapter3-main/right-4.png');
    }

    loadEnemyAssets() {
        // Load enemy animation frames for all 4 directions
        // Up direction
        this.load.image('enemy_up_1', 'assets/enemy/up-1.png');
        this.load.image('enemy_up_2', 'assets/enemy/up-2.png');
        this.load.image('enemy_up_3', 'assets/enemy/up-3.png');
        this.load.image('enemy_up_4', 'assets/enemy/up-4.png');
        
        // Down direction
        this.load.image('enemy_down_1', 'assets/enemy/down-1.png');
        this.load.image('enemy_down_2', 'assets/enemy/down-2.png');
        this.load.image('enemy_down_3', 'assets/enemy/down-3.png');
        this.load.image('enemy_down_4', 'assets/enemy/down-4.png');
        
        // Left direction
        this.load.image('enemy_left_1', 'assets/enemy/left-1.png');
        this.load.image('enemy_left_2', 'assets/enemy/left-2.png');
        this.load.image('enemy_left_3', 'assets/enemy/left-3.png');
        this.load.image('enemy_left_4', 'assets/enemy/left-4.png');
        
        // Right direction
        this.load.image('enemy_right_1', 'assets/enemy/right-1.png');
        this.load.image('enemy_right_2', 'assets/enemy/right-2.png');
        this.load.image('enemy_right_3', 'assets/enemy/right-3.png');
        this.load.image('enemy_right_4', 'assets/enemy/right-4.png');
    }

    loadNewEnvironmentAssets() {
        // Load new house assets for random placement
        this.load.image('house-1', 'assets/environment/house-1.png');
        this.load.image('house-2', 'assets/environment/house-2.png');
        
        // Load new warehouse assets
        this.load.image('warehouse-1', 'assets/environment/warehouse-1.png');
        this.load.image('warehouse-2', 'assets/environment/warehouse-2.png');
        this.load.image('exploded-warehouse', 'assets/environment/exploded-warehouse.png');
        
        // Load new bullet asset
        this.load.image('bullet', 'assets/environment/bullet.png');
        
        console.log('New environment assets loaded');
    }

    createPlaceholderAssets() {
        // Bullet texture is now loaded as an actual asset in loadNewEnvironmentAssets()
        // Enemy sprites are now loaded as actual assets in loadEnemyAssets()
        // No need to create placeholder textures
        
        console.log('Placeholder assets created successfully');
    }

    create() {
        // Wait for space key to start game
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('MainMenuScene');
        });
    }
} 