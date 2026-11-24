const router = require('express').Router();
const pool = require('../config/database');

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function positive(value, field, integer = false) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) fail(400, `${field} debe ser mayor a 0`);
  return integer ? Math.round(n) : n;
}

function signed(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) fail(400, `${field} debe ser un número distinto de 0`);
  return n;
}

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

async function nextCodigoVenta(conn) {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const prefijo = MESES[ahora.getMonth()];
  const [[fila]] = await conn.query(
    `SELECT MAX(CAST(SUBSTRING_INDEX(codigo, '-', -1) AS UNSIGNED)) AS ultimo
     FROM ventas WHERE anio_pedido = ? AND codigo LIKE ?`,
    [anio, `${prefijo}-%`]
  );
  return { codigo: `${prefijo}-${Number(fila.ultimo || 0) + 1}`, anio };
}

router.post('/fabricar', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const productoId = Number(req.body.producto_id);
    const cantidad = positive(req.body.cantidad, 'Cantidad', true);
    const usuario = String(req.body.usuario || 'local').trim() || 'local';
    await conn.beginTransaction();
    const [products] = await conn.query('SELECT * FROM productos WHERE id = ? AND activo = 1 FOR UPDATE', [productoId]);
    if (!products.length) fail(404, 'Producto no encontrado');
    const producto = products[0];
    const [recipe] = await conn.query(
      `SELECT r.cantidad, i.id, i.nombre, i.unidad, i.stock
       FROM recetas r JOIN insumos i ON i.id = r.insumo_id
       WHERE r.producto_id = ?`,
      [productoId]
    );
    if (!recipe.length) fail(400, 'Este producto no tiene receta de insumos');
    const requeridos = recipe.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      unidad: r.unidad,
      disponible: Number(r.stock),
      requerido: Number(r.cantidad) * cantidad
    }));
    const faltantes = requeridos.filter((r) => r.disponible < r.requerido);
    if (faltantes.length) {
      fail(400, `Faltan insumos: ${faltantes.map((r) => `${r.nombre} (${r.disponible} ${r.unidad}, necesita ${r.requerido})`).join(', ')}`);
    }
    for (const r of requeridos) {
      const nuevo = Number((r.disponible - r.requerido).toFixed(2));
      await conn.query('UPDATE insumos SET stock = ? WHERE id = ?', [nuevo, r.id]);
      await conn.query(
        `INSERT INTO movimientos_insumo (insumo_id, tipo, cantidad, anterior, nuevo, referencia, usuario)
         VALUES (?, 'consumo_fabricacion', ?, ?, ?, ?, ?)`,
        [r.id, r.requerido, r.disponible, nuevo, `Fabricación ${producto.codigo} x${cantidad}`, usuario]
      );
    }
    const stockNuevo = producto.stock + cantidad;
    await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [stockNuevo, productoId]);
    await conn.query(
      `INSERT INTO movimientos_producto (producto_id, tipo, cantidad, anterior, nuevo, referencia, usuario)
       VALUES (?, 'fabricacion', ?, ?, ?, ?, ?)`,
      [productoId, cantidad, producto.stock, stockNuevo, 'Fabricación', usuario]
    );
    await conn.commit();
    res.json({
      mensaje: `Se fabricaron ${cantidad} de ${producto.nombre}`,
      producto: { ...producto, stock: stockNuevo },
      insumos: requeridos
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post('/ventas', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) fail(400, 'La venta necesita al menos un producto');
    const clienteId = req.body.cliente_id ? Number(req.body.cliente_id) : null;
    let cliente = String(req.body.cliente || '').trim();
    const notas = String(req.body.notas || '').trim();
    const usuario = String(req.body.usuario || 'local').trim() || 'local';
    if (clienteId) {
      const [clientes] = await pool.query('SELECT * FROM clientes WHERE id = ? AND activo = 1', [clienteId]);
      if (!clientes.length) fail(400, 'Cliente no encontrado');
      const c = clientes[0];
      cliente = `${c.nombre}${c.distrito ? ` · ${c.distrito}` : ''}`;
    }
    if (!cliente) cliente = 'Indefinido';
    const normalizados = items.map((item) => ({
      producto_id: Number(item.producto_id),
      cantidad: positive(item.cantidad, 'Cantidad', true),
      precio_unitario: item.precio_unitario === undefined || item.precio_unitario === ''
        ? null
        : positive(item.precio_unitario, 'Precio unitario')
    }));
    const ids = normalizados.map((i) => i.producto_id);
    await conn.beginTransaction();
    const [products] = await conn.query(
      `SELECT * FROM productos WHERE id IN (?) AND activo = 1 FOR UPDATE`,
      [ids]
    );
    const byId = new Map(products.map((p) => [p.id, p]));
    const faltantes = [];
    const detalles = normalizados.map((item) => {
      const p = byId.get(item.producto_id);
      if (!p) fail(400, `Producto ${item.producto_id} no encontrado`);
      if (p.stock < item.cantidad) faltantes.push(`${p.nombre} (hay ${p.stock}, se piden ${item.cantidad})`);
      const precio = item.precio_unitario === null ? Number(p.precio_venta) : item.precio_unitario;
      return { producto: p, cantidad: item.cantidad, precio, subtotal: Number((precio * item.cantidad).toFixed(2)) };
    });
    if (faltantes.length) fail(400, `Stock insuficiente: ${faltantes.join(', ')}`);
    const total = Number(detalles.reduce((sum, d) => sum + d.subtotal, 0).toFixed(2));
    const { codigo, anio } = await nextCodigoVenta(conn);
    const [result] = await conn.query(
      `INSERT INTO ventas (codigo, anio_pedido, cliente_id, cliente, total, notas, usuario)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [codigo, anio, clienteId, cliente, total, notas || null, usuario]
    );
    const ventaId = result.insertId;
    for (const d of detalles) {
      await conn.query(
        `INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [ventaId, d.producto.id, d.cantidad, d.precio, d.subtotal]
      );
      const nuevo = d.producto.stock - d.cantidad;
      await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevo, d.producto.id]);
      await conn.query(
        `INSERT INTO movimientos_producto (producto_id, tipo, cantidad, anterior, nuevo, referencia, usuario)
         VALUES (?, 'venta', ?, ?, ?, ?, ?)`,
        [d.producto.id, d.cantidad, d.producto.stock, nuevo, codigo, usuario]
      );
    }
    await conn.commit();
    res.status(201).json({
      id: ventaId,
      codigo,
      orden: codigo,
      cliente,
      total,
      items: detalles.map((d) => ({
        producto_id: d.producto.id,
        nombre: d.producto.nombre,
        cantidad: d.cantidad,
        precio_unitario: d.precio,
        subtotal: d.subtotal
      }))
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post('/ventas/:id/anular', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const usuario = String(req.body.usuario || 'local').trim() || 'local';
    await conn.beginTransaction();
    const [ventas] = await conn.query('SELECT * FROM ventas WHERE id = ? FOR UPDATE', [id]);
    if (!ventas.length) fail(404, 'Venta no encontrada');
    const venta = ventas[0];
    if (venta.estado !== 'completada') fail(400, 'La venta ya está anulada');
    const [detalles] = await conn.query('SELECT * FROM venta_detalles WHERE venta_id = ?', [id]);
    for (const d of detalles) {
      const [products] = await conn.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [d.producto_id]);
      const anterior = products[0].stock;
      const nuevo = anterior + d.cantidad;
      await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevo, d.producto_id]);
      await conn.query(
        `INSERT INTO movimientos_producto (producto_id, tipo, cantidad, anterior, nuevo, referencia, usuario)
         VALUES (?, 'anulacion', ?, ?, ?, ?, ?)`,
        [d.producto_id, d.cantidad, anterior, nuevo, `Anulación ${venta.codigo}`, usuario]
      );
    }
    await conn.query("UPDATE ventas SET estado = 'anulada' WHERE id = ?", [id]);
    await conn.commit();
    res.json({ mensaje: `Venta ${venta.codigo} anulada y stock restaurado` });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.delete('/ventas/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const usuario = String(req.body.usuario || 'local').trim() || 'local';
    await conn.beginTransaction();
    const [ventas] = await conn.query('SELECT * FROM ventas WHERE id = ? FOR UPDATE', [id]);
    if (!ventas.length) fail(404, 'Venta no encontrada');
    const venta = ventas[0];
    const [detalles] = await conn.query('SELECT * FROM venta_detalles WHERE venta_id = ?', [id]);
    if (venta.estado === 'completada') {
      for (const d of detalles) {
        const [products] = await conn.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [d.producto_id]);
        if (!products.length) continue;
        const anterior = products[0].stock;
        const nuevo = anterior + d.cantidad;
        await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevo, d.producto_id]);
        await conn.query(
          `INSERT INTO movimientos_producto (producto_id, tipo, cantidad, anterior, nuevo, referencia, usuario)
           VALUES (?, 'anulacion', ?, ?, ?, ?, ?)`,
          [d.producto_id, d.cantidad, anterior, nuevo, `Eliminación ${venta.codigo}`, usuario]
        );
      }
    }
    await conn.query('DELETE FROM venta_detalles WHERE venta_id = ?', [id]);
    await conn.query('DELETE FROM ventas WHERE id = ?', [id]);
    await conn.commit();
    res.json({ mensaje: `Venta ${venta.codigo} eliminada` });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post('/insumos/:id/entrada', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const cantidad = positive(req.body.cantidad, 'Cantidad');
    const referencia = String(req.body.referencia || 'Entrada').trim();
    const usuario = String(req.body.usuario || 'local').trim() || 'local';
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM insumos WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) fail(404, 'Insumo no encontrado');
    const anterior = Number(rows[0].stock);
    const nuevo = Number((anterior + cantidad).toFixed(2));
    await conn.query('UPDATE insumos SET stock = ? WHERE id = ?', [nuevo, id]);
    await conn.query(
      `INSERT INTO movimientos_insumo (insumo_id, tipo, cantidad, anterior, nuevo, referencia, usuario)
       VALUES (?, 'compra', ?, ?, ?, ?, ?)`,
      [id, cantidad, anterior, nuevo, referencia, usuario]
    );
    await conn.commit();
    res.json({ mensaje: 'Entrada registrada', stock: nuevo });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post('/insumos/:id/ajuste', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const delta = signed(req.body.cantidad, 'Cantidad');
    const referencia = String(req.body.referencia || 'Ajuste manual').trim();
    const usuario = String(req.body.usuario || 'local').trim() || 'local';
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT stock FROM insumos WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) fail(404, 'Insumo no encontrado');
    const anterior = Number(rows[0].stock);
    const nuevo = Number((anterior + delta).toFixed(2));
    if (nuevo < 0) fail(400, 'El ajuste dejaría stock negativo');
    await conn.query('UPDATE insumos SET stock = ? WHERE id = ?', [nuevo, id]);
    await conn.query(
      `INSERT INTO movimientos_insumo (insumo_id, tipo, cantidad, anterior, nuevo, referencia, usuario)
       VALUES (?, 'ajuste', ?, ?, ?, ?, ?)`,
      [id, delta, anterior, nuevo, referencia, usuario]
    );
    await conn.commit();
    res.json({ mensaje: 'Ajuste registrado', stock: nuevo });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post('/productos/:id/ajuste', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const delta = signed(req.body.cantidad, 'Cantidad');
    const referencia = String(req.body.referencia || 'Ajuste manual').trim();
    const usuario = String(req.body.usuario || 'local').trim() || 'local';
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) fail(404, 'Producto no encontrado');
    const anterior = rows[0].stock;
    const nuevo = anterior + Math.round(delta);
    if (nuevo < 0) fail(400, 'El ajuste dejaría stock negativo');
    await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevo, id]);
    await conn.query(
      `INSERT INTO movimientos_producto (producto_id, tipo, cantidad, anterior, nuevo, referencia, usuario)
       VALUES (?, 'ajuste', ?, ?, ?, ?, ?)`,
      [id, Math.round(delta), anterior, nuevo, referencia, usuario]
    );
    await conn.commit();
    res.json({ mensaje: 'Ajuste registrado', stock: nuevo });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.get('/ventas', async (req, res, next) => {
  try {
    const [ventas] = await pool.query('SELECT * FROM ventas ORDER BY fecha DESC LIMIT 100');
    const [detalles] = await pool.query(
      `SELECT d.*, p.nombre AS producto_nombre FROM venta_detalles d
       JOIN productos p ON p.id = d.producto_id ORDER BY d.id`
    );
    const map = new Map();
    for (const d of detalles) {
      if (!map.has(d.venta_id)) map.set(d.venta_id, []);
      map.get(d.venta_id).push(d);
    }
    res.json(ventas.map((v) => ({ ...v, items: map.get(v.id) || [] })));
  } catch (error) {
    next(error);
  }
});

router.get('/ventas/:id', async (req, res, next) => {
  try {
    const [ventas] = await pool.query('SELECT * FROM ventas WHERE id = ?', [req.params.id]);
    if (!ventas.length) fail(404, 'Venta no encontrada');
    const [detalles] = await pool.query(
      `SELECT d.*, p.nombre AS producto_nombre FROM venta_detalles d
       JOIN productos p ON p.id = d.producto_id WHERE d.venta_id = ? ORDER BY d.id`,
      [req.params.id]
    );
    res.json({ ...ventas[0], items: detalles });
  } catch (error) {
    next(error);
  }
});

const ESTADOS_PEDIDO = ['pendiente', 'en_preparacion', 'listo', 'entregado'];
const ORDEN_ESTADOS = `FIELD(estado_pedido, 'pendiente', 'en_preparacion', 'listo', 'entregado')`;

async function pedidosConItems(filtro = '', params = []) {
  const [pedidos] = await pool.query(
    `SELECT * FROM ventas WHERE estado = 'completada' ${filtro}
     ORDER BY ${ORDEN_ESTADOS}, fecha ASC, id ASC LIMIT 200`,
    params
  );
  const [detalles] = await pool.query(
    `SELECT d.*, p.nombre AS producto_nombre FROM venta_detalles d
     JOIN productos p ON p.id = d.producto_id ORDER BY d.id`
  );
  const map = new Map();
  for (const d of detalles) {
    if (!map.has(d.venta_id)) map.set(d.venta_id, []);
    map.get(d.venta_id).push(d);
  }
  return pedidos.map((p) => ({ ...p, items: map.get(p.id) || [] }));
}

router.get('/pedidos', async (req, res, next) => {
  try {
    const estado = String(req.query.estado || '');
    const filtro = ESTADOS_PEDIDO.includes(estado) ? 'AND estado_pedido = ?' : '';
    const pedidos = await pedidosConItems(filtro, filtro ? [estado] : []);
    const todos = await pedidosConItems();
    const resumen = { total: todos.length };
    for (const e of ESTADOS_PEDIDO) {
      resumen[e] = todos.filter((p) => p.estado_pedido === e).length;
    }
    res.json({ pedidos, resumen });
  } catch (error) {
    next(error);
  }
});

router.get('/pedidos/:id', async (req, res, next) => {
  try {
    const lista = await pedidosConItems('AND id = ?', [req.params.id]);
    const pedido = lista[0];
    if (!pedido) fail(404, 'Pedido no encontrado');
    res.json(pedido);
  } catch (error) {
    next(error);
  }
});

router.patch('/pedidos/:id/estado', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const estado = String(req.body.estado || '');
    if (!ESTADOS_PEDIDO.includes(estado)) fail(400, `Estado inválido. Use: ${ESTADOS_PEDIDO.join(', ')}`);
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT id, estado, estado_pedido FROM ventas WHERE id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!rows.length) fail(404, 'Pedido no encontrado');
    if (rows[0].estado !== 'completada') fail(400, 'No se puede trabajar una venta anulada');
    await conn.query('UPDATE ventas SET estado_pedido = ? WHERE id = ?', [estado, req.params.id]);
    await conn.commit();
    res.json({ id: Number(req.params.id), estado_pedido: estado });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.get('/movimientos', async (req, res, next) => {
  try {
    const tipo = String(req.query.tipo || 'todos');
    const limite = Math.min(Number(req.query.limite) || 100, 300);
    const resultado = [];
    if (tipo === 'todos' || tipo === 'producto') {
      const [rows] = await pool.query(
        `SELECT m.*, p.nombre AS item_nombre FROM movimientos_producto m
         JOIN productos p ON p.id = m.producto_id ORDER BY m.fecha DESC, m.id DESC LIMIT ?`,
        [limite]
      );
      resultado.push(...rows.map((r) => ({ ...r, origen: 'producto' })));
    }
    if (tipo === 'todos' || tipo === 'insumo') {
      const [rows] = await pool.query(
        `SELECT m.*, i.nombre AS item_nombre FROM movimientos_insumo m
         JOIN insumos i ON i.id = m.insumo_id ORDER BY m.fecha DESC, m.id DESC LIMIT ?`,
        [limite]
      );
      resultado.push(...rows.map((r) => ({ ...r, origen: 'insumo' })));
    }
    resultado.sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id);
    res.json(resultado.slice(0, limite));
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const [productos] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN stock <= 20 OR (stock_minimo <> -1 AND stock <= stock_minimo) THEN 1 ELSE 0 END) AS stock_bajo,
              SUM(stock) AS unidades
       FROM productos WHERE activo = 1`
    );
    const [insumos] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN stock <= 20 OR (stock_minimo <> -1 AND stock <= stock_minimo) THEN 1 ELSE 0 END) AS stock_bajo
       FROM insumos WHERE activo = 1`
    );
    const [ventasHoy] = await pool.query(
      `SELECT COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS monto
       FROM ventas WHERE estado = 'completada' AND DATE(fecha) = CURDATE()`
    );
    const [ventasMes] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS monto FROM ventas
       WHERE estado = 'completada' AND YEAR(fecha) = YEAR(CURDATE()) AND MONTH(fecha) = MONTH(CURDATE())`
    );
    const [bajoProductos] = await pool.query(
      `SELECT id, codigo, nombre, stock, stock_minimo FROM productos
       WHERE activo = 1 AND (stock <= 20 OR (stock_minimo <> -1 AND stock <= stock_minimo))
       ORDER BY stock LIMIT 10`
    );
    const [bajoInsumos] = await pool.query(
      `SELECT id, codigo, nombre, stock, stock_minimo, unidad FROM insumos
       WHERE activo = 1 AND (stock <= 20 OR (stock_minimo <> -1 AND stock <= stock_minimo))
       ORDER BY stock LIMIT 10`
    );
    const [masVendidos] = await pool.query(
      `SELECT p.nombre, SUM(d.cantidad) AS vendidas FROM venta_detalles d
       JOIN productos p ON p.id = d.producto_id
       JOIN ventas v ON v.id = d.venta_id WHERE v.estado = 'completada'
       GROUP BY p.id ORDER BY vendidas DESC LIMIT 5`
    );
    const [mp] = await pool.query(
      `SELECT m.*, p.nombre AS item_nombre FROM movimientos_producto m
       JOIN productos p ON p.id = m.producto_id ORDER BY m.fecha DESC, m.id DESC LIMIT 8`
    );
    const [mi] = await pool.query(
      `SELECT m.*, i.nombre AS item_nombre FROM movimientos_insumo m
       JOIN insumos i ON i.id = m.insumo_id ORDER BY m.fecha DESC, m.id DESC LIMIT 8`
    );
    const movimientos = [
      ...mp.map((m) => ({ ...m, origen: 'producto' })),
      ...mi.map((m) => ({ ...m, origen: 'insumo' }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id).slice(0, 8);
    res.json({
      productos: {
        total: Number(productos[0].total),
        stockBajo: Number(productos[0].stock_bajo || 0),
        unidades: Number(productos[0].unidades || 0)
      },
      insumos: {
        total: Number(insumos[0].total),
        stockBajo: Number(insumos[0].stock_bajo || 0)
      },
      ventasHoy: { cantidad: Number(ventasHoy[0].cantidad), monto: Number(ventasHoy[0].monto) },
      ventasMes: { monto: Number(ventasMes[0].monto) },
      bajoProductos,
      bajoInsumos,
      masVendidos,
      movimientos
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
