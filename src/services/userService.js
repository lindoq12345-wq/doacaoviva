const crypto = require('crypto');
const { getRepository } = require('../database');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createUser({ name, email, password, city, type, pixKey, bio }) {
  const repository = getRepository();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await repository.getUserByEmail(normalizedEmail);
  if (existing) {
    const error = new Error('Email já cadastrado');
    error.code = 'DUPLICATE_EMAIL';
    throw error;
  }

  return repository.createUser({
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    password: hashPassword(password),
    city: city.trim(),
    type,
    pixKey: pixKey.trim(),
    bio: bio.trim(),
    avatar: '',
    createdAt: new Date().toISOString()
  });
}

async function authenticate({ email, password }) {
  const repository = getRepository();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await repository.getUserByEmail(normalizedEmail);
  if (!user) return null;
  if (user.password !== hashPassword(password)) return null;
  return { ...user, password: undefined };
}

async function getAllUsers() {
  const repository = getRepository();
  const users = await repository.getAllUsers();
  return users.map((user) => ({ ...user, password: undefined }));
}

async function getUserById(id) {
  const repository = getRepository();
  const user = await repository.getUserById(id);
  if (!user) return null;
  return { ...user, password: undefined };
}

module.exports = {
  createUser,
  authenticate,
  getAllUsers,
  getUserById
};
