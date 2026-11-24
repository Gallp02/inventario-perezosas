import { useState } from 'react';
import { Plus, Pencil, Search, Archive, RotateCcw, MapPin } from 'lucide-react';
import { api, DISTRITOS_LIMA } from '../api.js';

const vacio = {
  nombre: '', distrito: '', provincia: 'Lima', telefono: '', direccion: '', notas: ''
};

export default function Clientes({ clientes, refresh, notify }) {
  const [form, setForm] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [distrito, setDistrito] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);

  const guardar = async (event) => {
    event.preventDefault();
    try {
      if (form.id) await api.put(`/clientes/${form.id}`, form);
      else await api.post('/clientes', form);
      notify(form.id ? 'Cliente actualizado' : 'Cliente agregado');
      setForm(null);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const cambiarEstado = async (cliente) => {
    try {
      if (cliente.activo) await api.del(`/clientes/${cliente.id}`);
      else await api.put(`/clientes/${cliente.id}`, { ...cliente, activo: 1 });
      notify(cliente.activo ? 'Cliente archivado' : 'Cliente restaurado');
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const filtrados = clientes.filter((c) => {
    if (!verInactivos && !c.activo) return false;
    if (distrito && c.distrito !== distrito) return false;
    const texto = `${c.nombre} ${c.telefono || ''} ${c.distrito || ''}`.toLowerCase();
    return texto.includes(buscar.toLowerCase());
  });

  const distritos = [...new Set([...DISTRITOS_LIMA, ...clientes.map((c) => c.distrito).filter(Boolean)])].sort();

  return (
    <>
      <div className="card glass-panel border border-primary/10 bg-base-100/70 shadow-xl">
        <div className="card-body p-5">
          <div className="card-title flex flex-wrap items-center justify-between gap-3 text-base">
            <div>
              <div>Cartelera de clientes</div>
              <div className="text-xs font-normal opacity-60">Selecciona el destino desde Ventas y filtra por distrito al instante.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="input input-bordered input-sm flex w-48 items-center gap-2">
                <Search size={15} className="opacity-50" />
                <input className="grow bg-transparent" placeholder="Buscar…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
              </label>
              <select className="select select-bordered select-sm w-48" value={distrito} onChange={(e) => setDistrito(e.target.value)}>
                <option value="">Todos los distritos</option>
                {distritos.map((d) => <option key={d}>{d}</option>)}
              </select>
              <label className="label cursor-pointer gap-2">
                <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
                <span className="label-text text-xs">Inactivos</span>
              </label>
              <button className="btn btn-primary btn-sm gap-1" onClick={() => setForm({ ...vacio })}><Plus size={15} /> Nuevo</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>Cliente</th><th>Destino</th><th>Contacto</th><th>Dirección</th><th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="font-semibold">{c.nombre}</span>
                      {!c.activo && <span className="badge badge-ghost badge-sm ml-2">Archivado</span>}
                    </td>
                    <td className="text-xs opacity-70">
                      <span className="inline-flex items-center gap-1"><MapPin size={13} /> {c.provincia || 'Lima'} · {c.distrito || 'Sin distrito'}</span>
                    </td>
                    <td className="text-xs opacity-70">{c.telefono || '-'}</td>
                    <td className="text-xs opacity-60">{c.direccion || '-'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-ghost btn-xs" onClick={() => setForm({ ...c })}><Pencil size={14} /> Editar</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => cambiarEstado(c)}>
                          {c.activo ? <Archive size={14} /> : <RotateCcw size={14} />}
                          {c.activo ? 'Archivar' : 'Restaurar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && <tr><td colSpan="5" className="py-8 text-center text-sm opacity-50">No hay clientes con ese filtro</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {form && (
        <div className="modal modal-open">
          <form className="modal-box max-w-2xl" onSubmit={guardar}>
            <div className="modal-action -mt-2 mb-2 justify-between">
              <h3 className="text-lg font-bold">{form.id ? 'Editar cliente' : 'Nuevo cliente'}</h3>
              <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={() => setForm(null)}>✕</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="form-control"><span className="label-text text-xs font-semibold">Nombre o razón social</span><input className="input input-bordered input-sm" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
              <label className="form-control"><span className="label-text text-xs font-semibold">Teléfono</span><input className="input input-bordered input-sm" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></label>
              <label className="form-control"><span className="label-text text-xs font-semibold">Provincia</span><input className="input input-bordered input-sm" value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} /></label>
              <label className="form-control">
                <span className="label-text text-xs font-semibold">Distrito</span>
                <input className="input input-bordered input-sm" list="lista-distritos" value={form.distrito} onChange={(e) => setForm({ ...form, distrito: e.target.value })} />
                <datalist id="lista-distritos">{distritos.map((d) => <option key={d} value={d} />)}</datalist>
              </label>
            </div>
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Dirección</span><input className="input input-bordered input-sm" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></label>
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Notas</span><textarea className="textarea textarea-bordered textarea-sm" rows="2" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></label>
            <div className="modal-action">
              <button className="btn btn-primary btn-sm">Guardar</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
          <div className="modal-backdrop" onClick={() => setForm(null)} />
        </div>
      )}
    </>
  );
}
