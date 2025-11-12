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

    // Display score, level, and high score
    console.log('Creating UI elements...');
    this.levelText = this.add.text(10, 20, `Level: ${this.currentLevel}`, {
      fontSize: '20px',
      fill: '#222'
    });
    console.log('✅ Level text created');

    this.scoreText = this.add.text(400, 20, `Score: ${this.currentScore}`, {
      fontSize: '20px',
      fill: '#222'
    }).setOrigin(0.5, 0);
    console.log('✅ Score text created');

    this.highScoreText = this.add.text(790, 20, `High: ${this.highScore}`, {
      fontSize: '20px',
      fill: '#222'
    }).setOrigin(1, 0);
    console.log('✅ High score text created');

    this.playButton = this.add.text(700, 560, 'Play', {
      fontSize: '28px',
      fill: '#fff',
      backgroundColor: '#28a745',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    console.log('✅ Play button created');

    this.playButton.on('pointerdown', () => {
      console.log('Play button clicked!');
      this.events.emit('startGame');
      this.playButton.destroy();
    });

    // Remove any old listeners first
    this.gameScene.events.off('levelComplete', this.showWinUI, this);
    this.gameScene.events.off('levelFailed', this.showFailUI, this);

    // Listen for level complete and failed
    this.gameScene.events.on('levelComplete', this.showWinUI, this);
    this.gameScene.events.on('levelFailed', this.showFailUI, this);
    
    console.log('=== UIScene setup complete ===');
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
        this.highScoreText.setText(`High: ${this.highScore}`);
      }
    }

    // Update score display
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.currentScore}`);
    }

    // Win message
    this.add.text(width / 2, height / 2 - 80, 'You Win!', {
      fontSize: '48px',
      fill: '#007bff'
    }).setOrigin(0.5);

    // Next Level button
    const nextButton = this.add.text(width / 2 - 100, height / 2 + 20, 'Next Level', {
      fontSize: '28px',
      fill: '#fff',
      backgroundColor: '#007bff',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextButton.on('pointerdown', () => {
      console.log('Next Level button pointerdown event fired');
      this.nextLevel();
    });

    // Restart button
    const restartButton = this.add.text(width / 2 + 100, height / 2 + 20, 'Restart', {
      fontSize: '28px',
      fill: '#fff',
      backgroundColor: '#ff6b6b',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

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
    this.add.text(width / 2, height / 2 - 80, 'You Failed', {
      fontSize: '48px',
      fill: '#ff4d4d'
    }).setOrigin(0.5);

    // Retry button
    const retryButton = this.add.text(width / 2, height / 2 + 20, 'Retry', {
      fontSize: '28px',
      fill: '#fff',
      backgroundColor: '#ff6b6b',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryButton.on('pointerdown', () => {
      this.restartLevel();
      retryButton.destroy();
    });

    // Back to menu
    const menuButton = this.add.text(width / 2, height / 2 + 80, 'Main Menu', {
      fontSize: '20px',
      fill: '#fff',
      backgroundColor: '#007bff',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

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
        console.log('Delayed callback fired - Starting GameScene with level:', nextLevelNum);
        this.scene.start('GameScene', levelData);
        console.log('this.scene.start() called');
        
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
        console.log('Delayed callback fired - Starting GameScene with level:', this.currentLevel);
        this.scene.start('GameScene', levelData);
        console.log('this.scene.start() called');
        
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
  }
}