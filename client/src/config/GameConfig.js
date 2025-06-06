export const GameConfig = {
    type: Phaser.AUTO,
    width: 1280,
    height: 960,
    parent: 'game-container',
    backgroundColor: '#1a1a1a',
    
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0 }, // Top-down view, no gravity
            debug: false, // Set to true for development
            enableSleeping: false,
            runner: {
                isFixed: true,
                delta: 1000 / 60 // 60 FPS
            }
        },
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    
    render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true
    },
    
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: 1000,
            height: 750
        },
        max: {
            width: 1920,
            height: 1080
        }
    },
    
    dom: {
        createContainer: true
    }
}; 