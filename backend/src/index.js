const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/database');

const app = express();
app.set('trust proxy', 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const SECRETO = Buffer.from(process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex'), 'hex');
const COOKIE = 'inv_session';
const DURACION = 8 * 60 * 60 * 1000;

function firmar(payload) {
  return crypto.createHmac('sha256', SECRETO).update(payload).digest('base64url');
}

function crearToken(usuario) {
  const payload = Buffer.from(JSON.stringify({ u: usuario, exp: Date.now() + DURACION })).toString('base64url');
  return `${payload}.${firmar(payload)}`;
}

function leerToken(token) {
  if (!token) return null;
  const [payload, firma] = token.split('.');
  if (!payload || !firma) return null;
  const esperada = firmar(payload);
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  try {
    const datos = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!datos.exp || datos.exp < Date.now()) return null;
    return datos.u;
  } catch {
    return null;
  }
}

function cookies(req) {
  const resultado = {};
  for (const parte of (req.headers.cookie || '').split(';')) {
    const indice = parte.indexOf('=');
    if (indice > 0) resultado[parte.slice(0, indice).trim()] = decodeURIComponent(parte.slice(indice + 1).trim());
  }
  return resultado;
}

function passwordValida(password) {
  if (!process.env.AUTH_PASSWORD_HASH || !process.env.AUTH_PASSWORD_SALT) return false;
  const calculado = crypto.scryptSync(String(password || ''), Buffer.from(process.env.AUTH_PASSWORD_SALT, 'hex'), 64);
  const esperado = Buffer.from(process.env.AUTH_PASSWORD_HASH, 'hex');
  return calculado.length === esperado.length && crypto.timingSafeEqual(calculado, esperado);
}

function esSeguro(req) {
  return req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function opcionesCookie(req) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: esSeguro(req),
    path: '/',
    maxAge: DURACION
  };
}

function requerirAuth(req, res, next) {
  const usuario = leerToken(cookies(req)[COOKIE]);
  if (!usuario) return res.status(401).json({ error: 'Inicia sesión para continuar' });
  req.usuario = usuario;
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'inventario-perezosas' });
});

app.post('/api/login', async (req, res, next) => {
  const usuario = String(req.body.usuario || '').trim();
  if (usuario !== process.env.AUTH_USER || !passwordValida(req.body.password)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  try {
    const ip = String(req.ip || '').replace(/^::ffff:/, '') || null;
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 255);
    await pool.query(
      'INSERT INTO login_logs (usuario, ip, user_agent) VALUES (?, ?, ?)',
      [usuario, ip, userAgent]
    );
  } catch (error) {
    return next(error);
  }
  res.cookie(COOKIE, crearToken(usuario), opcionesCookie(req));
  res.json({ usuario });
});

app.use('/api', requerirAuth);

app.get('/api/me', (req, res) => res.json({ usuario: req.usuario }));

app.get('/api/accesos', async (req, res, next) => {
  try {
    const [total] = await pool.query('SELECT COUNT(*) AS total FROM login_logs');
    const [porUsuario] = await pool.query(
      `SELECT usuario, COUNT(*) AS cantidad, MAX(fecha) AS ultimo
       FROM login_logs GROUP BY usuario ORDER BY cantidad DESC`
    );
    const [recientes] = await pool.query(
      `SELECT id, usuario, ip, fecha FROM login_logs
       ORDER BY fecha DESC, id DESC LIMIT 10`
    );
    res.json({
      total: Number(total[0].total),
      porUsuario,
      recientes
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(COOKIE, { ...opcionesCookie(req), maxAge: undefined });
  res.json({ mensaje: 'Sesión cerrada' });
});

app.use('/api/catalogos', require('./routes/catalogos'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api', require('./routes/operaciones'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint no encontrado' }));

const dist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : err.message });
});

const PORT = Number(process.env.PORT || 3003);
app.listen(PORT, () => {
  console.log(`Inventario perezosas en http://localhost:${PORT}`);
});
