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
  del: (path) => request(path, { method: 'DELETE' }),
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
