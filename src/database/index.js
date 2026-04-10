const { Pool } = require('pg');
const mongoose = require('mongoose');
const DonationModel = require('./mongoDonation');
const crypto = require('crypto');

const provider = process.env.DATABASE_PROVIDER || 'postgresql';
const url = process.env.DATABASE_URL;

let repository;
let pool;

async function connect() {
  if (!url) {
    throw new Error('DATABASE_URL é obrigatório. Configure .env com DATABASE_URL e DATABASE_PROVIDER.');
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
