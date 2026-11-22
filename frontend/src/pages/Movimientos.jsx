import { useEffect, useState } from 'react';
import { History, Filter } from 'lucide-react';
import { api, num, fecha } from '../api.js';

const tipoNombre = {
  fabricacion: 'Fabricación', venta: 'Venta', anulacion: 'Anulación',
  ajuste: 'Ajuste', compra: 'Compra', consumo_fabricacion: 'Consumo por fabricación'
};
const badgeTipo = {
  fabricacion: 'success', venta: 'info', anulacion: 'warning',
  ajuste: 'warning', compra: 'success', consumo_fabricacion: 'info'
};

export default function Movimientos({ notify }) {
  const [tipo, setTipo] = useState('todos');
  const [filas, setFilas] = useState([]);

  useEffect(() => {
    api.get(`/movimientos?tipo=${tipo}`).then(setFilas).catch((e) => notify(e.message, 'error'));
  }, [tipo, notify]);

  return (
    <div className="card border border-base-200 bg-base-100 shadow-sm">
      <div className="card-body p-5">
        <div className="card-title flex flex-wrap items-center justify-between gap-3 text-base">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary" />
            <div>
              <div>Historial de movimientos</div>
              <div className="text-xs font-normal opacity-60">Entradas, salidas, fabricaciones y ventas de mercadería.</div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs opacity-60">
            <Filter size={15} />
            <select className="select select-bordered select-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="producto">Solo productos</option>
              <option value="insumo">Solo insumos</option>
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="table table-sm table-zebra">
            <thead>
              <tr>
                <th>Fecha</th><th>Item</th><th>Tipo</th><th className="text-right">Cantidad</th>
                <th className="text-right">Antes</th><th className="text-right">Después</th><th>Referencia</th><th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((m) => (
                <tr key={`${m.origen}-${m.id}`}>
                  <td className="whitespace-nowrap text-xs opacity-60">{fecha(m.fecha)}</td>
                  <td>
                    <span className="font-semibold">{m.item_nombre}</span>
                    <div className="text-[10px] opacity-50">{m.origen === 'producto' ? 'Producto' : 'Insumo'}</div>
                  </td>
                  <td><span className={`badge badge-sm ${badgeTipo[m.tipo] || 'badge-ghost'}`}>{tipoNombre[m.tipo] || m.tipo}</span></td>
                  <td className="text-right font-mono">{m.tipo === 'venta' || m.tipo === 'consumo_fabricacion' ? '-' : '+'}{num(m.cantidad, 2)}</td>
                  <td className="text-right font-mono opacity-70">{num(m.anterior, 2)}</td>
                  <td className="text-right font-mono">{num(m.nuevo, 2)}</td>
                  <td className="text-xs opacity-60">{m.referencia || '-'}</td>
                  <td className="text-xs opacity-60">{m.usuario}</td>
                </tr>
              ))}
              {!filas.length && <tr><td colSpan="8" className="py-10 text-center text-sm opacity-50">No hay movimientos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
