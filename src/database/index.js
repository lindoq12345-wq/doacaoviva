const { Pool } = require('pg');
const mongoose = require('mongoose');
const DonationModel = require('./mongoDonation');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const provider = process.env.DATABASE_PROVIDER || 'postgresql';
const url = process.env.DATABASE_URL;
const jsonDataPath = process.env.JSON_DATA_PATH || path.join('/tmp', 'doacaoviva-donations.json');

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

async function readJsonData() {
  await ensureJsonFile();
  const content = await fs.readFile(jsonDataPath, 'utf8');
  return JSON.parse(content);
}

async function saveJsonData(items) {
  await fs.writeFile(jsonDataPath, JSON.stringify(items, null, 2), 'utf8');
}

async function connect() {
  if (!url) {
    await ensureJsonFile();

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
    )
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
