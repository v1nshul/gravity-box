import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Title
    const title = this.add.text(width / 2, height / 2 - 150, 'Gravity Box', {
      fontSize: '56px',
      fill: '#111827',
      fontStyle: 'bold',
      fontFamily: 'Fredoka'
    }).setOrigin(0.5);
    title.setStroke('#4f46e5', 3);

    // Subtitle
    this.add.text(width / 2, height / 2 - 80, 'Place planks, press Play, and guide the ball into the basket.', {
      fontSize: '18px',
      fill: '#4b5563',
      fontFamily: 'Nunito'
    }).setOrigin(0.5);

    const startButton = this.add.text(width / 2, height / 2 + 80, 'Start Game', {
      fontSize: '30px',
      fill: '#ffffff',
      backgroundColor: '#2563eb',
      padding: { x: 32, y: 16 },
      fontFamily: 'Nunito',
      fontStyle: 'bold'
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on('pointerover', () => {
      startButton.setScale(1.05).setStyle({ backgroundColor: '#1d4ed8' });
    });

    startButton.on('pointerout', () => {
      startButton.setScale(1).setStyle({ backgroundColor: '#2563eb' });
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
  }
}