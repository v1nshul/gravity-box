import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Title with gradient effect (using shadow for visual depth)
    const title = this.add.text(width / 2, height / 2 - 150, '🎮 GRAVITY BOX', {
      fontSize: '56px',
      fill: '#667eea',
      fontStyle: 'bold',
      fontFamily: 'Fredoka'
    }).setOrigin(0.5);
    title.setStroke('#764ba2', 3);

    // Subtitle
    this.add.text(width / 2, height / 2 - 80, 'Guide the ball into the basket', {
      fontSize: '20px',
      fill: '#555',
      fontStyle: 'italic',
      fontFamily: 'Fredoka'
    }).setOrigin(0.5);

    const startButton = this.add.text(width / 2, height / 2 + 80, '▶ START GAME', {
      fontSize: '32px',
      fill: '#fff',
      backgroundColor: '#27ae60',
      padding: { x: 30, y: 15 },
      fontFamily: 'Fredoka',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startButton.on('pointerover', () => {
      startButton.setScale(1.08).setStyle({ backgroundColor: '#229954' });
    });

    startButton.on('pointerout', () => {
      startButton.setScale(1).setStyle({ backgroundColor: '#27ae60' });
    });

    startButton.on('pointerdown', () => {
      console.log('Start Game clicked!');
      // Stop any existing scenes
      if (this.scene.isActive('GameScene')) {
        this.scene.stop('GameScene');
      }
      if (this.scene.isActive('UIScene')) {
        this.scene.stop('UIScene');
      }
      
      // Reset level and score
      const levelData = { level: 1, score: 0 };
      
      // Start GameScene with data and launch UIScene
      this.scene.start('GameScene', levelData);
      this.scene.launch('UIScene');
    });

    // Add hover effects
    startButton.on('pointerover', () => {
      startButton.setScale(1.1);
    });

    startButton.on('pointerout', () => {
      startButton.setScale(1);
    });
  }
}