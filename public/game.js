const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const socket = io();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const players = {};
const playerRadius = 20;
const moveSpeed = 5;
const smoothingFactor = 0.1; // Factor for smoothing position updates

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('currentPlayers', (currentPlayers) => {
  Object.keys(currentPlayers).forEach((id) => {
    if (!players[id]) {
      players[id] = currentPlayers[id];
    }
  });
  draw();
});

socket.on('newPlayer', (newPlayer) => {
  players[newPlayer.id] = { x: newPlayer.x, y: newPlayer.y, color: newPlayer.color };
  draw();
});

socket.on('move', (data) => {
  if (players[data.id]) {
    players[data.id].targetX = data.x; // Set target position
    players[data.id].targetY = data.y;
  }
});

socket.on('remove', (data) => {
  delete players[data.id];
  draw();
});

const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

function update() {
  if (players[socket.id]) {
    let player = players[socket.id];
    if (keys['w'] && player.y - playerRadius - moveSpeed >= 0) player.y -= moveSpeed;
    if (keys['a'] && player.x - playerRadius - moveSpeed >= 0) player.x -= moveSpeed;
    if (keys['s'] && player.y + playerRadius + moveSpeed <= canvas.height) player.y += moveSpeed;
    if (keys['d'] && player.x + playerRadius + moveSpeed <= canvas.width) player.x += moveSpeed;

    // Avoid overlap with other players
    for (let id in players) {
      if (id !== socket.id) {
        let otherPlayer = players[id];
        let dx = player.x - otherPlayer.x;
        let dy = player.y - otherPlayer.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < playerRadius * 2) {
          if (keys['w']) player.y += moveSpeed;
          if (keys['a']) player.x += moveSpeed;
          if (keys['s']) player.y -= moveSpeed;
          if (keys['d']) player.x -= moveSpeed;
        }
      }
    }

    socket.emit('move', { x: player.x, y: player.y });
  }

  // Interpolate positions
  for (let id in players) {
    let player = players[id];
    if (player.targetX !== undefined && player.targetY !== undefined) {
      player.x += (player.targetX - player.x) * smoothingFactor;
      player.y += (player.targetY - player.y) * smoothingFactor;
    }
  }
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let id in players) {
    context.beginPath();
    context.arc(players[id].x, players[id].y, playerRadius, 0, Math.PI * 2);
    context.fillStyle = players[id].color;
    context.fill();
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();

