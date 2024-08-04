const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let players = {};

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);
  let color = '#' + Math.floor(Math.random() * 16777215).toString(16); // Random color
  players[socket.id] = { x: 100, y: 100, color: color }; // Initial position with color

  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', { id: socket.id, x: 100, y: 100, color: color });

  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      io.emit('move', { id: socket.id, x: data.x, y: data.y });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    delete players[socket.id];
    io.emit('remove', { id: socket.id });
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

