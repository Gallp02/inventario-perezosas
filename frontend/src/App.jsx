import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Package, Boxes, ClipboardList, Factory,
  ShoppingCart, ListChecks, History, Palette, UserRound, LogOut, Radio, UsersRound,
  Menu, X, LogIn
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
  const [accesos, setAccesos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [autenticando, setAutenticando] = useState(true);
  const [toast, setToast] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [tema, setTema] = useState(() => localStorage.getItem('inv_tema') || 'dark');
  const [menuAbierto, setMenuAbierto] = useState(() => {
    const guardado = localStorage.getItem('inv_menu_abierto');
    return guardado !== null ? guardado === '1' : window.innerWidth >= 1024;
  });
  const menuInicializado = useRef(false);

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
    api.get('/accesos').then(setAccesos).catch(() => setAccesos(null));
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
    if (!menuInicializado.current) {
      menuInicializado.current = true;
      return;
    }
    localStorage.setItem('inv_menu_abierto', menuAbierto ? '1' : '0');
  }, [menuAbierto]);

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

  const shared = { productos, insumos, recetas, clientes, accesos, refresh, notify, usuario };
  const titulo = NAV.find((n) => n.id === page)?.label || 'Resumen';

  return (
    <div className="app-shell flex min-h-screen flex-col lg:flex-row">
      <aside className={`app-sidebar flex w-full shrink-0 flex-col border-b border-primary/10 bg-base-100/80 p-4 transition-[width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:py-5 ${menuAbierto ? 'lg:w-64 lg:px-8' : 'lg:w-28 lg:px-2'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-lg font-black text-primary-content shadow-lg">IP</div>
            {menuAbierto && (
              <div className="min-w-0">
                <div className="section-kicker truncate">Panel de control</div>
                <div className="truncate text-base font-extrabold leading-tight">Inventario</div>
                <div className="truncate text-xs text-base-content/50">Perezosas y más</div>
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm btn-square shrink-0"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            aria-expanded={menuAbierto}
            aria-controls="modulos-nav"
            aria-label={menuAbierto ? 'Contraer menú de módulos' : 'Expandir menú de módulos'}
            title={menuAbierto ? 'Contraer menú' : 'Expandir menú'}
          >
            {menuAbierto ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>

        <nav id="modulos-nav" className={`mt-4 gap-1.5 lg:mt-8 ${menuAbierto ? 'flex overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0' : 'hidden lg:flex lg:flex-col'}`}>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                aria-current={page === item.id ? 'page' : undefined}
                title={menuAbierto ? undefined : item.label}
                className={`btn btn-ghost ${menuAbierto ? 'btn-sm shrink-0 justify-start gap-2 whitespace-nowrap lg:btn-md lg:w-full' : 'btn-md w-full justify-center px-0'} ${page === item.id ? 'nav-active text-primary' : ''}`}
                onClick={() => setPage(item.id)}
              >
                <Icon size={18} strokeWidth={2.2} />
                {menuAbierto && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {menuAbierto ? (
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
        ) : (
          <div className="mt-auto hidden pt-4 lg:block">
            <button className="btn btn-ghost btn-square w-full" onClick={salir} title="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1">
        <header className="app-header sticky top-0 z-30 border-b border-primary/10 py-4 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 lg:px-8">
            <div className="min-w-0">
              <div className="section-kicker">Módulo activo</div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">{titulo}</h1>
                <span className="badge badge-outline badge-sm hidden gap-1.5 self-end sm:inline-flex"><Radio size={13} /> Control de mercadería</span>
                <span className="badge badge-primary badge-sm hidden gap-1.5 self-end sm:inline-flex"><LogIn size={13} /> {accesos?.hoy ?? 0} ingresos hoy</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
