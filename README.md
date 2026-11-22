# Inventario perezosas

Sistema web para gestionar **productos terminados, insumos, recetas, fabricación, ventas y pedidos** de perezosas, toldos y sombrillas.

## Stack

- Frontend: React + Vite + Tailwind CSS 4 + daisyUI 5 + Lucide
- Backend: Node.js + Express
- Base de datos: MySQL 8
- Despliegue: Railway

## Funcionalidades

- Stock de productos e insumos con movimientos registrados.
- Recetas por producto y fabricación que descuenta insumos.
- Ventas que descuentan producto terminado y permiten anular.
- Panel de pedidos con estados: pendiente, en preparación, listo y entregado.
- Login con sesión firmada y registro de accesos.
- Dashboard con KPIs y accesos recientes.

## Demo

- URL: https://inventario-api-production-820ab87b.up.railway.app
- Las credenciales se configuran por variables de entorno; no están incrustadas en el código.

## Ejecutar localmente

```bash
cp backend/.env.example backend/.env
# Completar DB_* y generar AUTH_PASSWORD_SALT, AUTH_PASSWORD_HASH y AUTH_SECRET
npm install
npm install --prefix backend
npm install --prefix frontend
npm run build --prefix frontend
cd backend
node src/scripts/init-db.js
node src/index.js
```

La API queda en `http://localhost:3003` y sirve el frontend compilado desde `frontend/dist`.

## Variables de entorno

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=inventario_db
PORT=3003
AUTH_USER=
AUTH_PASSWORD_SALT=
AUTH_PASSWORD_HASH=
AUTH_SECRET=
```
