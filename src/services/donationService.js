const { getRepository } = require('../database');

async function getAllDonations() {
  const repository = getRepository();
  return repository.getAllDonations();
}

async function createDonation({ nome, email, valor, mensagem }) {
  const repository = getRepository();
  return repository.createDonation({ nome, email, valor, mensagem });
}

module.exports = {
  getAllDonations,
  createDonation
};
