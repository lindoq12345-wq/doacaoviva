const { getRepository } = require('../database');

async function createSubscriber({ email }) {
  const repository = getRepository();
  return repository.createSubscriber({ email });
}

async function getAllSubscribers() {
  const repository = getRepository();
  return repository.getAllSubscribers();
}

module.exports = {
  createSubscriber,
  getAllSubscribers
};
