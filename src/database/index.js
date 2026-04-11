const { Pool } = require('pg');
const mongoose = require('mongoose');
const DonationModel = require('./mongoDonation');
const SubscriberModel = require('./mongoSubscriber');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const provider = process.env.DATABASE_PROVIDER || 'postgresql';
const url = process.env.DATABASE_URL;
const jsonDataPath = process.env.JSON_DATA_PATH || path.join('/tmp', 'doacaoviva-donations.json');
const subscribersDataPath = process.env.SUBSCRIBERS_DATA_PATH || path.join('/tmp', 'doacaoviva-subscribers.json');

let repository;
let pool;

async function ensureJsonFile() {
  try {
    await fs.access(jsonDataPath);
  } catch {
    await fs.mkdir(path.dirname(jsonDataPath), { recursive: true });
    await fs.writeFile(jsonDataPath, '[]', 'utf8');
  }
}

async function ensureSubscribersJsonFile() {
  try {
    await fs.access(subscribersDataPath);
  } catch {
    await fs.mkdir(path.dirname(subscribersDataPath), { recursive: true });
    await fs.writeFile(subscribersDataPath, '[]', 'utf8');
  }
}

async function ensureJsonFiles() {
  await ensureJsonFile();
  await ensureSubscribersJsonFile();
}

async function readJsonData() {
  await ensureJsonFile();
  const content = await fs.readFile(jsonDataPath, 'utf8');
  return JSON.parse(content);
}

async function saveJsonData(items) {
  await fs.writeFile(jsonDataPath, JSON.stringify(items, null, 2), 'utf8');
}

async function readSubscribersJsonData() {
  await ensureSubscribersJsonFile();
  const content = await fs.readFile(subscribersDataPath, 'utf8');
  return JSON.parse(content);
}

async function saveSubscribersJsonData(items) {
  await fs.writeFile(subscribersDataPath, JSON.stringify(items, null, 2), 'utf8');
}

async function connect() {
  if (!url) {
    await ensureJsonFiles();

    repository = {
      getAllDonations: async () => {
        const items = await readJsonData();
        return items.sort((a, b) => new Date(b.recebidoEm) - new Date(a.recebidoEm));
      },
      createDonation: async ({ nome, email, valor, mensagem }) => {
        const items = await readJsonData();
        const record = {
          id: crypto.randomUUID(),
          nome,
          email,
          valor,
          mensagem: mensagem || '',
          recebidoEm: new Date().toISOString()
        };
        items.unshift(record);
        await saveJsonData(items);
        return record;
      },
      getAllSubscribers: async () => {
        const items = await readSubscribersJsonData();
        return items.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
      },
      createSubscriber: async ({ email }) => {
        const items = await readSubscribersJsonData();
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
        await saveSubscribersJsonData(items);
        return record;
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
