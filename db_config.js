// db_config.js

const mysql = require('mysql2');

const config = {
  host: 'localhost',
  user: 'root',
  password: 'banana',
  database: 'gerenciador'
};

const connection = mysql.createConnection(config);

module.exports = config;

