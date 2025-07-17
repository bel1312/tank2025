class Tank1990Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = 640; // Smaller field
    this.canvas.height = 640; // Smaller field

    // Game state
    this.gameRunning = false;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.enemyTanksRemaining = 0;

    // Grid system (16x16 tiles, each 40px) - Bigger tiles, smaller grid
    this.tileSize = 40;
    this.gridWidth = 16;
    this.gridHeight = 16;

    // Game objects
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.walls = [];
    this.powerUps = [];

    // Input handling
    this.keys = {};
    this.lastShot = 0;
    this.shotCooldown = 250; // milliseconds
    this.spacePressed = false; // Track spacebar state

    // Sound system
    this.sounds = this.initSounds();

    // Enemy spawning - Updated for smaller grid, spawn inside borders
    this.enemySpawnPoints = [
      { x: 1, y: 1 }, // Top-left inside border
      { x: 7, y: 1 }, // Center top inside border
      { x: 14, y: 1 }, // Right top inside border
    ];
    this.enemySpawnTimer = 0;
    this.enemySpawnDelay = 1000; // Faster spawning

    this.initGame();
    this.setupEventListeners();
    this.gameLoop();
  }

  initSounds() {
    // Create audio context for sound effects
    const sounds = {};
    
    // Create simple sound effects using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Shooting sound
    sounds.shoot = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    };
    
    // Explosion sound
    sounds.explode = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };
    
    // Hit sound
    sounds.hit = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    };
    
    // Game over sound
    sounds.gameOver = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 1.0);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1.0);
    };
    
    return sounds;
  }

  initGame() {
    this.createPlayer();
    this.createBase();
    this.generateLevel();
    this.enemyTanksRemaining = 20; // Always 20 enemies per level
    this.enemiesKilled = 0;
    this.maxEnemiesOnField = Math.min(4 + this.level, 5); // 4-5 max on field
    this.gameRunning = true;

    // Force spawn initial enemies
    for (let i = 0; i < Math.min(3, this.maxEnemiesOnField); i++) {
      this.spawnEnemy();
    }

    this.updateUI();
  }

  createBase() {
    // Create the base (eagle) at the bottom center
    this.base = {
      x: 7 * this.tileSize, // Center horizontally
      y: 14 * this.tileSize, // Second row from bottom
      width: this.tileSize,
      height: this.tileSize,
      alive: true,
      color: "#FFD700" // Gold color for the base
    };
  }

  createPlayer() {
    this.player = {
      x: 7 * this.tileSize, // Center horizontally for 16-wide grid
      y: 13 * this.tileSize, // Move up one tile from bottom border
      width: this.tileSize,
      height: this.tileSize,
      direction: 0, // 0: up, 1: right, 2: down, 3: left
      speed: 2,
      alive: true,
      color: "#00ff00",
    };
  }

  generateLevel() {
    this.walls = [];

    // Create border walls (indestructible steel)
    for (let x = 0; x < this.gridWidth; x++) {
      this.walls.push({ x: x * this.tileSize, y: 0, type: "steel" });
      this.walls.push({
        x: x * this.tileSize,
        y: (this.gridHeight - 1) * this.tileSize,
        type: "steel",
      });
    }
    for (let y = 1; y < this.gridHeight - 1; y++) {
      this.walls.push({ x: 0, y: y * this.tileSize, type: "steel" });
      this.walls.push({
        x: (this.gridWidth - 1) * this.tileSize,
        y: y * this.tileSize,
        type: "steel",
      });
    }

    // Add varied terrain types
    for (let i = 0; i < 30 + this.level * 8; i++) {
      let x = Math.floor(Math.random() * (this.gridWidth - 4)) + 2;
      let y = Math.floor(Math.random() * (this.gridHeight - 4)) + 2;

      // Don't place terrain near player spawn or enemy spawn points
      // Updated for 16x16 grid - more restrictive around spawn areas
      if (
        (x >= 6 && x <= 8 && y >= 12) || // Player area
        (x <= 3 && y <= 3) || // Top-left enemy spawn area (expanded)
        (x >= 5 && x <= 9 && y <= 3) || // Top-center enemy spawn area (expanded)
        (x >= 12 && y <= 3) || // Top-right enemy spawn area (expanded)
        (x >= 5 && x <= 9 && y >= 13) // Base protection area
      ) {
        continue;
      }

      // Random terrain type selection
      const terrainTypes = ["brick", "steel", "water", "forest", "concrete"];
      const weights = [40, 15, 10, 20, 15]; // Percentage chance for each type

      let randomValue = Math.random() * 100;
      let cumulativeWeight = 0;
      let selectedType = "brick";

      for (let j = 0; j < terrainTypes.length; j++) {
        cumulativeWeight += weights[j];
        if (randomValue <= cumulativeWeight) {
          selectedType = terrainTypes[j];
          break;
        }
      }

      this.walls.push({
        x: x * this.tileSize,
        y: y * this.tileSize,
        type: selectedType,
      });
    }

    // Add brick protection around the base
    const baseX = 7; // Base grid position
    const baseY = 14;
    
    // Create brick walls around the base in a protective pattern
    const brickPositions = [
      // Top protection
      { x: baseX - 1, y: baseY - 1 },
      { x: baseX, y: baseY - 1 },
      { x: baseX + 1, y: baseY - 1 },
      // Left protection
      { x: baseX - 1, y: baseY },
      // Right protection
      { x: baseX + 1, y: baseY },
      // Additional side protection
      { x: baseX - 2, y: baseY - 1 },
      { x: baseX - 2, y: baseY },
      { x: baseX + 2, y: baseY - 1 },
      { x: baseX + 2, y: baseY }
    ];
    
    for (let pos of brickPositions) {
      if (pos.x >= 1 && pos.x <= 14 && pos.y >= 1 && pos.y <= 14) { // Stay within borders
        this.walls.push({
          x: pos.x * this.tileSize,
          y: pos.y * this.tileSize,
          type: "brick"
        });
      }
    }
  }

  spawnEnemy() {
    if (
      this.enemies.length >= this.maxEnemiesOnField ||
      this.enemyTanksRemaining <= 0
    )
      return;

    // Try multiple spawn points if first one fails
    for (let attempt = 0; attempt < this.enemySpawnPoints.length; attempt++) {
      const spawnPoint = this.enemySpawnPoints[attempt];
      const spawnX = spawnPoint.x * this.tileSize;
      const spawnY = spawnPoint.y * this.tileSize;

      let canSpawn = true;

      // Check if spawn point has any walls - simplified check
      if (!this.canMoveTo(spawnX, spawnY, this.tileSize, this.tileSize, null)) {
        canSpawn = false;
      }

      // Check distance from other enemies - simplified
      for (let enemy of this.enemies) {
        if (
          this.distance(enemy.x, enemy.y, spawnX, spawnY) <
          this.tileSize * 1.5
        ) {
          canSpawn = false;
          break;
        }
      }

      // Check distance from player - simplified
      if (this.player && this.player.alive) {
        if (
          this.distance(this.player.x, this.player.y, spawnX, spawnY) <
          this.tileSize * 2
        ) {
          canSpawn = false;
        }
      }

      if (canSpawn) {
        // Create different enemy types
        const enemyType = this.getRandomEnemyType();

        const newEnemy = {
          x: spawnX,
          y: spawnY,
          width: this.tileSize,
          height: this.tileSize,
          direction: Math.floor(Math.random() * 4),
          speed: enemyType.speed,
          alive: true,
          color: enemyType.color,
          type: enemyType.name,
          maxHealth: enemyType.health,
          health: enemyType.health,
          shootCooldown: enemyType.shootCooldown,
          lastDirectionChange: Date.now(),
          lastShot: 0,
          stuckCounter: 0,
          lastPosition: { x: spawnX, y: spawnY },
          aggressiveness: enemyType.aggressiveness,
        };

        this.enemies.push(newEnemy);
        this.enemyTanksRemaining--;
        console.log(
          `Spawned ${enemyType.name} enemy at (${spawnX}, ${spawnY}). Total enemies: ${this.enemies.length}`
        );
        return; // Successfully spawned, exit function
      }
    }

    // If we get here, no spawn point was available
    console.log("No valid spawn points available");
  }

  getRandomEnemyType() {
    const enemyTypes = [
      {
        name: "light",
        health: 1,
        speed: 1.5,
        color: "#FF6B6B", // Light red
        shootCooldown: 1200,
        aggressiveness: 0.7, // 70% chance to move toward player
        weight: 40, // 40% spawn chance
      },
      {
        name: "medium",
        health: 2,
        speed: 1.0,
        color: "#FF4444", // Medium red
        shootCooldown: 1000,
        aggressiveness: 0.5,
        weight: 30, // 30% spawn chance
      },
      {
        name: "heavy",
        health: 3,
        speed: 0.8,
        color: "#CC0000", // Dark red
        shootCooldown: 800,
        aggressiveness: 0.3,
        weight: 15, // 15% spawn chance
      },
      {
        name: "fast",
        health: 1,
        speed: 2.5,
        color: "#FF8888", // Pink red
        shootCooldown: 1500,
        aggressiveness: 0.8, // Very aggressive
        weight: 15, // 15% spawn chance
      },
    ];

    // Weighted random selection
    const totalWeight = enemyTypes.reduce((sum, type) => sum + type.weight, 0);
    let randomValue = Math.random() * totalWeight;

    for (let type of enemyTypes) {
      randomValue -= type.weight;
      if (randomValue <= 0) {
        return type;
      }
    }

    return enemyTypes[0]; // Fallback
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      // Prevent default browser behavior for arrow keys and spacebar
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }

      this.keys[e.code] = true;

      if (e.code === "KeyR") {
        this.restartGame();
      }

      // Improved shooting mechanism - only shoot on initial key press
      if (e.code === "Space" && !this.spacePressed) {
        this.spacePressed = true;
        if (
          document.getElementById("levelComplete").classList.contains("hidden")
        ) {
          this.shoot(this.player);
        } else {
          this.nextLevel();
        }
      }
    });

    document.addEventListener("keyup", (e) => {
      // Prevent default browser behavior for arrow keys
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }

      this.keys[e.code] = false;
      
      // Reset spacebar state when key is released
      if (e.code === "Space") {
        this.spacePressed = false;
      }
    });
  }

  gameLoop() {
    if (this.gameRunning) {
      this.update();
      this.render();
    }
    requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    if (!this.gameRunning) return;

    // Handle player input
    this.handlePlayerInput();

    // Update enemies
    this.updateEnemies();

    // Update bullets
    this.updateBullets();

    // Spawn enemies
    if (Date.now() - this.enemySpawnTimer > this.enemySpawnDelay) {
      this.spawnEnemy();
      this.enemySpawnTimer = Date.now();
    }

    // Check win condition - all 20 enemies defeated
    if (this.enemies.length === 0 && this.enemyTanksRemaining === 0) {
      this.levelComplete();
    }

    // Check lose condition
    if (!this.player.alive) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver();
      } else {
        this.respawnPlayer();
      }
    }
  }

  handlePlayerInput() {
    if (!this.player.alive) return;

    let moved = false;
    let newX = this.player.x;
    let newY = this.player.y;

    if (this.keys["ArrowUp"]) {
      this.player.direction = 0;
      newY -= this.player.speed;
      moved = true;
    } else if (this.keys["ArrowRight"]) {
      this.player.direction = 1;
      newX += this.player.speed;
      moved = true;
    } else if (this.keys["ArrowDown"]) {
      this.player.direction = 2;
      newY += this.player.speed;
      moved = true;
    } else if (this.keys["ArrowLeft"]) {
      this.player.direction = 3;
      newX -= this.player.speed;
      moved = true;
    }

    if (moved) {
      const canMove = this.canMoveTo(
        newX,
        newY,
        this.player.width,
        this.player.height,
        this.player
      );
      if (canMove) {
        this.player.x = newX;
        this.player.y = newY;
      }
    }
  }

  updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let enemy = this.enemies[i];

      if (!enemy.alive) {
        this.enemies.splice(i, 1);
        this.score +=
          enemy.type === "heavy"
            ? 300
            : enemy.type === "medium"
            ? 200
            : enemy.type === "fast"
            ? 150
            : 100;
        this.enemiesKilled++;
        this.updateUI();
        continue;
      }

      // Initialize stuck counter if it doesn't exist
      if (enemy.stuckCounter === undefined) {
        enemy.stuckCounter = 0;
        enemy.lastPosition = { x: enemy.x, y: enemy.y };
      }

      // Check if enemy is stuck (hasn't moved in a while)
      if (
        Math.abs(enemy.x - enemy.lastPosition.x) < 1 &&
        Math.abs(enemy.y - enemy.lastPosition.y) < 1
      ) {
        enemy.stuckCounter++;
      } else {
        enemy.stuckCounter = 0;
        enemy.lastPosition = { x: enemy.x, y: enemy.y };
      }

      // More frequent direction changes and better AI
      const directionChangeTime =
        enemy.type === "fast" ? 800 : enemy.type === "light" ? 1200 : 1500;

      if (
        enemy.stuckCounter > 20 ||
        Date.now() - enemy.lastDirectionChange >
          directionChangeTime + Math.random() * 1000
      ) {
        enemy.direction = this.findBestDirection(enemy);
        enemy.lastDirectionChange = Date.now();
        enemy.stuckCounter = 0;
      }

      // Move enemy
      let newX = enemy.x;
      let newY = enemy.y;

      switch (enemy.direction) {
        case 0:
          newY -= enemy.speed;
          break;
        case 1:
          newX += enemy.speed;
          break;
        case 2:
          newY += enemy.speed;
          break;
        case 3:
          newX -= enemy.speed;
          break;
      }

      if (this.canMoveTo(newX, newY, enemy.width, enemy.height, enemy)) {
        enemy.x = newX;
        enemy.y = newY;
      } else {
        // If can't move, immediately try to find a new direction
        enemy.direction = this.findBestDirection(enemy);
        enemy.lastDirectionChange = Date.now();
      }

      // More aggressive shooting - enemies shoot while moving
      if (Date.now() - enemy.lastShot > enemy.shootCooldown) {
        // Higher chance to shoot if player is visible or nearby
        const playerDistance = this.distance(
          enemy.x + enemy.width / 2,
          enemy.y + enemy.height / 2,
          this.player.x + this.player.width / 2,
          this.player.y + this.player.height / 2
        );

        const shouldShoot =
          playerDistance < this.tileSize * 8 || Math.random() < 0.3;

        if (shouldShoot) {
          this.shoot(enemy);
          enemy.lastShot = Date.now();
        }
      }
    }
  }

  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let bullet = this.bullets[i];

      // Move bullet
      switch (bullet.direction) {
        case 0:
          bullet.y -= bullet.speed;
          break;
        case 1:
          bullet.x += bullet.speed;
          break;
        case 2:
          bullet.y += bullet.speed;
          break;
        case 3:
          bullet.x -= bullet.speed;
          break;
      }

      // Check collision with walls
      let hit = false;
      for (let j = this.walls.length - 1; j >= 0; j--) {
        let wall = this.walls[j];
        if (this.collision(bullet, wall)) {
          // Different terrain types react differently to bullets
          switch (wall.type) {
            case "brick":
              // Brick walls are destructible
              this.walls.splice(j, 1);
              this.sounds.hit();
              hit = true;
              break;
            case "steel":
              // Steel walls are indestructible
              this.sounds.hit();
              hit = true;
              break;
            case "concrete":
              // Concrete walls are indestructible but can be shot
              this.sounds.hit();
              hit = true;
              break;
            case "water":
              // Water cannot be shot through
              hit = true;
              break;
            case "forest":
              // Bullets pass through forest, but forest gets damaged
              if (Math.random() < 0.3) {
                // 30% chance to destroy forest
                this.walls.splice(j, 1);
                this.sounds.hit();
              }
              // Bullet continues through forest
              break;
          }

          if (hit) break;
        }
      }

      // Check collision with tanks
      if (!hit) {
        if (bullet.owner === "player") {
          for (let enemy of this.enemies) {
            if (this.collision(bullet, enemy)) {
              enemy.health--;
              if (enemy.health <= 0) {
                enemy.alive = false;
                this.sounds.explode();
              } else {
                this.sounds.hit();
              }
              hit = true;
              break;
            }
          }
        } else {
          if (this.collision(bullet, this.player)) {
            this.player.alive = false;
            this.sounds.explode();
            hit = true;
          }
          
          // Check collision with base
          if (this.base && this.base.alive && this.collision(bullet, this.base)) {
            this.base.alive = false;
            this.sounds.explode();
            this.gameOver(); // Game over if base is destroyed
            hit = true;
          }
        }
      }

      // Remove bullet if hit or out of bounds
      if (
        hit ||
        bullet.x < 0 ||
        bullet.x > this.canvas.width ||
        bullet.y < 0 ||
        bullet.y > this.canvas.height
      ) {
        this.bullets.splice(i, 1);
      }
    }
  }

  shoot(tank) {
    if (Date.now() - this.lastShot < this.shotCooldown) return;

    let bulletX = tank.x + tank.width / 2 - 4; // Bigger bullet
    let bulletY = tank.y + tank.height / 2 - 4; // Bigger bullet

    // Adjust bullet position based on direction
    switch (tank.direction) {
      case 0:
        bulletY = tank.y - 8; // Bigger offset
        break;
      case 1:
        bulletX = tank.x + tank.width;
        break;
      case 2:
        bulletY = tank.y + tank.height;
        break;
      case 3:
        bulletX = tank.x - 8; // Bigger offset
        break;
    }

    this.bullets.push({
      x: bulletX,
      y: bulletY,
      width: 8, // Bigger bullet
      height: 8, // Bigger bullet
      direction: tank.direction,
      speed: 6, // Slightly faster
      owner: tank === this.player ? "player" : "enemy",
      color: "#ffff00",
    });

    // Play shooting sound
    this.sounds.shoot();

    this.lastShot = Date.now();
  }

  canMoveTo(x, y, width, height, excludeTank = null) {
    // Reduce buffer to allow movement closer to walls
    const buffer = 0;

    // Check canvas bounds with buffer
    if (
      x < buffer ||
      y < buffer ||
      x + width > this.canvas.width - buffer ||
      y + height > this.canvas.height - buffer
    ) {
      return false;
    }

    // Check wall collision - different terrain types have different movement rules
    let testObj = { x, y, width, height };
    for (let wall of this.walls) {
      if (this.collision(testObj, wall)) {
        // Forest can be driven through, water and solid walls cannot
        if (wall.type === "forest") {
          continue; // Can drive through forest
        }
        return false; // Cannot drive through other terrain types
      }
    }

    // Check collision with other tanks (prevent tanks from overlapping)
    // But exclude the tank that's trying to move
    if (this.player && this.player.alive && excludeTank !== this.player) {
      if (this.collision(testObj, this.player)) {
        return false;
      }
    }

    for (let enemy of this.enemies) {
      if (
        enemy.alive &&
        excludeTank !== enemy &&
        this.collision(testObj, enemy)
      ) {
        return false;
      }
    }

    return true;
  }

  collision(obj1, obj2) {
    return (
      obj1.x < obj2.x + this.tileSize &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + this.tileSize &&
      obj1.y + obj1.height > obj2.y
    );
  }

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = "#2d2d2d";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw walls with different terrain types
    for (let wall of this.walls) {
      // Set colors based on terrain type
      switch (wall.type) {
        case "brick":
          this.ctx.fillStyle = "#8B4513"; // Brown brick
          break;
        case "steel":
          this.ctx.fillStyle = "#C0C0C0"; // Silver steel
          break;
        case "water":
          this.ctx.fillStyle = "#4169E1"; // Blue water
          break;
        case "forest":
          this.ctx.fillStyle = "#228B22"; // Green forest
          break;
        case "concrete":
          this.ctx.fillStyle = "#696969"; // Dark gray concrete
          break;
        default:
          this.ctx.fillStyle = "#8B4513"; // Default to brick
      }

      this.ctx.fillRect(wall.x, wall.y, this.tileSize, this.tileSize);

      // Add texture/pattern based on terrain type
      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = 1;

      switch (wall.type) {
        case "brick":
          // Brick pattern
          this.ctx.strokeStyle = "#654321";
          this.ctx.strokeRect(wall.x, wall.y, this.tileSize, this.tileSize);
          this.ctx.strokeRect(
            wall.x,
            wall.y + this.tileSize / 2,
            this.tileSize,
            this.tileSize / 2
          );
          break;

        case "steel":
          // Steel pattern with bolts
          this.ctx.strokeStyle = "#A0A0A0";
          this.ctx.strokeRect(wall.x, wall.y, this.tileSize, this.tileSize);
          this.ctx.fillStyle = "#808080";
          this.ctx.fillRect(wall.x + 5, wall.y + 5, 4, 4);
          this.ctx.fillRect(wall.x + this.tileSize - 9, wall.y + 5, 4, 4);
          this.ctx.fillRect(wall.x + 5, wall.y + this.tileSize - 9, 4, 4);
          this.ctx.fillRect(
            wall.x + this.tileSize - 9,
            wall.y + this.tileSize - 9,
            4,
            4
          );
          break;

        case "water":
          // Water wave pattern
          this.ctx.strokeStyle = "#1E90FF";
          this.ctx.strokeRect(wall.x, wall.y, this.tileSize, this.tileSize);
          this.ctx.beginPath();
          this.ctx.moveTo(wall.x, wall.y + this.tileSize / 3);
          this.ctx.quadraticCurveTo(
            wall.x + this.tileSize / 2,
            wall.y + this.tileSize / 6,
            wall.x + this.tileSize,
            wall.y + this.tileSize / 3
          );
          this.ctx.stroke();
          break;

        case "forest":
          // Forest tree pattern
          this.ctx.strokeStyle = "#006400";
          this.ctx.strokeRect(wall.x, wall.y, this.tileSize, this.tileSize);
          this.ctx.fillStyle = "#32CD32";
          this.ctx.fillRect(wall.x + 8, wall.y + 8, 8, 8);
          this.ctx.fillRect(wall.x + 20, wall.y + 15, 8, 8);
          this.ctx.fillRect(wall.x + 15, wall.y + 25, 6, 6);
          break;

        case "concrete":
          // Concrete pattern
          this.ctx.strokeStyle = "#2F4F4F";
          this.ctx.strokeRect(wall.x, wall.y, this.tileSize, this.tileSize);
          this.ctx.strokeRect(
            wall.x + 10,
            wall.y + 10,
            this.tileSize - 20,
            this.tileSize - 20
          );
          break;

        default:
          this.ctx.strokeRect(wall.x, wall.y, this.tileSize, this.tileSize);
      }
    }

    // Draw player
    if (this.player.alive) {
      this.drawTank(this.player);
    }

    // Draw base (eagle)
    if (this.base && this.base.alive) {
      this.ctx.fillStyle = this.base.color;
      this.ctx.fillRect(this.base.x, this.base.y, this.base.width, this.base.height);
      
      // Draw eagle symbol
      this.ctx.fillStyle = "#8B4513";
      this.ctx.fillRect(this.base.x + 8, this.base.y + 8, 24, 8);
      this.ctx.fillRect(this.base.x + 16, this.base.y + 16, 8, 16);
      
      // Add outline
      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(this.base.x, this.base.y, this.base.width, this.base.height);
    } else if (this.base && !this.base.alive) {
      // Draw destroyed base
      this.ctx.fillStyle = "#8B0000";
      this.ctx.fillRect(this.base.x, this.base.y, this.base.width, this.base.height);
      
      // Draw "X" over destroyed base
      this.ctx.strokeStyle = "#FF0000";
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(this.base.x, this.base.y);
      this.ctx.lineTo(this.base.x + this.base.width, this.base.y + this.base.height);
      this.ctx.moveTo(this.base.x + this.base.width, this.base.y);
      this.ctx.lineTo(this.base.x, this.base.y + this.base.height);
      this.ctx.stroke();
    }

    // Draw enemies
    for (let enemy of this.enemies) {
      if (enemy.alive) {
        this.drawTank(enemy);
      }
    }

    // Debug: Draw enemy count
    this.ctx.fillStyle = "#FFF";
    this.ctx.font = "16px monospace";
    this.ctx.fillText(`Enemies on field: ${this.enemies.length}`, 10, 30);

    // Draw bullets
    for (let bullet of this.bullets) {
      this.ctx.fillStyle = bullet.color;
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
  }

  drawTank(tank) {
    this.ctx.fillStyle = tank.color;
    this.ctx.fillRect(tank.x, tank.y, tank.width, tank.height);

    // Draw health indicator for enemies
    if (tank !== this.player && tank.maxHealth > 1) {
      const healthBarWidth = tank.width - 4;
      const healthBarHeight = 4;
      const healthPercentage = tank.health / tank.maxHealth;

      // Background (red)
      this.ctx.fillStyle = "#FF0000";
      this.ctx.fillRect(
        tank.x + 2,
        tank.y - 8,
        healthBarWidth,
        healthBarHeight
      );

      // Health (green)
      this.ctx.fillStyle = "#00FF00";
      this.ctx.fillRect(
        tank.x + 2,
        tank.y - 8,
        healthBarWidth * healthPercentage,
        healthBarHeight
      );
    }

    // Draw tank direction indicator (barrel) - Bigger and more visible
    this.ctx.fillStyle = "#333";
    let barrelX = tank.x + tank.width / 2 - 4;
    let barrelY = tank.y + tank.height / 2 - 4;
    let barrelWidth = 8;
    let barrelHeight = 8;

    switch (tank.direction) {
      case 0: // up
        barrelY = tank.y - 12;
        barrelHeight = 16;
        break;
      case 1: // right
        barrelX = tank.x + tank.width - 4;
        barrelWidth = 16;
        break;
      case 2: // down
        barrelY = tank.y + tank.height - 4;
        barrelHeight = 16;
        break;
      case 3: // left
        barrelX = tank.x - 12;
        barrelWidth = 16;
        break;
    }

    this.ctx.fillRect(barrelX, barrelY, barrelWidth, barrelHeight);

    // Add tank outline - Thicker for better visibility
    this.ctx.strokeStyle = "#000";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(tank.x, tank.y, tank.width, tank.height);

    // Add type indicator for enemies
    if (tank !== this.player) {
      this.ctx.fillStyle = "#FFF";
      this.ctx.font = "12px monospace";
      this.ctx.textAlign = "center";
      const typeIndicator =
        tank.type === "light"
          ? "L"
          : tank.type === "medium"
          ? "M"
          : tank.type === "heavy"
          ? "H"
          : "F";
      this.ctx.fillText(
        typeIndicator,
        tank.x + tank.width / 2,
        tank.y + tank.height / 2 + 4
      );
    }
  }

  respawnPlayer() {
    this.player.x = 7 * this.tileSize; // Center horizontally for 16-wide grid
    this.player.y = 13 * this.tileSize; // Move up one tile from bottom border
    this.player.alive = true;
    this.player.direction = 0;
    this.updateUI();
  }

  levelComplete() {
    this.gameRunning = false;
    document.getElementById("levelComplete").classList.remove("hidden");
  }

  nextLevel() {
    this.level++;
    document.getElementById("levelComplete").classList.add("hidden");
    this.enemies = [];
    this.bullets = [];
    this.createBase(); // Recreate base for new level
    this.generateLevel();
    this.enemyTanksRemaining = 20; // Always 20 enemies per level
    this.enemiesKilled = 0;
    this.maxEnemiesOnField = Math.min(4 + this.level, 5); // Increase max enemies slightly
    this.gameRunning = true;
    this.updateUI();
  }

  gameOver() {
    this.gameRunning = false;
    this.sounds.gameOver();
    document.getElementById("gameOver").classList.remove("hidden");
  }

  restartGame() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];
    this.spacePressed = false;

    document.getElementById("gameOver").classList.add("hidden");
    document.getElementById("levelComplete").classList.add("hidden");

    this.initGame();
  }

  updateUI() {
    document.getElementById("score").textContent = this.score;
    document.getElementById("lives").textContent = this.lives;
    document.getElementById("level").textContent = this.level;
    document.getElementById("enemies").textContent =
      this.enemyTanksRemaining + this.enemies.length;
  }

  findBestDirection(enemy) {
    // Try all four directions and pick the one that allows movement
    const directions = [0, 1, 2, 3];
    const validDirections = [];

    for (let dir of directions) {
      let testX = enemy.x;
      let testY = enemy.y;

      switch (dir) {
        case 0:
          testY -= enemy.speed * 2;
          break; // up
        case 1:
          testX += enemy.speed * 2;
          break; // right
        case 2:
          testY += enemy.speed * 2;
          break; // down
        case 3:
          testX -= enemy.speed * 2;
          break; // left
      }

      if (this.canMoveTo(testX, testY, enemy.width, enemy.height, enemy)) {
        validDirections.push(dir);
      }
    }

    if (validDirections.length === 0) {
      // If no direction works, try to move in smaller steps
      for (let dir of directions) {
        let testX = enemy.x;
        let testY = enemy.y;

        switch (dir) {
          case 0:
            testY -= 1;
            break;
          case 1:
            testX += 1;
            break;
          case 2:
            testY += 1;
            break;
          case 3:
            testX -= 1;
            break;
        }

        if (this.canMoveTo(testX, testY, enemy.width, enemy.height, enemy)) {
          validDirections.push(dir);
        }
      }
    }

    if (validDirections.length > 0) {
      // Use aggressiveness to determine behavior
      if (
        this.player &&
        this.player.alive &&
        Math.random() < enemy.aggressiveness
      ) {
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;

        let bestDir = validDirections[0];
        let bestScore = -1;

        for (let dir of validDirections) {
          let score = 0;

          // Give preference to directions that get closer to player
          if (dir === 0 && playerCenterY < enemyCenterY) score += 3; // up towards player
          if (dir === 1 && playerCenterX > enemyCenterX) score += 3; // right towards player
          if (dir === 2 && playerCenterY > enemyCenterY) score += 3; // down towards player
          if (dir === 3 && playerCenterX < enemyCenterX) score += 3; // left towards player

          // Add some randomness but less for aggressive enemies
          score += Math.random() * (enemy.aggressiveness < 0.5 ? 2 : 1);

          if (score > bestScore) {
            bestScore = score;
            bestDir = dir;
          }
        }

        return bestDir;
      }

      return validDirections[
        Math.floor(Math.random() * validDirections.length)
      ];
    }

    // Last resort: return a random direction
    return Math.floor(Math.random() * 4);
  }
}

// Start the game when the page loads
window.addEventListener("load", () => {
  new Tank1990Game();
});
