const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const ruta = path.join(__dirname, '../../../database/schema.sql');
const esquema = fs.readFileSync(ruta, 'utf8')
  .split(/\r?\n/)
  .filter((linea) => !/^\s*(CREATE DATABASE|USE)\b/i.test(linea))
  .join('\n');
const sentencias = esquema.split(';').map((s) => s.trim()).filter(Boolean);

(async () => {
  for (const sentencia of sentencias) {
    try {
      await pool.query(sentencia);
    } catch (error) {
      if (![1050, 1061].includes(error.errno)) throw error;
    }
  }
  console.log('Base de datos inicializada');
  await pool.end();
})().catch((error) => {
  console.error('Error al inicializar la BD:', error.message);
  process.exit(1);
});
