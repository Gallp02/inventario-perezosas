import { useEffect, useState } from 'react';
import { Factory, Hammer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api, num } from '../api.js';

export default function Fabricar({ productos, insumos, recetas, refresh, notify, usuario }) {
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!productoId && productos.length) setProductoId(String((productos.find((p) => p.activo) || productos[0]).id));
  }, [productos, productoId]);

  const producto = productos.find((p) => String(p.id) === String(productoId));
  const filas = recetas
    .filter((r) => String(r.producto_id) === String(productoId))
    .map((r) => {
      const insumo = insumos.find((i) => i.id === r.insumo_id);
      const requerido = Number(r.cantidad) * (Number(cantidad) || 0);
      const disponible = Number(insumo?.stock || 0);
      return { id: r.id, nombre: insumo?.nombre || `Insumo ${r.insumo_id}`, unidad: insumo?.unidad || '', requerido, disponible, falta: disponible < requerido };
    });
  const faltan = filas.some((f) => f.falta);

  const fabricar = async () => {
    setProcesando(true);
    try {
      const res = await api.post('/fabricar', { producto_id: Number(productoId), cantidad: Number(cantidad), usuario });
      notify(res.mensaje);
      setCantidad('1');
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card border border-base-200 bg-base-100 shadow-sm">
        <div className="card-body p-5">
          <div className="card-title flex items-center gap-2 text-base"><Factory size={18} className="text-primary" /> Fabricar mercadería</div>
          <p className="text-sm opacity-60">Se consumen los insumos de la receta y aumenta el stock del producto terminado.</p>

          <label className="form-control mt-4">
            <span className="label-text text-xs font-semibold">Producto a fabricar</span>
            <select className="select select-bordered select-sm" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {productos.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
            </select>
          </label>
          <label className="form-control mt-3">
            <span className="label-text text-xs font-semibold">Cantidad a fabricar</span>
            <input className="input input-bordered input-sm" type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </label>

          {producto && (
            <div className="my-5 flex items-center justify-between rounded-box bg-primary/10 p-4">
              <div>
                <div className="text-xs opacity-60">Stock actual</div>
                <div className="text-3xl font-black">{num(producto.stock)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-60">Después de fabricar</div>
                <div className="text-3xl font-black text-primary">{num(producto.stock + (Number(cantidad) || 0))}</div>
              </div>
            </div>
          )}

          <button className="btn btn-primary w-full gap-2" onClick={fabricar} disabled={!producto || !filas.length || !Number(cantidad) || faltan || procesando}>
            {procesando ? <span className="loading loading-spinner loading-sm" /> : <Hammer size={17} />}
            {procesando ? 'Procesando…' : 'Confirmar fabricación'}
          </button>
          {!filas.length && productoId && <p className="mt-3 text-xs opacity-60">Este producto aún no tiene receta. Configúrala en Recetas.</p>}
        </div>
      </div>

      <div className="card border border-base-200 bg-base-100 shadow-sm">
        <div className="card-body p-5">
          <div className="card-title text-base">Insumos que se consumirán</div>
          {filas.length ? (
            <div className="overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead><tr><th>Insumo</th><th className="text-right">Disponible</th><th className="text-right">Necesario</th><th className="text-right">Estado</th></tr></thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.id}>
                      <td className="font-medium">{f.nombre}</td>
                      <td className="text-right font-mono">{num(f.disponible, 2)} {f.unidad}</td>
                      <td className="text-right font-mono">{num(f.requerido, 2)} {f.unidad}</td>
                      <td className="text-right">
                        <span className={`badge badge-sm gap-1 ${f.falta ? 'badge-error' : 'badge-success'}`}>
                          {f.falta ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                          {f.falta ? 'Falta' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="py-10 text-center text-sm opacity-50">Selecciona un producto con receta</div>}
          {faltan && (
            <div className="alert alert-warning mt-4 text-xs"><AlertTriangle size={16} /><span>No hay insumos suficientes. Registra una entrada en Insumos.</span></div>
          )}
        </div>
      </div>
    </div>
  );
}
