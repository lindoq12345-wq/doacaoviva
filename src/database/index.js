const { Pool } = require('pg');
const mongoose = require('mongoose');
const DonationModel = require('./mongoDonation');
const SubscriberModel = require('./mongoSubscriber');
const UserModel = require('./mongoUser');
const PostModel = require('./mongoPost');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const provider = process.env.DATABASE_PROVIDER || 'postgresql';
const url = process.env.DATABASE_URL;
const jsonDataPath = process.env.JSON_DATA_PATH || path.join('/tmp', 'doacaoviva-donations.json');
const subscribersDataPath = process.env.SUBSCRIBERS_DATA_PATH || path.join('/tmp', 'doacaoviva-subscribers.json');
const usersDataPath = process.env.USERS_DATA_PATH || path.join('/tmp', 'doacaoviva-users.json');
const postsDataPath = process.env.POSTS_DATA_PATH || path.join('/tmp', 'doacaoviva-posts.json');

let repository;
let pool;

async function ensureJsonFile(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, '[]', 'utf8');
  }
}

async function ensureJsonFiles() {
  await ensureJsonFile(jsonDataPath);
  await ensureJsonFile(subscribersDataPath);
  await ensureJsonFile(usersDataPath);
  await ensureJsonFile(postsDataPath);
}

async function readJsonFile(filePath) {
  await ensureJsonFile(filePath);
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function saveJsonFile(filePath, items) {
  await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf8');
}

async function connect() {
  if (!url) {
    await ensureJsonFiles();

    repository = {
      getAllDonations: async () => {
        const items = await readJsonFile(jsonDataPath);
        return items.sort((a, b) => new Date(b.recebidoEm) - new Date(a.recebidoEm));
      },
      createDonation: async ({ nome, email, valor, mensagem }) => {
        const items = await readJsonFile(jsonDataPath);
        const record = {
          id: crypto.randomUUID(),
          nome,
          email,
          valor,
          mensagem: mensagem || '',
          recebidoEm: new Date().toISOString()
        };
        items.unshift(record);
        await saveJsonFile(jsonDataPath, items);
        return record;
      },
      getAllSubscribers: async () => {
        const items = await readJsonFile(subscribersDataPath);
        return items.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
      },
      createSubscriber: async ({ email }) => {
        const items = await readJsonFile(subscribersDataPath);
        const normalizedEmail = email.trim().toLowerCase();
        const existing = items.find((item) => item.email === normalizedEmail);
        if (existing) {
          return existing;
        }

        const record = {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          criadoEm: new Date().toISOString()
        };

        items.unshift(record);
        await saveJsonFile(subscribersDataPath, items);
        return record;
      },
      getAllUsers: async () => {
        const items = await readJsonFile(usersDataPath);
        return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      },
      getUserById: async (id) => {
        const items = await readJsonFile(usersDataPath);
        return items.find((item) => item.id === id) || null;
      },
      getUserByEmail: async (email) => {
        const items = await readJsonFile(usersDataPath);
        return items.find((item) => item.email === email.trim().toLowerCase()) || null;
      },
      createUser: async (user) => {
        const items = await readJsonFile(usersDataPath);
        items.unshift(user);
        await saveJsonFile(usersDataPath, items);
        return user;
      },
      getAllPosts: async () => {
        const items = await readJsonFile(postsDataPath);
        return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      },
      createPost: async ({ id, authorId, type, content, media, likes, likedBy, createdAt }) => {
        const items = await readJsonFile(postsDataPath);
        const record = {
          id,
          authorId,
          type,
          content,
          media: media || '',
          likes: likes || 0,
          likedBy: likedBy || [],
          createdAt: createdAt || new Date().toISOString()
        };
        items.unshift(record);
        await saveJsonFile(postsDataPath, items);
        return record;
      },
      togglePostLike: async (postId, userId) => {
        const items = await readJsonFile(postsDataPath);
        const post = items.find((item) => item.id === postId);
        if (!post) return null;
        const likedBy = new Set(post.likedBy || []);
        if (likedBy.has(userId)) {
          likedBy.delete(userId);
        } else {
          likedBy.add(userId);
        }
        post.likedBy = Array.from(likedBy);
        post.likes = post.likedBy.length;
        await saveJsonFile(postsDataPath, items);
        return post;
      }
    };

    return repository;
  }

  if (provider === 'mongodb') {
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    repository = {
      getAllDonations: async () => DonationModel.find().sort({ recebidoEm: -1 }),
      createDonation: async ({ nome, email, valor, mensagem }) => {
        return DonationModel.create({ nome, email, valor, mensagem });
      },
      getAllSubscribers: async () => SubscriberModel.find().sort({ criadoEm: -1 }),
      createSubscriber: async ({ email }) => {
        const normalizedEmail = email.trim().toLowerCase();
        return SubscriberModel.findOneAndUpdate(
          { email: normalizedEmail },
          { $setOnInsert: { email: normalizedEmail, criadoEm: new Date() } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
      },
      getAllUsers: async () => UserModel.find().sort({ createdAt: -1 }),
      getUserById: async (id) => UserModel.findById(id),
      getUserByEmail: async (email) => UserModel.findOne({ email: email.trim().toLowerCase() }),
      createUser: async (user) => UserModel.create(user),
      getAllPosts: async () => PostModel.find().sort({ createdAt: -1 }),
      createPost: async (data) => PostModel.create(data),
      togglePostLike: async (postId, userId) => {
        const post = await PostModel.findById(postId);
        if (!post) return null;
        const likedBy = new Set(post.likedBy.map(String));
        if (likedBy.has(userId)) {
          likedBy.delete(userId);
        } else {
          likedBy.add(userId);
        }
        post.likedBy = Array.from(likedBy);
        post.likes = post.likedBy.length;
        await post.save();
        return post;
      }
    };

    return repository;
  }

  pool = new Pool({ connectionString: url });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      valor NUMERIC NOT NULL,
      mensagem TEXT,
      recebidoEm TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      criadoEm TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      city TEXT,
      type TEXT,
      pixKey TEXT,
      bio TEXT,
      avatar TEXT,
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      authorId TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      media TEXT,
      likes INTEGER NOT NULL DEFAULT 0,
      likedBy TEXT[],
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  repository = {
    getAllDonations: async () => {
      const result = await pool.query('SELECT id, nome, email, valor, mensagem, recebidoEm FROM donations ORDER BY recebidoEm DESC');
      return result.rows.map((row) => ({
        ...row,
        valor: parseFloat(row.valor)
      }));
    },
    createDonation: async ({ nome, email, valor, mensagem }) => {
      const id = crypto.randomUUID();
      const result = await pool.query(
        'INSERT INTO donations (id, nome, email, valor, mensagem, recebidoEm) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, nome, email, valor, mensagem, recebidoEm',
        [id, nome, email, valor, mensagem]
      );
      return {
        ...result.rows[0],
        valor: parseFloat(result.rows[0].valor)
      };
    },
    getAllSubscribers: async () => {
      const result = await pool.query('SELECT id, email, criadoEm FROM subscribers ORDER BY criadoEm DESC');
      return result.rows;
    },
    createSubscriber: async ({ email }) => {
      const id = crypto.randomUUID();
      const normalizedEmail = email.trim().toLowerCase();
      const result = await pool.query(
        `INSERT INTO subscribers (id, email, criadoEm)
         VALUES ($1, $2, NOW())
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id, email, criadoEm`,
        [id, normalizedEmail]
      );
      return result.rows[0];
    },
    getAllUsers: async () => {
      const result = await pool.query('SELECT id, name, email, city, type, pixKey, bio, avatar, createdAt FROM users ORDER BY createdAt DESC');
      return result.rows;
    },
    getUserById: async (id) => {
      const result = await pool.query('SELECT id, name, email, city, type, pixKey, bio, avatar, createdAt FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
    getUserByEmail: async (email) => {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await pool.query('SELECT id, name, email, password, city, type, pixKey, bio, avatar, createdAt FROM users WHERE email = $1', [normalizedEmail]);
      return result.rows[0] || null;
    },
    createUser: async ({ id, name, email, password, city, type, pixKey, bio, avatar, createdAt }) => {
      const result = await pool.query(
        `INSERT INTO users (id, name, email, password, city, type, pixKey, bio, avatar, createdAt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, name, email, city, type, pixKey, bio, avatar, createdAt`,
        [id, name, email, password, city, type, pixKey, bio, avatar, createdAt]
      );
      return result.rows[0];
    },
    getAllPosts: async () => {
      const result = await pool.query('SELECT id, authorId, type, content, media, likes, likedBy, createdAt FROM posts ORDER BY createdAt DESC');
      return result.rows;
    },
    createPost: async ({ id, authorId, type, content, media, likes, likedBy, createdAt }) => {
      const result = await pool.query(
        `INSERT INTO posts (id, authorId, type, content, media, likes, likedBy, createdAt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, authorId, type, content, media, likes, likedBy, createdAt`,
        [id, authorId, type, content, media, likes || 0, likedBy || [], createdAt]
      );
      return result.rows[0];
    },
    togglePostLike: async (postId, userId) => {
      const select = await pool.query('SELECT likedBy FROM posts WHERE id = $1', [postId]);
      if (!select.rows.length) return null;
      const currentLikedBy = select.rows[0].likedby || [];
      const likedBySet = new Set(currentLikedBy.map(String));
      if (likedBySet.has(userId)) {
        likedBySet.delete(userId);
      } else {
        likedBySet.add(userId);
      }
      const likedBy = Array.from(likedBySet);
      const likes = likedBy.length;
      const update = await pool.query(
        'UPDATE posts SET likedBy = $1, likes = $2 WHERE id = $3 RETURNING id, authorId, type, content, media, likes, likedBy, createdAt',
        [likedBy, likes, postId]
      );
      return update.rows[0];
    }
  };

  return repository;
}

function getRepository() {
  if (!repository) {
    throw new Error('Repositório de banco de dados não inicializado. Chame connect() antes de iniciar o servidor.');
  }

  return repository;
}

module.exports = {
  connect,
  getRepository
};
