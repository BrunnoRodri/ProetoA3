

const db_config = require('./db_config');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'seuemail@gmail.com', // Seu e-mail
    pass: 'suasenha' // Sua senha
  }
});

// Rota para reservar livro
app.post('/reservar-livro', (req, res) => {
  const { id_livro, id_usuario } = req.body;

  // Verificar se o livro está disponível para reserva
  const sqlVerificarDisponibilidade = 'SELECT * FROM livros WHERE id = ? AND disponivel = true';
  connection.query(sqlVerificarDisponibilidade, [id_livro], (err, results) => {
    if (err) {
      console.error('Erro ao verificar disponibilidade do livro:', err);
      res.status(500).send('Erro ao verificar disponibilidade do livro');
      return;
    }

    if (results.length === 0) {
      res.status(404).send('Livro não disponível para reserva');
      return;
    }

    // Inserir reserva na tabela de reservas
    const sqlInserirReserva = 'INSERT INTO reservas (id_livro, id_usuario, data_reserva) VALUES (?, ?, NOW())';
    connection.query(sqlInserirReserva, [id_livro, id_usuario], (err) => {
      if (err) {
        console.error('Erro ao fazer reserva:', err);
        res.status(500).send('Erro ao fazer reserva');
        return;
      }

      // Enviar e-mail de notificação de reserva
      const emailUsuario = email; // Você deve obter o e-mail do usuário do banco de dados
      const livroReservado = results[0].titulo; // Supondo que o título do livro está armazenado na coluna 'titulo' da tabela 'livros'
      enviarEmailNotificacao(emailUsuario, livroReservado);

      res.status(200).send('Reserva efetuada com sucesso. Você será notificado por e-mail quando o livro estiver disponível.');
    });
  });
});

// Função para enviar e-mail de notificação de reserva
function enviarEmailNotificacao(email, livro) {
  const mailOptions = {
    from: 'seuemail@gmail.com',
    to: email,
    subject: 'Reserva de Livro Confirmada',
    text: `Sua reserva do livro "${livro}" foi confirmada. Assim que estiver disponível, entraremos em contato.`
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.error('Erro ao enviar e-mail de notificação:', error);
    } else {
      console.log('E-mail de notificação enviado:', info.response);
    }
  });
}