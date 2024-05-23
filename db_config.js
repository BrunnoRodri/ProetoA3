// db_config.js

const mysql = require('mysql2');

const config = {
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'cadastro'
};

const connection = mysql.createConnection(config);

module.exports = config;

