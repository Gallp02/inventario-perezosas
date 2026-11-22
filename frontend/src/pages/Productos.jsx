import { useState } from 'react';
import { Pencil, Plus, SlidersHorizontal, Search } from 'lucide-react';
import { api, money, num } from '../api.js';

const vacio = { codigo: '', nombre: '', categoria: '', descripcion: '', precio_venta: '', stock: '0', stock_minimo: '5' };

export default function Productos({ productos, refresh, notify, usuario }) {
  const [form, setForm] = useState(null);
  const [ajuste, setAjuste] = useState(null);
  const [buscar, setBuscar] = useState('');

  const guardar = async (event) => {
    event.preventDefault();
    try {
      const body = {
        ...form,
        precio_venta: Number(form.precio_venta),
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo)
      };
      if (form.id) await api.put(`/catalogos/productos/${form.id}`, body);
      else await api.post('/catalogos/productos', body);
      notify(form.id ? 'Producto actualizado' : 'Producto creado');
      setForm(null);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const guardarAjuste = async (event) => {
    event.preventDefault();
    try {
      const res = await api.post(`/productos/${ajuste.id}/ajuste`, {
        cantidad: Number(ajuste.cantidad),
        referencia: ajuste.referencia,
        usuario
      });
      notify(`${res.mensaje}. Stock ahora: ${res.stock}`);
      setAjuste(null);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const filtrados = productos.filter((p) =>
    `${p.codigo} ${p.nombre} ${p.categoria}`.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <>
      <div className="card border border-base-200 bg-base-100 shadow-sm">
        <div className="card-body p-5">
          <div className="card-title flex flex-wrap items-center justify-between gap-3 text-base">
            <span>Productos terminados</span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="input input-bordered input-sm flex w-52 items-center gap-2">
                <Search size={15} className="opacity-50" />
                <input className="grow bg-transparent" placeholder="Buscar…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
              </label>
              <button className="btn btn-primary btn-sm gap-1" onClick={() => setForm({ ...vacio })}><Plus size={15} /> Nuevo</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>Código</th><th>Producto</th><th>Categoría</th>
                  <th className="text-right">Precio</th><th className="text-right">Stock</th>
                  <th className="text-right">Mín.</th><th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{p.codigo}</td>
                    <td>
                      <span className="font-semibold">{p.nombre}</span>
                      {!p.activo && <span className="badge badge-ghost badge-sm ml-2">Inactivo</span>}
                    </td>
                    <td className="opacity-70">{p.categoria}</td>
                    <td className="text-right font-mono">{money(p.precio_venta)}</td>
                    <td className="text-right"><span className={`badge badge-sm ${p.stock <= p.stock_minimo ? 'badge-error' : 'badge-success'}`}>{num(p.stock)}</span></td>
                    <td className="text-right opacity-60">{num(p.stock_minimo)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-ghost btn-xs" onClick={() => setAjuste({ id: p.id, nombre: p.nombre, cantidad: '', referencia: '' })}><SlidersHorizontal size={14} /> Ajustar</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => setForm({ ...p })}><Pencil size={14} /> Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && <tr><td colSpan="7" className="py-8 text-center text-sm opacity-50">No hay productos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {form && (
        <div className="modal modal-open">
          <form className="modal-box max-w-xl" onSubmit={guardar}>
            <div className="modal-action -mt-2 mb-2 justify-between">
              <h3 className="text-lg font-bold">{form.id ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={() => setForm(null)}>✕</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="form-control"><span className="label-text text-xs font-semibold">Código</span><input className="input input-bordered input-sm" required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></label>
              <label className="form-control"><span className="label-text text-xs font-semibold">Categoría</span><input className="input input-bordered input-sm" required placeholder="Perezosas, Toldos…" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></label>
            </div>
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Nombre</span><input className="input input-bordered input-sm" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Descripción</span><input className="input input-bordered input-sm" value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Precio de venta</span><input className="input input-bordered input-sm" required type="number" step="0.01" min="0" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: e.target.value })} /></label>
              <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Stock mínimo</span><input className="input input-bordered input-sm" type="number" step="1" min="0" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} /></label>
            </div>
            {!form.id && (
              <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Stock inicial</span><input className="input input-bordered input-sm" type="number" step="1" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
            )}
            <div className="modal-action">
              <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(null)}>Cancelar</button>
              {form.id && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, activo: form.activo ? 0 : 1 })}>
                  {form.activo ? 'Desactivar' : 'Activar'}
                </button>
              )}
            </div>
          </form>
          <div className="modal-backdrop" onClick={() => setForm(null)} />
        </div>
      )}

      {ajuste && (
        <div className="modal modal-open">
          <form className="modal-box max-w-md" onSubmit={guardarAjuste}>
            <h3 className="mb-1 text-lg font-bold">Ajustar stock</h3>
            <p className="mb-4 text-sm opacity-60">{ajuste.nombre}</p>
            <label className="form-control"><span className="label-text text-xs font-semibold">Cantidad (+ aumentar, - descontar)</span><input className="input input-bordered input-sm" required type="number" step="1" value={ajuste.cantidad} onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value })} /></label>
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Motivo</span><input className="input input-bordered input-sm" value={ajuste.referencia} onChange={(e) => setAjuste({ ...ajuste, referencia: e.target.value })} /></label>
            <div className="modal-action">
              <button className="btn btn-primary btn-sm">Guardar ajuste</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAjuste(null)}>Cancelar</button>
            </div>
          </form>
          <div className="modal-backdrop" onClick={() => setAjuste(null)} />
        </div>
      )}
    </>
  );
}
