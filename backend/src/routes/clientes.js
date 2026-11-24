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

function dni(value) {
  const v = String(value ?? '').trim().replace(/[\s.-]/g, '').toUpperCase();
  return v ? v.slice(0, 20) : null;
}

function datos(body = {}) {
  const b = body || {};
  return {
    nombre: text(b.nombre, 'Nombre', true),
    dni: dni(b.dni),
    empresa: text(b.empresa, 'Empresa'),
    distrito: text(b.distrito, 'Distrito'),
    provincia: text(b.provincia, 'Provincia') || 'Lima',
    telefono: text(b.telefono, 'Teléfono'),
    direccion: text(b.direccion, 'Dirección'),
    notas: text(b.notas, 'Notas'),
    activo: b.activo === undefined ? 1 : (b.activo ? 1 : 0)
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
      conditions.push('(nombre LIKE ? OR dni LIKE ? OR empresa LIKE ? OR telefono LIKE ? OR distrito LIKE ?)');
      const like = `%${String(req.query.q)}%`;
      params.push(like, like, like, like, like);
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
      `INSERT INTO clientes (nombre, dni, empresa, distrito, provincia, telefono, direccion, notas, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.nombre, d.dni, d.empresa, d.distrito, d.provincia, d.telefono, d.direccion, d.notas, d.activo]
    );
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return next(Object.assign(new Error('Ese DNI ya está registrado'), { status: 400 }));
    next(error);
  }
});

router.post('/importar', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const filas = Array.isArray(req.body.clientes) ? req.body.clientes : [];
    if (!filas.length) fail(400, 'No hay clientes para importar');
    if (filas.length > 2000) fail(400, 'Máximo 2000 clientes por importación');
    await conn.beginTransaction();
    let creados = 0;
    let actualizados = 0;
    for (let index = 0; index < filas.length; index += 1) {
      let d;
      try {
        d = datos(filas[index]);
      } catch (error) {
        fail(400, `Fila ${index + 1}: ${error.message}`);
      }
      const valores = [d.nombre, d.dni, d.empresa, d.distrito, d.provincia, d.telefono, d.direccion, d.notas, d.activo];
      try {
        const [result] = await conn.query(
          `INSERT INTO clientes (nombre, dni, empresa, distrito, provincia, telefono, direccion, notas, activo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), empresa = VALUES(empresa),
           distrito = VALUES(distrito), provincia = VALUES(provincia), telefono = VALUES(telefono),
           direccion = VALUES(direccion), notas = VALUES(notas), activo = VALUES(activo)`,
          valores
        );
        if (result.insertId && result.affectedRows === 1) creados += 1;
        else actualizados += 1;
      } catch (error) {
        fail(400, `Fila ${index + 1}: ${error.message}`);
      }
    }
    await conn.commit();
    res.json({ creados, actualizados, total: filas.length });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [current] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!current.length) fail(404, 'Cliente no encontrado');
    const d = datos({ activo: current[0].activo, ...req.body });
    await pool.query(
      `UPDATE clientes SET nombre = ?, dni = ?, empresa = ?, distrito = ?, provincia = ?,
       telefono = ?, direccion = ?, notas = ?, activo = ? WHERE id = ?`,
      [d.nombre, d.dni, d.empresa, d.distrito, d.provincia, d.telefono, d.direccion, d.notas, d.activo, id]
    );
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return next(Object.assign(new Error('Ese DNI ya está registrado'), { status: 400 }));
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
