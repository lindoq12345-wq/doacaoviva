require('dotenv').config();

const express = require('express');
const path = require('path');
const donationsRouter = require('./routes/donations');
const subscribersRouter = require('./routes/subscribers');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/subscribers', subscribersRouter);

app.get('/health', (req, res) => {
  res.send('OK');
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Erro interno do servidor.' });
});

module.exports = app;
