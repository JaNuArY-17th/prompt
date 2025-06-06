export class InputSystem {
    constructor(scene) {
        this.scene = scene;
        
        // Create cursor keys
        this.cursors = scene.input.keyboard.createCursorKeys();
        
        // Create WASD keys
        this.keys = {
            W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            E: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            R: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
        };
        
        // Mouse input
        this.pointer = scene.input.activePointer;
        
        // Setup input events
        this.setupInputEvents();
        
        console.log('InputSystem initialized');
    }

    setupInputEvents() {
        // Mouse click for shooting
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) {
                this.handleShooting(pointer);
            }
        });
        
        // E key for melee attack
        this.keys.E.on('down', () => {
            this.handleMelee();
        });
        
        // R key for reload
        this.keys.R.on('down', () => {
            this.handleReload();
        });
    }

    update() {
        // Input is handled through events, but we can add continuous checks here if needed
        // Movement is handled directly in the Player class
    }

    handleShooting(pointer) {
        if (!this.scene.player || this.scene.player.health <= 0) {
            return;
        }
        
        // Use shooting system from scene if available, otherwise use player's shooting
        if (this.scene.shoot && typeof this.scene.shoot === 'function') {
            this.scene.shoot(pointer.worldX, pointer.worldY);
        } else if (this.scene.player.handleShooting) {
            this.scene.player.handleShooting(pointer.worldX, pointer.worldY);
        } else {
            console.warn('No shooting method available in scene or player');
        }
    }

    handleMelee() {
        if (!this.scene.player || this.scene.player.health <= 0) {
            return;
        }
        
        // Have player handle the melee attack
        this.scene.player.handleMelee();
    }
    
    handleReload() {
        if (!this.scene.player || this.scene.player.health <= 0) {
            return;
        }
        
        // Use reload system from scene if available, otherwise use player's reload
        if (this.scene.startReload && typeof this.scene.startReload === 'function') {
            this.scene.startReload();
        } else if (this.scene.player.startReload) {
            this.scene.player.startReload();
        } else {
            console.warn('No reload method available in scene or player');
        }
    }

    destroy() {
        // Clean up input events
        this.scene.input.off('pointerdown');
        this.scene.input.off('pointermove');
        
        this.keys.E.off('down');
        this.keys.R.off('down');
    }
} 