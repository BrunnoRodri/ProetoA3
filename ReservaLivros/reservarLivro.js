$(document).ready(function() {
    $('#formReserva').submit(function(event) {
      event.preventDefault();
  
      const idLivro = $('#id_livro').val();
      const idUsuario = $('#id_usuario').val();
  
      $.ajax({
        type: 'POST',
        url: '/reservar-livro',
        data: { id_livro: idLivro, id_usuario: idUsuario },
        success: function(response) {
          alert(response);
          $('#formReserva')[0].reset(); // Limpa o formulário após a reserva
        },
        error: function(error) {
          alert('Erro ao reservar livro: ' + error.responseText);
        }
      });
    });
  });
  