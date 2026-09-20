const socket = io();

const joinForm = document.getElementById('join-form');
const chatForm = document.getElementById('chat-form');
const nameInput = document.getElementById('name-input');
const messageInput = document.getElementById('message-input');
const messagesEl = document.getElementById('messages');
const userListEl = document.getElementById('user-list');
const roomNameEl = document.getElementById('room-name');
const typingIndicatorEl = document.getElementById('typing-indicator');

const state = {
  name: '',
  room: 'general',
  joined: false,
  typingTimeout: null,
};

function appendMessage({ name, text, createdAt, type = 'message' }) {
  const messageEl = document.createElement('article');
  messageEl.className = `message ${type === 'system' ? 'system' : state.name === name ? 'self' : ''}`;

  const header = document.createElement('div');
  header.className = 'message-header';

  const sender = document.createElement('strong');
  sender.textContent = type === 'system' ? 'System' : name;

  const time = document.createElement('span');
  time.textContent = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  header.appendChild(sender);
  header.appendChild(time);

  const body = document.createElement('p');
  body.className = 'message-text';
  body.textContent = text;

  messageEl.appendChild(header);
  messageEl.appendChild(body);
  messagesEl.appendChild(messageEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderUsers(users) {
  userListEl.innerHTML = '';

  if (!users.length) {
    const item = document.createElement('li');
    item.textContent = 'No one else is online';
    userListEl.appendChild(item);
    return;
  }

  users.forEach((user) => {
    const item = document.createElement('li');
    item.textContent = user;
    userListEl.appendChild(item);
  });
}

joinForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }

  state.name = name;
  state.joined = true;

  socket.emit('join', { name, room: state.room });
  roomNameEl.textContent = state.room;

  joinForm.classList.add('hidden');
  chatForm.classList.remove('hidden');
  messageInput.focus();
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit('chat-message', text);
  appendMessage({
    name: state.name,
    text,
    createdAt: new Date().toISOString(),
    type: 'message',
  });
  messageInput.value = '';
  typingIndicatorEl.classList.add('hidden');
});

messageInput.addEventListener('input', () => {
  if (!state.joined) return;

  socket.emit('typing', { isTyping: !!messageInput.value.trim() });

  clearTimeout(state.typingTimeout);
  state.typingTimeout = setTimeout(() => {
    socket.emit('typing', { isTyping: false });
  }, 800);
});

socket.on('chat-message', (payload) => {
  appendMessage({
    name: payload.name,
    text: payload.text,
    createdAt: payload.createdAt,
  });
});

socket.on('system-message', (payload) => {
  appendMessage({
    name: 'System',
    text: payload.text,
    createdAt: payload.createdAt,
    type: 'system',
  });
});

socket.on('user-list', (users) => {
  renderUsers(users);
});

socket.on('typing', ({ name, isTyping }) => {
  if (name === state.name) return;

  if (isTyping) {
    typingIndicatorEl.textContent = `${name} is typing...`;
    typingIndicatorEl.classList.remove('hidden');
    return;
  }

  typingIndicatorEl.classList.add('hidden');
});

renderUsers([]);
appendMessage({
  name: 'System',
  text: 'Welcome! Enter your name to join the chat.',
  createdAt: new Date().toISOString(),
  type: 'system',
});
