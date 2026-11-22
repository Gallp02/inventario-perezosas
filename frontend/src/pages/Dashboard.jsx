import { useEffect, useState } from 'react';
import { ArrowRight, CircleAlert, Package, Boxes, ShoppingCart, ListChecks, TrendingUp, LogIn } from 'lucide-react';
import { api, money, num, fecha } from '../api.js';

const tipoNombre = {
  fabricacion: 'Fabricación', venta: 'Venta', anulacion: 'Anulación',
  ajuste: 'Ajuste', compra: 'Compra', consumo_fabricacion: 'Consumo'
};
const badgeTipo = {
  fabricacion: 'success', venta: 'info', anulacion: 'warning',
  ajuste: 'warning', compra: 'success', consumo_fabricacion: 'info'
};

export default function Dashboard({ refresh, notify, ir }) {
  const [data, setData] = useState(null);
  const [accesos, setAccesos] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/dashboard'), api.get('/accesos')])
      .then(([resumen, ingresos]) => {
        setData(resumen);
        setAccesos(ingresos);
      })
      .catch((error) => notify(error.message, 'error'));
  }, [refresh, notify]);

  if (!data) {
    return <div className="flex min-h-[50vh] items-center justify-center"><span className="loading loading-spinner loading-lg text-primary" /></div>;
  }

  const alertas = data.productos.stockBajo + data.insumos.stockBajo;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm" onClick={() => ir('ventas')}><ShoppingCart size={16} /> Nueva venta</button>
        <button className="btn btn-outline btn-sm" onClick={() => ir('pedidos')}><ListChecks size={16} /> Ver pedidos</button>
        <button className="btn btn-outline btn-sm" onClick={() => ir('fabricar')}>Fabricar mercadería</button>
        <button className="btn btn-outline btn-sm" onClick={() => ir('insumos')}>Entrada de tela/armazón</button>
      </div>

      <div className="stats stats-vertical w-full shadow-sm lg:stats-horizontal">
        <div className="stat">
          <div className="stat-figure text-primary"><Package size={26} /></div>
          <div className="stat-title">Productos terminados</div>
          <div className="stat-value text-3xl">{data.productos.total}</div>
          <div className="stat-desc">{num(data.productos.unidades)} unidades en stock</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-secondary"><Boxes size={26} /></div>
          <div className="stat-title">Insumos</div>
          <div className="stat-value text-3xl">{data.insumos.total}</div>
          <div className="stat-desc">Armazones, telas y más</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-accent"><ShoppingCart size={26} /></div>
          <div className="stat-title">Ventas de hoy</div>
          <div className="stat-value text-3xl">{data.ventasHoy.cantidad}</div>
          <div className="stat-desc">{money(data.ventasHoy.monto)}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-info"><TrendingUp size={26} /></div>
          <div className="stat-title">Ventas del mes</div>
          <div className="stat-value text-2xl">{money(data.ventasMes.monto)}</div>
          <div className="stat-desc">Monto acumulado</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-warning"><LogIn size={26} /></div>
          <div className="stat-title">Ingresos al sistema</div>
          <div className="stat-value text-3xl">{accesos?.total ?? 0}</div>
          <div className="stat-desc">{accesos?.recientes?.[0] ? `Último: ${fecha(accesos.recientes[0].fecha)}` : 'Sin registros'}</div>
        </div>
        <div className={`stat ${alertas ? 'bg-error/5' : ''}`}>
          <div className="stat-figure text-error"><CircleAlert size={26} /></div>
          <div className="stat-title">Alertas de stock</div>
          <div className={`stat-value text-3xl ${alertas ? 'text-error' : ''}`}>{alertas}</div>
          <div className="stat-desc">Por reponer</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body p-5">
            <div className="card-title flex w-full items-center justify-between text-base">
              <span>Productos con stock bajo</span>
              <button className="btn btn-ghost btn-xs gap-1" onClick={() => ir('productos')}>Ver todos <ArrowRight size={14} /></button>
            </div>
            {data.bajoProductos.length ? (
              <div className="overflow-x-auto">
                <table className="table table-sm table-zebra">
                  <thead><tr><th>Producto</th><th className="text-right">Stock</th><th className="text-right">Mínimo</th></tr></thead>
                  <tbody>{data.bajoProductos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nombre}</td>
                      <td className="text-right"><span className="badge badge-error badge-sm">{p.stock}</span></td>
                      <td className="text-right opacity-60">{p.stock_minimo}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="py-8 text-center text-sm opacity-50">Todo el inventario está por encima del mínimo</div>}
          </div>
        </div>

        <div className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body p-5">
            <div className="card-title flex w-full items-center justify-between text-base">
              <span>Insumos por reponer</span>
              <button className="btn btn-ghost btn-xs gap-1" onClick={() => ir('insumos')}>Ver todos <ArrowRight size={14} /></button>
            </div>
            {data.bajoInsumos.length ? (
              <div className="overflow-x-auto">
                <table className="table table-sm table-zebra">
                  <thead><tr><th>Insumo</th><th className="text-right">Stock</th><th className="text-right">Mínimo</th></tr></thead>
                  <tbody>{data.bajoInsumos.map((i) => (
                    <tr key={i.id}>
                      <td>{i.nombre}</td>
                      <td className="text-right"><span className="badge badge-error badge-sm">{num(i.stock, 2)} {i.unidad}</span></td>
                      <td className="text-right opacity-60">{num(i.stock_minimo, 2)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="py-8 text-center text-sm opacity-50">No hay insumos por debajo del mínimo</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body p-5">
            <div className="card-title text-base">Últimos movimientos</div>
            {data.movimientos.length ? (
              <div className="overflow-x-auto">
                <table className="table table-sm table-zebra">
                  <thead><tr><th>Fecha</th><th>Item</th><th>Tipo</th><th className="text-right">Cant.</th></tr></thead>
                  <tbody>{data.movimientos.map((m) => (
                    <tr key={`${m.origen}-${m.id}`}>
                      <td className="whitespace-nowrap text-xs opacity-60">{fecha(m.fecha)}</td>
                      <td>{m.item_nombre}</td>
                      <td><span className={`badge badge-sm ${badgeTipo[m.tipo] || 'badge-ghost'}`}>{tipoNombre[m.tipo] || m.tipo}</span></td>
                      <td className="text-right font-mono">{m.tipo === 'venta' ? '-' : ''}{num(m.cantidad, 2)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="py-8 text-center text-sm opacity-50">Aún no hay movimientos</div>}
          </div>
        </div>

        <div className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body p-5">
            <div className="card-title text-base">Más vendidos</div>
            {data.masVendidos.length ? (
              <div className="overflow-x-auto">
                <table className="table table-sm table-zebra">
                  <thead><tr><th>Producto</th><th className="text-right">Unidades</th></tr></thead>
                  <tbody>{data.masVendidos.map((p, index) => (
                    <tr key={p.nombre}>
                      <td>{index + 1}. {p.nombre}</td>
                      <td className="text-right font-bold">{num(p.vendidas)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="py-8 text-center text-sm opacity-50">Registra una venta para ver este resumen</div>}
          </div>
        </div>
      </div>
    </>
  );
}
