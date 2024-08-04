const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const players = {};
const bullets = [];
const powerUps = [];

// Serve static files from the public directory
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 800,
        y: Math.random() * 600,
        health: 100,
        score: 0,
        weapon: 'pistol',
        armor: 'none',
        color: '#0000ff',
        speed: 5,
        weaponProps: { speed: 10, damage: 10, rate: 400 }
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    socket.on('startGame', (loadout) => {
        const player = players[socket.id];
        if (player) {
            player.weapon = loadout.weapon;
            player.armor = loadout.armor;
            player.color = loadout.color;

            // Adjust player speed and health based on armor
            switch (loadout.armor) {
                case 'light':
                    player.speed = 6;
                    player.health = 80;
                    break;
                case 'medium':
                    player.speed = 5;
                    player.health = 100;
                    break;
                case 'heavy':
                    player.speed = 4;
                    player.health = 120;
                    break;
                default:
                    player.speed = 5;
                    player.health = 100;
            }

            // Define weapon properties
            const weapons = {
                pistol: { speed: 10, damage: 10, rate: 400 },
                smg: { speed: 12, damage: 8, rate: 100 },
                shotgun: { speed: 8, damage: 20, rate: 800 },
                assaultRifle: { speed: 15, damage: 12, rate: 200 },
                sniper: { speed: 20, damage: 50, rate: 1500 },
                lmg: { speed: 12, damage: 15, rate: 300 }
            };

            player.weaponProps = weapons[loadout.weapon];
        }
    });

    socket.on('playerMovement', (movementData) => {
        const player = players[socket.id];
        if (player) {
            player.x += movementData.x * player.speed;
            player.y += movementData.y * player.speed;
            io.emit('playerMoved', { id: socket.id, x: player.x, y: player.y });
        }
    });

    socket.on('shootBullet', (bulletData) => {
        const player = players[socket.id];
        if (player) {
            const bullet = {
                x: bulletData.x,
                y: bulletData.y,
                direction: bulletData.direction,
                speed: player.weaponProps.speed,
                damage: player.weaponProps.damage,
                ownerId: socket.id
            };
            bullets.push(bullet);
            io.emit('bulletMoved', bullet);
        }
    });
});

setInterval(() => {
    bullets.forEach((bullet, index) => {
        bullet.x += bullet.direction.x * bullet.speed;
        bullet.y += bullet.direction.y * bullet.speed;

        // Check for bullet collisions with players
        for (let id in players) {
            const player = players[id];
            if (
                bullet.ownerId !== id &&
                bullet.x > player.x && bullet.x < player.x + 20 &&
                bullet.y > player.y && bullet.y < player.y + 20
            ) {
                player.health -= bullet.damage;
                if (player.health <= 0) {
                    player.health = 100; // Respawn player
                    player.score -= 1;
                }
                io.emit('playerHit', { id: id, health: player.health });
                bullets.splice(index, 1);
                break;
            }
        }
    });

    // Generate power-ups randomly
    if (Math.random() < 0.01) {
        const powerUp = {
            x: Math.random() * 800,
            y: Math.random() * 600,
            type: 'health',
            value: 20
        };
        powerUps.push(powerUp);
        io.emit('newPowerUp', powerUp);
    }
}, 1000 / 60);

server.listen(3000, () => {
    console.log('Listening on port 3000');
});

