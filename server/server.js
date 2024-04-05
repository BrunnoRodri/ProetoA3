const express = require('express');
const mysql = require('mysql');
const db_config = require('./db_config');

const app = express();
const port = 3000;

const connection = mysql.createConnection(db_config);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
    return;
  }
  console.log('Conexão bem-sucedida com o banco de dados');
});

app.post('/cadastrar', (req, res) => {
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

// Rota para cas.html
app.get('/cas.html', (req, res) => {
  res.sendFile(__dirname + '/cas.html');
});

// Rota para o login.html
app.get('/login.html', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// Rota para redirecionar de cas.html para login.html
app.get('/redirecionar_para_login', (req, res) => {
  res.redirect('/login.html');
});

// Rota para redirecionar de login.html para cas.html
app.get('/redirecionar_para_cas', (req, res) => {
  res.redirect('/cas.html');
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
