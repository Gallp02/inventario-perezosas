const router = require('express').Router();
const pool = require('../config/database');

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function text(value, field, required = false) {
  const v = String(value ?? '').trim();
  if (required && !v) fail(400, `${field} es obligatorio`);
  return v || null;
}

function datos(body) {
  return {
    nombre: text(body.nombre, 'Nombre', true),
    distrito: text(body.distrito, 'Distrito'),
    provincia: text(body.provincia, 'Provincia') || 'Lima',
    telefono: text(body.telefono, 'Teléfono'),
    direccion: text(body.direccion, 'Dirección'),
    notas: text(body.notas, 'Notas'),
    activo: body.activo === undefined ? 1 : (body.activo ? 1 : 0)
  };
}

router.get('/', async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];
    if (!req.query.incluirInactivos) conditions.push('activo = 1');
    if (req.query.distrito) {
      conditions.push('distrito = ?');
      params.push(String(req.query.distrito));
    }
    if (req.query.q) {
      conditions.push('(nombre LIKE ? OR telefono LIKE ? OR distrito LIKE ?)');
      const like = `%${String(req.query.q)}%`;
      params.push(like, like, like);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT * FROM clientes ${where} ORDER BY activo DESC, distrito, nombre`,
      params
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const d = datos(req.body);
    const [result] = await pool.query(
      `INSERT INTO clientes (nombre, distrito, provincia, telefono, direccion, notas, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.nombre, d.distrito, d.provincia, d.telefono, d.direccion, d.notas, d.activo]
    );
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [current] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!current.length) fail(404, 'Cliente no encontrado');
    const d = datos({ activo: current[0].activo, ...req.body });
    await pool.query(
      `UPDATE clientes SET nombre = ?, distrito = ?, provincia = ?, telefono = ?,
       direccion = ?, notas = ?, activo = ? WHERE id = ?`,
      [d.nombre, d.distrito, d.provincia, d.telefono, d.direccion, d.notas, d.activo, id]
    );
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('UPDATE clientes SET activo = 0 WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) fail(404, 'Cliente no encontrado');
    res.json({ mensaje: 'Cliente archivado' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
