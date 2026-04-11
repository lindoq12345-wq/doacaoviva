const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARES ───
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── BANCO DE DADOS (JSON simples) ───
const DB_FILE = path.join(__dirname, 'db.json');

function lerDB() {
  if (!fs.existsSync(DB_FILE)) {
    const inicial = { usuarios: [], posts: [], doacoes: [], subscribers: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(inicial, null, 2));
    return inicial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function salvarDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ─── HEALTH ───
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ══════════════════════════════════════
// USUÁRIOS
// ══════════════════════════════════════

// Cadastro
app.post('/api/usuarios', (req, res) => {
  const { nome, email, senha, cidade, tipo, pix, bio } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Campos obrigatórios: nome, email, senha' });

  const db = lerDB();
  if (db.usuarios.find(u => u.email === email)) {
    return res.status(409).json({ erro: 'E-mail já cadastrado' });
  }

  const usuario = {
    id: Date.now().toString(),
    nome, email, senha,
    cidade: cidade || 'Brasil',
    tipo: tipo || 'ambos',
    pix: pix || email,
    bio: bio || 'Membro da comunidade DoacãoViva 🌱',
    avatar: nome.charAt(0).toUpperCase(),
    seguidores: 0,
    doado: 0,
    criadoEm: new Date().toISOString()
  };

  db.usuarios.push(usuario);
  salvarDB(db);

  const { senha: _, ...usuarioSemSenha } = usuario;
  res.status(201).json(usuarioSemSenha);
});

// Login
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  const db = lerDB();
  const usuario = db.usuarios.find(u => u.email === email && u.senha === senha);
  if (!usuario) return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
  const { senha: _, ...usuarioSemSenha } = usuario;
  res.json(usuarioSemSenha);
});

// Listar usuários
app.get('/api/usuarios', (req, res) => {
  const db = lerDB();
  const lista = db.usuarios.map(({ senha, ...u }) => u);
  res.json(lista);
});

// Buscar usuário por ID
app.get('/api/usuarios/:id', (req, res) => {
  const db = lerDB();
  const usuario = db.usuarios.find(u => u.id === req.params.id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
  const { senha, ...usuarioSemSenha } = usuario;
  res.json(usuarioSemSenha);
});

// ══════════════════════════════════════
// POSTS
// ══════════════════════════════════════

// Criar post (com suporte a base64 para foto/vídeo)
app.post('/api/posts', (req, res) => {
  const { autorId, autorNome, autorAvatar, tipo, texto, pix, midia, mediaTipo } = req.body;
  if (!texto) return res.status(400).json({ erro: 'Texto é obrigatório' });

  const db = lerDB();
  const post = {
    id: Date.now().toString(),
    autorId: autorId || 'anonimo',
    autorNome: autorNome || 'Anônimo',
    autorAvatar: autorAvatar || '👤',
    tipo: tipo || 'necessidade',
    texto,
    pix: pix || '',
    midia: midia || null,
    mediaTipo: mediaTipo || null,
    curtidas: 0,
    curtidasIds: [],
    comentarios: [],
    criadoEm: new Date().toISOString()
  };

  db.posts.unshift(post);
  salvarDB(db);
  res.status(201).json(post);
});

// Listar posts
app.get('/api/posts', (req, res) => {
  const db = lerDB();
  res.json(db.posts);
});

// Curtir post
app.post('/api/posts/:id/curtir', (req, res) => {
  const { usuarioId } = req.body;
  const db = lerDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ erro: 'Post não encontrado' });

  const idx = post.curtidasIds.indexOf(usuarioId);
  if (idx === -1) {
    post.curtidasIds.push(usuarioId);
    post.curtidas++;
  } else {
    post.curtidasIds.splice(idx, 1);
    post.curtidas--;
  }

  salvarDB(db);
  res.json({ curtidas: post.curtidas, curtido: idx === -1 });
});

// Comentar post
app.post('/api/posts/:id/comentarios', (req, res) => {
  const { autorNome, texto } = req.body;
  const db = lerDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ erro: 'Post não encontrado' });

  const comentario = {
    id: Date.now().toString(),
    autorNome: autorNome || 'Anônimo',
    texto,
    criadoEm: new Date().toISOString()
  };
  post.comentarios.push(comentario);
  salvarDB(db);
  res.status(201).json(comentario);
});

// ══════════════════════════════════════
// DOAÇÕES / NECESSIDADES
// ══════════════════════════════════════

app.post('/api/doacoes', (req, res) => {
  const { doadorNome, receptorNome, pixChave, valor, tipo } = req.body;
  const db = lerDB();
  const doacao = {
    id: Date.now().toString(),
    doadorNome: doadorNome || 'Anônimo',
    receptorNome,
    pixChave,
    valor: valor || 0,
    tipo: tipo || 'alimentos',
    criadoEm: new Date().toISOString()
  };
  db.doacoes.push(doacao);
  salvarDB(db);
  res.status(201).json(doacao);
});

app.get('/api/doacoes', (req, res) => {
  const db = lerDB();
  res.json(db.doacoes);
});

// ══════════════════════════════════════
// SUBSCRIBERS (lista de espera)
// ══════════════════════════════════════

app.post('/api/subscribers', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: 'E-mail obrigatório' });
  const db = lerDB();
  if (!db.subscribers.includes(email)) {
    db.subscribers.push(email);
    salvarDB(db);
  }
  res.status(201).json({ ok: true, total: db.subscribers.length });
});

app.get('/api/subscribers', (req, res) => {
  const db = lerDB();
  res.json({ total: db.subscribers.length, emails: db.subscribers });
});

// ─── FALLBACK SPA ───
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 DoacaoViva rodando na porta ${PORT}`));
