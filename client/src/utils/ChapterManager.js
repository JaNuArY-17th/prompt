export class ChapterManager {
    constructor(game) {
        this.game = game;
        this.currentChapter = 1;
        this.chapterData = new Map();
        this.playerProgress = {
            unlockedChapters: [1, 2, 3], // DEV: All chapters unlocked for development
            completedChapters: [],
            playerStats: {
                health: 100,
                maxHealth: 100,
                damage: 20,
                speed: 4
            }
        };
    }

    // Initialize chapter configurations
    initializeChapters() {
        // Chapter 1 Configuration
        this.chapterData.set(1, {
            name: "CHAPTER 1",
            sceneKey: "GameScene",
            description: "Destroy the enemy rice warehouses",
            objectives: {
                main: { description: "Destroy 3 rice warehouses", total: 3 },
                side: [
                    { description: "Kill enemies", total: 45 }
                ]
            },
            mapConfig: {
                width: 600,
                height: 600,
                theme: "rural_village"
            }
        });

        // Chapter 2 Configuration
        this.chapterData.set(2, {
            name: "CHAPTER 2 - THE ILLITERACY ENEMY",
            sceneKey: "Chapter2Scene", 
            description: "Sister Sáu Nhung's literacy mission",
            objectives: {
                main: { description: "Complete 3 blackboard puzzles", total: 3 },
                side: [
                    { description: "Kill enemies", total: 30 }
                ]
            },
            mapConfig: {
                width: 500,
                height: 500,
                theme: "village_night"
            }
        });

        // Chapter 3 Configuration
        this.chapterData.set(3, {
            name: "CHAPTER 3 - THE FINAL ASSAULT",
            sceneKey: "Chapter3Scene",
            description: "Destroy 2 heavily guarded radar towers, destroy the boss command center, and eliminate the Commanding Colonel",
            objectives: {
                main: { description: "Destroy 2 radar towers and boss command center", total: 3 },
                side: [
                    { description: "Eliminate the Commanding Colonel", total: 1 },
                    { description: "Kill enemies", total: 200 }
                ]
            },
            mapConfig: {
                width: 600,
                height: 600,
                theme: "village_jungle_mix"
            }
        });
    }

    // Get current chapter data
    getCurrentChapterData() {
        return this.chapterData.get(this.currentChapter);
    }

    // Check if chapter is unlocked
    isChapterUnlocked(chapterNumber) {
        return this.playerProgress.unlockedChapters.includes(chapterNumber);
    }

    // Complete current chapter and unlock next
    completeChapter(chapterNumber) {
        if (!this.playerProgress.completedChapters.includes(chapterNumber)) {
            this.playerProgress.completedChapters.push(chapterNumber);
            
            // Unlock next chapter
            const nextChapter = chapterNumber + 1;
            if (this.chapterData.has(nextChapter) && !this.isChapterUnlocked(nextChapter)) {
                this.playerProgress.unlockedChapters.push(nextChapter);
                console.log(`🎉 Chapter ${nextChapter} unlocked!`);
            }
        }
    }

    // Start specific chapter
    startChapter(chapterNumber) {
        // DEV: Check if this is a dev skip (bypass unlock check for development)
        const isDevSkip = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (!this.isChapterUnlocked(chapterNumber) && !isDevSkip) {
            console.warn(`Chapter ${chapterNumber} is not unlocked yet!`);
            return false;
        }
        
        // DEV: Force unlock chapter if dev skip
        if (isDevSkip && !this.isChapterUnlocked(chapterNumber)) {
            console.log(`🔧 DEV: Force unlocking Chapter ${chapterNumber}`);
            this.playerProgress.unlockedChapters.push(chapterNumber);
        }

        const chapterData = this.chapterData.get(chapterNumber);
        if (!chapterData) {
            console.error(`Chapter ${chapterNumber} data not found!`);
            return false;
        }

        this.currentChapter = chapterNumber;
        
        // Update game state
        this.game.gameState.currentChapter = chapterNumber;
        
        // Stop current scene if running
        if (this.game.scene.isActive('GameScene')) {
            this.game.scene.stop('GameScene');
        }
        if (this.game.scene.isActive('Chapter1Scene')) {
            this.game.scene.stop('Chapter1Scene');
        }
        if (this.game.scene.isActive('Chapter2Scene')) {
            this.game.scene.stop('Chapter2Scene');
        }
        if (this.game.scene.isActive('Chapter3Scene')) {
            this.game.scene.stop('Chapter3Scene');
        }

        // Start the new chapter scene
        this.game.scene.start(chapterData.sceneKey);
        
        // Update UIScene to connect to the new chapter scene
        this.updateUISceneConnection(chapterData.sceneKey);
        
        console.log(`🚀 Starting ${chapterData.name}: ${chapterData.description}`);
        return true;
    }

    // Get next available chapter
    getNextChapter() {
        const nextChapter = this.currentChapter + 1;
        if (this.chapterData.has(nextChapter)) {
            return {
                number: nextChapter,
                data: this.chapterData.get(nextChapter),
                unlocked: this.isChapterUnlocked(nextChapter)
            };
        }
        return null;
    }

    // Save progress (you can extend this to use localStorage)
    saveProgress() {
        const saveData = {
            currentChapter: this.currentChapter,
            playerProgress: this.playerProgress,
            timestamp: Date.now()
        };
        
        localStorage.setItem('gameProgress', JSON.stringify(saveData));
        console.log('📱 Progress saved!');
    }

    // Load progress
    loadProgress() {
        try {
            const saveData = localStorage.getItem('gameProgress');
            if (saveData) {
                const parsed = JSON.parse(saveData);
                this.currentChapter = parsed.currentChapter || 1;
                this.playerProgress = { ...this.playerProgress, ...parsed.playerProgress };
                console.log('📱 Progress loaded!');
                return true;
            }
        } catch (error) {
            console.warn('Failed to load progress:', error);
        }
        return false;
    }

    // Update UIScene to connect to the current chapter scene
    updateUISceneConnection(sceneKey) {
        // Wait a bit for the new scene to initialize
        setTimeout(() => {
            const uiScene = this.game.scene.getScene('UIScene');
            if (uiScene && uiScene.switchGameScene) {
                uiScene.switchGameScene(sceneKey);
                console.log(`🔗 UIScene connected to ${sceneKey}`);
            } else {
                console.warn('⚠️ Could not connect UIScene to new chapter scene');
            }
        }, 200);
    }
} 