import Phaser from 'phaser';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.gameScene = null;
    this.playButton = null;
    this.currentLevel = 1;
    this.currentScore = 0;
    this.highScore = 0;
    this.scoreText = null;
    this.levelText = null;
    this.highScoreText = null;
    this.leftRotateBtn = null;
    this.rightRotateBtn = null;
    this.ballsText = null;
  }

  create() {
    console.log('UIScene.create() called');
    
    // Destroy all children to clear previous UI
    this.children.removeAll(true);
    this.levelText = null;
    this.scoreText = null;
    this.highScoreText = null;
    this.playButton = null;
    
    // Wait a bit for GameScene to initialize, then create UI
    this.time.delayedCall(200, () => {
      this.initializeUI();
    });
  }

  initializeUI() {
    console.log('=== Initializing UI ===');
    
    const gameScene = this.scene.get('GameScene');
    console.log('GameScene reference:', gameScene?.sys?.key);
    console.log('GameScene active?', gameScene?.sys?.isActive());
    
    if (!gameScene || !gameScene.sys.isActive()) {
      console.log('GameScene not active, retrying in 100ms...');
      this.time.delayedCall(100, () => this.initializeUI());
      return;
    }

    this.gameScene = gameScene;
    this.currentLevel = this.gameScene.currentLevel;
    this.currentScore = this.gameScene.score;

    console.log('UIScene initializing with level:', this.currentLevel, 'score:', this.currentScore);

    // First, clear ALL existing children (both main UI and overlays)
    console.log('Clearing', this.children.list.length, 'children');
    this.children.removeAll(true);
    this.levelText = null;
    this.scoreText = null;
    this.highScoreText = null;
    this.playButton = null;

    // Load high score from localStorage
    this.highScore = parseInt(localStorage.getItem('gravityBoxHighScore') || '0', 10);

    // Display score, level, and high score with enhanced styling
    console.log('Creating UI elements...');
    this.levelText = this.add.text(20, 15, `🎮 Level: ${this.currentLevel}`, {
      fontSize: '22px',
      fill: '#667eea',
      fontStyle: 'bold',
      fontFamily: 'Fredoka'
    });
    console.log('✅ Level text created');

    this.scoreText = this.add.text(400, 15, `⭐ Score: ${this.currentScore}`, {
      fontSize: '22px',
      fill: '#667eea',
      fontStyle: 'bold',
      fontFamily: 'Fredoka'
    }).setOrigin(0.5, 0);
    console.log('✅ Score text created');

    this.highScoreText = this.add.text(780, 15, `🏆 High: ${this.highScore}`, {
      fontSize: '22px',
      fill: '#764ba2',
      fontStyle: 'bold',
      fontFamily: 'Fredoka'
    }).setOrigin(1, 0);
    console.log('✅ High score text created');

    // Display balls remaining
    this.ballsText = this.add.text(400, 50, `🔴 Balls: ${this.gameScene?.ballsRemaining || 3}`, {
      fontSize: '20px',
      fill: '#e74c3c',
      fontStyle: 'bold',
      fontFamily: 'Fredoka'
    }).setOrigin(0.5, 0).setStroke('#c0392b', 2);

    console.log('✅ Balls text created');

    // Move buttons below the game area (y=620, below 600px game box)
    this.playButton = this.add.text(400, 620, '▶ PLAY', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#27ae60',
      padding: { x: 24, y: 12 },
      fontFamily: 'Fredoka',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(1000);
    this.playButton.on('pointerover', () => this.playButton.setScale(1.05).setStyle({ backgroundColor: '#229954' }));
    this.playButton.on('pointerout', () => this.playButton.setScale(1).setStyle({ backgroundColor: '#27ae60' }));
    console.log('✅ Play button created at y=620');

    this.playButton.on('pointerdown', () => {
      console.log('Play button clicked!');
      this.events.emit('startGame');
      this.playButton.destroy();
    });

    // On-screen rotate buttons below game area (useful for touch)
    this.leftRotateBtn = this.add.text(200, 620, '⬅ ROTATE', {
      fontSize: '18px',
      fill: '#fff',
      backgroundColor: '#3498db',
      padding: { x: 14, y: 10 },
      fontFamily: 'Fredoka',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(1000);
    this.leftRotateBtn.on('pointerover', () => this.leftRotateBtn.setScale(1.05).setStyle({ backgroundColor: '#2980b9' }));
    this.leftRotateBtn.on('pointerout', () => this.leftRotateBtn.setScale(1).setStyle({ backgroundColor: '#3498db' }));

    this.rightRotateBtn = this.add.text(600, 620, 'ROTATE ➜', {
      fontSize: '18px',
      fill: '#fff',
      backgroundColor: '#3498db',
      padding: { x: 14, y: 10 },
      fontFamily: 'Fredoka',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(1000);
    this.rightRotateBtn.on('pointerover', () => this.rightRotateBtn.setScale(1.05).setStyle({ backgroundColor: '#2980b9' }));
    this.rightRotateBtn.on('pointerout', () => this.rightRotateBtn.setScale(1).setStyle({ backgroundColor: '#3498db' }));

    // Emit rotate events to GameScene so it can toggle rotation flags
    this.leftRotateBtn.on('pointerdown', () => {
      console.log('Left rotate button down');
      if (this.gameScene) {
        this.gameScene.rotateLeftActive = true;
        this.gameScene.events.emit('rotateLeftStart');
      }
    });
    this.leftRotateBtn.on('pointerup', () => {
      if (this.gameScene) {
        this.gameScene.rotateLeftActive = false;
        this.gameScene.events.emit('rotateLeftStop');
      }
    });
    this.leftRotateBtn.on('pointerout', () => {
      if (this.gameScene) {
        this.gameScene.rotateLeftActive = false;
        this.gameScene.events.emit('rotateLeftStop');
      }
    });

    this.rightRotateBtn.on('pointerdown', () => {
      console.log('Right rotate button down');
      if (this.gameScene) {
        this.gameScene.rotateRightActive = true;
        this.gameScene.events.emit('rotateRightStart');
      }
    });
    this.rightRotateBtn.on('pointerup', () => {
      if (this.gameScene) {
        this.gameScene.rotateRightActive = false;
        this.gameScene.events.emit('rotateRightStop');
      }
    });
    this.rightRotateBtn.on('pointerout', () => {
      if (this.gameScene) {
        this.gameScene.rotateRightActive = false;
        this.gameScene.events.emit('rotateRightStop');
      }
    });

    // Remove any old listeners first
    this.gameScene.events.off('levelComplete', this.showWinUI, this);
    this.gameScene.events.off('levelFailed', this.showFailUI, this);

    // Listen for level complete, failed, and ball lost
    this.gameScene.events.on('levelComplete', this.showWinUI, this);
    this.gameScene.events.on('levelFailed', this.showFailUI, this);
    this.gameScene.events.on('ballLost', this.onBallLost, this);
    
    console.log('=== UIScene setup complete ===');
  }

  onBallLost(data) {
    console.log('Ball lost - balls remaining:', data.ballsRemaining);
    if (this.ballsText) {
      this.ballsText.setText(`🔴 Balls: ${data.ballsRemaining}`);
    }
    
    // Show restart UI immediately when a ball is lost
    const { width } = this.cameras.main;
    
    this.add.text(width / 2, 150, '❌ Ball Lost!', {
      fontSize: '44px',
      fill: '#e74c3c',
      fontStyle: 'bold',
      fontFamily: 'Fredoka'
    }).setOrigin(0.5).setDepth(999).setStroke('#c0392b', 3);

    const restartBtn = this.add.text(width / 2 - 110, 250, '🔄 Retry', {
      fontSize: '26px',
      fill: '#fff',
      backgroundColor: '#e74c3c',
      padding: { x: 20, y: 12 },
      fontFamily: 'Fredoka',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(999);
    restartBtn.on('pointerover', () => restartBtn.setScale(1.05).setStyle({ backgroundColor: '#c0392b' }));
    restartBtn.on('pointerout', () => restartBtn.setScale(1).setStyle({ backgroundColor: '#e74c3c' }));

    const menuBtn = this.add.text(width / 2 + 110, 250, '🏠 Menu', {
      fontSize: '26px',
      fill: '#fff',
      backgroundColor: '#3498db',
      padding: { x: 20, y: 12 },
      fontFamily: 'Fredoka',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(999);
    menuBtn.on('pointerover', () => menuBtn.setScale(1.05).setStyle({ backgroundColor: '#2980b9' }));
    menuBtn.on('pointerout', () => menuBtn.setScale(1).setStyle({ backgroundColor: '#3498db' }));

    restartBtn.on('pointerdown', () => {
      console.log('Retry clicked after ball loss');
      this.restartLevel();
      restartBtn.destroy();
      menuBtn.destroy();
    });

    menuBtn.on('pointerdown', () => {
      console.log('Main Menu clicked after ball loss');
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('MainMenuScene');
    });
  }

  showWinUI(data) {
    console.log('showWinUI called with data:', data);
    const { width, height } = this.cameras.main;
    this.currentLevel = data.level;
    this.currentScore = data.score;

    console.log('Updated currentLevel to:', this.currentLevel, 'currentScore to:', this.currentScore);

    // Update high score if needed
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
      localStorage.setItem('gravityBoxHighScore', this.highScore.toString());
      if (this.highScoreText) {
        this.highScoreText.setText(`🏆 High: ${this.highScore}`);
      }
    }

    // Update score display
    if (this.scoreText) {
      this.scoreText.setText(`⭐ Score: ${this.currentScore}`);
    }

    // Win message with enhanced styling
    this.add.text(width / 2, 150, '🎉 LEVEL COMPLETE!', {
      fontSize: '48px',
      fill: '#27ae60',
      fontStyle: 'bold',
      fontFamily: 'Fredoka'
    }).setOrigin(0.5).setDepth(999).setStroke('#1e8449', 3);

    // Points earned
    this.add.text(width / 2, 220, `+${100 * this.currentLevel} Points!`, {
      fontSize: '32px',
      fill: '#f39c12',
      fontStyle: 'bold',
      fontFamily: 'Fredoka'
    }).setOrigin(0.5).setDepth(999);

    // Next Level button
    const nextButton = this.add.text(width / 2 - 110, 310, '⛭️ NEXT LEVEL', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#27ae60',
      padding: { x: 20, y: 12 },
      fontFamily: 'Fredoka',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(999);
    nextButton.on('pointerover', () => nextButton.setScale(1.05).setStyle({ backgroundColor: '#229954' }));
    nextButton.on('pointerout', () => nextButton.setScale(1).setStyle({ backgroundColor: '#27ae60' }));

    nextButton.on('pointerdown', () => {
      console.log('Next Level button pointerdown event fired');
      this.nextLevel();
    });

    // Restart button
    const restartButton = this.add.text(width / 2 + 110, 310, '🔄 RESTART', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#3498db',
      padding: { x: 20, y: 12 },
      fontFamily: 'Fredoka',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(999);
    restartButton.on('pointerover', () => restartButton.setScale(1.05).setStyle({ backgroundColor: '#2980b9' }));
    restartButton.on('pointerout', () => restartButton.setScale(1).setStyle({ backgroundColor: '#3498db' }));

    restartButton.on('pointerdown', () => {
      console.log('Restart button pointerdown event fired');
      this.restartLevel();
    });
  }

  showFailUI(data) {
    console.log('showFailUI called with data:', data);
    const { width, height } = this.cameras.main;
    this.currentLevel = data.level;
    this.currentScore = data.score || 0;

    // Failure message
    this.add.text(width / 2, 150, '☠️ GAME OVER', {
      fontSize: '48px',
      fill: '#e74c3c',
      fontStyle: 'bold',
      fontFamily: 'Fredoka'
    }).setOrigin(0.5).setDepth(999).setStroke('#c0392b', 3);

    // Final score display
    this.add.text(width / 2, 220, `Final Score: ${this.currentScore}`, {
      fontSize: '28px',
      fill: '#555',
      fontFamily: 'Fredoka'
    }).setOrigin(0.5).setDepth(999);

    // Retry button
    const retryButton = this.add.text(width / 2 - 110, 280, '🔄 TRY AGAIN', {
      fontSize: '26px',
      fill: '#fff',
      backgroundColor: '#3498db',
      padding: { x: 20, y: 12 },
      fontFamily: 'Fredoka',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(999);
    retryButton.on('pointerover', () => retryButton.setScale(1.05).setStyle({ backgroundColor: '#2980b9' }));
    retryButton.on('pointerout', () => retryButton.setScale(1).setStyle({ backgroundColor: '#3498db' }));

    retryButton.on('pointerdown', () => {
      console.log('Retry button clicked');
      this.restartLevel();
      retryButton.destroy();
      menuButton.destroy();
    });

    // Back to menu
    const menuButton = this.add.text(width / 2 + 110, 280, '🏠 MAIN MENU', {
      fontSize: '26px',
      fill: '#fff',
      backgroundColor: '#e74c3c',
      padding: { x: 20, y: 12 },
      fontFamily: 'Fredoka',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(999);
    menuButton.on('pointerover', () => menuButton.setScale(1.05).setStyle({ backgroundColor: '#c0392b' }));
    menuButton.on('pointerout', () => menuButton.setScale(1).setStyle({ backgroundColor: '#e74c3c' }));

    menuButton.on('pointerdown', () => {
      // stop game and ui and return to menu
      console.log('Main Menu clicked - transitioning to MainMenuScene');
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('MainMenuScene');
    });
  }

  nextLevel() {
    console.log('Next Level clicked');
    const nextLevelNum = this.currentLevel + 1;
    
    console.log('Current level:', this.currentLevel, 'Next level:', nextLevelNum);
    
    // Cap at max levels
    if (nextLevelNum > 5) {
      console.log('All levels completed!');
      if (this.scene.isActive('GameScene')) {
        this.scene.stop('GameScene');
      }
      if (this.scene.isActive('UIScene')) {
        this.scene.stop('UIScene');
      }
      this.scene.start('MainMenuScene');
      return;
    }

    const levelData = {
      level: nextLevelNum,
      score: this.currentScore
    };

    console.log('Transitioning to next level with data:', levelData);
    console.log('this.scene type:', typeof this.scene);
    console.log('GameScene is active?', this.scene.isActive('GameScene'));

    try {
      // Check if GameScene exists before stopping
      if (this.scene.isActive('GameScene')) {
        console.log('Attempting to stop GameScene');
        this.scene.stop('GameScene');
        console.log('GameScene stopped successfully');
      } else {
        console.log('GameScene is not active');
      }
      
      // Wait a tiny bit then start fresh
      this.time.delayedCall(50, () => {
        console.log('Delayed callback fired - Launching GameScene with level:', nextLevelNum);
        // Launch the GameScene so that UIScene remains active (don't stop UIScene)
        this.scene.launch('GameScene', levelData);
        console.log('this.scene.launch() called');

        // Re-initialize UI for new level
        this.time.delayedCall(100, () => {
          console.log('Re-initializing UI');
          this.initializeUI();
        });
      });
    } catch (error) {
      console.error('Error in nextLevel:', error);
      console.error('Stack:', error.stack);
    }
  }

  restartLevel() {
    console.log('Restart Level clicked');
    
    const levelData = {
      level: this.currentLevel,
      score: 0
    };

    console.log('Restarting current level:', levelData);

    try {
      // Check if GameScene exists before stopping
      if (this.scene.isActive('GameScene')) {
        console.log('Attempting to stop GameScene');
        this.scene.stop('GameScene');
        console.log('GameScene stopped successfully');
      } else {
        console.log('GameScene is not active');
      }
      
      // Wait a tiny bit then start fresh
      this.time.delayedCall(50, () => {
        console.log('Delayed callback fired - Launching GameScene with level:', this.currentLevel);
        // Launch the GameScene so UIScene stays active and can show UI elements
        this.scene.launch('GameScene', levelData);
        console.log('this.scene.launch() called');

        // Re-initialize UI for new level
        this.time.delayedCall(100, () => {
          console.log('Re-initializing UI');
          this.initializeUI();
        });
      });
    } catch (error) {
      console.error('Error in restartLevel:', error);
      console.error('Stack:', error.stack);
    }
  }

  update() {
    // Update score display in real-time if needed
    if (this.gameScene && this.scoreText) {
      this.scoreText.setText(`Score: ${this.gameScene.score}`);
    }
    // Update balls display in real-time
    if (this.gameScene && this.ballsText) {
      this.ballsText.setText(`Balls: ${this.gameScene.ballsRemaining}`);
    }
  }
}