async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/login') && !path.startsWith('/me')) {
      window.dispatchEvent(new CustomEvent('inv:unauthorized'));
    }
    throw new Error(data.error || 'Error en la solicitud');
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path, body) => request(path, {
    method: 'DELETE',
    body: body === undefined ? undefined : JSON.stringify(body)
  }),
  login: (usuario, password) => request('/login', { method: 'POST', body: JSON.stringify({ usuario, password }) }),
  me: () => request('/me'),
  logout: () => request('/logout', { method: 'POST' })
};

export const money = (value) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0));

export const num = (value, decimals = 0) =>
  new Intl.NumberFormat('es-PE', { maximumFractionDigits: decimals }).format(Number(value || 0));

export const fecha = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export const minimoTexto = (value) => Number(value) === -1 ? 'Indefinido' : num(value, 2);

export const estadoStock = (item) => {
  const stock = Number(item.stock || 0);
  const minimo = Number(item.stock_minimo ?? -1);
  if (stock <= 20) return { clave: 'rojo', etiqueta: 'Crítico', badge: 'badge-error', barra: 'bg-error' };
  if (minimo >= 0 && stock <= minimo) return { clave: 'amarillo', etiqueta: 'Mínimo', badge: 'badge-warning', barra: 'bg-warning' };
  return { clave: 'verde', etiqueta: 'OK', badge: 'badge-success', barra: 'bg-success' };
};

export const DISTRITOS_LIMA = [
  'Ancón', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo', 'Chorrillos', 'Cieneguilla',
  'Comas', 'El Agustino', 'Independencia', 'Jesús María', 'La Molina', 'La Victoria', 'Lima',
  'Lince', 'Los Olivos', 'Lurigancho', 'Lurín', 'Magdalena del Mar', 'Miraflores', 'Pachacámac',
  'Pucusana', 'Pueblo Libre', 'Puente Piedra', 'Punta Hermosa', 'Punta Negra', 'Rímac',
  'San Bartolo', 'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores',
  'San Luis', 'San Martín de Porres', 'San Miguel', 'Santa María del Mar', 'Santa Rosa',
  'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo'
];
