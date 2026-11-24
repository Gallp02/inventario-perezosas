import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, Package, Boxes, ClipboardList, Factory,
  ShoppingCart, ListChecks, History, Palette, UserRound, LogOut, Radio, UsersRound,
  LayoutGrid, ChevronDown, X
} from 'lucide-react';
import { api } from './api.js';
import Dashboard from './pages/Dashboard.jsx';
import Productos from './pages/Productos.jsx';
import Insumos from './pages/Insumos.jsx';
import Recetas from './pages/Recetas.jsx';
import Fabricar from './pages/Fabricar.jsx';
import Ventas from './pages/Ventas.jsx';
import Pedidos from './pages/Pedidos.jsx';
import Clientes from './pages/Clientes.jsx';
import Movimientos from './pages/Movimientos.jsx';
import Login from './pages/Login.jsx';

const NAV = [
  { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'insumos', label: 'Insumos', icon: Boxes },
  { id: 'recetas', label: 'Recetas', icon: ClipboardList },
  { id: 'fabricar', label: 'Fabricar', icon: Factory },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
  { id: 'clientes', label: 'Clientes', icon: UsersRound },
  { id: 'pedidos', label: 'Pedidos', icon: ListChecks },
  { id: 'movimientos', label: 'Movimientos', icon: History }
];

const TEMAS = ['dark', 'emerald', 'forest', 'light', 'sunset', 'nord', 'caramellatte'];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [autenticando, setAutenticando] = useState(true);
  const [toast, setToast] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [tema, setTema] = useState(() => localStorage.getItem('inv_tema') || 'dark');
  const [menuModulos, setMenuModulos] = useState(false);

  const refresh = useCallback(async () => {
    const [p, i, r, c] = await Promise.all([
      api.get('/catalogos/productos'),
      api.get('/catalogos/insumos'),
      api.get('/catalogos/recetas'),
      api.get('/clientes?incluirInactivos=1')
    ]);
    setProductos(p);
    setInsumos(i);
    setRecetas(r);
    setClientes(c);
  }, []);

  const notify = useCallback((mensaje, tipo = 'ok') => {
    setToast({ mensaje, tipo });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('inv_tema', tema);
  }, [tema]);

  useEffect(() => {
    api.me()
      .then((datos) => setUsuario(datos.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setAutenticando(false));
  }, []);

  useEffect(() => {
    const cerrarSesion = () => setUsuario(null);
    window.addEventListener('inv:unauthorized', cerrarSesion);
    return () => window.removeEventListener('inv:unauthorized', cerrarSesion);
  }, []);

  useEffect(() => {
    if (!menuModulos) return;
    const cerrarAlHacerClic = (event) => {
      if (!event.target.closest('[data-menu-modulos]')) setMenuModulos(false);
    };
    const cerrarConEscape = (event) => {
      if (event.key === 'Escape') setMenuModulos(false);
    };
    document.addEventListener('click', cerrarAlHacerClic);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('click', cerrarAlHacerClic);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [menuModulos]);

  useEffect(() => {
    if (!usuario) return;
    refresh().catch((error) => notify(error.message, 'error')).finally(() => setCargando(false));
  }, [usuario, refresh, notify]);

  const salir = async () => {
    await api.logout().catch(() => {});
    setUsuario(null);
  };

  if (autenticando) {
    return <div className="grid min-h-screen place-items-center bg-base-200"><span className="loading loading-spinner loading-lg text-primary" /></div>;
  }

  if (!usuario) return <Login onOk={setUsuario} />;

  const shared = { productos, insumos, recetas, clientes, refresh, notify, usuario };
  const titulo = NAV.find((n) => n.id === page)?.label || 'Resumen';

  return (
    <div className="app-shell flex min-h-screen flex-col lg:flex-row">
      <aside className="app-sidebar flex w-full shrink-0 flex-col border-b border-primary/10 bg-base-100/80 p-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:px-8 lg:py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-lg font-black text-primary-content shadow-lg">IP</div>
          <div>
            <div className="section-kicker">Panel de control</div>
            <div className="text-base font-extrabold leading-tight">Inventario</div>
            <div className="text-xs text-base-content/50">Perezosas y más</div>
          </div>
        </div>

        <nav className="mt-4 flex gap-1.5 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                aria-current={page === item.id ? 'page' : undefined}
                className={`btn btn-ghost btn-sm shrink-0 justify-start gap-2 whitespace-nowrap lg:btn-md lg:w-full ${page === item.id ? 'nav-active text-primary' : ''}`}
                onClick={() => setPage(item.id)}
              >
                <Icon size={18} strokeWidth={2.2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto hidden border-t border-base-200 pt-4 lg:block">
          <div className="label py-1">
            <span className="label-text text-xs font-semibold opacity-60">Sesión activa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="input input-bordered input-sm flex flex-1 items-center gap-2">
              <UserRound size={15} className="opacity-50" />
              <span className="grow truncate">{usuario}</span>
            </div>
            <button className="btn btn-outline btn-sm btn-square" onClick={salir} title="Cerrar sesión">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="app-header sticky top-0 z-30 border-b border-primary/10 py-4 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 lg:px-8">
            <div className="min-w-0">
              <div className="section-kicker">Módulo activo</div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">{titulo}</h1>
                <span className="badge badge-outline badge-sm hidden gap-1.5 self-end sm:inline-flex"><Radio size={13} /> Control de mercadería</span>
              </div>
            </div>
            <div className="relative flex shrink-0 items-center gap-2" data-menu-modulos>
              <button
                className="btn btn-outline btn-sm gap-2"
                aria-expanded={menuModulos}
                onClick={() => setMenuModulos((abierto) => !abierto)}
              >
                <LayoutGrid size={15} />
                <span className="hidden sm:inline">Módulos</span>
                <ChevronDown size={14} className={`transition-transform ${menuModulos ? 'rotate-180' : ''}`} />
              </button>
              <div className="hidden h-6 w-px bg-base-300/60 sm:block" />
              <Palette size={16} className="shrink-0 opacity-50" />
              <select
                className="select select-bordered select-sm w-36 capitalize"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                aria-label="Tema de color"
              >
                {TEMAS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm btn-square lg:hidden" onClick={salir} title="Cerrar sesión">
                <LogOut size={16} />
              </button>

              {menuModulos && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-primary/20 bg-base-100/95 p-3 shadow-2xl backdrop-blur-xl">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="section-kicker">Lista de módulos</span>
                    <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setMenuModulos(false)} aria-label="Cerrar lista de módulos">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {NAV.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          className={`btn btn-ghost btn-sm justify-start gap-2.5 text-sm lg:btn-md ${page === item.id ? 'nav-active text-primary' : ''}`}
                          onClick={() => {
                            setPage(item.id);
                            setMenuModulos(false);
                          }}
                        >
                          <Icon size={16} strokeWidth={2.2} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {cargando ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : (
          <div className="mx-auto max-w-[1440px] space-y-5 p-4 lg:p-8">
            {page === 'dashboard' && <Dashboard {...shared} ir={setPage} />}
            {page === 'productos' && <Productos {...shared} />}
            {page === 'insumos' && <Insumos {...shared} />}
            {page === 'recetas' && <Recetas {...shared} />}
            {page === 'fabricar' && <Fabricar {...shared} />}
            {page === 'ventas' && <Ventas {...shared} />}
            {page === 'clientes' && <Clientes {...shared} />}
            {page === 'pedidos' && <Pedidos {...shared} />}
            {page === 'movimientos' && <Movimientos {...shared} />}
          </div>
        )}
      </main>

      {toast && (
        <div className="toast toast-end toast-bottom z-50">
          <div className={`alert ${toast.tipo === 'error' ? 'alert-error' : 'alert-success'} shadow-lg`}>
            <span className="text-sm font-medium">{toast.mensaje}</span>
          </div>
        </div>
      )}
    </div>
  );
}
