const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const db_config = require('./db_config');
const session = require('express-session');
const path = require('path');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const stripe = require('stripe')('pk_test_51PHYcWEgxOfM3CbTWufDz6MOtC4Zg9B8HknIpVi6Kmk5jDGpGWBe8CIHdbdTVmQsSIzU4gocb3hT8R64xSwwll9a00qeqyhDPh'); // Substitua pela sua chave secreta do Stripe

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

    res.json(result);
  });
});

// Rota para página principal.html
router.get('/principal.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'principal.html'));
});

// Rota para login.html
router.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
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
      req.session.loggedin = true;
      res.redirect('/paineladm.html'); // Redireciona para a página paineladm.html
    }
  });
});

// Função para enviar e-mail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'laurasernin@gmail.com',
    pass: 'sua_senha' // Substitua pela sua senha do Gmail
  }
});

function enviarEmail(destinatario, token) {
  const mailOptions = {
    from: "Assistente virtual <laurasernin@gmail.com>",
    to: destinatario,
    subject: 'Redefinição de Senha',
    text: `Você solicitou a redefinição de senha. Use o seguinte token para redefinir sua senha: ${token}`
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.error('Erro ao enviar e-mail:', error);
    } else {
      console.log('E-mail enviado:', info.response);
    }
  });
}

// Rota para solicitar a recuperação de senha
router.post('/recuperar-senha', (req, res) => {
  const { email } = req.body;
  const sql = 'SELECT * FROM clientes WHERE Email = ?';
  connection.query(sql, [email], (err, result) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      res.status(500).send('Erro ao buscar usuário');
      return;
    }

    if (result.length === 0) {
      res.status(404).send('Usuário não encontrado');
      return;
    }

    const token = Math.random().toString(36).substr(2);
    const insertSql = 'INSERT INTO senha_reset (Email, Token, Expiracao) VALUES (?, ?, ?)';
    const expirationDate = new Date(Date.now() + 3600000); // Define a expiração para 1 hora
    connection.query(insertSql, [email, token, expirationDate], (err) => {
      if (err) {
        console.error('Erro ao gerar token de recuperação de senha:', err);
        res.status(500).send('Erro ao gerar token de recuperação de senha');
        return;
      }
      enviarEmail(email, token);
      console.log('Token de recuperação de senha gerado com sucesso:', token);
      res.status(200).send('Um email de recuperação foi enviado para o seu endereço de email');
    });
  });
});

// Rota para redefinir a senha
router.post('/redefinir-senha', (req, res) => {
  const { token, novaSenha } = req.body;
  const sql = 'SELECT * FROM senha_reset WHERE Token = ? AND Expiracao > NOW()';
  connection.query(sql, [token], (err, result) => {
    if (err) {
      console.error('Erro ao verificar token de recuperação de senha:', err);
      res.status(500).send('Erro ao verificar token de recuperação de senha');
      return;
    }

    if (result.length === 0) {
      res.status(400).send('Token inválido ou expirado');
      return;
    }

    bcrypt.hash(novaSenha, 10, (err, hash) => {
      if (err) {
        console.error('Erro ao gerar hash da senha:', err);
        res.status(500).send('Erro ao redefinir senha');
        return;
      }

      const email = result[0].Email;
      const updateSql = 'UPDATE clientes SET Senha = ? WHERE Email = ?';
      connection.query(updateSql, [hash, email], (err) => {
        if (err) {
          console.error('Erro ao atualizar senha:', err);
          res.status(500).send('Erro ao redefinir senha');
          return;
        }

        console.log('Senha redefinida com sucesso');
        const deleteSql = 'DELETE FROM senha_reset WHERE Token = ?';
        connection.query(deleteSql, [token], (err) => {
          if (err) {
            console.error('Erro ao remover token de recuperação de senha:', err);
            res.status(500).send('Erro ao redefinir senha');
            return;
          }

          console.log('Token de recuperação de senha removido');
          res.status(200).send('Senha redefinida com sucesso');
        });
      });
    });
  });
});

// Rota para exibir a loja
router.get('/loja', (req, res) => {
  const sql = 'SELECT id, nome, autor, preco, estoque FROM livros';
  connection.query(sql, (err, result) => {
    if (err) {
      console.error('Erro ao buscar livros:', err);
      res.status(500).json({ error: 'Erro ao buscar livros' });
      return;
    }

    res.render('loja', { livros: result });
  });
});

// Rota para criar a intenção de pagamento
router.post('/comprar', async (req, res) => {
  const { livroId, quantidade } = req.body;
  const sql = 'SELECT preco FROM livros WHERE id = ?';
  connection.query(sql, [livroId], async (err, result) => {
    if (err) {
      console.error('Erro ao buscar preço do livro:', err);
      res.status(500).json({ error: 'Erro ao buscar preço do livro' });
      return;
    }

    if (result.length === 0) {
      res.status(404).json({ error: 'Livro não encontrado' });
      return;
    }

    const preco = result[0].preco;
    const valor = preco * quantidade;

    try {
      const intencaoPagamento = await stripe.paymentIntents.create({
        amount: valor * 100, // Stripe espera valores em centavos
        currency: 'brl',
      });

      res.status(200).send({
        clientSecret: intencaoPagamento.client_secret,
      });
    } catch (erro) {
      res.status(500).send({
        erro: erro.message,
      });
    }
  });
});

//Rota para adicionar ao carrinho
router.post('/adicionar-ao-carrinho', (req, res) => {
  const { livroId, quantidade } = req.body;
  const sql = 'SELECT id, nome, autor, preco FROM livros WHERE id = ?';
  connection.query(sql, [livroId], (err, result) => {
    if (err) {
      console.error('Erro ao buscar livro:', err);
      res.status(500).json({ error: 'Erro ao buscar livro' });
      return;
    }

    if (result.length === 0) {
      res.status(404).json({ error: 'Livro não encontrado' });
      return;
    }

    const livro = result[0];
    const item = {
      id: livro.id,
      nome: livro.nome,
      autor: livro.autor,
      preco: livro.preco,
      quantidade: quantidade,
    };

    if (!req.session.carrinho) {
      req.session.carrinho = [];
    }

    req.session.carrinho.push(item);
    res.status(200).json({ message: 'Livro adicionado ao carrinho' });
  });
});

// Rota para visualizar o carrinho
router.get('/carrinho', (req, res) => {
  const carrinho = req.session.carrinho || [];
  res.json(carrinho);
});

// Rota para remover um item do carrinho
router.post('/remover-do-carrinho', (req, res) => {
  const { livroId } = req.body;
  if (!req.session.carrinho) {
    return res.status(400).json({ error: 'Carrinho vazio' });
  }

  req.session.carrinho = req.session.carrinho.filter(item => item.id !== livroId);
  res.status(200).json({ message: 'Livro removido do carrinho' });
});

// Rota para reservar um livro
router.post('/reservar-livro', (req, res) => {
  const { livroId, email } = req.body;

  const sql = 'SELECT id, nome, autor, preco, estoque FROM livros WHERE id = ?';
  connection.query(sql, [livroId], (err, result) => {
      if (err) {
          console.error('Erro ao buscar livro:', err);
          res.status(500).json({ error: 'Erro ao buscar livro' });
          return;
      }

      if (result.length === 0) {
          res.status(404).json({ error: 'Livro não encontrado' });
          return;
      }

      const livro = result[0];
      if (livro.estoque > 0) {
          res.status(400).json({ error: 'Livro ainda está em estoque. Não é necessário reservar.' });
          return;
      }

      const reservaSql = 'INSERT INTO reservas (livro_id, email) VALUES (?, ?)';
      connection.query(reservaSql, [livroId, email], (err, result) => {
          if (err) {
              console.error('Erro ao fazer reserva:', err);
              res.status(500).json({ error: 'Erro ao fazer reserva' });
              return;
          }

          res.status(200).json({ message: 'Livro reservado com sucesso' });
      });
  });
});

// Função para notificar usuários quando o livro estiver em estoque
function notificarUsuarios(livroId) {
  const sql = 'SELECT email FROM reservas WHERE livro_id = ?';
  connection.query(sql, [livroId], (err, results) => {
      if (err) {
          console.error('Erro ao buscar reservas:', err);
          return;
      }

      if (results.length > 0) {
          const emails = results.map(result => result.email);
          emails.forEach(email => {
              enviarEmail(email, 'Livro disponível', 'O livro que você reservou está agora disponível em estoque.');
          });

          const deleteSql = 'DELETE FROM reservas WHERE livro_id = ?';
          connection.query(deleteSql, [livroId], (err) => {
              if (err) {
                  console.error('Erro ao deletar reservas:', err);
              }
          });
      }
  });
}

// Exemplo de como atualizar o estoque e notificar os usuários (pode ser em uma rota de administração ou outra lógica de negócio)
router.post('/atualizar-estoque', (req, res) => {
  const { livroId, quantidade } = req.body;

  const sql = 'UPDATE livros SET estoque = estoque + ? WHERE id = ?';
  connection.query(sql, [quantidade, livroId], (err, result) => {
      if (err) {
          console.error('Erro ao atualizar estoque:', err);
          res.status(500).json({ error: 'Erro ao atualizar estoque' });
          return;
      }

      if (result.affectedRows > 0) {
          notificarUsuarios(livroId);
          res.status(200).json({ message: 'Estoque atualizado e usuários notificados' });
      } else {
          res.status(404).json({ error: 'Livro não encontrado' });
      }
  });
});
module.exports = router;


