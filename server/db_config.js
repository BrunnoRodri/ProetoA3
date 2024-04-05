// db_config.js

const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'banana',
  database: 'gerenciador'
});

module.exports = connection;
