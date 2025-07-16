class Tank1990Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = 640;  // Smaller field
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

    // Enemy spawning - Updated for smaller grid
    this.enemySpawnPoints = [
      { x: 0, y: 0 },
      { x: 7, y: 0 },  // Center top
      { x: 14, y: 0 }, // Right top
    ];
    this.enemySpawnTimer = 0;
    this.enemySpawnDelay = 2000;

    this.initGame();
    this.setupEventListeners();
    this.gameLoop();
  }

  initGame() {
    this.createPlayer();
    this.generateLevel();
    this.enemyTanksRemaining = 4 + this.level;
    this.gameRunning = true;
    this.updateUI();
  }

  createPlayer() {
    this.player = {
      x: 7 * this.tileSize,  // Center horizontally for 16-wide grid
      y: 14 * this.tileSize, // Near bottom for 16-tall grid
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

    // Create border walls
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

    // Add some random brick walls - Fewer walls for smaller grid
    for (let i = 0; i < 20 + this.level * 5; i++) {
      let x = Math.floor(Math.random() * (this.gridWidth - 4)) + 2;
      let y = Math.floor(Math.random() * (this.gridHeight - 4)) + 2;

      // Don't place walls near player spawn or enemy spawn points
      // Updated for 16x16 grid
      if (
        (x >= 6 && x <= 8 && y >= 12) ||  // Player area
        (x <= 2 && y <= 2) ||             // Top-left enemy spawn
        (x >= 6 && x <= 8 && y <= 2) ||   // Top-center enemy spawn
        (x >= 12 && y <= 2)               // Top-right enemy spawn
      ) {
        continue;
      }

      this.walls.push({
        x: x * this.tileSize,
        y: y * this.tileSize,
        type: "brick",
      });
    }
  }

  spawnEnemy() {
    if (this.enemies.length >= 3 || this.enemyTanksRemaining <= 0) return;

    const spawnPoint =
      this.enemySpawnPoints[
        Math.floor(Math.random() * this.enemySpawnPoints.length)
      ];

    // Check if spawn point is clear
    const spawnX = spawnPoint.x * this.tileSize;
    const spawnY = spawnPoint.y * this.tileSize;

    let canSpawn = true;

    // Check if spawn point has any walls
    if (!this.canMoveTo(spawnX, spawnY, this.tileSize, this.tileSize)) {
      canSpawn = false;
    }

    // Check distance from other enemies
    for (let enemy of this.enemies) {
      if (this.distance(enemy.x, enemy.y, spawnX, spawnY) < this.tileSize * 2) {
        canSpawn = false;
        break;
      }
    }

    // Check distance from player
    if (this.player && this.player.alive) {
      if (
        this.distance(this.player.x, this.player.y, spawnX, spawnY) <
        this.tileSize * 3
      ) {
        canSpawn = false;
      }
    }

    if (canSpawn) {
      this.enemies.push({
        x: spawnX,
        y: spawnY,
        width: this.tileSize,
        height: this.tileSize,
        direction: Math.floor(Math.random() * 4),
        speed: 1 + Math.random(),
        alive: true,
        color: "#ff0000",
        lastDirectionChange: Date.now(),
        lastShot: 0,
        shootCooldown: 1000 + Math.random() * 1000,
        stuckCounter: 0,
        lastPosition: { x: spawnX, y: spawnY },
      });
      this.enemyTanksRemaining--;
    }
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;

      if (e.code === "KeyR") {
        this.restartGame();
      }

      if (e.code === "Space") {
        e.preventDefault();
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
      this.keys[e.code] = false;
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

    // Check win condition
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

    if (
      moved &&
      this.canMoveTo(newX, newY, this.player.width, this.player.height)
    ) {
      this.player.x = newX;
      this.player.y = newY;
    }
  }

  updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let enemy = this.enemies[i];

      if (!enemy.alive) {
        this.enemies.splice(i, 1);
        this.score += 100;
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

      // If stuck for too long, try to find a way out
      if (
        enemy.stuckCounter > 30 ||
        Date.now() - enemy.lastDirectionChange > 1000 + Math.random() * 2000
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

      if (this.canMoveTo(newX, newY, enemy.width, enemy.height)) {
        enemy.x = newX;
        enemy.y = newY;
      } else {
        // If can't move, immediately try to find a new direction
        enemy.direction = this.findBestDirection(enemy);
        enemy.lastDirectionChange = Date.now();
      }

      // Enemy shooting
      if (Date.now() - enemy.lastShot > enemy.shootCooldown) {
        this.shoot(enemy);
        enemy.lastShot = Date.now();
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
          if (wall.type === "brick") {
            this.walls.splice(j, 1);
          }
          hit = true;
          break;
        }
      }

      // Check collision with tanks
      if (!hit) {
        if (bullet.owner === "player") {
          for (let enemy of this.enemies) {
            if (this.collision(bullet, enemy)) {
              enemy.alive = false;
              hit = true;
              break;
            }
          }
        } else {
          if (this.collision(bullet, this.player)) {
            this.player.alive = false;
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

    let bulletX = tank.x + tank.width / 2 - 4;  // Bigger bullet
    let bulletY = tank.y + tank.height / 2 - 4; // Bigger bullet

    // Adjust bullet position based on direction
    switch (tank.direction) {
      case 0:
        bulletY = tank.y - 8;  // Bigger offset
        break;
      case 1:
        bulletX = tank.x + tank.width;
        break;
      case 2:
        bulletY = tank.y + tank.height;
        break;
      case 3:
        bulletX = tank.x - 8;  // Bigger offset
        break;
    }

    this.bullets.push({
      x: bulletX,
      y: bulletY,
      width: 8,   // Bigger bullet
      height: 8,  // Bigger bullet
      direction: tank.direction,
      speed: 6,   // Slightly faster
      owner: tank === this.player ? "player" : "enemy",
      color: "#ffff00",
    });

    this.lastShot = Date.now();
  }

  canMoveTo(x, y, width, height) {
    // Add a small buffer to prevent getting stuck at exact boundaries
    const buffer = 1;

    // Check canvas bounds with buffer
    if (
      x < buffer ||
      y < buffer ||
      x + width > this.canvas.width - buffer ||
      y + height > this.canvas.height - buffer
    ) {
      return false;
    }

    // Check wall collision
    let testObj = { x, y, width, height };
    for (let wall of this.walls) {
      if (this.collision(testObj, wall)) {
        return false;
      }
    }

    // Check collision with other tanks (prevent tanks from overlapping)
    if (this.player && this.player.alive) {
      if (
        this.collision(testObj, this.player) &&
        !(testObj.x === this.player.x && testObj.y === this.player.y)
      ) {
        return false;
      }
    }

    for (let enemy of this.enemies) {
      if (
        enemy.alive &&
        this.collision(testObj, enemy) &&
        !(testObj.x === enemy.x && testObj.y === enemy.y)
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

    // Draw walls
    for (let wall of this.walls) {
      this.ctx.fillStyle = wall.type === "brick" ? "#8B4513" : "#C0C0C0";
      this.ctx.fillRect(wall.x, wall.y, this.tileSize, this.tileSize);

      // Add texture
      this.ctx.strokeStyle = wall.type === "brick" ? "#654321" : "#A0A0A0";
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(wall.x, wall.y, this.tileSize, this.tileSize);
    }

    // Draw player
    if (this.player.alive) {
      this.drawTank(this.player);
    }

    // Draw enemies
    for (let enemy of this.enemies) {
      if (enemy.alive) {
        this.drawTank(enemy);
      }
    }

    // Draw bullets
    for (let bullet of this.bullets) {
      this.ctx.fillStyle = bullet.color;
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
  }

  drawTank(tank) {
    this.ctx.fillStyle = tank.color;
    this.ctx.fillRect(tank.x, tank.y, tank.width, tank.height);

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
  }

  respawnPlayer() {
    this.player.x = 7 * this.tileSize;  // Center horizontally for 16-wide grid
    this.player.y = 14 * this.tileSize; // Near bottom for 16-tall grid
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
    this.generateLevel();
    this.enemyTanksRemaining = 4 + this.level;
    this.gameRunning = true;
    this.updateUI();
  }

  gameOver() {
    this.gameRunning = false;
    document.getElementById("gameOver").classList.remove("hidden");
  }

  restartGame() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];

    document.getElementById("gameOver").classList.add("hidden");
    document.getElementById("levelComplete").classList.add("hidden");

    this.initGame();
  }

  updateUI() {
    document.getElementById("score").textContent = this.score;
    document.getElementById("lives").textContent = this.lives;
    document.getElementById("level").textContent = this.level;
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

      if (this.canMoveTo(testX, testY, enemy.width, enemy.height)) {
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

        if (this.canMoveTo(testX, testY, enemy.width, enemy.height)) {
          validDirections.push(dir);
        }
      }
    }

    if (validDirections.length > 0) {
      // Prefer directions that move towards the player (simple AI improvement)
      if (this.player && this.player.alive) {
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;

        let bestDir = validDirections[0];
        let bestScore = -1;

        for (let dir of validDirections) {
          let score = 0;

          // Give preference to directions that get closer to player
          if (dir === 0 && playerCenterY < enemyCenterY) score += 2; // up towards player
          if (dir === 1 && playerCenterX > enemyCenterX) score += 2; // right towards player
          if (dir === 2 && playerCenterY > enemyCenterY) score += 2; // down towards player
          if (dir === 3 && playerCenterX < enemyCenterX) score += 2; // left towards player

          // Add some randomness
          score += Math.random();

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
