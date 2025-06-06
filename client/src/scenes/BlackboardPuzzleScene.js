export class BlackboardPuzzleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BlackboardPuzzleScene' });
        
        // Vietnamese cultural-historical words
        this.targetWords = [
            'ĐỘC LẬP',    // Independence  
            'HỌC TẬP',    // Learning
            'TỰ DO',      // Freedom
            'ĐOÀN KẾT',   // Unity
            'THỐNG NHẤT', // Unification
            'CÁCH MẠNG',  // Revolution
            'YÊU NƯỚC',   // Patriotism
            'CÔNG BẰNG',  // Justice
            'HOÀ BÌNH',   // Peace
            'TIẾN BỘ'     // Progress
        ];
        
        this.currentWord = '';
        this.targetWord = '';
        this.formedWord = '';
        this.scrambledLetters = [];
        this.letterButtons = [];
        this.gameTime = 45; // 45 seconds for word arrangement
        this.score = 0;
        this.wordsCompleted = 0;
        this.minWordsToWin = 2; // Need to complete 2 words to succeed
        this.currentLetterIndex = 0; // Track which letter we need next
        
        // Scene data from Chapter 2
        this.returnScene = 'MainMenuScene';
        this.houseId = '';
    }

    create(data) {
        // Get scene data
        if (data) {
            this.returnScene = data.returnScene || 'MainMenuScene';
            this.houseId = data.houseId || '';
        }
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Create blackboard background
        this.add.rectangle(0, 0, width, height, 0x1a1a1a).setOrigin(0, 0);
        
        // Add blackboard frame
        this.add.rectangle(50, 50, width - 100, height - 100, 0x2a2a2a)
            .setOrigin(0, 0)
            .setStrokeStyle(8, 0x8B4513);

        // Title
        this.add.text(width / 2, 80, 'VIETNAMESE BLACKBOARD PUZZLE', {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Instructions
        this.add.text(width / 2, 120, `Click letters in order to form ${this.minWordsToWin} Vietnamese words!`, {
            fontSize: '16px',
            fontFamily: 'Courier New',
            color: '#cccccc'
        }).setOrigin(0.5);

        // UI Elements
        this.timeText = this.add.text(80, 160, `Time: ${this.gameTime}`, {
            fontSize: '18px',
            fontFamily: 'Courier New',
            color: '#00ff00'
        });

        this.scoreText = this.add.text(80, 190, `Score: ${this.score}`, {
            fontSize: '18px',
            fontFamily: 'Courier New',
            color: '#00ff00'
        });

        this.wordsText = this.add.text(80, 220, `Words: ${this.wordsCompleted}`, {
            fontSize: '18px',
            fontFamily: 'Courier New',
            color: '#00ff00'
        });

        // Target word display
        this.targetWordText = this.add.text(width / 2, 180, '', {
            fontSize: '20px',
            fontFamily: 'Courier New',
            color: '#ffff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Current formed word display
        this.formedWordText = this.add.text(width / 2, 220, '', {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Game area for letter arrangement
        this.gameArea = {
            left: 100,
            right: width - 100,
            top: 280,
            bottom: height - 150
        };

        // Letter containers
        this.scrambledContainer = this.add.container(0, 0);
        this.formedContainer = this.add.container(0, 0);
        
        // Add labels for the areas
        this.add.text(width / 2, 260, 'Available Letters:', {
            fontSize: '18px',
            fontFamily: 'Courier New',
            color: '#ffff00'
        }).setOrigin(0.5);
        
        this.add.text(width / 2, height - 120, 'Your Word:', {
            fontSize: '18px',
            fontFamily: 'Courier New',
            color: '#00ff00'
        }).setOrigin(0.5);

        // Back button
        const backButton = this.add.text(width - 100, 80, 'BACK', {
            fontSize: '16px',
            fontFamily: 'Courier New',
            color: '#ff6666'
        }).setOrigin(0.5);

        backButton.setInteractive({ useHandCursor: true });
        backButton.on('pointerdown', () => {
            this.exitPuzzle(false);
        });

        // Start the game
        this.startNewWord();
        this.startTimer();
    }

    update(time, delta) {
        // No continuous updates needed for letter arrangement puzzle
        // All interaction is event-based through clicking
    }

    startNewWord() {
        this.targetWord = Phaser.Utils.Array.GetRandom(this.targetWords);
        this.formedWord = '';
        this.currentLetterIndex = 0;
        
        // Create initial formed word display with underscores
        const targetLetters = this.targetWord.split('');
        let initialFormed = '';
        for (let i = 0; i < targetLetters.length; i++) {
            if (targetLetters[i] === ' ') {
                initialFormed += ' ';
            } else {
                initialFormed += '_';
            }
        }
        this.formedWord = initialFormed;
        
        this.targetWordText.setText(`Target: ${this.targetWord}`);
        this.formedWordText.setText(`Formed: ${this.formedWord}`);
        
        this.createScrambledLetters();
    }

    createScrambledLetters() {
        // Clear existing letters
        this.clearLetters();
        
        // Get letters from target word (including spaces)
        const letters = this.targetWord.split('');
        
        // Create array of letters with their correct positions
        this.scrambledLetters = letters.map((letter, index) => ({
            letter: letter,
            correctIndex: index,
            isSpace: letter === ' '
        })).filter(item => !item.isSpace); // Remove spaces from clickable letters
        
        // Shuffle the letters
        Phaser.Utils.Array.Shuffle(this.scrambledLetters);
        
        // Create visual letter buttons
        const width = this.cameras.main.width;
        const startX = (width - (this.scrambledLetters.length * 60)) / 2;
        const y = this.gameArea.top + 50;
        
        this.scrambledLetters.forEach((letterData, index) => {
            const x = startX + (index * 60);
            
            const letterButton = this.add.text(x, y, letterData.letter, {
                fontSize: '28px',
                fontFamily: 'Courier New',
                color: '#ffffff',
                backgroundColor: '#444444',
                padding: { x: 12, y: 8 }
            }).setOrigin(0.5);
            
            letterButton.setInteractive({ useHandCursor: true });
            letterButton.letterData = letterData;
            letterButton.originalX = x;
            letterButton.originalY = y;
            letterButton.used = false;
            
            letterButton.on('pointerover', () => {
                if (!letterButton.used) {
                    letterButton.setBackgroundColor('#666666');
                }
            });
            
            letterButton.on('pointerout', () => {
                if (!letterButton.used) {
                    letterButton.setBackgroundColor('#444444');
                }
            });
            
            letterButton.on('pointerdown', () => this.onLetterClick(letterButton));
            
            this.letterButtons.push(letterButton);
            this.scrambledContainer.add(letterButton);
        });
    }

    onLetterClick(letterButton) {
        if (letterButton.used) return;

        // Check if this is the next correct letter in sequence
        const expectedIndex = this.currentLetterIndex;
        const targetLetters = this.targetWord.replace(/\s/g, '').split('');
        const expectedLetter = targetLetters[expectedIndex];

        if (letterButton.letterData.letter === expectedLetter) {
            // Correct letter!
            letterButton.used = true;
            letterButton.setBackgroundColor('#00aa00');
            letterButton.setColor('#ffffff');
            
            // Move letter to formed word area
            const width = this.cameras.main.width;
            const formedY = this.cameras.main.height - 80;
            const letterSpacing = 35;
            const startX = (width - (targetLetters.length * letterSpacing)) / 2;
            const targetX = startX + (this.currentLetterIndex * letterSpacing);
            
            // Animate letter to its position in the formed word
            this.tweens.add({
                targets: letterButton,
                x: targetX,
                y: formedY,
                duration: 300,
                ease: 'Power2'
            });
            
            // Update formed word with spaces
            this.updateFormedWord();
            this.currentLetterIndex++;
            this.score += 10;
            this.updateUI();

            // Check if word is complete
            if (this.currentLetterIndex >= targetLetters.length) {
                this.time.delayedCall(500, () => {
                    this.completeWord();
                });
            }
        } else {
            // Wrong letter - flash red
            const originalColor = letterButton.style.backgroundColor;
            letterButton.setBackgroundColor('#aa0000');
            this.score = Math.max(0, this.score - 5);
            this.updateUI();
            
            // Flash effect
            this.time.delayedCall(300, () => {
                if (!letterButton.used) {
                    letterButton.setBackgroundColor(originalColor);
                }
            });
        }
    }
    
    updateFormedWord() {
        // Reconstruct the formed word with spaces
        const targetLetters = this.targetWord.split('');
        let formed = '';
        let letterIndex = 0;
        
        for (let i = 0; i < targetLetters.length; i++) {
            if (targetLetters[i] === ' ') {
                formed += ' ';
            } else {
                if (letterIndex < this.currentLetterIndex) {
                    formed += targetLetters[i];
                } else {
                    formed += '_';
                }
                letterIndex++;
            }
        }
        
        this.formedWord = formed;
        this.formedWordText.setText(`Formed: ${this.formedWord}`);
    }
    
    clearLetters() {
        // Clear existing letter buttons
        this.letterButtons.forEach(button => button.destroy());
        this.letterButtons = [];
        this.scrambledContainer.removeAll();
        this.formedContainer.removeAll();
    }

    completeWord() {
        this.wordsCompleted++;
        this.score += 50; // Bonus for completing word
        
        // Show completion effect
        this.cameras.main.flash(200, 0, 255, 0);
        
        // Add completion text
        const width = this.cameras.main.width;
        const completionText = this.add.text(width / 2, this.cameras.main.height / 2, '✅ WORD COMPLETE!', {
            fontSize: '32px',
            fontFamily: 'Courier New',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Fade out completion text
        this.tweens.add({
            targets: completionText,
            alpha: 0,
            duration: 1500,
            onComplete: () => completionText.destroy()
        });
        
        this.updateUI();
        
        // Check if puzzle is complete
        if (this.wordsCompleted >= this.minWordsToWin) {
            this.time.delayedCall(1500, () => {
                this.endGame();
            });
        } else {
            // Start new word after delay
            this.time.delayedCall(1500, () => {
                this.startNewWord();
            });
        }
    }

    startTimer() {
        this.gameTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.gameTime--;
                this.updateUI();
                
                if (this.gameTime <= 0) {
                    this.endGame();
                }
            },
            loop: true
        });
    }

    updateUI() {
        this.timeText.setText(`Time: ${this.gameTime}`);
        this.scoreText.setText(`Score: ${this.score}`);
        this.wordsText.setText(`Words: ${this.wordsCompleted}`);
        this.formedWordText.setText(`Formed: ${this.formedWord}`);
    }

    endGame() {
        this.gameTimer.destroy();
        
        // Clear all letter buttons
        this.clearLetters();

        // Check if player succeeded
        const success = this.wordsCompleted >= this.minWordsToWin;

        // Show game over screen
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
        overlay.setOrigin(0, 0);

        if (success) {
            this.add.text(width / 2, height / 2 - 80, 'LESSON COMPLETE!', {
                fontSize: '48px',
                fontFamily: 'Courier New',
                color: '#00ff00',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            this.add.text(width / 2, height / 2 - 20, 'Sister Sáu Nhung is proud of your learning!', {
                fontSize: '18px',
                fontFamily: 'Courier New',
                color: '#ffffff'
            }).setOrigin(0.5);
        } else {
            this.add.text(width / 2, height / 2 - 80, 'LESSON INCOMPLETE', {
                fontSize: '48px',
                fontFamily: 'Courier New',
                color: '#ff6666',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            this.add.text(width / 2, height / 2 - 20, `Need ${this.minWordsToWin} words, completed ${this.wordsCompleted}`, {
                fontSize: '18px',
                fontFamily: 'Courier New',
                color: '#ffffff'
            }).setOrigin(0.5);
        }

        this.add.text(width / 2, height / 2 + 20, `Words Completed: ${this.wordsCompleted}`, {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#ffffff'
        }).setOrigin(0.5);

        const continueButton = this.add.text(width / 2, height / 2 + 80, success ? 'CONTINUE' : 'TRY AGAIN', {
            fontSize: '20px',
            fontFamily: 'Courier New',
            color: '#00ff00'
        }).setOrigin(0.5);

        const exitButton = this.add.text(width / 2, height / 2 + 120, 'EXIT LESSON', {
            fontSize: '20px',
            fontFamily: 'Courier New',
            color: '#ffffff'
        }).setOrigin(0.5);

        continueButton.setInteractive({ useHandCursor: true });
        exitButton.setInteractive({ useHandCursor: true });

        continueButton.on('pointerdown', () => {
            if (success) {
                this.exitPuzzle(true);
            } else {
                this.scene.restart();
            }
        });

        exitButton.on('pointerdown', () => {
            this.exitPuzzle(false);
        });
    }
    
    exitPuzzle(success) {
        // Clear any remaining timers
        if (this.gameTimer) {
            this.gameTimer.destroy();
        }
        
        // Emit completion event to the return scene
        if (this.returnScene === 'Chapter2Scene') {
            const chapter2Scene = this.scene.get('Chapter2Scene');
            if (chapter2Scene) {
                chapter2Scene.events.emit('blackboardPuzzleCompleted', { 
                    success: success,
                    wordsCompleted: this.wordsCompleted,
                    score: this.score,
                    houseId: this.houseId
                });
            }
        }
        
        // Stop this scene and return to the calling scene
        this.scene.stop();
    }
} 