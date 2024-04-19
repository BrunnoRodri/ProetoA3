// Rota para emprestar livro
app.post('/emprestar-livro', (req, res) => {
    const { id_livro, id_usuario } = req.body;

    // Verificar se o livro está disponível para empréstimo
    const sqlVerificarDisponibilidade = 'SELECT * FROM livros WHERE id = ? AND disponivel = true';
    connection.query(sqlVerificarDisponibilidade, [id_livro], (err, results) => {
        if (err) {
            console.error('Erro ao verificar disponibilidade do livro:', err);
            res.status(500).send('Erro ao verificar disponibilidade do livro');
            return;
        }

        if (results.length === 0) {
            res.status(404).send('Livro não disponível para empréstimo');
            return;
        }

        // Verificar se o livro está reservado
        const sqlVerificarReserva = 'SELECT * FROM reservas WHERE id_livro = ?';
        connection.query(sqlVerificarReserva, [id_livro], (err, reservaResult) => {
            if (err) {
                console.error('Erro ao verificar reserva do livro:', err);
                res.status(500).send('Erro ao verificar reserva do livro');
                return;
            }

            if (reservaResult.length > 0) {
                res.status(400).send('Livro reservado, não pode ser emprestado');
                return;
            }

            // Registrar empréstimo na tabela de empréstimos
            const sqlRegistrarEmprestimo = 'INSERT INTO emprestimos (id_livro, id_usuario, data_emprestimo) VALUES (?, ?, NOW())';
            connection.query(sqlRegistrarEmprestimo, [id_livro, id_usuario], (err) => {
                if (err) {
                    console.error('Erro ao registrar empréstimo:', err);
                    res.status(500).send('Erro ao registrar empréstimo');
                    return;
                }

                res.status(200).send('Empréstimo realizado com sucesso');
            });
        });
    });
});

// Rota para devolver livro
app.post('/devolver-livro', (req, res) => {
    const { id_livro } = req.body;

    // Marcar o livro como disponível na tabela de livros
    const sqlMarcarComoDisponivel = 'UPDATE livros SET disponivel = true WHERE id = ?';
    connection.query(sqlMarcarComoDisponivel, [id_livro], (err) => {
        if (err) {
            console.error('Erro ao marcar livro como disponível:', err);
            res.status(500).send('Erro ao marcar livro como disponível');
            return;
        }

        // Remover qualquer reserva associada a este livro
        const sqlRemoverReserva = 'DELETE FROM reservas WHERE id_livro = ?';
        connection.query(sqlRemoverReserva, [id_livro], (err) => {
            if (err) {
                console.error('Erro ao remover reserva do livro:', err);
                res.status(500).send('Erro ao remover reserva do livro');
                return;
            }

            res.status(200).send('Livro devolvido com sucesso');
        });
    });
});
