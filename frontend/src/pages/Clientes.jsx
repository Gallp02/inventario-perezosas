import { useState } from 'react';
import readXlsxFile from 'read-excel-file/browser';
import { Plus, Pencil, Search, Archive, RotateCcw, MapPin, Upload } from 'lucide-react';
import { api, DISTRITOS_LIMA } from '../api.js';

const vacio = {
  nombre: '', dni: '', empresa: '', distrito: '', provincia: 'Lima', telefono: '', direccion: '', notas: ''
};

const COLUMNAS = {
  nombre: ['nombre de cliente', 'nombre cliente', 'nombre', 'cliente', 'razon social', 'razón social', 'name', 'customer'],
  dni: ['dni', 'documento', 'numero de documento', 'número de documento', 'ruc', 'documento de identidad'],
  empresa: ['empresa', 'compania', 'compañía', 'company', 'razon social empresa'],
  distrito: ['distrito', 'ciudad', 'city'],
  provincia: ['provincia', 'region', 'región', 'state'],
  telefono: ['telefono', 'teléfono', 'celular', 'phone', 'mobile'],
  direccion: ['direccion', 'dirección', 'address'],
  notas: ['notas', 'observaciones', 'notes']
};

function normalizar(valor) {
  return String(valor ?? '').trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[\s_.-]+/g, ' ').trim();
}

function contarSeparadores(linea, separador) {
  let total = 0;
  let entreComillas = false;
  for (const caracter of linea) {
    if (caracter === '"') entreComillas = !entreComillas;
    else if (caracter === separador && !entreComillas) total += 1;
  }
  return total;
}

function parsearCsv(texto) {
  const limpio = texto.replace(/^\uFEFF/, '');
  if (!limpio.trim()) return [];
  const primeraLinea = limpio.split(/\r?\n/, 1)[0];
  const separador = contarSeparadores(primeraLinea, ';') > contarSeparadores(primeraLinea, ',') ? ';' : ',';
  const filas = [];
  let fila = [];
  let campo = '';
  let entreComillas = false;
  for (let index = 0; index < limpio.length; index += 1) {
    const caracter = limpio[index];
    if (caracter === '"') {
      if (entreComillas && limpio[index + 1] === '"') {
        campo += '"';
        index += 1;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (caracter === separador && !entreComillas) {
      fila.push(campo.trim());
      campo = '';
    } else if ((caracter === '\n' || caracter === '\r') && !entreComillas) {
      if (caracter === '\r' && limpio[index + 1] === '\n') index += 1;
      fila.push(campo.trim());
      if (fila.some(Boolean)) filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += caracter;
    }
  }
  fila.push(campo.trim());
  if (fila.some(Boolean)) filas.push(fila);
  return filas;
}

function filaACliente(fila, encabezados) {
  const pos = (nombres) => encabezados.findIndex((cabecera) => nombres.includes(cabecera));
  const valor = (nombres) => {
    const indice = pos(nombres);
    return indice < 0 ? '' : String(fila[indice] ?? '').trim();
  };
  const nombre = valor(COLUMNAS.nombre);
  const empresa = valor(COLUMNAS.empresa);
  return {
    nombre: nombre || empresa,
    dni: valor(COLUMNAS.dni),
    empresa,
    distrito: valor(COLUMNAS.distrito),
    provincia: valor(COLUMNAS.provincia) || 'Lima',
    telefono: valor(COLUMNAS.telefono),
    direccion: valor(COLUMNAS.direccion),
    notas: valor(COLUMNAS.notas)
  };
}

export default function Clientes({ clientes, refresh, notify }) {
  const [form, setForm] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [distrito, setDistrito] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
  const [importando, setImportando] = useState(false);

  const importar = async (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    setImportando(true);
    try {
      const filas = /\.csv$/i.test(archivo.name)
        ? parsearCsv(await archivo.text())
        : await readXlsxFile(archivo);
      if (filas.length < 2) throw new Error('El archivo no tiene datos');
      const encabezados = filas[0].map(normalizar);
      const clientes = filas.slice(1)
        .map((fila) => filaACliente(fila, encabezados))
        .filter((cliente) => cliente.nombre);
      if (!clientes.length) throw new Error('No se encontraron clientes. Usa columnas Nombre de cliente, DNI y Empresa');
      const res = await api.post('/clientes/importar', { clientes });
      notify(`Importación: ${res.creados} nuevos, ${res.actualizados} actualizados`);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setImportando(false);
      event.target.value = '';
    }
  };

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
    const texto = `${c.nombre} ${c.dni || ''} ${c.empresa || ''} ${c.telefono || ''} ${c.distrito || ''}`.toLowerCase();
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
              <div className="text-xs font-normal opacity-60">Columnas del Excel: Nombre de cliente, DNI y Empresa. También acepta teléfono, distrito y dirección.</div>
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
              <label className={`btn btn-outline btn-sm gap-1 ${importando ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
                <Upload size={15} /> {importando ? 'Importando…' : 'Importar Excel'}
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importar} disabled={importando} />
              </label>
              <button className="btn btn-primary btn-sm gap-1" onClick={() => setForm({ ...vacio })}><Plus size={15} /> Nuevo</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>Cliente</th><th>DNI</th><th>Empresa</th><th>Destino</th><th>Contacto</th><th>Dirección</th><th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="font-semibold">{c.nombre}</span>
                      {!c.activo && <span className="badge badge-ghost badge-sm ml-2">Archivado</span>}
                    </td>
                    <td className="font-mono text-xs opacity-70">{c.dni || '-'}</td>
                    <td className="text-xs opacity-70">{c.empresa || '-'}</td>
                    <td className="text-xs opacity-70">
                      <span className="inline-flex items-center gap-1"><MapPin size={13} /> {c.provincia || 'Lima'} · {c.distrito || 'Sin distrito'}</span>
                    </td>
                    <td className="text-xs opacity-70">{c.telefono || '-'}</td>
                    <td className="text-xs opacity-60">{c.direccion || '-'}</td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button className="btn btn-ghost btn-xs" onClick={() => setForm({ ...c })}><Pencil size={14} /> Editar</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => cambiarEstado(c)}>
                          {c.activo ? <Archive size={14} /> : <RotateCcw size={14} />}
                          {c.activo ? 'Archivar' : 'Restaurar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && <tr><td colSpan="7" className="py-8 text-center text-sm opacity-50">No hay clientes con ese filtro</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {form && (
        <div className="modal modal-open">
          <form className="modal-box max-w-2xl" onSubmit={guardar}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">{form.id ? 'Editar cliente' : 'Nuevo cliente'}</h3>
              <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={() => setForm(null)}>✕</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="form-control"><span className="label-text text-xs font-semibold">Nombre de cliente</span><input className="input input-bordered input-sm" required value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
              <label className="form-control"><span className="label-text text-xs font-semibold">DNI</span><input className="input input-bordered input-sm" placeholder="12345678" value={form.dni || ''} onChange={(e) => setForm({ ...form, dni: e.target.value })} /></label>
              <label className="form-control"><span className="label-text text-xs font-semibold">Empresa</span><input className="input input-bordered input-sm" value={form.empresa || ''} onChange={(e) => setForm({ ...form, empresa: e.target.value })} /></label>
              <label className="form-control"><span className="label-text text-xs font-semibold">Teléfono</span><input className="input input-bordered input-sm" value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></label>
              <label className="form-control"><span className="label-text text-xs font-semibold">Provincia</span><input className="input input-bordered input-sm" value={form.provincia || ''} onChange={(e) => setForm({ ...form, provincia: e.target.value })} /></label>
              <label className="form-control">
                <span className="label-text text-xs font-semibold">Distrito</span>
                <input className="input input-bordered input-sm" list="lista-distritos" value={form.distrito || ''} onChange={(e) => setForm({ ...form, distrito: e.target.value })} />
                <datalist id="lista-distritos">{distritos.map((d) => <option key={d} value={d} />)}</datalist>
              </label>
            </div>
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Dirección</span><input className="input input-bordered input-sm" value={form.direccion || ''} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></label>
            <label className="form-control mt-3"><span className="label-text text-xs font-semibold">Notas</span><textarea className="textarea textarea-bordered textarea-sm" rows="2" value={form.notas || ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></label>
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
