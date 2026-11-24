const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const ruta = path.join(__dirname, '../../../database/schema.sql');
const esquema = fs.readFileSync(ruta, 'utf8')
  .split(/\r?\n/)
  .filter((linea) => !/^\s*(CREATE DATABASE|USE)\b/i.test(linea))
  .join('\n');
const sentencias = esquema.split(';').map((s) => s.trim()).filter(Boolean);
const ignorables = [1050, 1060, 1061, 1091];
const migraciones = [
  'ALTER TABLE productos ADD COLUMN orden INT NOT NULL DEFAULT 0',
  'UPDATE productos SET orden = id WHERE orden = 0',
  'ALTER TABLE insumos ADD COLUMN orden INT NOT NULL DEFAULT 0',
  'UPDATE insumos SET orden = id WHERE orden = 0',
  'ALTER TABLE clientes ADD COLUMN dni VARCHAR(20) NULL AFTER nombre',
  'ALTER TABLE clientes ADD COLUMN empresa VARCHAR(150) NULL AFTER dni',
  "UPDATE clientes SET dni = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(dni, '.', ''), '-', ''), ' ', ''), CHAR(9), ''), CHAR(160), '') WHERE dni IS NOT NULL",
  "UPDATE clientes SET dni = NULL WHERE dni = ''",
  `UPDATE clientes c
   JOIN (SELECT dni, MIN(id) AS id_min FROM clientes WHERE dni IS NOT NULL GROUP BY dni HAVING COUNT(*) > 1) d
     ON c.dni = d.dni AND c.id > d.id_min
   SET c.dni = NULL`,
  'ALTER TABLE clientes DROP INDEX idx_clientes_dni',
  'ALTER TABLE clientes ADD UNIQUE KEY uq_clientes_dni (dni)',
  'ALTER TABLE ventas ADD COLUMN cliente_id INT NULL',
  'ALTER TABLE ventas ADD COLUMN anio_pedido INT NULL',
  'UPDATE ventas SET anio_pedido = YEAR(fecha) WHERE anio_pedido IS NULL',
  'ALTER TABLE ventas DROP INDEX codigo',
  'ALTER TABLE ventas ADD UNIQUE KEY uq_ventas_codigo_anio (codigo, anio_pedido)',
  'ALTER TABLE ventas DROP FOREIGN KEY fk_venta_cliente',
  'ALTER TABLE ventas ADD CONSTRAINT fk_venta_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id)'
];

(async () => {
  for (const sentencia of [...sentencias, ...migraciones]) {
    try {
      await pool.query(sentencia);
    } catch (error) {
      if (!ignorables.includes(error.errno)) throw error;
    }
  }
  console.log('Base de datos inicializada');
  await pool.end();
})().catch((error) => {
  console.error('Error al inicializar la BD:', error.message);
  process.exit(1);
});
