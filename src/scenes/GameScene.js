import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'GameScene',
      physics: {
        default: 'matter',
        matter: {
          gravity: { y: 1 },
          debug: false  // disable debug outlines
        }
      }
    });
    this.plank = null;
    this.simulationStarted = false;
    this.ball = null;
    this.basket = null;
    this.basketBody = null; // Store custom basket body separately
    this.currentLevel = 1;
    this.score = 0;
    this.maxLevels = 5;
    this.levelActive = false; // track if level is in progress
    this.ballStillTimer = null; // timer to detect when ball stops moving
    this.ballLastPos = { x: 0, y: 0 }; // track ball position to detect stillness
    this.plankRotation = 0; // track plank rotation angle
    // tuning values
    this.plankRestitution = 0.6;
    this.plankFriction = 0.2;
    this.ballRestitution = 0.9;
    this.ballFriction = 0.005;

    // simple level definitions: basket position and obstacles
    this.levels = [
      { basket: { x: 400, y: 580 }, obstacles: [] },
      { basket: { x: 550, y: 560 }, obstacles: [{ x: 300, y: 420, w: 200, h: 20, angle: -15 }] },
      { basket: { x: 250, y: 560 }, obstacles: [{ x: 450, y: 400, w: 180, h: 20, angle: 20 }] },
      { basket: { x: 600, y: 520 }, obstacles: [{ x: 400, y: 350, w: 220, h: 20, angle: -30 }, { x: 200, y: 300, w: 120, h: 20, angle: 10 }] },
      { basket: { x: 400, y: 520 }, obstacles: [{ x: 300, y: 360, w: 160, h: 20, angle: 0 }, { x: 500, y: 300, w: 160, h: 20, angle: 15 }] }
    ];
  }

  create(levelData) {
    console.log('GameScene.create() called with data:', levelData);
    console.log('Scene settings data:', this.sys?.settings?.data);
    
    // Try both parameter and settings data
    let data = levelData || (this.sys?.settings?.data);
    
    // Get level from scene data parameter or default to 1
    if (data) {
      this.currentLevel = data.level;
      this.score = data.score;
      console.log('Using data - Level:', this.currentLevel, 'Score:', this.score);
    } else {
      this.currentLevel = 1;
      this.score = 0;
      console.log('No data provided, using defaults - Level: 1, Score: 0');
    }

    // Get matter plugin (robust to plugin availability)
    const matter = this.matter || (this.sys && this.sys.matter) || null;
    const MatterJS = Phaser.Physics.Matter.Matter;

    if (matter && matter.world) {
      // Resume physics world if paused (from previous level)
      if (matter.world.isPaused && matter.world.isPaused()) {
        matter.world.resume();
      }
      matter.world.setBounds(0, 0, 800, 600);
      // Increase gravity slightly per level for difficulty
      if (matter.world.gravity) {
        matter.world.gravity.y = 1 + (this.currentLevel - 1) * 0.2;
      }
    } else {
      console.warn('Matter plugin not available on GameScene');
    }

    // create level (basket + obstacles) via helper
    this.clearLevel && this.clearLevel();
    this.createLevel(this.currentLevel);

    this.plank = null;
    this.simulationStarted = false;

    // Remove previous input listeners
    this.input.off('pointerdown');
    this.input.keyboard.off('keydown-LEFT');
    this.input.keyboard.off('keydown-RIGHT');

    // place or move a plank (use matter images so visuals are attached)
    this.input.on('pointerdown', pointer => {
      if (!this.simulationStarted) {
        if (!this.plank) {
          this.plank = matter.add.image(pointer.x, pointer.y, 'plank', null, {
            label: 'plank',
            isStatic: true  // keep plank static during placement
          });
          this.plank.setDisplaySize(120, 20);
          // configure body
          this.plank.setFriction(this.plankFriction);
          if (this.plank.setBounce) this.plank.setBounce(this.plankRestitution);
          else if (this.plank.body) this.plank.body.restitution = this.plankRestitution;
          this.plankRotation = 0;
        } else {
          this.plank.setPosition(pointer.x, pointer.y);
        }
      }
    });

    // Plank rotation with arrow keys (left = -5 deg, right = +5 deg)
    this.input.keyboard.on('keydown-LEFT', () => {
      if (this.plank && !this.simulationStarted) {
        this.plankRotation -= 5;
        this.plank.setAngle(this.plankRotation);
        console.log('Plank rotated to:', this.plankRotation, '°');
      }
    });

    this.input.keyboard.on('keydown-RIGHT', () => {
      if (this.plank && !this.simulationStarted) {
        this.plankRotation += 5;
        this.plank.setAngle(this.plankRotation);
        console.log('Plank rotated to:', this.plankRotation, '°');
      }
    });

    // Wait for UIScene to be ready
    this.time.delayedCall(500, () => {
      const uiScene = this.scene.get('UIScene');
      if (uiScene && uiScene.sys.isActive()) {
        console.log('UIScene is active, setting up startGame listener');
        uiScene.events.on('startGame', this.startSimulation, this);
      }
    });

    // Collision detection - store reference for cleanup
    this.collisionHandler = (event) => {
      event.pairs.forEach(pair => {
        // Matter.Image objects have body.label; raw bodies have label
        const labelA = pair.bodyA.label || (pair.bodyA.gameObject && pair.bodyA.gameObject.label);
        const labelB = pair.bodyB.label || (pair.bodyB.gameObject && pair.bodyB.gameObject.label);
        console.log('Collision: bodyA.label=', labelA, ', bodyB.label=', labelB);
        
        const labels = [labelA, labelB];
        if (labels.includes('ball') && labels.includes('basket')) {
          console.log('✅ BALL HIT BASKET! Calling levelWin()');
          this.levelWin();
        }
      });
    };

    if (matter && matter.world) {
      matter.world.off('collisionstart', this.collisionHandler);
      matter.world.on('collisionstart', this.collisionHandler);
    } else {
      console.warn('Cannot register collision listener: matter.world missing');
    }

    // Handle scene shutdown to clean up all objects
    this.events.on('shutdown', () => {
      console.log('GameScene shutting down - cleaning up');
      const matter = this.matter || (this.sys && this.sys.matter) || null;
      if (matter && matter.world && this.collisionHandler) {
        matter.world.off('collisionstart', this.collisionHandler);
      }
      this.clearLevel();
      if (this.ballStillTimer) this.time.removeEvent(this.ballStillTimer);
    });
  }

  startSimulation() {
    console.log('Starting simulation');
    this.simulationStarted = true;
    this.levelActive = true;
    
    // Ball (dynamic circle body with visual) - add high restitution so it bounces
    const matter = this.matter || (this.sys && this.sys.matter) || null;
    if (matter && matter.add) {
      this.ball = matter.add.image(400, 50, 'ball', null, { label: 'ball', isSensor: false });
      this.ball.setDisplaySize(40, 40);
      // set circle body to match display
      if (this.ball.setCircle) this.ball.setCircle(20);
      if (this.ball.setBounce) this.ball.setBounce(this.ballRestitution);
      else if (this.ball.body) this.ball.body.restitution = this.ballRestitution;
      if (this.ball.setFriction) this.ball.setFriction(this.ballFriction);
      // Verify ball body has the label set
      if (this.ball.body) {
        this.ball.body.label = 'ball';
      }
      console.log('✅ Ball created:', { label: this.ball.label, bodyLabel: this.ball.body?.label });
    } else {
      // fallback
      const ballBody = Phaser.Physics.Matter.Matter.Bodies.circle(400, 50, 20, { label: 'ball' });
      this.ball = ballBody;
      const ballVisual = this.add.image(400, 50, 'ball');
      ballVisual.setDisplaySize(40, 40);
      this.ball.gameObject = ballVisual;
    }

    // Make plank static so it becomes an immovable guide
    if (this.plank) {
      if (this.plank.setStatic) {
        this.plank.setStatic(true);
      } else if (MatterJS && MatterJS.Body) {
        MatterJS.Body.setStatic(this.plank, true);
      } else {
        this.plank.isStatic = true;
      }
    }

    // Start a timer to detect when ball stops moving (after 3 seconds of no movement, fail)
    if (this.ballStillTimer) this.time.removeEvent(this.ballStillTimer);
    this.ballStillTimer = this.time.delayedCall(3000, () => {
      if (this.levelActive) {
        console.log('Ball stopped moving and not in basket - failing level');
        this.levelFail();
      }
    });
  }

  levelWin() {
    console.log('Level Complete!');
    // Add points for completing level
    this.score += 100 * this.currentLevel;
    // Notify UI via this scene's events so UIScene can listen on gameScene.events
    this.events.emit('levelComplete', { level: this.currentLevel, score: this.score });
    this.levelActive = false;
    // pause physics if available
    const matter = this.matter || (this.sys && this.sys.matter) || null;
    if (matter && matter.world && matter.world.pause) {
      try { matter.world.pause(); } catch (e) { /* ignore */ }
    }
  }

  levelFail() {
    console.log('Level Failed');
    this.levelActive = false;
    // Emit failure on this scene events so UIScene can listen
    this.events.emit('levelFailed', { level: this.currentLevel, score: this.score });
    const matter = this.matter || (this.sys && this.sys.matter) || null;
    if (matter && matter.world && matter.world.pause) {
      try { matter.world.pause(); } catch (e) { /* ignore */ }
    }
  }

  // create level helper
  createLevel(levelNum) {
    const idx = Math.max(0, Math.min(this.levels.length - 1, levelNum - 1));
    const cfg = this.levels[idx];
    const matter = this.matter || (this.sys && this.sys.matter) || null;

    // Clear previous basket if any
    if (this.basketBody && matter && matter.world) {
      try {
        matter.world.remove(this.basketBody);
      } catch (e) {
        console.log('Error removing old basket body:', e);
      }
      this.basketBody = null;
    }
    if (this.basket) {
      try {
        this.basket.destroy();
      } catch (e) {
        console.log('Error destroying old basket:', e);
      }
    }

    if (matter && matter.add) {
      // Create visual basket WITHOUT a physics body initially
      this.basket = this.add.image(cfg.basket.x, cfg.basket.y, 'basket');
      this.basket.setDisplaySize(120, 30);  // visual size
      
      // Create a TINY collision rectangle body (only 30px wide, 15px tall) for very tight detection
      const MatterJS = Phaser.Physics.Matter.Matter;
      const tinyBody = MatterJS.Bodies.rectangle(cfg.basket.x, cfg.basket.y + 5, 30, 15, { 
        isStatic: true, 
        label: 'basket', 
        isSensor: true 
      });
      
      // Store the body separately, not attached to the game object
      matter.world.add(tinyBody);
      this.basketBody = tinyBody;
      
      console.log('✅ Basket created with TINY collision box:', { x: cfg.basket.x, y: cfg.basket.y, bodyWidth: 30, bodyHeight: 15 });
    }

    // create obstacles
    this.obstacles = [];
    if (cfg.obstacles && cfg.obstacles.length && matter && matter.add) {
      cfg.obstacles.forEach(o => {
        const obs = matter.add.image(o.x, o.y, 'plank', null, { isStatic: true, label: 'obstacle' });
        obs.setDisplaySize(o.w, o.h);
        obs.setAngle(o.angle || 0);
        obs.setStatic(true);
        this.obstacles.push(obs);
      });
    }

    // reset plank and ball
    if (this.plank) { this.plank.destroy(); this.plank = null; }
    if (this.ball) { if (this.ball.gameObject) this.ball.gameObject.destroy(); if (this.ball.destroy) this.ball.destroy(); this.ball = null; }
  }

  clearLevel() {
    const matter = this.matter || (this.sys && this.sys.matter) || null;
    
    // Remove custom basket body from world
    if (this.basketBody && matter && matter.world) {
      try {
        matter.world.remove(this.basketBody);
        console.log('Removed basketBody from world');
      } catch (e) {
        console.log('Error removing basketBody:', e);
      }
      this.basketBody = null;
    }
    
    // Destroy basket game object (no physics body attached)
    if (this.basket) { 
      try {
        this.basket.destroy(); 
      } catch (e) {
        console.log('Error destroying basket:', e);
      }
      this.basket = null; 
    }
    
    if (this.obstacles) { 
      this.obstacles.forEach(o => {
        try {
          o.destroy();
        } catch (e) {
          console.log('Error destroying obstacle:', e);
        }
      }); 
      this.obstacles = []; 
    }
    
    if (this.plank) { 
      try {
        this.plank.destroy(); 
      } catch (e) {
        console.log('Error destroying plank:', e);
      }
      this.plank = null; 
    }
    
    if (this.ball) { 
      try {
        if (this.ball.gameObject) this.ball.gameObject.destroy(); 
        if (this.ball.destroy) this.ball.destroy(); 
      } catch (e) {
        console.log('Error destroying ball:', e);
      }
      this.ball = null; 
    }
  }

  update() {
    // For MatterImage objects, use x/y; for raw Matter bodies, use position
    if (this.ball) {
      if (this.ball.gameObject) {
        // case where ball is a raw body with a separate visual
        const go = this.ball.gameObject;
        if (this.ball.position) {
          go.setPosition(this.ball.position.x, this.ball.position.y);
          go.rotation = this.ball.angle;
        }
      } else {
        // ball is a MatterImage (has x/y)
        if (this.ball.x !== undefined) {
          // nothing to sync; Phaser updates position automatically
        }
      }
    }

    // plank is a MatterImage when placed; no manual sync needed

    // Check if ball is moving during gameplay
    if (this.levelActive && this.ball) {
      let ballX = this.ball.x || (this.ball.position && this.ball.position.x) || 0;
      let ballY = this.ball.y || (this.ball.position && this.ball.position.y) || 0;
      
      // If ball is moving, reset the still timer
      const distance = Math.hypot(ballX - this.ballLastPos.x, ballY - this.ballLastPos.y);
      if (distance > 1) {
        // Ball is moving; reset the stillness timer
        if (this.ballStillTimer) this.time.removeEvent(this.ballStillTimer);
        this.ballStillTimer = this.time.delayedCall(3000, () => {
          if (this.levelActive) {
            console.log('Ball stopped moving - failing level');
            this.levelFail();
          }
        });
      }
      
      this.ballLastPos = { x: ballX, y: ballY };
    }

    // Fail detection: if ball falls below the screen and level is active
    let ballY = null;
    if (this.ball) {
      if (this.ball.position && this.ball.position.y !== undefined) ballY = this.ball.position.y;
      else if (this.ball.y !== undefined) ballY = this.ball.y;
    }
    if (this.levelActive && ballY !== null) {
      if (ballY > 620) {
        // ball fell out of play area -> fail
        this.levelFail();
      }
    }
  }
}