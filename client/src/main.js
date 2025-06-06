import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { Chapter2Scene } from './scenes/Chapter2Scene.js';
import { Chapter3Scene } from './scenes/Chapter3Scene.js';
import { UIScene } from './scenes/UIScene.js';
import { BlackboardPuzzleScene } from './scenes/BlackboardPuzzleScene.js';
import { ChapterManager } from './utils/ChapterManager.js';


class Game extends Phaser.Game {
    constructor() {
        const config = {
            ...GameConfig,
            scene: [PreloadScene, MainMenuScene, GameScene, Chapter2Scene, Chapter3Scene, UIScene, BlackboardPuzzleScene]
        };
        
        super(config);
        
        // Global game state
        this.gameState = {
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

        // Initialize Chapter Manager
        this.chapterManager = new ChapterManager(this);
        this.chapterManager.initializeChapters();
        this.chapterManager.loadProgress(); // Load saved progress if any
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
