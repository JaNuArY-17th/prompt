export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Title
        this.add.text(width / 2, height / 3, 'MỆNH LỆNH ĐỘC LẬP', {
            fontSize: '48px',
            fontFamily: 'VT323',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, height / 3 + 60, 'Cuộc Phiêu Lưu Chiến Đấu', {
            fontSize: '18px',
            fontFamily: 'VT323',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        // Menu options
        const startButton = this.add.text(width / 2, height / 2 + 50, 'BẮT ĐẦU GAME', {
            fontSize: '24px',
            fontFamily: 'VT323',
            color: '#00ff00'
        }).setOrigin(0.5);

        const controlsButton = this.add.text(width / 2, height / 2 + 100, 'ĐIỀU KHIỂN', {
            fontSize: '24px',
            fontFamily: 'VT323',
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
        this.add.text(width / 2, height - 50, 'Click BẮT ĐẦU GAME hoặc nhấn ENTER để bắt đầu', {
            fontSize: '14px',
            fontFamily: 'VT323',
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
            'ĐIỀU KHIỂN',
            '',
            'WASD - Di chuyển',
            'Click trái - Bắn',
            'E - Tấn công cận chiến / Tương tác',
            'R - Nạp đạn',
            'ESC - Tạm dừng',
            '',
            'Chiến đấu & Học tập!',
            'Tìm bảng đen ở Chương 2',
            'để học từ vựng tiếng Việt!',
            '',
            'Click bất kỳ đâu để đóng'
        ];

        const text = this.add.text(width / 2, height / 2, controlsText.join('\n'), {
            fontSize: '20px',
            fontFamily: 'VT323',
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