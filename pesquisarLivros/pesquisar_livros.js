const db_config = require('./db_config');
function pesquisarLivros(criterios, callback) {
  let sql = 'SELECT * FROM livros WHERE ';

  const { autor, titulo, categoria, classificacao } = criterios;
  const params = [];
  const conditions = [];

  if (autor) {
    conditions.push('Autor LIKE ?');
    params.push('%' + autor + '%');
  }
  if (titulo) {
    conditions.push('Titulo LIKE ?');
    params.push('%' + titulo + '%');
  }
  if (categoria) {
    conditions.push('Categoria = ?');
    params.push(categoria);
  }
  if (classificacao) {
    conditions.push('Classificacao = ?');
    params.push(classificacao);
  }

  if (conditions.length === 0) {
    callback(new Error('Pelo menos um critério de pesquisa deve ser fornecido'), null);
    return;
  }

  sql += conditions.join(' AND ');

  connection.query(sql, params, (err, results) => {
    if (err) {
      callback(err, null);
      return;
    }

    callback(null, results);
  });
}
