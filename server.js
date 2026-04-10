require('dotenv').config();
const app = require('./src/app');
const { connect } = require('./src/database');

const port = process.env.PORT || 3000;

connect()
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor rodando em http://localhost:${port}`);
      console.log(`Banco de dados inicializado com provider ${process.env.DATABASE_PROVIDER || 'postgresql'}`);
    });
  })
  .catch((error) => {
    console.error('Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  });
