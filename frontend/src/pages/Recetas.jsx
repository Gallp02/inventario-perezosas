import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, Info } from 'lucide-react';
import { api, num } from '../api.js';

export default function Recetas({ productos, insumos, recetas, refresh, notify }) {
  const [productoId, setProductoId] = useState('');
  const [items, setItems] = useState([]);
  const [nuevoInsumo, setNuevoInsumo] = useState('');
  const [nuevaCantidad, setNuevaCantidad] = useState('1');

  useEffect(() => {
    if (!productoId && productos.length) setProductoId(String(productos[0].id));
  }, [productos, productoId]);

  useEffect(() => {
    const id = Number(productoId);
    setItems(recetas.filter((r) => r.producto_id === id).map((r) => ({
      insumo_id: r.insumo_id,
      cantidad: String(r.cantidad)
    })));
  }, [productoId, recetas]);

  const agregar = () => {
    const insumoId = Number(nuevoInsumo);
    if (!insumoId) return notify('Selecciona un insumo', 'error');
    if (items.some((i) => i.insumo_id === insumoId)) return notify('Ese insumo ya está en la receta', 'error');
    const cantidad = Number(nuevaCantidad);
    if (!cantidad || cantidad <= 0) return notify('Cantidad inválida', 'error');
    setItems([...items, { insumo_id: insumoId, cantidad: String(cantidad) }]);
    setNuevoInsumo('');
    setNuevaCantidad('1');
  };

  const guardar = async () => {
    try {
      await api.put(`/catalogos/recetas/${productoId}`, {
        items: items.map((i) => ({ insumo_id: i.insumo_id, cantidad: Number(i.cantidad) }))
      });
      notify('Receta guardada');
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const producto = productos.find((p) => String(p.id) === String(productoId));

  return (
    <div className="card border border-base-200 bg-base-100 shadow-sm">
      <div className="card-body p-5">
        <div className="card-title flex flex-wrap items-center justify-between gap-3 text-base">
          <div>
            <div>Recetas de fabricación</div>
            <div className="text-xs font-normal opacity-60">Cuánto armazón, tela u otro insumo se usa por cada unidad terminada.</div>
          </div>
          <button className="btn btn-primary btn-sm gap-1" onClick={guardar} disabled={!productoId}><Save size={15} /> Guardar receta</button>
        </div>

        <label className="form-control mt-4 max-w-sm">
          <span className="label-text text-xs font-semibold">Producto terminado</span>
          <select className="select select-bordered select-sm" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
          </select>
        </label>

        {!productoId ? (
          <div className="py-10 text-center text-sm opacity-50">Selecciona un producto para ver o armar su receta</div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <label className="form-control w-64">
                <span className="label-text text-xs font-semibold">Insumo</span>
                <select className="select select-bordered select-sm" value={nuevoInsumo} onChange={(e) => setNuevoInsumo(e.target.value)}>
                  <option value="">Seleccionar insumo…</option>
                  {insumos.filter((i) => !items.some((x) => x.insumo_id === i.id)).map((i) => (
                    <option key={i.id} value={i.id}>{i.codigo} · {i.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-semibold">Cantidad</span>
                <input className="input input-bordered input-sm w-24" type="number" step="0.01" min="0.01" placeholder="Cant." value={nuevaCantidad} onChange={(e) => setNuevaCantidad(e.target.value)} />
              </label>
              <button className="btn btn-outline btn-sm gap-1" onClick={agregar}><Plus size={15} /> Agregar</button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead><tr><th>Insumo</th><th>Unidad</th><th className="text-right">Cant. por unidad</th><th className="text-right">Stock actual</th><th className="text-right">Quitar</th></tr></thead>
                <tbody>
                  {items.map((item) => {
                    const insumo = insumos.find((i) => i.id === item.insumo_id);
                    return (
                      <tr key={item.insumo_id}>
                        <td className="font-semibold">{insumo?.nombre || `Insumo ${item.insumo_id}`}</td>
                        <td className="opacity-70">{insumo?.unidad || '-'}</td>
                        <td className="text-right">
                          <input className="input input-bordered input-xs w-24 bg-transparent text-right font-mono text-xs" type="number" step="0.01" min="0.01" value={item.cantidad}
                            onChange={(e) => setItems(items.map((x) => x.insumo_id === item.insumo_id ? { ...x, cantidad: e.target.value } : x))} />
                        </td>
                        <td className="text-right font-mono">{num(insumo?.stock || 0, 2)}</td>
                        <td className="text-right"><button className="btn btn-ghost btn-xs text-error" onClick={() => setItems(items.filter((x) => x.insumo_id !== item.insumo_id))}><Trash2 size={14} /></button></td>
                      </tr>
                    );
                  })}
                  {!items.length && <tr><td colSpan="5" className="py-8 text-center text-sm opacity-50">Esta receta está vacía. Agrega insumos arriba.</td></tr>}
                </tbody>
              </table>
            </div>

            {producto && (
              <div className="alert mt-4 text-xs">
                <Info size={16} />
                <span>Al fabricar 1 unidad de <strong>{producto.nombre}</strong> se descontarán estos insumos. El stock terminado sube al fabricar y baja al vender.</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
