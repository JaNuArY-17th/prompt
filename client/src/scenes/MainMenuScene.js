export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Title
        this.add.text(width / 2, height / 3, '2.5D ACTION SHOOTER', {
            fontSize: '48px',
            fontFamily: 'Courier New',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, height / 3 + 60, 'Isometric Combat Adventure', {
            fontSize: '18px',
            fontFamily: 'Courier New',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        // Menu options
        const startButton = this.add.text(width / 2, height / 2 + 50, 'START GAME', {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#00ff00'
        }).setOrigin(0.5);

        const controlsButton = this.add.text(width / 2, height / 2 + 100, 'CONTROLS', {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Make buttons interactive
        startButton.setInteractive({ useHandCursor: true });
        controlsButton.setInteractive({ useHandCursor: true });

        // Button hover effects
        startButton.on('pointerover', () => {
            startButton.setColor('#ffffff');
        });
        
        startButton.on('pointerout', () => {
            startButton.setColor('#00ff00');
        });

        startButton.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        controlsButton.on('pointerover', () => {
            controlsButton.setColor('#00ff00');
        });
        
        controlsButton.on('pointerout', () => {
            controlsButton.setColor('#ffffff');
        });

        controlsButton.on('pointerdown', () => {
            this.showControls();
        });

        // Instructions
        this.add.text(width / 2, height - 50, 'Click START GAME or press ENTER to begin', {
            fontSize: '14px',
            fontFamily: 'Courier New',
            color: '#666666'
        }).setOrigin(0.5);

        // Keyboard input
        this.input.keyboard.on('keydown-ENTER', () => {
            this.scene.start('GameScene');
        });
    }

    showControls() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Create controls overlay
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
        overlay.setOrigin(0, 0);
        overlay.setInteractive();

        const controlsText = [
            'CONTROLS',
            '',
            'WASD - Move',
            'Left Click - Shoot',
            'E - Melee Attack / Interact',
            'R - Reload',
            'ESC - Pause',
            '',
            'Combat & Learning!',
            'Find blackboards in Chapter 2',
            'for Vietnamese puzzle lessons!',
            '',
            'Click anywhere to close'
        ];

        const text = this.add.text(width / 2, height / 2, controlsText.join('\n'), {
            fontSize: '20px',
            fontFamily: 'Courier New',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Close controls on click
        overlay.on('pointerdown', () => {
            overlay.destroy();
            text.destroy();
        });
    }
} 