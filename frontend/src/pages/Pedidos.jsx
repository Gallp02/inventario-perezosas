import { useEffect, useState } from 'react';
import { ClipboardList, ChefHat, PackageCheck, Truck, Eye, Search, Clock3, ClipboardCheck } from 'lucide-react';
import { api, money, fecha } from '../api.js';

const ESTADOS = {
  pendiente: { label: 'Pendiente', badge: 'badge-warning' },
  en_preparacion: { label: 'En preparación', badge: 'badge-info' },
  listo: { label: 'Listo', badge: 'badge-success' },
  entregado: { label: 'Entregado', badge: 'badge-neutral' }
};

const SIGUIENTE = {
  pendiente: 'en_preparacion',
  en_preparacion: 'listo',
  listo: 'entregado'
};

const ACCIONES = {
  pendiente: { texto: 'Tomar pedido', icono: ChefHat, btn: 'btn-primary' },
  en_preparacion: { texto: 'Marcar listo', icono: PackageCheck, btn: 'btn-info' },
  listo: { texto: 'Entregar', icono: Truck, btn: 'btn-success' }
};

const TABS = [
  { clave: 'todos', label: 'Todos', icono: ClipboardList },
  { clave: 'pendiente', label: 'Pendientes', icono: Clock3 },
  { clave: 'en_preparacion', label: 'En preparación', icono: ChefHat },
  { clave: 'listo', label: 'Listos', icono: PackageCheck },
  { clave: 'entregado', label: 'Entregados', icono: ClipboardCheck }
];

export default function Pedidos({ refresh, notify }) {
  const [pedidos, setPedidos] = useState([]);
  const [resumen, setResumen] = useState({ total: 0 });
  const [filtro, setFiltro] = useState('pendiente');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState(null);

  const cargar = async () => {
    try {
      const data = await api.get('/pedidos');
      setPedidos(data.pedidos);
      setResumen(data.resumen);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  useEffect(() => {
    cargar();
  }, [refresh, notify]);

  const cambiarEstado = async (pedido, estado) => {
    try {
      await api.patch(`/pedidos/${pedido.id}/estado`, { estado });
      notify(`${pedido.codigo} → ${ESTADOS[estado].label}`);
      if (detalle?.id === pedido.id) setDetalle({ ...detalle, estado_pedido: estado });
      cargar();
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const filtrados = pedidos.filter((p) => {
    const coincideTab = filtro === 'todos' || p.estado_pedido === filtro;
    const q = busqueda.trim().toLowerCase();
    const coincideBusqueda = !q ||
      p.codigo.toLowerCase().includes(q) ||
      (p.cliente || '').toLowerCase().includes(q) ||
      p.items.some((i) => i.producto_nombre.toLowerCase().includes(q));
    return coincideTab && coincideBusqueda;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-sm opacity-60">Cada venta se convierte en un pedido listo para preparar y entregar.</p>
        </div>
        <div className="badge badge-primary badge-lg gap-2">
          <ClipboardList size={15} /> {resumen.pendiente || 0} pendientes
        </div>
      </div>

      <div className="tabs tabs-bordered overflow-x-auto">
        {TABS.map((tab) => {
          const Icono = tab.icono;
          const count = tab.clave === 'todos' ? resumen.total : (resumen[tab.clave] || 0);
          return (
            <button
              key={tab.clave}
              className={`tab gap-2 whitespace-nowrap ${filtro === tab.clave ? 'tab-active text-primary' : ''}`}
              onClick={() => setFiltro(tab.clave)}
            >
              <Icono size={15} /> {tab.label}
              <span className="badge badge-sm">{count}</span>
            </button>
          );
        })}
      </div>

      <label className="input input-bordered flex items-center gap-2">
        <Search size={16} className="opacity-50" />
        <input
          className="grow"
          placeholder="Buscar por código, cliente o producto…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </label>

      {filtrados.length === 0 ? (
        <div className="card border border-dashed border-base-300 bg-base-100">
          <div className="card-body items-center text-center py-12 opacity-60">
            <ClipboardCheck size={32} />
            <p className="font-medium">No hay pedidos en esta vista</p>
            <p className="text-sm">Registra una venta o cambia de pestaña.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((pedido) => {
            const meta = ESTADOS[pedido.estado_pedido] || ESTADOS.pendiente;
            const accion = ACCIONES[pedido.estado_pedido];
            const IconoAccion = accion?.icono;
            return (
              <div key={pedido.id} className="card border border-base-200 bg-base-100 shadow-sm">
                <div className="card-body gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold tracking-tight">{pedido.codigo}</div>
                      <div className="flex items-center gap-1 text-xs opacity-60">
                        <Clock3 size={12} /> {fecha(pedido.fecha)}
                      </div>
                    </div>
                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  </div>

                  <div className="text-xs opacity-60">{pedido.cliente || 'Cliente en mostrador'}</div>

                  <div className="rounded-box space-y-1 bg-base-200/60 p-3 text-sm">
                    {pedido.items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-2">
                        <span>{item.cantidad} × {item.producto_nombre}</span>
                        <span className="opacity-60">{money(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs opacity-60">{pedido.items.length} {pedido.items.length === 1 ? 'producto' : 'productos'}</span>
                    <span className="text-lg font-bold text-primary">{money(pedido.total)}</span>
                  </div>

                  <div className="card-actions mt-1">
                    <button className="btn btn-ghost btn-sm gap-1" onClick={() => setDetalle(pedido)}>
                      <Eye size={15} /> Detalle
                    </button>
                    {accion && (
                      <button
                        className={`btn btn-sm flex-1 gap-1 ${accion.btn}`}
                        onClick={() => cambiarEstado(pedido, SIGUIENTE[pedido.estado_pedido])}
                      >
                        <IconoAccion size={15} /> {accion.texto}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detalle && (
        <dialog className="modal modal-bottom sm:modal-middle" open onClose={() => setDetalle(null)}>
          <div className="modal-box max-w-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{detalle.codigo}</h3>
                <p className="text-xs opacity-60">{fecha(detalle.fecha)} · {detalle.cliente || 'Mostrador'}</p>
              </div>
              <span className={`badge ${ESTADOS[detalle.estado_pedido]?.badge || 'badge-ghost'}`}>
                {ESTADOS[detalle.estado_pedido]?.label || detalle.estado_pedido}
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>Producto</th><th className="text-right">Cant.</th><th className="text-right">Subtotal</th></tr></thead>
                <tbody>
                  {detalle.items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.producto_nombre}</td>
                      <td className="text-right">{item.cantidad}</td>
                      <td className="text-right">{money(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex justify-between text-lg font-bold">
              <span>Total</span><span className="text-primary">{money(detalle.total)}</span>
            </div>

            {detalle.notas && <p className="mt-2 rounded-box bg-base-200 p-3 text-sm">Nota: {detalle.notas}</p>}

            <div className="modal-action">
              {ACCIONES[detalle.estado_pedido] && (
                <button
                  className={`btn ${ACCIONES[detalle.estado_pedido].btn}`}
                  onClick={() => cambiarEstado(detalle, SIGUIENTE[detalle.estado_pedido])}
                >
                  {ACCIONES[detalle.estado_pedido].texto}
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setDetalle(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
