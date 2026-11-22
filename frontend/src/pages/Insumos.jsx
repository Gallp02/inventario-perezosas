import { useState } from 'react';
import { Pencil, Plus, Search, ArrowDownToLine } from 'lucide-react';
import { api, money, num } from '../api.js';

const vacio = { codigo: '', nombre: '', categoria: '', unidad: 'pza', stock: '0', stock_minimo: '0', costo_unitario: '0' };

export default function Insumos({ insumos, refresh, notify, usuario }) {
  const [form, setForm] = useState(null);
  const [entrada, setEntrada] = useState(null);
  const [buscar, setBuscar] = useState('');

  const guardar = async (event) => {
    event.preventDefault();
    try {
      const body = {
        ...form,
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        costo_unitario: Number(form.costo_unitario)
      };
      if (form.id) await api.put(`/catalogos/insumos/${form.id}`, body);
      else await api.post('/catalogos/insumos', body);
      notify(form.id ? 'Insumo actualizado' : 'Insumo creado');
      setForm(null);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const guardarEntrada = async (event) => {
    event.preventDefault();
    try {
      const res = await api.post(`/insumos/${entrada.id}/entrada`, {
        cantidad: Number(entrada.cantidad),
        referencia: entrada.referencia,
        usuario
      });
      notify(`${res.mensaje}. Stock ahora: ${num(res.stock, 2)}`);
      setEntrada(null);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const filtrados = insumos.filter((i) =>
    `${i.codigo} ${i.nombre} ${i.categoria}`.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <>
      <div className="card border border-base-200 bg-base-100 shadow-sm">
        <div className="card-body p-5">
          <div className="card-title flex flex-wrap items-center justify-between gap-3 text-base">
            <span>Insumos (armazones, telas y otros)</span>
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
                  <th>Código</th><th>Insumo</th><th>Categoría</th><th className="text-right">Costo</th>
                  <th className="text-right">Stock</th><th className="text-right">Mín.</th><th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((i) => (
                  <tr key={i.id}>
                    <td className="font-mono text-xs">{i.codigo}</td>
                    <td>
                      <span className="font-semibold">{i.nombre}</span>
                      {!i.activo && <span className="badge badge-ghost badge-sm ml-2">Inactivo</span>}
                    </td>
                    <td className="opacity-70">{i.categoria}</td>
                    <td className="text-right font-mono">{money(i.costo_unitario)}</td>
                    <td className="text-right"><span className={`badge badge-sm ${Number(i.stock) <= Number(i.stock_minimo) ? 'badge-error' : 'badge-success'}`}>{num(i.stock, 2)} {i.unidad}</span></td>
                    <td className="text-right opacity-60">{num(i.stock_minimo, 2)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-ghost btn-xs" onClick={() => setEntrada({ id: i.id, nombre: i.nombre, cantidad: '', referencia: 'Compra' })}><ArrowDownToLine size={14} /> Entrada</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => setForm({ ...i })}><Pencil size={14} /> Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && <tr><td colSpan="7" className="py-8 text-center text-sm opacity-50">No hay insumos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {form && (
        <div className="modal modal-open">
          <form className="modal-box max-w-xl" onSubmit={guardar}>
            <div className="modal-action -mt-2 mb-2 justify-between">
              <h3 className="text-lg font-bold">{form.id ? 'Editar insumo' : 'Nuevo insumo'}</h3>
              <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={() => setForm(null)}>✕</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="form-control"><span className="label-text text-xs font-semibold">Código</span><input className="input input-bordered input-sm" required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></label>
              <label className="form-control"><span className="label-text text-xs font-semibold">Categoría</span><input className="input input-bordered input-sm" required placeholder="Telas, Armazones…" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></label>
            </div>
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Nombre</span><input className="input input-bordered input-sm" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Unidad</span><input className="input input-bordered input-sm" required value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} /></label>
              <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Costo unitario</span><input className="input input-bordered input-sm" type="number" step="0.01" min="0" value={form.costo_unitario} onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })} /></label>
            </div>
            {!form.id && (
              <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Stock inicial</span><input className="input input-bordered input-sm" type="number" step="0.01" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
            )}
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Stock mínimo</span><input className="input input-bordered input-sm" type="number" step="0.01" min="0" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} /></label>
            <div className="modal-action">
              <button className="btn btn-primary btn-sm">Guardar</button>
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

      {entrada && (
        <div className="modal modal-open">
          <form className="modal-box max-w-md" onSubmit={guardarEntrada}>
            <h3 className="mb-1 text-lg font-bold">Entrada de insumo</h3>
            <p className="mb-4 text-sm opacity-60">{entrada.nombre}</p>
            <label className="form-control"><span className="label-text text-xs font-semibold">Cantidad</span><input className="input input-bordered input-sm" required type="number" step="0.01" min="0.01" value={entrada.cantidad} onChange={(e) => setEntrada({ ...entrada, cantidad: e.target.value })} /></label>
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Referencia</span><input className="input input-bordered input-sm" value={entrada.referencia} onChange={(e) => setEntrada({ ...entrada, referencia: e.target.value })} /></label>
            <div className="modal-action">
              <button className="btn btn-primary btn-sm">Registrar entrada</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEntrada(null)}>Cancelar</button>
            </div>
          </form>
          <div className="modal-backdrop" onClick={() => setEntrada(null)} />
        </div>
      )}
    </>
  );
}
