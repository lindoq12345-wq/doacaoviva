# doacaoviva

Aplicação de doações com frontend + backend em Node.js/Express.

## Estrutura do projeto

- `server.js` — inicializa o servidor Express
- `src/app.js` — configura o app e middlewares
- `src/routes/donations.js` — rota de API para criar e listar doações
- `src/services/donationService.js` — camada de persistência com banco
- `src/database/index.js` — adaptador de conexão para PostgreSQL ou MongoDB
- `src/database/mongoDonation.js` — modelo Mongoose para MongoDB
- `public/` — frontend do formulário
- `.env.example` — exemplo de variáveis de ambiente
- `Dockerfile` — imagem Docker para deploy

## Como executar localmente

1. Instale as dependências:

```bash
npm install
```

2. Execute o servidor:

```bash
npm start
```

3. Abra no navegador:

```text
http://localhost:3000
```

4. Para desenvolvimento com reinício automático:

```bash
npm run dev
```

## Rodando com Docker Compose

1. Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

2. Inicie os serviços:

```bash
docker compose up --build
```

3. O frontend estará disponível em:

```text
http://localhost:3000
```

4. O banco PostgreSQL usa credenciais padrão do compose:

- usuário: `postgres`
- senha: `postgres`
- banco: `doacaoviva`

## API

- `POST /api/donations` — cria uma nova doação
- `GET /api/donations` — lista todas as doações
- `GET /health` — health check do servidor

## Backend completo

- Validação de entrada com `express-validator`
- Persistência real em PostgreSQL ou MongoDB
- Tratamento de erros de rota e servidor
- Frontend integrado que consome a API

## Deploy automático

### Render

1. Conecte o repositório no Render.
2. Deixe o comando de build padrão ou use:

```bash
npm install
```

3. Defina o comando de start:

```bash
npm start
```

4. Configure as variáveis de ambiente em Render:

- `DATABASE_PROVIDER`
- `DATABASE_URL`
- `PORT`

### Railway

1. Conecte o repositório ao Railway.
2. Use o mesmo comando de build e start.
3. Adicione as variáveis de ambiente no painel do Railway.

### Vercel

1. Conecte o repositório no Vercel.
2. Defina o projeto como Node.js.
3. O arquivo `vercel.json` já foi adicionado para roteamento do Express.
4. Configure as variáveis de ambiente:

- `DATABASE_PROVIDER`
- `DATABASE_URL`
- `PORT`

> Se preferir, use Render ou Railway para o backend e mantenha o Vercel apenas para o frontend.
