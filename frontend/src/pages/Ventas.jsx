import { useEffect, useState } from 'react';
import {
  ShoppingCart, Plus, Trash2, Receipt, Undo2, Eye, MapPin, FileText
} from 'lucide-react';
import { api, money, num, fecha, DISTRITOS_LIMA } from '../api.js';

const BORRADOR_KEY = 'inv_venta_borrador_v2';
const BORRADOR_VACIO = {
  productoId: '',
  cantidad: '1',
  precio: '',
  carrito: [],
  clienteId: '',
  cliente: '',
  distrito: '',
  notas: '',
  comprobante: null
};

function leerBorrador() {
  try {
    const guardado = JSON.parse(localStorage.getItem(BORRADOR_KEY) || '{}');
    return {
      ...BORRADOR_VACIO,
      ...guardado,
      carrito: Array.isArray(guardado.carrito) ? guardado.carrito : []
    };
  } catch {
    return BORRADOR_VACIO;
  }
}

export default function Ventas({ productos, clientes, refresh, notify, usuario }) {
  const [borrador, setBorrador] = useState(leerBorrador);
  const [ventas, setVentas] = useState([]);
  const [pedido, setPedido] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const { productoId, cantidad, precio, carrito, clienteId, cliente, distrito, notas, comprobante } = borrador;

  const actualizar = (cambios) => setBorrador((actual) => ({ ...actual, ...cambios }));

  const cargarVentas = () => api.get('/ventas').then(setVentas).catch((e) => notify(e.message, 'error'));

  useEffect(() => {
    cargarVentas();
  }, [refresh, notify]);

  useEffect(() => {
    try {
      localStorage.setItem(BORRADOR_KEY, JSON.stringify(borrador));
    } catch {}
  }, [borrador]);

  const seleccionarProducto = (id) => {
    const producto = productos.find((p) => String(p.id) === String(id));
    actualizar({ productoId: id, precio: producto ? String(producto.precio_venta) : '' });
  };

  const seleccionarCliente = (id) => {
    const encontrado = clientes.find((c) => String(c.id) === String(id));
    actualizar({
      clienteId: id,
      cliente: encontrado ? `${encontrado.nombre}${encontrado.distrito ? ` · ${encontrado.distrito}` : ''}` : ''
    });
  };

  const cambiarPrecio = (productoIdItem, valor) => {
    actualizar({
      carrito: carrito.map((item) => (
        item.producto_id === productoIdItem ? { ...item, precio_unitario: valor } : item
      ))
    });
  };

  const agregar = () => {
    const producto = productos.find((p) => String(p.id) === String(productoId));
    const qty = Number(cantidad);
    const precioUnitario = Number(precio);
    if (!producto || !qty || qty <= 0) return notify('Elige un producto y una cantidad', 'error');
    if (!Number.isFinite(precioUnitario) || precioUnitario <= 0) return notify('Ingresa un precio válido', 'error');
    const yaEnCarrito = carrito.find((i) => i.producto_id === producto.id);
    const totalSolicitado = (yaEnCarrito?.cantidad || 0) + qty;
    if (totalSolicitado > producto.stock) return notify(`Stock insuficiente de ${producto.nombre}. Hay ${producto.stock}`, 'error');
    const nuevoCarrito = yaEnCarrito
      ? carrito.map((i) => (
        i.producto_id === producto.id
          ? { ...i, cantidad: totalSolicitado, precio_unitario: String(precioUnitario) }
          : i
      ))
      : [...carrito, {
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad: qty,
        precio_unitario: String(precioUnitario)
      }];
    actualizar({ carrito: nuevoCarrito, productoId: '', cantidad: '1', precio: '' });
  };

  const registrar = async () => {
    const items = carrito.map((i) => ({
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: Number(i.precio_unitario)
    }));
    if (items.some((i) => !Number.isFinite(i.precio_unitario) || i.precio_unitario <= 0)) {
      return notify('Revisa los precios de la venta', 'error');
    }
    try {
      const res = await api.post('/ventas', {
        cliente_id: clienteId ? Number(clienteId) : null,
        cliente,
        notas,
        usuario,
        items
      });
      actualizar({
        productoId: '',
        cantidad: '1',
        precio: '',
        carrito: [],
        clienteId: '',
        cliente: '',
        notas: '',
        comprobante: res
      });
      notify(`Orden ${res.codigo} registrada. Stock descontado.`);
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
      setPedido(null);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const eliminar = async () => {
    try {
      const res = await api.del(`/ventas/${confirmar.id}`, { usuario });
      notify(res.mensaje);
      setConfirmar(null);
      setPedido(null);
      cargarVentas();
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const total = carrito.reduce((sum, i) => sum + (Number(i.precio_unitario) || 0) * i.cantidad, 0);
  const clientesDisponibles = clientes.filter((c) => c.activo && (!distrito || c.distrito === distrito));
  const distritos = [...new Set([...DISTRITOS_LIMA, ...clientes.map((c) => c.distrito).filter(Boolean)])].sort();

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-5">
        <div className="card glass-panel border border-primary/10 bg-base-100/70 shadow-xl">
          <div className="card-body p-5">
            <div className="card-title flex items-center gap-2 text-base"><ShoppingCart size={18} className="text-primary" /> Registrar venta</div>
            <p className="text-sm opacity-60">Precio editable por item. El borrador se conserva al cambiar de sección.</p>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="form-control min-w-56 flex-1">
                <span className="label-text text-xs font-semibold">Producto</span>
                <select className="select select-bordered select-sm" value={productoId} onChange={(e) => seleccionarProducto(e.target.value)}>
                  <option value="">Seleccionar producto…</option>
                  {productos.filter((p) => p.activo).map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} · stock {p.stock} · {money(p.precio_venta)}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-semibold">Cant.</span>
                <input className="input input-bordered input-sm w-20" type="number" min="1" step="1" value={cantidad} onChange={(e) => actualizar({ cantidad: e.target.value })} />
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-semibold">Precio</span>
                <input className="input input-bordered input-sm w-28" type="number" min="0.01" step="0.01" value={precio} onChange={(e) => actualizar({ precio: e.target.value })} placeholder="0.00" />
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
                      <td className="text-right">
                        <input
                          className="input input-bordered input-xs w-24 text-right font-mono"
                          type="number"
                          min="0.01"
                          step="0.01"
                          aria-label={`Precio de ${i.nombre}`}
                          value={i.precio_unitario}
                          onChange={(e) => cambiarPrecio(i.producto_id, e.target.value)}
                        />
                      </td>
                      <td className="text-right font-mono">{money((Number(i.precio_unitario) || 0) * i.cantidad)}</td>
                      <td className="text-right"><button className="btn btn-ghost btn-xs text-error" onClick={() => actualizar({ carrito: carrito.filter((x) => x.producto_id !== i.producto_id) })}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                  {!carrito.length && <tr><td colSpan="5" className="py-8 text-center text-sm opacity-50">Agrega productos a la venta</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="form-control">
                <span className="label-text text-xs font-semibold">Cliente de la cartelera</span>
                <select className="select select-bordered select-sm" value={clienteId} onChange={(e) => seleccionarCliente(e.target.value)}>
                  <option value="">Indefinido / Mostrador</option>
                  {clientesDisponibles.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} · {c.distrito || 'Sin distrito'}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-semibold"><MapPin size={12} className="inline" /> Filtrar por distrito</span>
                <select className="select select-bordered select-sm" value={distrito} onChange={(e) => actualizar({ distrito: e.target.value })}>
                  <option value="">Todos los distritos</option>
                  {distritos.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
            </div>
            {!clientes.length && (
              <p className="mt-2 text-xs text-warning">Aún no hay clientes. Agrégalos desde la pestaña Clientes.</p>
            )}
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Notas (opcional)</span><input className="input input-bordered input-sm" value={notas} onChange={(e) => actualizar({ notas: e.target.value })} /></label>

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

      <div className="card glass-panel border border-primary/10 bg-base-100/70 shadow-xl">
        <div className="card-body p-5">
          <div className="card-title flex items-center justify-between text-base">
            <span>Ventas recientes</span>
            <span className="badge badge-outline badge-sm">{ventas.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead><tr><th>Orden</th><th>Cliente</th><th className="text-right">Total</th><th className="text-right">Acciones</th></tr></thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id} className={v.estado === 'anulada' ? 'opacity-60' : ''}>
                    <td>
                      <div className="font-mono text-xs font-bold">{v.codigo}</div>
                      <div className="text-[10px] opacity-50">{fecha(v.fecha)}</div>
                    </td>
                    <td className="max-w-32 truncate text-xs">{v.cliente || 'Indefinido'}</td>
                    <td className="text-right font-mono">{money(v.total)}</td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button className="btn btn-ghost btn-xs" onClick={() => setPedido(v)}><Eye size={14} /> Ver</button>
                        {v.estado === 'completada' ? (
                          <button className="btn btn-ghost btn-xs text-error" onClick={() => anular(v)}><Undo2 size={14} /> Anular</button>
                        ) : <span className="badge badge-warning badge-sm">Anulada</span>}
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => setConfirmar(v)}><Trash2 size={14} /> Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!ventas.length && <tr><td colSpan="4" className="py-8 text-center text-sm opacity-50">Aún no hay ventas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {pedido && (
        <div className="modal modal-open">
          <div className="modal-box max-w-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Pedido {pedido.codigo}</h3>
              <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setPedido(null)}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="opacity-50">Cliente</span><div className="font-semibold">{pedido.cliente || 'Indefinido'}</div></div>
              <div><span className="opacity-50">Fecha</span><div className="font-semibold">{fecha(pedido.fecha)}</div></div>
              <div><span className="opacity-50">Estado venta</span><div className={`font-semibold ${pedido.estado === 'anulada' ? 'text-warning' : 'text-success'}`}>{pedido.estado}</div></div>
              <div><span className="opacity-50">Estado pedido</span><div className="font-semibold capitalize">{pedido.estado_pedido?.replaceAll('_', ' ')}</div></div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead><tr><th>Producto</th><th className="text-right">Cant.</th><th className="text-right">P. unit.</th><th className="text-right">Subtotal</th></tr></thead>
                <tbody>
                  {(pedido.items || []).map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.producto_nombre}</td>
                      <td className="text-right">{num(item.cantidad)}</td>
                      <td className="text-right font-mono">{money(item.precio_unitario)}</td>
                      <td className="text-right font-mono">{money(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-between border-t border-base-200 pt-3"><span className="text-sm">Total</span><span className="text-2xl font-black text-primary">{money(pedido.total)}</span></div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setPedido(null)}>Cerrar</button>
              {pedido.estado === 'completada' && <button className="btn btn-outline btn-sm gap-1" onClick={() => anular(pedido)}><Undo2 size={14} /> Anular pedido</button>}
              <button className="btn btn-error btn-sm gap-1" onClick={() => setConfirmar(pedido)}><Trash2 size={14} /> Eliminar pedido</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setPedido(null)} />
        </div>
      )}

      {confirmar && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="flex items-center gap-2 text-lg font-bold"><FileText size={18} /> Eliminar pedido</h3>
            <p className="py-3 text-sm opacity-70">
              Se eliminará el pedido <strong>{confirmar.codigo}</strong>. Si está activo, se devolverá el stock antes de borrarlo.
            </p>
            <div className="modal-action">
              <button className="btn btn-error btn-sm" onClick={eliminar}>Sí, eliminar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmar(null)}>Cancelar</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setConfirmar(null)} />
        </div>
      )}
    </div>
  );
}
