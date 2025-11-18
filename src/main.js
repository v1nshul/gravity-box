import Phaser from 'phaser';
import PreloaderScene from './scenes/PreloaderScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container', // attach canvas to styled container in index.html
  width: 800,
  height: 680,
  backgroundColor: '#f5f7fa',
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1 },
      debug: false // turn off global debug outlines for a cleaner, finished look
    }
  },
  scene: [PreloaderScene, MainMenuScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);

export default game;