const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const users = new Map();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join', ({ name, room }) => {
    const safeName = String(name || 'Guest').trim().slice(0, 24) || 'Guest';
    const safeRoom = String(room || 'general').trim() || 'general';

    users.set(socket.id, { name: safeName, room: safeRoom });
    socket.join(safeRoom);

    socket.emit('system-message', {
      text: `Welcome to ${safeRoom}!`,
      createdAt: new Date().toISOString(),
    });

    socket.broadcast.to(safeRoom).emit('system-message', {
      text: `${safeName} joined the chat`,
      createdAt: new Date().toISOString(),
    });

    io.to(safeRoom).emit('user-list', Array.from(users.values()).filter((user) => user.room === safeRoom).map((user) => user.name));
  });

  socket.on('chat-message', (message) => {
    const user = users.get(socket.id);

    if (!user) return;

    const safeMessage = String(message || '').trim();
    if (!safeMessage) return;

    io.to(user.room).emit('chat-message', {
      name: user.name,
      text: safeMessage,
      createdAt: new Date().toISOString(),
    });
  });

  socket.on('typing', ({ isTyping }) => {
    const user = users.get(socket.id);
    if (!user) return;

    socket.broadcast.to(user.room).emit('typing', {
      name: user.name,
      isTyping: Boolean(isTyping),
    });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (!user) return;

    users.delete(socket.id);
    socket.broadcast.to(user.room).emit('system-message', {
      text: `${user.name} left the chat`,
      createdAt: new Date().toISOString(),
    });

    io.to(user.room).emit('user-list', Array.from(users.values()).filter((u) => u.room === user.room).map((u) => u.name));
  });
});

server.listen(PORT, () => {
  console.log(`Chat app running on http://localhost:${PORT}`);
});
