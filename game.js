const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const scoreText = document.querySelector("#scoreText");
const highScoreText = document.querySelector("#highScoreText");
const gameMenu = document.querySelector("#gameMenu");
const startButton = document.querySelector("#startButton");
const jumpButton = document.querySelector("#jumpButton");
const resetHighScoreButton = document.querySelector("#resetHighScoreButton");

const world = {
  width: 960,
  height: 540,
  groundY: 430
};

const storageKey = "baby-cheese-jump-high-score";
let highScore = Number(localStorage.getItem(storageKey) || "0");
let state = "ready";
let lastTime = 0;
let score = 0;
let speed = 345;
let spawnTimer = 0;
let spawnAfter = 1.25;
let clouds = [];
let leaves = [];
let stars = [];
let obstacles = [];
let fartPuffs = [];
let boostTimer = 0;
let boostCooldown = 0;

const baby = {
  x: 144,
  y: world.groundY - 86,
  width: 58,
  height: 86,
  velocityY: 0,
  grounded: true
};

function setupCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  canvas.width = Math.round(box.width * ratio);
  canvas.height = Math.round(box.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  world.width = box.width;
  world.height = box.height;
  world.groundY = world.height * 0.79;
  baby.y = baby.grounded ? world.groundY - baby.height : baby.y;
}

function makeScenery() {
  clouds = Array.from({ length: 5 }, (_, index) => ({
    x: index * 230 + Math.random() * 90,
    y: 46 + Math.random() * 80,
    size: 34 + Math.random() * 22
  }));

  leaves = Array.from({ length: 18 }, (_, index) => ({
    x: index * 76 + Math.random() * 40,
    y: 22 + Math.random() * 170,
    size: 12 + Math.random() * 18,
    sway: Math.random() * Math.PI * 2
  }));

  stars = Array.from({ length: 42 }, () => ({
    x: Math.random() * world.width,
    y: 24 + Math.random() * world.height * 0.45,
    size: 1 + Math.random() * 2.4,
    twinkle: Math.random() * Math.PI * 2
  }));
}

function resetGame() {
  score = 0;
  speed = Math.max(290, world.width * 0.36);
  spawnTimer = 0;
  spawnAfter = 0.95;
  obstacles = [];
  fartPuffs = [];
  boostTimer = 0;
  boostCooldown = 0;
  baby.y = world.groundY - baby.height;
  baby.velocityY = 0;
  baby.grounded = true;
}

function startGame() {
  resetGame();
  state = "playing";
  gameMenu.classList.add("hidden");
}

function endGame() {
  state = "over";
  highScore = Math.max(highScore, Math.floor(score));
  localStorage.setItem(storageKey, String(highScore));
  startButton.textContent = "Restart";
  gameMenu.classList.remove("hidden");
  updateHud();
}

function jump() {
  if (state !== "playing") {
    startGame();
  }

  if (!baby.grounded) {
    return;
  }

  baby.velocityY = -Math.max(690, world.height * 1.16);
  baby.grounded = false;
}

function fartBoost() {
  if (state !== "playing") {
    startGame();
  }

  if (boostCooldown > 0) {
    return;
  }

  boostTimer = 0.42;
  boostCooldown = 1.18;
  baby.velocityY = Math.min(baby.velocityY, 80) - Math.max(280, world.height * 0.46);
  baby.grounded = false;
  addFartPuffs(8);
}

function addFartPuffs(count) {
  for (let index = 0; index < count; index += 1) {
    fartPuffs.push({
      x: baby.x + 5 + Math.random() * 8,
      y: baby.y + 58 + Math.random() * 12,
      size: 8 + Math.random() * 9,
      velocityX: -130 - Math.random() * 120,
      velocityY: -50 + Math.random() * 80,
      age: 0,
      life: 0.34 + Math.random() * 0.24
    });
  }
}

function isNight() {
  return score >= 160;
}

function spawnCheese() {
  const size = 46 + Math.random() * 18;
  obstacles.push({
    type: "cheese",
    x: world.width + size,
    y: world.groundY - size + 6,
    width: size * 1.18,
    height: size,
    passed: false
  });
}

function spawnSnake() {
  const height = 28 + Math.random() * 6;
  obstacles.push({
    type: "snake",
    x: world.width + 90,
    y: world.groundY - height + 4,
    width: 86,
    height,
    phase: Math.random() * Math.PI * 2,
    age: 0,
    passed: false
  });
}

function spawnObstacle() {
  const night = isNight();
  const roll = Math.random();

  if (night && roll < 0.5) {
    spawnSnake();
  } else {
    spawnCheese();
  }

  spawnAfter = night ? 0.68 + Math.random() * 0.62 : 0.85 + Math.random() * 0.9;
}

function updateGame(delta) {
  if (state !== "playing") {
    return;
  }

  score += delta * 10;
  speed += delta * 5.5;
  spawnTimer += delta;
  boostTimer = Math.max(0, boostTimer - delta);
  boostCooldown = Math.max(0, boostCooldown - delta);

  if (boostTimer > 0) {
    addFartPuffs(1);
    score += delta * 8;
  }

  if (spawnTimer >= spawnAfter) {
    spawnTimer = 0;
    spawnObstacle();
  }

  baby.velocityY += Math.max(1850, world.height * 3.2) * delta;
  baby.y += baby.velocityY * delta;

  if (baby.y >= world.groundY - baby.height) {
    baby.y = world.groundY - baby.height;
    baby.velocityY = 0;
    baby.grounded = true;
  }

  obstacles.forEach((obstacle) => {
    obstacle.age = (obstacle.age || 0) + delta;
    const boostedSpeed = speed + (boostTimer > 0 ? Math.max(170, world.width * 0.18) : 0);
    obstacle.x -= boostedSpeed * delta;

    if (obstacle.type === "snake") {
      obstacle.y = world.groundY - obstacle.height + 4 + Math.sin(obstacle.age * 9 + obstacle.phase) * 2;
    }

    if (!obstacle.passed && obstacle.x + obstacle.width < baby.x) {
      obstacle.passed = true;
      score += 12;
    }
  });

  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -40);
  fartPuffs.forEach((puff) => {
    puff.age += delta;
    puff.x += puff.velocityX * delta;
    puff.y += puff.velocityY * delta;
    puff.size += delta * 28;
  });
  fartPuffs = fartPuffs.filter((puff) => puff.age < puff.life);

  if (obstacles.some(hasCollision)) {
    endGame();
  }

  updateHud();
}

function hasCollision(obstacle) {
  const babyBox = {
    x: baby.x + 10,
    y: baby.y + 10,
    width: baby.width - 18,
    height: baby.height - 14
  };

  const cheeseBox = {
    x: obstacle.x + 8,
    y: obstacle.y + 8,
    width: obstacle.width - 14,
    height: obstacle.height - 12
  };

  return (
    babyBox.x < cheeseBox.x + cheeseBox.width &&
    babyBox.x + babyBox.width > cheeseBox.x &&
    babyBox.y < cheeseBox.y + cheeseBox.height &&
    babyBox.y + babyBox.height > cheeseBox.y
  );
}

function updateHud() {
  scoreText.textContent = String(Math.floor(score));
  highScoreText.textContent = String(highScore);
}

function drawBackground(time) {
  const night = isNight();
  const sky = ctx.createLinearGradient(0, 0, 0, world.height);
  if (night) {
    sky.addColorStop(0, "#10213f");
    sky.addColorStop(0.58, "#183457");
    sky.addColorStop(1, "#163825");
  } else {
    sky.addColorStop(0, "#aee9ec");
    sky.addColorStop(0.55, "#cfeec6");
    sky.addColorStop(1, "#8abb63");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, world.width, world.height);

  if (night) {
    stars.forEach((star) => {
      ctx.fillStyle = `rgba(255, 250, 218, ${0.45 + Math.sin(time * 2 + star.twinkle) * 0.22})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#fff5bd";
    ctx.beginPath();
    ctx.arc(world.width - 116, 78, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#10213f";
    ctx.beginPath();
    ctx.arc(world.width - 102, 66, 32, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#f7cf57";
    ctx.beginPath();
    ctx.arc(world.width - 108, 82, 42, 0, Math.PI * 2);
    ctx.fill();
  }

  clouds.forEach((cloud) => {
    cloud.x -= 0.16;
    if (cloud.x < -120) {
      cloud.x = world.width + 120;
    }

    ctx.fillStyle = night ? "rgba(214, 224, 230, 0.28)" : "rgba(255, 250, 240, 0.78)";
    ctx.beginPath();
    ctx.roundRect(cloud.x - cloud.size, cloud.y, cloud.size * 2.5, cloud.size * 0.72, 12);
    ctx.roundRect(cloud.x - cloud.size * 0.45, cloud.y - cloud.size * 0.48, cloud.size * 1.3, cloud.size * 0.92, 12);
    ctx.roundRect(cloud.x + cloud.size * 0.62, cloud.y - cloud.size * 0.24, cloud.size, cloud.size * 0.72, 12);
    ctx.fill();
  });

  drawJungleLayer(0.2, night ? "#123920" : "#1d7650", 0.58, time);
  drawJungleLayer(0.45, night ? "#0b2d1c" : "#135e41", 0.68, time + 2);
  drawJungleLayer(0.8, night ? "#061d14" : "#0b3f2d", 0.76, time + 4);
  drawLeaves(time, night);
  drawGround(time, night);
}

function drawJungleLayer(speedFactor, color, baseline, time) {
  const offset = (time * speed * speedFactor * 0.018) % 160;
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(6, 29, 20, 0.28)";
  ctx.lineWidth = 3;

  for (let x = -180 - offset; x < world.width + 180; x += 160) {
    const trunkHeight = world.height * 0.36;
    const trunkWidth = 24;
    const treeBase = world.height * baseline;

    ctx.fillStyle = "#7a5735";
    ctx.fillRect(x + 72, treeBase - trunkHeight, trunkWidth, trunkHeight);
    ctx.strokeRect(x + 72, treeBase - trunkHeight, trunkWidth, trunkHeight);

    ctx.fillStyle = color;
    [
      [x + 32, treeBase - trunkHeight - 18, 72, 58],
      [x + 74, treeBase - trunkHeight - 48, 74, 66],
      [x + 112, treeBase - trunkHeight - 4, 66, 54]
    ].forEach(([leafX, leafY, width, height]) => {
      ctx.beginPath();
      ctx.roundRect(leafX, leafY, width, height, 8);
      ctx.fill();
      ctx.stroke();
    });
  }
}

function drawLeaves(time, night) {
  leaves.forEach((leaf) => {
    leaf.x -= 0.52;
    if (leaf.x < -40) {
      leaf.x = world.width + 40;
    }

    const sway = Math.sin(time * 2 + leaf.sway) * 8;
    ctx.save();
    ctx.translate(leaf.x + sway, leaf.y);
    ctx.rotate(Math.sin(time + leaf.sway) * 0.18);
    ctx.fillStyle = night ? "#1c5e3b" : "#2f9c63";
    ctx.beginPath();
    ctx.roundRect(-leaf.size * 0.35, -leaf.size * 0.5, leaf.size * 0.7, leaf.size, 4);
    ctx.fill();
    ctx.restore();
  });
}

function drawGround(time, night) {
  ctx.fillStyle = night ? "#4b3928" : "#7d5c34";
  ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);

  ctx.fillStyle = night ? "#22552d" : "#4c8c41";
  ctx.fillRect(0, world.groundY - 15, world.width, 18);

  ctx.fillStyle = night ? "#6b5134" : "#9b713f";
  for (let x = -20; x < world.width + 24; x += 48) {
    ctx.fillRect(x, world.groundY + 26, 26, 14);
    ctx.fillRect(x + 18, world.groundY + 58, 34, 12);
  }

  ctx.strokeStyle = "rgba(255, 250, 240, 0.22)";
  ctx.lineWidth = 3;

  const offset = (time * speed * 0.06) % 42;
  for (let x = -42 - offset; x < world.width + 42; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, world.groundY - 4);
    ctx.lineTo(x + 18, world.groundY - 15);
    ctx.lineTo(x + 36, world.groundY - 5);
    ctx.stroke();
  }
}

function drawBaby(time) {
  const bob = baby.grounded ? Math.sin(time * 12) * 2 : 0;
  const x = baby.x;
  const y = baby.y + bob;

  ctx.save();
  ctx.translate(x, y);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.fillStyle = "rgba(16, 38, 26, 0.18)";
  ctx.beginPath();
  ctx.ellipse(32, 89, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 5;
  ctx.fillStyle = "#ef5f43";

  ctx.beginPath();
  ctx.roundRect(8, 47, 14, 27, 5);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(47, 47, 14, 27, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#1b2736";
  ctx.beginPath();
  ctx.roundRect(17, 72, 15, 17, 4);
  ctx.roundRect(39, 72, 15, 17, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ef5f43";
  ctx.beginPath();
  ctx.roundRect(13, 40, 44, 38, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#c9412f";
  ctx.beginPath();
  ctx.roundRect(21, 57, 28, 14, 4);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#fff4df";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(29, 46);
  ctx.lineTo(31, 56);
  ctx.moveTo(40, 46);
  ctx.lineTo(38, 56);
  ctx.stroke();

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 5;
  ctx.fillStyle = "#ef5f43";
  ctx.beginPath();
  ctx.roundRect(8, 1, 56, 49, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffd3ad";
  ctx.beginPath();
  ctx.roundRect(16, 10, 40, 33, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ef5f43";
  ctx.beginPath();
  ctx.roundRect(24, -4, 20, 11, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#40251e";
  ctx.beginPath();
  ctx.roundRect(17, 8, 38, 8, 4);
  ctx.fill();

  ctx.fillStyle = "#1b231f";
  ctx.beginPath();
  ctx.arc(26, 23, 2.8, 0, Math.PI * 2);
  ctx.arc(44, 23, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f17767";
  ctx.beginPath();
  ctx.arc(22, 31, 3.4, 0, Math.PI * 2);
  ctx.arc(49, 31, 3.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#8e4f42";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 33);
  ctx.quadraticCurveTo(35, 37, 41, 33);
  ctx.stroke();

  ctx.restore();
}

function drawFartPuffs() {
  fartPuffs.forEach((puff) => {
    const alpha = Math.max(0, 1 - puff.age / puff.life);
    ctx.save();
    ctx.globalAlpha = alpha * 0.75;
    ctx.fillStyle = "#b9e879";
    ctx.strokeStyle = "#487a35";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(puff.x, puff.y, puff.size * 1.25, puff.size, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function drawCheese(obstacle) {
  ctx.save();
  ctx.translate(obstacle.x, obstacle.y);
  ctx.lineJoin = "round";

  ctx.fillStyle = "#f8c744";
  ctx.strokeStyle = "#ad751d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, obstacle.height);
  ctx.lineTo(obstacle.width, obstacle.height);
  ctx.lineTo(obstacle.width * 0.24, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#d9922b";
  ctx.beginPath();
  ctx.moveTo(obstacle.width * 0.24, 0);
  ctx.lineTo(obstacle.width, obstacle.height);
  ctx.lineTo(obstacle.width * 0.8, obstacle.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff2a8";
  [[0.34, 0.48, 10, 8], [0.56, 0.72, 12, 10], [0.68, 0.38, 8, 8]].forEach(([x, y, width, height]) => {
    ctx.beginPath();
    ctx.roundRect(obstacle.width * x, obstacle.height * y, width, height, 3);
    ctx.fill();
  });

  ctx.restore();
}

function drawSnake(obstacle) {
  ctx.save();
  ctx.translate(obstacle.x, obstacle.y);

  ctx.fillStyle = "#78c45a";
  ctx.strokeStyle = "#285c2a";
  ctx.lineWidth = 3;
  for (let x = 0; x <= obstacle.width - 24; x += 16) {
    const y = obstacle.height * 0.5 + Math.sin(x * 0.18 + obstacle.age * 8) * 7;
    ctx.beginPath();
    ctx.roundRect(x, y - 8, 21, 16, 5);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = "#91db70";
  ctx.beginPath();
  ctx.roundRect(obstacle.width - 25, obstacle.height * 0.5 - 14, 28, 24, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(obstacle.width - 7, obstacle.height * 0.36, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#e65b58";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(obstacle.width + 2, obstacle.height * 0.5);
  ctx.lineTo(obstacle.width + 14, obstacle.height * 0.43);
  ctx.moveTo(obstacle.width + 2, obstacle.height * 0.5);
  ctx.lineTo(obstacle.width + 14, obstacle.height * 0.58);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(obstacle) {
  if (obstacle.type === "snake") {
    drawSnake(obstacle);
    return;
  }

  drawCheese(obstacle);
}

function drawOverlay() {
  if (state === "playing") {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(9, 39, 27, 0.36)";
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = "#fffaf0";
  ctx.textAlign = "center";
  ctx.font = "800 42px Arial";
  ctx.fillText(state === "over" ? "Game Over" : "Ready?", world.width / 2, world.height * 0.38);

  ctx.font = "700 24px Arial";
  ctx.fillText(`Best: ${highScore}`, world.width / 2, world.height * 0.48);
  ctx.restore();
}

function draw(time) {
  drawBackground(time);
  obstacles.forEach(drawObstacle);
  drawFartPuffs();
  drawBaby(time);
  drawOverlay();
}

function loop(timestamp) {
  const seconds = timestamp / 1000;
  const delta = Math.min(0.032, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  updateGame(delta);
  draw(seconds);
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", () => {
  startGame();
});

jumpButton.addEventListener("click", jump);
canvas.addEventListener("pointerdown", jump);

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    jump();
  }

  if (event.code === "KeyE") {
    event.preventDefault();
    fartBoost();
  }
});

resetHighScoreButton.addEventListener("click", () => {
  highScore = 0;
  localStorage.setItem(storageKey, "0");
  updateHud();
});

window.addEventListener("resize", setupCanvas);

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + width - r, y);
    this.quadraticCurveTo(x + width, y, x + width, y + r);
    this.lineTo(x + width, y + height - r);
    this.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    this.lineTo(x + r, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}

setupCanvas();
makeScenery();
resetGame();
updateHud();
requestAnimationFrame(loop);
