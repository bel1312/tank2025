class Tank1990Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = 640; // Smaller field
    this.canvas.height = 640; // Smaller field

    // Game state
    this.gameRunning = false;
    this.score = 0;
    this.level = 1;
    this.enemyTanksRemaining = 0;
    this.highScore = this.loadHighScore();

    // Level system
    this.levelConfig = this.getLevelConfigurations();
    this.currentLevelConfig = null;

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

    // Power-up system
    this.powerUpDropChance = 0.3; // 30% chance to drop power-up when enemy dies
    this.activeBuff = null; // Currently active buff
    this.buffTimer = 0; // Timer for active buff

    // Input handling
    this.keys = {};
    this.playerLastShot = 0; // Separate shooting cooldown for player
    this.shotCooldown = 2000; // Much slower fire rate for realistic tank combat (2 seconds)
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

    try {
      // Create simple sound effects using Web Audio API
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Shooting sound
      sounds.shoot = () => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(
            200,
            audioContext.currentTime + 0.1
          );

          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + 0.1
          );

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
          console.log("Sound error:", e);
        }
      };

      // Explosion sound
      sounds.explode = () => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(
            50,
            audioContext.currentTime + 0.3
          );

          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + 0.3
          );

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
          console.log("Sound error:", e);
        }
      };

      // Hit sound
      sounds.hit = () => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(
            100,
            audioContext.currentTime + 0.15
          );

          gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + 0.15
          );

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15);
        } catch (e) {
          console.log("Sound error:", e);
        }
      };

      // Game over sound
      sounds.gameOver = () => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(
            50,
            audioContext.currentTime + 1.0
          );

          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + 1.0
          );

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 1.0);
        } catch (e) {
          console.log("Sound error:", e);
        }
      };
    } catch (e) {
      console.log("Audio context creation failed:", e);
      // Create dummy sound functions if audio fails
      sounds.shoot = () => {};
      sounds.explode = () => {};
      sounds.hit = () => {};
      sounds.gameOver = () => {};
    }

    return sounds;
  }

  loadHighScore() {
    const stored = localStorage.getItem("tank2025_highscore");
    return stored ? parseInt(stored) : 0;
  }

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("tank2025_highscore", this.highScore.toString());
      return true; // New high score achieved
    }
    return false;
  }

  getLevelConfigurations() {
    return {
      1: {
        enemyCount: 20,
        maxEnemiesOnField: 4,
        spawnDelay: 1000,
        terrainDensity: 30,
        powerUpDropChance: 0.3,
        enemyTypes: {
          light: 50,
          medium: 30,
          heavy: 15,
          fast: 5,
        },
        goal: "Destroy all 20 enemy tanks",
        theme: "Basic Training",
      },
      2: {
        enemyCount: 25,
        maxEnemiesOnField: 5,
        spawnDelay: 900,
        terrainDensity: 35,
        powerUpDropChance: 0.25,
        enemyTypes: {
          light: 40,
          medium: 35,
          heavy: 20,
          fast: 5,
        },
        goal: "Survive 25 enemy waves",
        theme: "Intermediate Combat",
      },
      3: {
        enemyCount: 30,
        maxEnemiesOnField: 5,
        spawnDelay: 800,
        terrainDensity: 40,
        powerUpDropChance: 0.2,
        enemyTypes: {
          light: 30,
          medium: 35,
          heavy: 25,
          fast: 10,
        },
        goal: "Defeat 30 enemies in dense terrain",
        theme: "Urban Warfare",
      },
      4: {
        enemyCount: 35,
        maxEnemiesOnField: 6,
        spawnDelay: 700,
        terrainDensity: 45,
        powerUpDropChance: 0.15,
        enemyTypes: {
          light: 25,
          medium: 30,
          heavy: 30,
          fast: 15,
        },
        goal: "Heavy resistance - 35 enemies",
        theme: "Fortress Assault",
      },
      5: {
        enemyCount: 40,
        maxEnemiesOnField: 6,
        spawnDelay: 600,
        terrainDensity: 50,
        powerUpDropChance: 0.1,
        enemyTypes: {
          light: 20,
          medium: 25,
          heavy: 35,
          fast: 20,
        },
        goal: "Final battle - 40 elite enemies",
        theme: "Last Stand",
      },
    };
  }

  getCurrentLevelConfig() {
    const maxLevel = Math.max(...Object.keys(this.levelConfig).map(Number));
    if (this.level <= maxLevel) {
      return this.levelConfig[this.level];
    } else {
      // Generate endless levels beyond defined ones
      const baseConfig = this.levelConfig[maxLevel];
      const scaleFactor = this.level - maxLevel + 1;
      return {
        enemyCount: baseConfig.enemyCount + scaleFactor * 10,
        maxEnemiesOnField: Math.min(
          8,
          baseConfig.maxEnemiesOnField + Math.floor(scaleFactor / 2)
        ),
        spawnDelay: Math.max(300, baseConfig.spawnDelay - scaleFactor * 50),
        terrainDensity: Math.min(
          70,
          baseConfig.terrainDensity + scaleFactor * 5
        ),
        powerUpDropChance: Math.max(
          0.05,
          baseConfig.powerUpDropChance - scaleFactor * 0.02
        ),
        enemyTypes: {
          light: Math.max(5, 20 - scaleFactor * 2),
          medium: Math.max(10, 25 - scaleFactor),
          heavy: Math.min(50, 35 + scaleFactor * 2),
          fast: Math.min(35, 20 + scaleFactor * 3),
        },
        goal: `Endless Mode - Survive ${
          baseConfig.enemyCount + scaleFactor * 10
        } enemies`,
        theme: `Endless Level ${this.level}`,
      };
    }
  }

  getPowerUpTypes() {
    return [
      {
        type: "speed",
        name: "Speed Boost",
        color: "#00FFFF", // Cyan
        icon: "S",
        duration: 10000, // 10 seconds
        effect: "Increases movement speed by 50%",
      },
      {
        type: "rapidFire",
        name: "Rapid Fire",
        color: "#FF8C00", // Dark orange
        icon: "R",
        duration: 10000, // 10 seconds
        effect: "Reduces fire cooldown by 75%",
      },
      {
        type: "shield",
        name: "Shield",
        color: "#9370DB", // Medium purple
        icon: "♦",
        duration: 10000, // 10 seconds
        effect: "Absorbs one hit",
      },
      {
        type: "health",
        name: "Extra Life",
        color: "#FF1493", // Deep pink
        icon: "+",
        duration: 0, // Instant effect
        effect: "Adds +1 life",
      },
    ];
  }

  createPowerUp(x, y) {
    const powerUpTypes = this.getPowerUpTypes();
    const randomType =
      powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];

    const powerUp = {
      x: x,
      y: y,
      width: this.tileSize * 0.8, // Slightly smaller than tiles
      height: this.tileSize * 0.8,
      type: randomType.type,
      color: randomType.color,
      icon: randomType.icon,
      name: randomType.name,
      duration: randomType.duration,
      effect: randomType.effect,
      bobOffset: 0, // For visual bobbing effect
      lifetime: 15000, // Disappears after 15 seconds
      created: Date.now(),
    };

    this.powerUps.push(powerUp);
  }

  applyBuff(powerUpType) {
    switch (powerUpType) {
      case "speed":
        // Don't remove existing buff, just apply speed if not already active
        if (!this.activeBuff || this.activeBuff.type !== "speed") {
          this.activeBuff = {
            type: "speed",
            originalSpeed: this.player.speed,
            startTime: Date.now(),
            duration: Infinity, // Infinite duration until death
          };
          this.player.speed = this.player.speed * 1.5; // 50% speed increase
        }
        break;

      case "rapidFire":
        // Don't remove existing buff, just apply rapid fire if not already active
        if (!this.activeBuff || this.activeBuff.type !== "rapidFire") {
          this.activeBuff = {
            type: "rapidFire",
            originalCooldown: this.shotCooldown,
            startTime: Date.now(),
            duration: Infinity, // Infinite duration until death
          };
          this.shotCooldown = this.shotCooldown * 0.25; // 75% cooldown reduction
        }
        break;

      case "shield":
        // Shield can still replace other buffs and has limited duration
        this.removeBuff();
        this.activeBuff = {
          type: "shield",
          startTime: Date.now(),
          duration: 10000,
          hits: 1, // Can absorb 1 hit
        };
        break;

      case "health":
        // Directly add life
        this.player.lives++;
        this.updateUI();
        // No persistent buff for health
        return;
    }

    this.buffTimer = Date.now();
  }

  removeBuff() {
    if (!this.activeBuff) return;

    switch (this.activeBuff.type) {
      case "speed":
        this.player.speed = this.activeBuff.originalSpeed;
        break;
      case "rapidFire":
        this.shotCooldown = this.activeBuff.originalCooldown;
        break;
      // Shield buff is removed when hit or expires
    }

    this.activeBuff = null;
  }

  checkBuffExpiration() {
    if (!this.activeBuff) return;

    const elapsed = Date.now() - this.activeBuff.startTime;
    if (elapsed >= this.activeBuff.duration) {
      this.removeBuff();
    }
  }

  initGame() {
    this.createPlayer();
    this.createBase();

    // Get current level configuration
    this.currentLevelConfig = this.getCurrentLevelConfig();

    this.generateLevel();
    this.enemyTanksRemaining = this.currentLevelConfig.enemyCount;
    this.enemiesKilled = 0;
    this.maxEnemiesOnField = this.currentLevelConfig.maxEnemiesOnField;
    this.enemySpawnDelay = this.currentLevelConfig.spawnDelay;
    this.powerUpDropChance = this.currentLevelConfig.powerUpDropChance;
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
      color: "#FFD700", // Gold color for the base
    };
  }

  createPlayer() {
    this.player = {
      x: 7 * this.tileSize, // Center horizontally for 16-wide grid
      y: 12 * this.tileSize, // Move further up to avoid base area
      width: this.tileSize,
      height: this.tileSize,
      direction: 0, // 0: up, 1: right, 2: down, 3: left
      speed: 2, // Base speed
      alive: true,
      color: "#00ff00",
      lives: 3,
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

    // Add varied terrain types - use level configuration
    const terrainCount = this.currentLevelConfig
      ? this.currentLevelConfig.terrainDensity
      : 30;
    for (let i = 0; i < terrainCount; i++) {
      let x = Math.floor(Math.random() * (this.gridWidth - 4)) + 2;
      let y = Math.floor(Math.random() * (this.gridHeight - 4)) + 2;

      // Don't place terrain near player spawn or enemy spawn points
      // Updated for 16x16 grid - more restrictive around spawn areas
      if (
        (x >= 6 && x <= 8 && y >= 11 && y <= 13) || // Player area (expanded to include both old and new positions)
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
      { x: baseX + 2, y: baseY },
    ];

    for (let pos of brickPositions) {
      if (pos.x >= 1 && pos.x <= 14 && pos.y >= 1 && pos.y <= 14) {
        // Stay within borders
        this.walls.push({
          x: pos.x * this.tileSize,
          y: pos.y * this.tileSize,
          type: "brick",
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
    // Use level-specific enemy type distribution
    const levelWeights = this.currentLevelConfig
      ? this.currentLevelConfig.enemyTypes
      : {
          light: 40,
          medium: 30,
          heavy: 15,
          fast: 15,
        };

    const enemyTypes = [
      {
        name: "light",
        health: 1,
        speed: 1.5,
        color: "#FF6B6B", // Light red
        shootCooldown: 3000, // 3 seconds - realistic tank reload time
        aggressiveness: 0.7, // 70% chance to move toward player
        weight: levelWeights.light,
      },
      {
        name: "medium",
        health: 2,
        speed: 1.0,
        color: "#FF4444", // Medium red
        shootCooldown: 2500, // 2.5 seconds - faster than light tanks
        aggressiveness: 0.5,
        weight: levelWeights.medium,
      },
      {
        name: "heavy",
        health: 3,
        speed: 0.8,
        color: "#CC0000", // Dark red
        shootCooldown: 2000, // 2 seconds - heavy guns reload faster but move slower
        aggressiveness: 0.3,
        weight: levelWeights.heavy,
      },
      {
        name: "fast",
        health: 1,
        speed: 2.5,
        color: "#FF8888", // Pink red
        shootCooldown: 4000, // 4 seconds - very fast but poor gun
        aggressiveness: 0.8, // Very aggressive
        weight: levelWeights.fast,
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
      if (e.code === "Space" && !this.spacePressed && this.gameRunning) {
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

    // Update power-ups
    this.updatePowerUps();

    // Check buff expiration
    this.checkBuffExpiration();

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
      this.player.lives--;
      if (this.player.lives <= 0) {
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
        console.log(`Player moved to: (${this.player.x}, ${this.player.y})`);
      } else {
        console.log(`Movement blocked to: (${newX}, ${newY})`);
      }
    }
  }

  updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let enemy = this.enemies[i];

      if (!enemy.alive) {
        // Drop power-up chance
        if (Math.random() < this.powerUpDropChance) {
          this.createPowerUp(
            enemy.x + enemy.width / 4,
            enemy.y + enemy.height / 4
          );
        }

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
            // Check if player has shield buff
            if (
              this.activeBuff &&
              this.activeBuff.type === "shield" &&
              this.activeBuff.hits > 0
            ) {
              this.activeBuff.hits--;
              this.sounds.hit();
              if (this.activeBuff.hits <= 0) {
                this.removeBuff(); // Remove shield when depleted
              }
            } else {
              this.player.alive = false;
              this.sounds.explode();
            }
            hit = true;
          }

          // Check collision with base
          if (
            this.base &&
            this.base.alive &&
            this.collision(bullet, this.base)
          ) {
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

  updatePowerUps() {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      let powerUp = this.powerUps[i];

      // Update bobbing animation
      powerUp.bobOffset = Math.sin(Date.now() * 0.005) * 3;

      // Check if power-up expired
      if (Date.now() - powerUp.created > powerUp.lifetime) {
        this.powerUps.splice(i, 1);
        continue;
      }

      // Check collision with player
      if (this.player.alive && this.collision(this.player, powerUp)) {
        // Apply buff
        this.applyBuff(powerUp.type);

        // Remove power-up
        this.powerUps.splice(i, 1);

        // Play sound
        this.sounds.hit(); // Use hit sound for pickup
        continue;
      }
    }
  }

  shoot(tank) {
    // Use separate cooldown for player vs enemies
    const lastShot =
      tank === this.player ? this.playerLastShot : tank.lastShot || 0;
    const cooldown =
      tank === this.player ? this.shotCooldown : tank.shootCooldown;

    if (Date.now() - lastShot < cooldown) {
      return;
    }

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

    // Update the appropriate last shot time
    if (tank === this.player) {
      this.playerLastShot = Date.now();
    } else {
      tank.lastShot = Date.now();
    }
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
      console.log("Movement blocked by canvas bounds");
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
        console.log(
          `Movement blocked by ${wall.type} wall at (${wall.x}, ${wall.y})`
        );
        return false; // Cannot drive through other terrain types
      }
    }

    // Check collision with base
    if (this.base && this.base.alive && this.collision(testObj, this.base)) {
      console.log("Movement blocked by base");
      return false;
    }

    // Check collision with other tanks (prevent tanks from overlapping)
    // But exclude the tank that's trying to move
    if (this.player && this.player.alive && excludeTank !== this.player) {
      if (this.collision(testObj, this.player)) {
        console.log("Movement blocked by player tank");
        return false;
      }
    }

    for (let enemy of this.enemies) {
      if (
        enemy.alive &&
        excludeTank !== enemy &&
        this.collision(testObj, enemy)
      ) {
        console.log(`Movement blocked by enemy at (${enemy.x}, ${enemy.y})`);
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
      this.ctx.fillRect(
        this.base.x,
        this.base.y,
        this.base.width,
        this.base.height
      );

      // Draw eagle symbol
      this.ctx.fillStyle = "#8B4513";
      this.ctx.fillRect(this.base.x + 8, this.base.y + 8, 24, 8);
      this.ctx.fillRect(this.base.x + 16, this.base.y + 16, 8, 16);

      // Add outline
      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(
        this.base.x,
        this.base.y,
        this.base.width,
        this.base.height
      );
    } else if (this.base && !this.base.alive) {
      // Draw destroyed base
      this.ctx.fillStyle = "#8B0000";
      this.ctx.fillRect(
        this.base.x,
        this.base.y,
        this.base.width,
        this.base.height
      );

      // Draw "X" over destroyed base
      this.ctx.strokeStyle = "#FF0000";
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(this.base.x, this.base.y);
      this.ctx.lineTo(
        this.base.x + this.base.width,
        this.base.y + this.base.height
      );
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

    // Debug: Draw enemy count and player position
    this.ctx.fillStyle = "#FFF";
    this.ctx.font = "16px monospace";
    this.ctx.fillText(`Enemies on field: ${this.enemies.length}`, 10, 30);
    this.ctx.fillText(
      `Player: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`,
      10,
      50
    );
    this.ctx.fillText(
      `Keys: ${Object.keys(this.keys)
        .filter((k) => this.keys[k])
        .join(", ")}`,
      10,
      70
    );

    // Draw bullets
    for (let bullet of this.bullets) {
      this.ctx.fillStyle = bullet.color;
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }

    // Draw power-ups
    for (let powerUp of this.powerUps) {
      // Draw power-up with bobbing effect
      const drawY = powerUp.y + powerUp.bobOffset;

      // Draw power-up background
      this.ctx.fillStyle = powerUp.color;
      this.ctx.fillRect(powerUp.x, drawY, powerUp.width, powerUp.height);

      // Draw power-up icon
      this.ctx.fillStyle = "#FFF";
      this.ctx.font = "bold 20px monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        powerUp.icon,
        powerUp.x + powerUp.width / 2,
        drawY + powerUp.height / 2 + 6
      );

      // Draw outline
      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(powerUp.x, drawY, powerUp.width, powerUp.height);
    }

    // Draw active buff indicator
    if (this.activeBuff) {
      const timeLeft =
        this.activeBuff.duration - (Date.now() - this.activeBuff.startTime);
      const buffTypes = this.getPowerUpTypes();
      const buffInfo = buffTypes.find((b) => b.type === this.activeBuff.type);

      if (timeLeft > 0 && buffInfo) {
        this.ctx.fillStyle = buffInfo.color;
        this.ctx.fillRect(10, 90, 200, 30);

        this.ctx.fillStyle = "#000";
        this.ctx.font = "14px monospace";
        this.ctx.textAlign = "left";
        this.ctx.fillText(
          `${buffInfo.name}: ${Math.ceil(timeLeft / 1000)}s`,
          15,
          110
        );
      }
    }
  }

  drawTank(tank) {
    this.ctx.fillStyle = tank.color;
    this.ctx.fillRect(tank.x, tank.y, tank.width, tank.height);

    // Draw shield effect for player if active
    if (
      tank === this.player &&
      this.activeBuff &&
      this.activeBuff.type === "shield"
    ) {
      this.ctx.strokeStyle = "#9370DB";
      this.ctx.lineWidth = 4;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(
        tank.x - 4,
        tank.y - 4,
        tank.width + 8,
        tank.height + 8
      );
      this.ctx.setLineDash([]); // Reset dash
    }

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
    // Reset buffs when player dies
    this.removeBuff();

    this.player.x = 7 * this.tileSize; // Center horizontally for 16-wide grid
    this.player.y = 12 * this.tileSize; // Move further up to avoid base area
    this.player.alive = true;
    this.player.direction = 0;
    this.updateUI();
  }

  gameOver() {
    this.gameRunning = false;
    this.sounds.gameOver();

    // Save high score
    const newHighScore = this.saveHighScore();
    if (newHighScore) {
      // Could add special effect for new high score
      console.log("New high score achieved!");
    }

    document.getElementById("gameOver").classList.remove("hidden");
    this.updateUI(); // Update UI to show high score
  }

  levelComplete() {
    this.gameRunning = false;
    document.getElementById("levelComplete").classList.remove("hidden");

    // Add level completion bonus
    const levelBonus = this.level * 1000;
    this.score += levelBonus;
    this.updateUI();
  }

  nextLevel() {
    this.level++;
    document.getElementById("levelComplete").classList.add("hidden");
    this.enemies = [];
    this.bullets = [];
    this.createBase(); // Recreate base for new level

    // Use new level configuration
    this.currentLevelConfig = this.getCurrentLevelConfig();
    this.generateLevel();
    this.enemyTanksRemaining = this.currentLevelConfig.enemyCount;
    this.enemiesKilled = 0;
    this.maxEnemiesOnField = this.currentLevelConfig.maxEnemiesOnField;
    this.enemySpawnDelay = this.currentLevelConfig.spawnDelay;
    this.powerUpDropChance = this.currentLevelConfig.powerUpDropChance;
    this.gameRunning = true;
    this.updateUI();
  }

  restartGame() {
    this.score = 0;
    this.level = 1;
    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];
    this.spacePressed = false;

    // Reset buffs
    this.removeBuff();
    this.activeBuff = null;
    this.buffTimer = 0;

    document.getElementById("gameOver").classList.add("hidden");
    document.getElementById("levelComplete").classList.add("hidden");

    this.initGame();
  }

  updateUI() {
    document.getElementById("score").textContent = this.score;
    document.getElementById("lives").textContent = this.player.lives;
    document.getElementById("enemies").textContent = this.enemyTanksRemaining;
    document.getElementById("highScore").textContent = this.highScore;

    // Update level information
    const levelConfig = this.getCurrentLevelConfig();
    document.getElementById("levelInfo").innerHTML = `
      <strong>Level ${this.level} Goals:</strong><br>
      • Destroy ${levelConfig.enemyCount} enemy tanks<br>
      • Protect your base at all costs<br>
      • Current Enemies Remaining: ${this.enemyTanksRemaining}
    `;

    // Update enemy types information
    const enemyInfo = this.getEnemyTypesInfo();
    document.getElementById("enemyTypes").innerHTML = enemyInfo;

    // Update terrain information
    document.getElementById("terrainInfo").innerHTML = this.getTerrainInfo();
  }

  getEnemyTypesInfo() {
    return `
      <strong>Enemy Types in This Level:</strong><br>
      <div style="margin-left: 10px;">
        <div>🟢 <strong>Basic Tank:</strong> Standard enemy, 1 shot to destroy</div>
        <div>🔴 <strong>Fast Tank:</strong> Moves quickly, 1 shot to destroy</div>
        <div>🟡 <strong>Heavy Tank:</strong> Slower but takes 2 shots to destroy</div>
        <div>⚪ <strong>Power Tank:</strong> Fast firing and durable, 2 shots to destroy</div>
      </div>
      <br>
      <strong>Current Active Enemies:</strong> ${this.enemies.length}/${this.maxEnemiesOnField}
    `;
  }

  getTerrainInfo() {
    return `
      <strong>Terrain Types:</strong><br>
      <div style="margin-left: 10px;">
        <div>🟫 <strong>Brick Walls:</strong> Destructible by tank shots</div>
        <div>⬜ <strong>Steel Blocks:</strong> Indestructible barriers</div>
        <div>🌲 <strong>Forest:</strong> Tanks can hide but bullets pass through</div>
        <div>🌊 <strong>Water:</strong> Impassable for all tanks</div>
        <div>❄️ <strong>Ice:</strong> Tanks slide and have reduced control</div>
      </div>
      <br>
      <strong>Terrain Density:</strong> ${Math.round(
        this.currentLevelConfig.terrainDensity * 100
      )}%
    `;
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
