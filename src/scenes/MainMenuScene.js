import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width } = this.cameras.main;

    this.add.text(width / 2, 80, 'Gravity Box', {
      fontSize: '48px',
      fill: '#222'
    }).setOrigin(0.5);

    const startButton = this.add.text(width / 2, 300, 'Start Game', {
      fontSize: '32px',
      fill: '#fff',
      backgroundColor: '#007bff',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

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