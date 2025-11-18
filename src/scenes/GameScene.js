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
    this.planks = []; // array of planks per level (for multi-plank levels)
    this.simulationStarted = false;
    this.ball = null;
    this.basket = null;
    this.basketBody = null; // Store custom basket body separately
    this.currentLevel = 1;
    this.score = 0;
    this.levelActive = false; // track if level is in progress
    this.ballStillTimer = null; // timer to detect when ball stops moving
    this.ballLastPos = { x: 0, y: 0 }; // track ball position to detect stillness
    this.plankRotation = 0; // track plank rotation angle
    this.cursors = null;
    this.rotateLeftKey = null;
    this.rotateRightKey = null;
    this.rotateSpeed = 2; // degrees per frame when holding key
    // tuning values
    this.plankRestitution = 0.6;
    this.plankFriction = 0.2;
    this.ballRestitution = 0.9;
    this.ballFriction = 0.005;
    this.rotateLeftActive = false;
    this.rotateRightActive = false;
    this.ballsRemaining = 3; // fixed number of balls per level
    this.ballsPerLevel = 3; // default balls; can be overridden per level

    // simple level definitions: basket position, obstacles, and planks per level
    this.levels = [
      { basket: { x: 400, y: 580 }, obstacles: [], planksPerLevel: 1, balls: 3 },
      { basket: { x: 550, y: 560 }, obstacles: [{ x: 300, y: 420, w: 200, h: 20, angle: -15 }], planksPerLevel: 1, balls: 3 },
      { basket: { x: 250, y: 560 }, obstacles: [{ x: 450, y: 400, w: 180, h: 20, angle: 20 }], planksPerLevel: 2, balls: 3 },
      { basket: { x: 600, y: 520 }, obstacles: [{ x: 400, y: 350, w: 220, h: 20, angle: -30 }, { x: 200, y: 300, w: 120, h: 20, angle: 10 }], planksPerLevel: 2, balls: 3 },
      { basket: { x: 400, y: 520 }, obstacles: [{ x: 300, y: 360, w: 160, h: 20, angle: 0 }, { x: 500, y: 300, w: 160, h: 20, angle: 15 }], planksPerLevel: 3, balls: 3 }
    ];

    // track max levels based on current level definitions
    this.maxLevels = this.levels.length;
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

    // Set balls remaining based on current level config
    const levelConfig = this.levels[Math.max(0, Math.min(this.levels.length - 1, this.currentLevel - 1))];
    this.ballsPerLevel = levelConfig.balls || 3;
    this.ballsRemaining = this.ballsPerLevel;
    console.log('Level config: planksPerLevel=', levelConfig.planksPerLevel, 'balls=', this.ballsPerLevel);

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

    // place or move plank(s) (use matter images so visuals are attached)
    const planksPerLevel = levelConfig.planksPerLevel || 1;
    this.input.on('pointerdown', pointer => {
      if (!this.simulationStarted) {
        if (this.planks.length < planksPerLevel) {
          // Add a new plank
          const newPlank = matter.add.image(pointer.x, pointer.y, 'plank', null, {
            label: 'plank',
            isStatic: true  // keep plank static during placement
          });
          newPlank.setDisplaySize(120, 20);
          // configure body
          newPlank.setFriction(this.plankFriction);
          if (newPlank.setBounce) newPlank.setBounce(this.plankRestitution);
          else if (newPlank.body) newPlank.body.restitution = this.plankRestitution;
          newPlank.plankRotation = 0;
          this.planks.push(newPlank);
          console.log('Plank', this.planks.length, '/', planksPerLevel, 'placed');
        } else if (this.planks.length > 0) {
          // Move the last plank if all planks already placed
          const lastPlank = this.planks[this.planks.length - 1];
          lastPlank.setPosition(pointer.x, pointer.y);
        }
      }
    });

    // Plank rotation with arrow keys (left = -5 deg, right = +5 deg)
    // Single-press rotation handlers (keep for accessibility) - rotate last placed plank
    this.input.keyboard.on('keydown-LEFT', () => {
      if (this.planks.length > 0 && !this.simulationStarted) {
        const lastPlank = this.planks[this.planks.length - 1];
        if (!lastPlank.plankRotation) lastPlank.plankRotation = 0;
        lastPlank.plankRotation -= 5;
        lastPlank.setAngle(lastPlank.plankRotation);
        console.log('Plank rotated to:', lastPlank.plankRotation, '°');
      }
    });

    this.input.keyboard.on('keydown-RIGHT', () => {
      if (this.planks.length > 0 && !this.simulationStarted) {
        const lastPlank = this.planks[this.planks.length - 1];
        if (!lastPlank.plankRotation) lastPlank.plankRotation = 0;
        lastPlank.plankRotation += 5;
        lastPlank.setAngle(lastPlank.plankRotation);
        console.log('Plank rotated to:', lastPlank.plankRotation, '°');
      }
    });

    // Create cursor keys and additional keys for smooth rotation while held
    this.cursors = this.input.keyboard.createCursorKeys();
    this.rotateLeftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rotateRightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // Wait for UIScene to be ready
    this.time.delayedCall(500, () => {
      const uiScene = this.scene.get('UIScene');
      if (uiScene && uiScene.sys.isActive()) {
        console.log('UIScene is active, setting up startGame listener');
        uiScene.events.on('startGame', this.startSimulation, this);
        // Listen for rotation events coming from UI buttons
        this.events.on('rotateLeftStart', () => { this.rotateLeftActive = true; });
        this.events.on('rotateLeftStop', () => { this.rotateLeftActive = false; });
        this.events.on('rotateRightStart', () => { this.rotateRightActive = true; });
        this.events.on('rotateRightStop', () => { this.rotateRightActive = false; });
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
          // Identify which body is ball and which is basket
          let ballBody = null;
          let basketBody = null;
          if (labelA === 'ball') ballBody = pair.bodyA;
          if (labelB === 'ball') ballBody = pair.bodyB;
          if (labelA === 'basket') basketBody = pair.bodyA;
          if (labelB === 'basket') basketBody = pair.bodyB;

          // Read Y positions robustly
          const ballY = (ballBody && ballBody.position && ballBody.position.y) || (ballBody && ballBody.gameObject && ballBody.gameObject.y) || 0;
          const basketY = (basketBody && basketBody.position && basketBody.position.y) || (basketBody && basketBody.gameObject && basketBody.gameObject.y) || 0;

          console.log('Basket collision positions: ballY=', ballY, ' basketY=', basketY);

          // Only count as a win if the ball is coming from above the basket
          // Use a small tolerance to account for sensor size and minor overlaps
          const TOLERANCE = 6;
          if (ballY < basketY - TOLERANCE) {
            console.log('✅ BALL ENTERED BASKET FROM TOP — awarding win');
            this.levelWin();
          } else {
            console.log('Ignored basket contact — ball not above basket (likely from below)');
          }
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
      // slight horizontal jitter so every run feels a bit less robotic
      const spawnX = 360 + Math.random() * 80;
      this.ball = matter.add.image(spawnX, 50, 'ball', null, { label: 'ball', isSensor: false });
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

    // Make all placed planks static so they become immovable guides
    if (this.planks && this.planks.length) {
      this.planks.forEach(plank => {
        if (plank && plank.setStatic) {
          plank.setStatic(true);
        } else if (plank && MatterJS && MatterJS.Body) {
          MatterJS.Body.setStatic(plank, true);
        } else if (plank) {
          plank.isStatic = true;
        }
      });
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
    this.ballsRemaining--;
    console.log('Ball lost. Balls remaining:', this.ballsRemaining);
    
    if (this.ballsRemaining <= 0) {
      console.log('No balls remaining - Game Over');
      this.events.emit('levelFailed', { level: this.currentLevel, score: this.score });
      // Pause physics only on full game over
      const matter = this.matter || (this.sys && this.sys.matter) || null;
      if (matter && matter.world && matter.world.pause) {
        try { matter.world.pause(); } catch (e) { /* ignore */ }
      }
    } else {
      console.log('Restarting level with', this.ballsRemaining, 'balls remaining');
      this.events.emit('ballLost', { ballsRemaining: this.ballsRemaining, score: this.score });
      // Reset planks for retry (don't pause physics, allow immediate retry)
      this.time.delayedCall(500, () => {
        this.clearPlanks();
        this.ball = null;
        this.simulationStarted = false;
        this.levelActive = false;
      });
    }
  }

  clearPlanks() {
    if (this.planks && this.planks.length > 0) {
      this.planks.forEach(p => {
        try { p.destroy(); } catch (e) { console.log('Error destroying plank:', e); }
      });
      this.planks = [];
    }
  }

  // create level helper
  createLevel(levelNum) {
    const idx = Math.max(0, Math.min(this.levels.length - 1, levelNum - 1));
    const cfg = this.levels[idx];
    const matter = this.matter || (this.sys && this.sys.matter) || null;
    
    // Clear previous planks
    this.clearPlanks();

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

    // reset planks and ball
    this.clearPlanks();
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
    
    this.clearPlanks();
    
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

    // Smooth rotation while arrow keys (or A/D) or on-screen buttons are active - rotate last plank
    if (this.planks.length > 0 && !this.simulationStarted) {
      const lastPlank = this.planks[this.planks.length - 1];
      if (!lastPlank.plankRotation) lastPlank.plankRotation = 0;
      let rotated = false;
      if ((this.cursors && this.cursors.left.isDown) || (this.rotateLeftKey && this.rotateLeftKey.isDown) || this.rotateLeftActive) {
        lastPlank.plankRotation -= this.rotateSpeed;
        rotated = true;
      }
      if ((this.cursors && this.cursors.right.isDown) || (this.rotateRightKey && this.rotateRightKey.isDown) || this.rotateRightActive) {
        lastPlank.plankRotation += this.rotateSpeed;
        rotated = true;
      }
      if (rotated) {
        if (lastPlank.setAngle) lastPlank.setAngle(lastPlank.plankRotation);
        else if (lastPlank.angle !== undefined) lastPlank.angle = lastPlank.plankRotation;
      }
    }

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