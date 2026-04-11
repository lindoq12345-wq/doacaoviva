const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const tmpRoot = path.join(os.tmpdir(), `doacaoviva-tests-${Date.now()}`);
process.env.DATABASE_URL = '';
process.env.DATABASE_PROVIDER = 'postgresql';
process.env.JSON_DATA_PATH = path.join(tmpRoot, 'doacaoviva-donations.json');
process.env.SUBSCRIBERS_DATA_PATH = path.join(tmpRoot, 'doacaoviva-subscribers.json');

const app = require('../src/app');
const { connect } = require('../src/database');

async function startServer() {
  const server = http.createServer(app);
  server.listen(0);
  await once(server, 'listening');
  const port = server.address().port;
  return { server, url: `http://127.0.0.1:${port}` };
}

async function cleanupData() {
  await fs.rm(tmpRoot, { recursive: true, force: true });
  await fs.mkdir(tmpRoot, { recursive: true });
}

test.before(async () => {
  await cleanupData();
});

test('POST /api/subscribers saves email and GET /api/subscribers returns it', async () => {
  await cleanupData();
  await connect();

  const { server, url } = await startServer();

  const response = await fetch(`${url}/api/subscribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teste@example.com' })
  });

  assert.strictEqual(response.status, 201);
  const payload = await response.json();
  assert.strictEqual(payload.success, true);
  assert.strictEqual(payload.subscriber.email, 'teste@example.com');

  const listResponse = await fetch(`${url}/api/subscribers`);
  assert.strictEqual(listResponse.status, 200);
  const listPayload = await listResponse.json();
  assert.strictEqual(Array.isArray(listPayload.subscribers), true);
  assert.strictEqual(listPayload.subscribers.length, 1);
  assert.strictEqual(listPayload.subscribers[0].email, 'teste@example.com');

  await new Promise((resolve) => server.close(resolve));
});

test('POST /api/donations saves donation and GET /api/donations returns it', async () => {
  await cleanupData();
  await connect();

  const { server, url } = await startServer();

  const response = await fetch(`${url}/api/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Teste de Doação',
      email: 'doa@example.com',
      valor: 12.5,
      mensagem: 'Vamos ajudar'
    })
  });

  assert.strictEqual(response.status, 201);
  const payload = await response.json();
  assert.strictEqual(payload.success, true);
  assert.strictEqual(payload.donation.nome, 'Teste de Doação');
  assert.strictEqual(payload.donation.valor, 12.5);

  const listResponse = await fetch(`${url}/api/donations`);
  assert.strictEqual(listResponse.status, 200);
  const listPayload = await listResponse.json();
  assert.strictEqual(Array.isArray(listPayload.donations), true);
  assert.strictEqual(listPayload.donations.length, 1);
  assert.strictEqual(listPayload.donations[0].email, 'doa@example.com');

  await new Promise((resolve) => server.close(resolve));
});
