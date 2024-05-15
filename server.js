const express = require('express');
const session = require('express-session');
const routes = require('./routes');
const path = require('path');
const app = express();
const port = 3000;

// Configuração do middleware para parsing de URL-encoded bodies
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Configuração da sessão
app.use(session({
  secret: 'secretpassword',
  resave: true,
  saveUninitialized: true
}));

// Servindo arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do mecanismo de visualização EJS
app.set('view engine', 'ejs'); // Define o mecanismo de visualização como EJS
app.set('views', path.join(__dirname, 'views')); // Define o diretório de visualizações como 'views'

// Configuração do roteador
app.use('/', routes);

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
