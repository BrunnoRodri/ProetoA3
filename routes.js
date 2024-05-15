const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const db_config = require('./db_config');
const session = require('express-session');
const path = require('path');

const connection = mysql.createConnection(db_config);

// Middleware de sessão
router.use(session({
  secret: 'secretpassword',
  resave: true,
  saveUninitialized: true
}));

// Middleware para parsing de URL-encoded bodies
router.use(express.urlencoded({ extended: false }));
router.use(express.json());

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
    return;
  }
  console.log('Conexão bem-sucedida com o banco de dados');
});

// Rota para obter os dados dos livros em formato JSON
router.get('/livros', (req, res) => {
  const sql = 'SELECT nome, autor, preco, estoque FROM livros';
  connection.query(sql, (err, result) => {
    if (err) {
      console.error('Erro ao buscar livros:', err);
      res.status(500).json({ error: 'Erro ao buscar livros' });
      return;
    }

    // Retorna os dados dos livros em formato JSON
    res.json(result);
  });
});

// Rota para página principal.html
router.get('/principal.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'principal.html'));
});

// Rota para login.html
router.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota para cadastrar usuário
router.post('/cadastrar', (req, res) => {
  const { cpf, cidade, email, senha, nome, cep } = req.body;

  const sql = 'INSERT INTO clientes (CPF, Cidade, Email, Senha, Nome, CEP) VALUES (?, ?, ?, ?, ?, ?)';
  const values = [cpf, cidade, email, senha, nome, cep];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('Erro ao criar usuário:', err);
      res.status(500).send('Erro ao criar usuário');
      return;
    }
    console.log('Usuário criado com sucesso');
    res.status(200).send('Usuário criado com sucesso');
  });
});

// Rota para login de usuário
router.post('/login', (req, res) => {
  const { administrador, senha } = req.body;

  const sql = 'SELECT * FROM adm WHERE administrador = ? AND senha = ?';
  const values = [administrador, senha];

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('Erro ao fazer login:', err);
      res.status(500).send('Erro ao fazer login');
      return;
    }

    if (results.length === 0) {
      res.status(401).send('Administrador ou senha incorretos');
    } else {
      // Define a sessão como autenticada
      req.session.loggedin = true;
      res.redirect('/paineladm.html'); // Redireciona para a página paineladm.html
    }
  });
});

module.exports = router;
