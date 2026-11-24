import { useState } from 'react';
import {
  Pencil, Plus, Search, ArrowDownToLine, SlidersHorizontal,
  Minus, Archive, RotateCcw
} from 'lucide-react';
import { api, money, num, estadoStock } from '../api.js';

const vacio = { codigo: '', nombre: '', categoria: '', unidad: 'pza', stock: '0', stock_minimo: '0', costo_unitario: '0' };

export default function Insumos({ insumos, refresh, notify, usuario }) {
  const [form, setForm] = useState(null);
  const [entrada, setEntrada] = useState(null);
  const [ajuste, setAjuste] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);

  const guardar = async (event) => {
    event.preventDefault();
    try {
      const body = {
        ...form,
        stock: Number(form.stock),
        stock_minimo: String(form.stock_minimo).trim() === '' ? -1 : Number(form.stock_minimo),
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

  const guardarCampo = async (insumo, campo, valor) => {
    let nuevo = valor;
    if (campo === 'stock_minimo') nuevo = String(valor).trim() === '' ? -1 : Number(valor);
    else nuevo = String(valor).trim();
    if (String(insumo[campo]) === String(nuevo)) return;
    try {
      await api.put(`/catalogos/insumos/${insumo.id}`, { [campo]: nuevo });
      refresh();
    } catch (error) {
      notify(error.message, 'error');
      refresh();
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

  const guardarAjuste = async (event) => {
    event.preventDefault();
    try {
      const res = await api.post(`/insumos/${ajuste.id}/ajuste`, {
        cantidad: Number(ajuste.cantidad),
        referencia: ajuste.referencia,
        usuario
      });
      notify(`${res.mensaje}. Stock ahora: ${num(res.stock, 2)}`);
      setAjuste(null);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const cambiarEstado = async (insumo) => {
    try {
      if (insumo.activo) await api.del(`/catalogos/insumos/${insumo.id}`);
      else await api.put(`/catalogos/insumos/${insumo.id}`, { activo: 1 });
      notify(insumo.activo ? 'Insumo archivado' : 'Insumo restaurado');
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const filtrados = insumos.filter((i) => {
    if (!verInactivos && !i.activo) return false;
    return `${i.codigo} ${i.nombre} ${i.categoria}`.toLowerCase().includes(buscar.toLowerCase());
  });

  return (
    <>
      <div className="card glass-panel border border-primary/10 bg-base-100/70 shadow-xl">
        <div className="card-body p-5">
          <div className="card-title flex flex-wrap items-center justify-between gap-3 text-base">
            <div>
              <span>Insumos (armazones, telas y otros)</span>
              <div className="text-xs font-normal opacity-60">Edita el nombre en la tabla y ajusta stock en + o −.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="input input-bordered input-sm flex w-52 items-center gap-2">
                <Search size={15} className="opacity-50" />
                <input className="grow bg-transparent" placeholder="Buscar…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
              </label>
              <label className="label cursor-pointer gap-2">
                <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
                <span className="label-text text-xs">Archivados</span>
              </label>
              <button className="btn btn-primary btn-sm gap-1" onClick={() => setForm({ ...vacio })}><Plus size={15} /> Nuevo</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>Código</th><th>Insumo</th><th>Categoría</th><th className="text-right">Costo</th>
                  <th className="text-right">Stock</th><th className="text-right">Mín.</th><th>Estado</th><th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((i) => {
                  const estado = estadoStock(i);
                  return (
                    <tr key={i.id} className={!i.activo ? 'opacity-50' : ''}>
                      <td className="font-mono text-xs">{i.codigo}</td>
                      <td className="min-w-40">
                        <input
                          className="input input-bordered input-xs w-full bg-transparent text-xs"
                          key={`${i.id}-nombre-${i.nombre}`}
                          defaultValue={i.nombre}
                          onBlur={(e) => guardarCampo(i, 'nombre', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        />
                        {!i.activo && <span className="badge badge-ghost badge-sm ml-2">Archivado</span>}
                      </td>
                      <td className="opacity-70">{i.categoria}</td>
                      <td className="text-right font-mono">{money(i.costo_unitario)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => setAjuste({ id: i.id, nombre: i.nombre, cantidad: '-1', referencia: 'Ajuste rápido' })}><Minus size={13} /></button>
                          <span className={`badge badge-sm ${estado.badge}`}>{num(i.stock, 2)} {i.unidad}</span>
                          <button className="btn btn-ghost btn-xs btn-square text-success" onClick={() => setAjuste({ id: i.id, nombre: i.nombre, cantidad: '1', referencia: 'Ajuste rápido' })}><Plus size={13} /></button>
                        </div>
                      </td>
                      <td className="text-right">
                        <input
                          className="input input-bordered input-xs w-24 bg-transparent text-right font-mono text-xs"
                          key={`${i.id}-min-${i.stock_minimo}`}
                          type="number"
                          step="0.01"
                          min="-1"
                          placeholder="Indefinido"
                          defaultValue={Number(i.stock_minimo) === -1 ? '' : i.stock_minimo}
                          onBlur={(e) => guardarCampo(i, 'stock_minimo', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        />
                      </td>
                      <td><span className={`badge badge-sm ${estado.badge}`}>{estado.etiqueta}</span></td>
                      <td className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button className="btn btn-ghost btn-xs" onClick={() => setEntrada({ id: i.id, nombre: i.nombre, cantidad: '', referencia: 'Compra' })}><ArrowDownToLine size={14} /> Entrada</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setAjuste({ id: i.id, nombre: i.nombre, cantidad: '', referencia: '' })}><SlidersHorizontal size={14} /> Ajustar</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setForm({ ...i })}><Pencil size={14} /> Editar</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => cambiarEstado(i)}>
                            {i.activo ? <Archive size={14} /> : <RotateCcw size={14} />}
                            {i.activo ? 'Archivar' : 'Restaurar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtrados.length && <tr><td colSpan="8" className="py-8 text-center text-sm opacity-50">No hay insumos con ese filtro</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {form && (
        <div className="modal modal-open">
          <form className="modal-box max-w-xl" onSubmit={guardar}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">{form.id ? 'Editar insumo' : 'Nuevo insumo'}</h3>
              <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={() => setForm(null)}>✕</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="form-control"><span className="label-text text-xs font-semibold">Código</span><input className="input input-bordered input-sm" required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></label>
              <label className="form-control"><span className="label-text text-xs font-semibold">Categoría</span><input className="input input-bordered input-sm" required placeholder="Telas, Armazones…" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></label>
            </div>
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Nombre</span><input className="input input-bordered input-sm" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="form-control"><span className="label-text text-xs font-semibold">Unidad</span><input className="input input-bordered input-sm" required value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} /></label>
              <label className="form-control"><span className="label-text text-xs font-semibold">Costo unitario</span><input className="input input-bordered input-sm" type="number" step="0.01" min="0" value={form.costo_unitario} onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })} /></label>
            </div>
            {!form.id && (
              <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Stock inicial</span><input className="input input-bordered input-sm" type="number" step="0.01" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
            )}
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Stock mínimo (vacío = Indefinido)</span><input className="input input-bordered input-sm" type="number" step="0.01" min="-1" placeholder="Indefinido" value={Number(form.stock_minimo) === -1 ? '' : form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} /></label>
            <div className="modal-action">
              <button className="btn btn-primary btn-sm">Guardar</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(null)}>Cancelar</button>
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

      {ajuste && (
        <div className="modal modal-open">
          <form className="modal-box max-w-md" onSubmit={guardarAjuste}>
            <h3 className="mb-1 text-lg font-bold">Ajustar insumo</h3>
            <p className="mb-4 text-sm opacity-60">{ajuste.nombre}</p>
            <label className="form-control"><span className="label-text text-xs font-semibold">Cantidad (+ aumentar, - descontar)</span><input className="input input-bordered input-sm" required type="number" step="0.01" value={ajuste.cantidad} onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value })} /></label>
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
