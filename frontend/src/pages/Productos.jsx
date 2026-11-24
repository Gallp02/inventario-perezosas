import { useState } from 'react';
import {
  Pencil, Plus, SlidersHorizontal, Search, ArrowUp, ArrowDown,
  Archive, RotateCcw, Minus, GripVertical
} from 'lucide-react';
import { api, num, estadoStock } from '../api.js';

const vacio = { codigo: '', nombre: '', categoria: '', descripcion: '', precio_venta: '', stock: '0', stock_minimo: '5' };

export default function Productos({ productos, refresh, notify, usuario }) {
  const [form, setForm] = useState(null);
  const [ajuste, setAjuste] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
  const [confirmar, setConfirmar] = useState(null);

  const guardar = async (event) => {
    event.preventDefault();
    try {
      const body = {
        ...form,
        precio_venta: Number(form.precio_venta),
        stock: Number(form.stock),
        stock_minimo: String(form.stock_minimo).trim() === '' ? -1 : Number(form.stock_minimo)
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

  const guardarCampo = async (producto, campo, valor) => {
    let nuevo = valor;
    if (campo === 'precio_venta') nuevo = Number(valor);
    if (campo === 'stock_minimo') nuevo = String(valor).trim() === '' ? -1 : Number(valor);
    if (campo === 'nombre') nuevo = String(valor).trim();
    if (String(producto[campo]) === String(nuevo)) return;
    try {
      await api.put(`/catalogos/productos/${producto.id}`, { [campo]: nuevo });
      refresh();
    } catch (error) {
      notify(error.message, 'error');
      refresh();
    }
  };

  const mover = async (id, direccion) => {
    const ids = productos.map((p) => p.id);
    const indice = ids.indexOf(id);
    const destino = indice + direccion;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    try {
      await api.put('/catalogos/productos/reordenar', { ids });
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const archivar = async () => {
    try {
      await api.del(`/catalogos/productos/${confirmar.id}`);
      notify('Producto archivado');
      setConfirmar(null);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const restaurar = async (producto) => {
    try {
      await api.put(`/catalogos/productos/${producto.id}`, { activo: 1 });
      notify('Producto restaurado');
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

  const filtrados = productos.filter((p) => {
    if (!verInactivos && !p.activo) return false;
    return `${p.codigo} ${p.nombre} ${p.categoria}`.toLowerCase().includes(buscar.toLowerCase());
  });

  const campo = (producto, nombreCampo, valor, tipo = 'text', extra = {}) => (
    <input
      className="input input-bordered input-xs w-full min-w-24 bg-transparent text-xs"
      type={tipo}
      defaultValue={valor}
      key={`${producto.id}-${nombreCampo}-${valor}`}
      onBlur={(e) => guardarCampo(producto, nombreCampo, e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      {...extra}
    />
  );

  return (
    <>
      <div className="card glass-panel border border-primary/10 bg-base-100/70 shadow-xl">
        <div className="card-body p-5">
          <div className="card-title flex flex-wrap items-center justify-between gap-3 text-base">
            <div>
              <span>Productos terminados</span>
              <div className="text-xs font-normal opacity-60">Edita precio, nombre y mínimo en la tabla. Usa las flechas para cambiar el orden.</div>
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
                  <th>Orden</th><th>Código</th><th>Producto</th><th>Categoría</th>
                  <th className="text-right">Precio</th><th className="text-right">Stock</th>
                  <th className="text-right">Mín.</th><th>Estado</th><th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => {
                  const estado = estadoStock(p);
                  const indice = productos.findIndex((x) => x.id === p.id);
                  return (
                    <tr key={p.id} className={!p.activo ? 'opacity-50' : ''}>
                      <td>
                        <div className="flex items-center gap-1">
                          <GripVertical size={14} className="opacity-40" />
                          <button className="btn btn-ghost btn-xs btn-square" disabled={indice === 0} onClick={() => mover(p.id, -1)}><ArrowUp size={13} /></button>
                          <button className="btn btn-ghost btn-xs btn-square" disabled={indice === productos.length - 1} onClick={() => mover(p.id, 1)}><ArrowDown size={13} /></button>
                        </div>
                      </td>
                      <td className="font-mono text-xs">{p.codigo}</td>
                      <td className="min-w-40">{campo(p, 'nombre', p.nombre)}</td>
                      <td className="opacity-70">{p.categoria}</td>
                      <td className="text-right">{campo(p, 'precio_venta', p.precio_venta, 'number', { step: '0.01', min: '0', className: 'input input-bordered input-xs w-24 bg-transparent text-right font-mono text-xs' })}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn btn-ghost btn-xs btn-square text-error" title="Descontar 1" onClick={() => setAjuste({ id: p.id, nombre: p.nombre, cantidad: '-1', referencia: 'Ajuste rápido' })}><Minus size={13} /></button>
                          <span className={`badge badge-sm ${estado.badge}`}>{num(p.stock)}</span>
                          <button className="btn btn-ghost btn-xs btn-square text-success" title="Aumentar 1" onClick={() => setAjuste({ id: p.id, nombre: p.nombre, cantidad: '1', referencia: 'Ajuste rápido' })}><Plus size={13} /></button>
                        </div>
                      </td>
                      <td className="text-right">
                        {campo(p, 'stock_minimo', Number(p.stock_minimo) === -1 ? '' : p.stock_minimo, 'number', { step: '1', min: '-1', placeholder: 'Indefinido', title: 'Deja vacío o usa -1 para Indefinido', className: 'input input-bordered input-xs w-24 bg-transparent text-right text-xs' })}
                      </td>
                      <td><span className={`badge badge-sm ${estado.badge}`}>{estado.etiqueta}</span></td>
                      <td className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button className="btn btn-ghost btn-xs" onClick={() => setAjuste({ id: p.id, nombre: p.nombre, cantidad: '', referencia: '' })}><SlidersHorizontal size={14} /> Ajustar</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setForm({ ...p })}><Pencil size={14} /> Editar</button>
                          {p.activo ? (
                            <button className="btn btn-ghost btn-xs text-error" onClick={() => setConfirmar(p)}><Archive size={14} /> Borrar</button>
                          ) : (
                            <button className="btn btn-ghost btn-xs text-success" onClick={() => restaurar(p)}><RotateCcw size={14} /> Restaurar</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtrados.length && <tr><td colSpan="9" className="py-8 text-center text-sm opacity-50">No hay productos con ese filtro</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs opacity-70">
            <span><span className="inline-block h-2 w-2 rounded-full bg-success mr-1" /> Verde: sobre mínimo y más de 20</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-warning mr-1" /> Amarillo: en mínimo o entre 21 y el mínimo</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-error mr-1" /> Rojo: 20 o menos</span>
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
              <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Stock mínimo (vacío = Indefinido)</span><input className="input input-bordered input-sm" type="number" step="1" min="-1" placeholder="Indefinido" value={Number(form.stock_minimo) === -1 ? '' : form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} /></label>
            </div>
            {!form.id && (
              <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Stock inicial</span><input className="input input-bordered input-sm" type="number" step="1" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
            )}
            <div className="modal-action">
              <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(null)}>Cancelar</button>
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

      {confirmar && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="text-lg font-bold">Archivar producto</h3>
            <p className="py-3 text-sm opacity-70">
              Se ocultará <strong>{confirmar.nombre}</strong> del panel de ventas. Podrás verlo y restaurarlo con “Archivados”.
            </p>
            <div className="modal-action">
              <button className="btn btn-error btn-sm" onClick={archivar}>Sí, archivar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmar(null)}>Cancelar</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setConfirmar(null)} />
        </div>
      )}
    </>
  );
}
