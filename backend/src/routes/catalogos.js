const router = require('express').Router();
const pool = require('../config/database');

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function decimal(value, field, min = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) fail(400, `${field} debe ser un número válido`);
  return n;
}

function minimo(value, field) {
  if (value === 'indefinido' || value === 'Indefinido' || value === -1 || value === '-1') return -1;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) fail(400, `${field} debe ser un número válido o Indefinido`);
  return Math.round(n);
}

function minimoDecimal(value, field) {
  if (value === 'indefinido' || value === 'Indefinido' || value === -1 || value === '-1') return -1;
  return decimal(value, field);
}

function text(value, field, required = true) {
  const v = String(value ?? '').trim();
  if (required && !v) fail(400, `${field} es obligatorio`);
  return v;
}

router.get('/productos', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM productos ORDER BY orden ASC, activo DESC, categoria, nombre'
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.put('/productos/reordenar', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : [];
    if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) fail(400, 'Orden inválido');
    await conn.beginTransaction();
    for (let index = 0; index < ids.length; index += 1) {
      await conn.query('UPDATE productos SET orden = ? WHERE id = ?', [index + 1, ids[index]]);
    }
    await conn.commit();
    res.json({ mensaje: 'Orden actualizado' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post('/productos', async (req, res, next) => {
  try {
    const b = req.body;
    const values = [
      text(b.codigo, 'Código').toUpperCase(),
      text(b.nombre, 'Nombre'),
      text(b.categoria, 'Categoría'),
      text(b.descripcion, 'Descripción', false),
      decimal(b.precio_venta, 'Precio de venta'),
      Math.round(decimal(b.stock, 'Stock')),
      minimo(b.stock_minimo, 'Stock mínimo')
    ];
    const [[siguiente]] = await pool.query('SELECT COALESCE(MAX(orden), 0) + 1 AS orden FROM productos');
    values.push(siguiente.orden);
    const [result] = await pool.query(
      `INSERT INTO productos (codigo, nombre, categoria, descripcion, precio_venta, stock, stock_minimo, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );
    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return next(Object.assign(new Error('Ese código ya existe'), { status: 400 }));
    next(error);
  }
});

router.put('/productos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [current] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (!current.length) fail(404, 'Producto no encontrado');
    const p = current[0];
    const b = req.body;
    const values = [
      text(b.codigo ?? p.codigo, 'Código').toUpperCase(),
      text(b.nombre ?? p.nombre, 'Nombre'),
      text(b.categoria ?? p.categoria, 'Categoría'),
      text(b.descripcion ?? p.descripcion, 'Descripción', false),
      decimal(b.precio_venta ?? p.precio_venta, 'Precio de venta'),
      minimo(b.stock_minimo ?? p.stock_minimo, 'Stock mínimo'),
      b.activo === undefined ? p.activo : (b.activo ? 1 : 0),
      id
    ];
    await pool.query(
      `UPDATE productos SET codigo = ?, nombre = ?, categoria = ?, descripcion = ?,
       precio_venta = ?, stock_minimo = ?, activo = ? WHERE id = ?`,
      values
    );
    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return next(Object.assign(new Error('Ese código ya existe'), { status: 400 }));
    next(error);
  }
});

router.delete('/productos/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('UPDATE productos SET activo = 0 WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) fail(404, 'Producto no encontrado');
    res.json({ mensaje: 'Producto archivado' });
  } catch (error) {
    next(error);
  }
});

router.get('/insumos', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM insumos ORDER BY orden ASC, activo DESC, categoria, nombre');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.put('/insumos/reordenar', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : [];
    if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) fail(400, 'Orden inválido');
    await conn.beginTransaction();
    for (let index = 0; index < ids.length; index += 1) {
      await conn.query('UPDATE insumos SET orden = ? WHERE id = ?', [index + 1, ids[index]]);
    }
    await conn.commit();
    res.json({ mensaje: 'Orden actualizado' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post('/insumos', async (req, res, next) => {
  try {
    const b = req.body;
    const values = [
      text(b.codigo, 'Código').toUpperCase(),
      text(b.nombre, 'Nombre'),
      text(b.categoria, 'Categoría'),
      text(b.unidad || 'pza', 'Unidad'),
      decimal(b.stock, 'Stock'),
      minimoDecimal(b.stock_minimo, 'Stock mínimo'),
      decimal(b.costo_unitario, 'Costo unitario')
    ];
    const [[siguiente]] = await pool.query('SELECT COALESCE(MAX(orden), 0) + 1 AS orden FROM insumos');
    values.push(siguiente.orden);
    const [result] = await pool.query(
      `INSERT INTO insumos (codigo, nombre, categoria, unidad, stock, stock_minimo, costo_unitario, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );
    const [rows] = await pool.query('SELECT * FROM insumos WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return next(Object.assign(new Error('Ese código ya existe'), { status: 400 }));
    next(error);
  }
});

router.put('/insumos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [current] = await pool.query('SELECT * FROM insumos WHERE id = ?', [id]);
    if (!current.length) fail(404, 'Insumo no encontrado');
    const i = current[0];
    const b = req.body;
    const values = [
      text(b.codigo ?? i.codigo, 'Código').toUpperCase(),
      text(b.nombre ?? i.nombre, 'Nombre'),
      text(b.categoria ?? i.categoria, 'Categoría'),
      text(b.unidad ?? i.unidad, 'Unidad'),
      minimoDecimal(b.stock_minimo ?? i.stock_minimo, 'Stock mínimo'),
      decimal(b.costo_unitario ?? i.costo_unitario, 'Costo unitario'),
      b.activo === undefined ? i.activo : (b.activo ? 1 : 0),
      id
    ];
    await pool.query(
      `UPDATE insumos SET codigo = ?, nombre = ?, categoria = ?, unidad = ?,
       stock_minimo = ?, costo_unitario = ?, activo = ? WHERE id = ?`,
      values
    );
    const [rows] = await pool.query('SELECT * FROM insumos WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return next(Object.assign(new Error('Ese código ya existe'), { status: 400 }));
    next(error);
  }
});

router.delete('/insumos/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('UPDATE insumos SET activo = 0 WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) fail(404, 'Insumo no encontrado');
    res.json({ mensaje: 'Insumo desactivado' });
  } catch (error) {
    next(error);
  }
});

router.get('/recetas', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.producto_id, p.nombre AS producto_nombre, p.codigo AS producto_codigo,
              r.insumo_id, i.nombre AS insumo_nombre, i.codigo AS insumo_codigo,
              i.unidad, i.stock AS insumo_stock, r.cantidad
       FROM recetas r
       JOIN productos p ON p.id = r.producto_id
       JOIN insumos i ON i.id = r.insumo_id
       ORDER BY p.nombre, i.nombre`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.put('/recetas/:productoId', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const productoId = Number(req.params.productoId);
    const [products] = await conn.query('SELECT id FROM productos WHERE id = ?', [productoId]);
    if (!products.length) fail(404, 'Producto no encontrado');
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    await conn.beginTransaction();
    await conn.query('DELETE FROM recetas WHERE producto_id = ?', [productoId]);
    for (const item of items) {
      const insumoId = Number(item.insumo_id);
      const cantidad = decimal(item.cantidad, 'Cantidad', 0.01);
      const [insumos] = await conn.query('SELECT id FROM insumos WHERE id = ?', [insumoId]);
      if (!insumos.length) fail(400, `Insumo ${insumoId} no encontrado`);
      await conn.query(
        'INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES (?, ?, ?)',
        [productoId, insumoId, cantidad]
      );
    }
    await conn.commit();
    res.json({ mensaje: 'Receta actualizada', items: items.length });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

module.exports = router;
