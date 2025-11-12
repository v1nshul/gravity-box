import Phaser from 'phaser';
import PreloaderScene from './scenes/PreloaderScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#e0e0e0',
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1 },
      debug: true
    }
  },
  scene: [PreloaderScene, MainMenuScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);

export default game;