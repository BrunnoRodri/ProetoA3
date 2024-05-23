const nodemailer = require('nodemailer');
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const db_config = require('./db_config');

const app = express();
const port = 3000;

const connection = mysql.createConnection(db_config);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const transport = nodemailer.createTransport({
  host:'sntp.gmail.com',
  port: 465,
  secure: true,
  auth: {
   user: 'laurasernin@gmail.com',
   pass:'...'
 }
})

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

// Middleware para processar dados do formulário
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Middleware de autenticação
function isAuthenticated(req, res, next) {
    if (req.session && req.session.loggedin) {
        return next(); 
    } else {
        res.status(401).send('Acesso não autorizado'); 
    }
}
// Rota para recuperar_senha.html
app.get('/recuperar_senha.html', (req, res) => {
  res.sendFile(__dirname + '/recuperar_senha.html');
});
// Rota para redefinir_senha.html
app.get('/redefinir_senha.html', (req, res) => {
  res.sendFile(__dirname + '/redefinir_senha.html');
});
// Função para enviar e-mail
function enviarEmail(destinatario, token) {
  const mailOptions = {  
    from: "Assistente virtual <laurasernin@gmail.com>" ,
    to: destinatario,
    subject: 'Redefinição de Senha',
    text: `Você solicitou a redefinição de senha. Use o seguinte token para redefinir sua senha: ${token}`
  };

  transport.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.error('Erro ao enviar e-mail:', error);
    } else {
      console.log('E-mail enviado:', info.response);
    }
  });
}
// Rota para solicitar a recuperação de senha
app.post('/recuperar-senha', (req, res) => {
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
            enviarEmail(email,token);
            console.log('Token de recuperação de senha gerado com sucesso:', token);
            res.status(200).send('Um email de recuperação foi enviado para o seu endereço de email');
        });
    });
});

// Rota para redefinir a senha
app.post('/redefinir-senha', (req, res) => {
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

                console.log('Senha redefinida com sucesso')
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

// Rota para acessar a pesquisa de livros (linkada com a autenticação)
app.get('/pesquisar-livros', isAuthenticated, (req, res) => {
  res.sendFile(__dirname + '/pesquisar_livros.html');
});

app.post('/reservar-livro', isAuthenticated, (req, res) => {
  res.sendFile(__dirname + '/reservar-livro.html');
});

// Rota para emprestar livro
app.post('/emprestar_livro', isAuthenticated, (req, res) => {
  res.sendFile(__dirname + '/emprestar_livro.html');
});

// Rota para devolução de livro
app.post('/devolver_livro', isAuthenticated, (req, res) => {
  res.sendFile(__dirname + '/emprestar_livro.html');
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

