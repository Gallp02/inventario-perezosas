const mysql = require('mysql2/promise');
require('dotenv').config();

const configuracion = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'inventario_db'
};

if (!configuracion.password) {
  console.error('ERROR: DB_PASSWORD o MYSQLPASSWORD no está configurada');
  process.exit(1);
}

const pool = mysql.createPool({
  ...configuracion,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
