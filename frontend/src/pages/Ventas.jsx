import { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Trash2, Receipt, Undo2 } from 'lucide-react';
import { api, money, num, fecha } from '../api.js';

export default function Ventas({ productos, refresh, notify, usuario }) {
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState('');
  const [notas, setNotas] = useState('');
  const [ventas, setVentas] = useState([]);
  const [comprobante, setComprobante] = useState(null);

  const cargarVentas = () => api.get('/ventas').then(setVentas).catch((e) => notify(e.message, 'error'));

  useEffect(() => {
    cargarVentas();
  }, [refresh, notify]);

  const agregar = () => {
    const producto = productos.find((p) => String(p.id) === String(productoId));
    const qty = Number(cantidad);
    if (!producto || !qty || qty <= 0) return notify('Elige un producto y una cantidad', 'error');
    const yaEnCarrito = carrito.find((i) => i.producto_id === producto.id);
    const totalSolicitado = (yaEnCarrito?.cantidad || 0) + qty;
    if (totalSolicitado > producto.stock) return notify(`Stock insuficiente de ${producto.nombre}. Hay ${producto.stock}`, 'error');
    if (yaEnCarrito) {
      setCarrito(carrito.map((i) => i.producto_id === producto.id ? { ...i, cantidad: totalSolicitado } : i));
    } else {
      setCarrito([...carrito, { producto_id: producto.id, nombre: producto.nombre, cantidad: qty, precio_unitario: Number(producto.precio_venta) }]);
    }
    setProductoId('');
    setCantidad('1');
  };

  const registrar = async () => {
    try {
      const res = await api.post('/ventas', {
        cliente,
        notas,
        usuario,
        items: carrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario }))
      });
      setComprobante(res);
      setCarrito([]);
      setCliente('');
      setNotas('');
      notify(`Venta ${res.codigo} registrada. Stock descontado.`);
      cargarVentas();
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const anular = async (venta) => {
    try {
      const res = await api.post(`/ventas/${venta.id}/anular`, { usuario });
      notify(res.mensaje);
      cargarVentas();
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const total = carrito.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-5">
        <div className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body p-5">
            <div className="card-title flex items-center gap-2 text-base"><ShoppingCart size={18} className="text-primary" /> Registrar venta</div>
            <p className="text-sm opacity-60">El stock se descuenta automáticamente al confirmar.</p>

            <div className="mt-4 flex flex-wrap items-end gap-2">
              <label className="form-control min-w-56 flex-1">
                <span className="label-text text-xs font-semibold">Producto</span>
                <select className="select select-bordered select-sm" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
                  <option value="">Seleccionar producto…</option>
                  {productos.filter((p) => p.activo).map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} · stock {p.stock} · {money(p.precio_venta)}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-semibold">Cant.</span>
                <input className="input input-bordered input-sm w-20" type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
              </label>
              <button className="btn btn-outline btn-sm gap-1" onClick={agregar}><Plus size={15} /> Agregar</button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead><tr><th>Producto</th><th className="text-right">Cant.</th><th className="text-right">P. unit.</th><th className="text-right">Subtotal</th><th /></tr></thead>
                <tbody>
                  {carrito.map((i) => (
                    <tr key={i.producto_id}>
                      <td className="font-medium">{i.nombre}</td>
                      <td className="text-right">{num(i.cantidad)}</td>
                      <td className="text-right font-mono">{money(i.precio_unitario)}</td>
                      <td className="text-right font-mono">{money(i.precio_unitario * i.cantidad)}</td>
                      <td className="text-right"><button className="btn btn-ghost btn-xs text-error" onClick={() => setCarrito(carrito.filter((x) => x.producto_id !== i.producto_id))}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                  {!carrito.length && <tr><td colSpan="5" className="py-8 text-center text-sm opacity-50">Agrega productos a la venta</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="form-control"><span className="label-text text-xs font-semibold">Cliente (opcional)</span><input className="input input-bordered input-sm" value={cliente} onChange={(e) => setCliente(e.target.value)} /></label>
              <label className="form-control"><span className="label-text text-xs font-semibold">Notas (opcional)</span><input className="input input-bordered input-sm" value={notas} onChange={(e) => setNotas(e.target.value)} /></label>
            </div>

            <div className="my-5 flex items-center justify-between rounded-box bg-primary/10 p-4">
              <span className="text-sm font-semibold">Total de la venta</span>
              <span className="text-3xl font-black text-primary">{money(total)}</span>
            </div>
            <button className="btn btn-primary w-full gap-2" onClick={registrar} disabled={!carrito.length}><Receipt size={17} /> Confirmar venta</button>
          </div>
        </div>

        {comprobante && (
          <div className="card border border-success/30 bg-success/5 shadow-sm">
            <div className="card-body p-5">
              <div className="card-title text-base"><Receipt size={18} /> Última venta registrada</div>
              <p className="text-sm"><strong>{comprobante.codigo}</strong> · {fecha(new Date())}</p>
              <p className="text-xs opacity-60">{comprobante.cliente || 'Cliente no identificado'} · {num(comprobante.items.reduce((s, i) => s + i.cantidad, 0))} unidades</p>
              <div className="mt-3 flex justify-between border-t border-success/20 pt-3"><span className="text-sm">Total</span><span className="text-2xl font-black text-success">{money(comprobante.total)}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="card border border-base-200 bg-base-100 shadow-sm">
        <div className="card-body p-5">
          <div className="card-title text-base">Ventas recientes</div>
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead><tr><th>Código</th><th>Fecha</th><th className="text-right">Total</th><th className="text-right">Estado</th></tr></thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id}>
                    <td className="font-mono text-xs">{v.codigo}</td>
                    <td className="whitespace-nowrap text-xs opacity-60">{fecha(v.fecha)}</td>
                    <td className="text-right font-mono">{money(v.total)}</td>
                    <td className="text-right">
                      {v.estado === 'completada' ? (
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => anular(v)}><Undo2 size={14} /> Anular</button>
                      ) : <span className="badge badge-warning badge-sm">Anulada</span>}
                    </td>
                  </tr>
                ))}
                {!ventas.length && <tr><td colSpan="4" className="py-8 text-center text-sm opacity-50">Aún no hay ventas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
