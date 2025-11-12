import Phaser from 'phaser';

export default class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloaderScene' });
  }

  preload() {
    const { width, height } = this.cameras.main;
    this.loadingText = this.add.text(width / 2, height / 2 - 30, 'Loading...', {
      fontSize: '24px',
      fill: '#333'
    }).setOrigin(0.5);

    this.loadingBarBg = this.add.graphics();
    this.loadingBarBg.fillStyle(0xcccccc, 1);
    this.loadingBarBg.fillRect(width / 2 - 150, height / 2, 300, 20);

    this.loadingBar = this.add.graphics();

    this.load.on('progress', (value) => {
      this.loadingBar.clear();
      this.loadingBar.fillStyle(0x007bff, 1);
      this.loadingBar.fillRect(width / 2 - 150, height / 2, 300 * value, 20);
    });

    this.load.on('complete', () => {
      this.loadingBar.destroy();
      this.loadingBarBg.destroy();
      this.loadingText.destroy();
    });

    this.load.image('ball', 'assets/images/ball.png');
    this.load.image('plank', 'assets/images/plank.png');
    this.load.image('basket', 'assets/images/basket.png');
  }

  create() {
    this.scene.start('MainMenuScene');
  }
}