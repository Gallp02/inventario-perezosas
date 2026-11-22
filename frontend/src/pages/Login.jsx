import { useState } from 'react';
import {
  LockKeyhole, UserRound, Eye, EyeOff, ArrowRight, ShieldCheck,
  Boxes, ListChecks, History, Radio, Cpu, Sparkles
} from 'lucide-react';
import { api } from '../api.js';

export default function Login({ onOk }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const entrar = async (evento) => {
    evento.preventDefault();
    setError('');
    if (!usuario.trim() || !password) return setError('Ingresa tu usuario y contraseña');
    setCargando(true);
    try {
      const datos = await api.login(usuario.trim(), password);
      onOk(datos.usuario);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-shell relative grid min-h-screen place-items-center overflow-hidden p-4 lg:p-8">
      <div className="auth-grid" />
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden space-y-8 px-4 lg:block">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="live-dot" />
              <span className="section-kicker">Sistema de control · v1.0</span>
            </div>
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight xl:text-6xl">
              Inventario
              <span className="block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(16,185,129,.25)]">
                Perezosas
              </span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-base-content/60">
              Producción, stock, ventas y pedidos en una sola superficie. Diseñado para operar rápido y saber qué pasa en cada momento.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="auth-feature space-y-2 rounded-2xl p-4">
              <Boxes size={20} className="text-primary" />
              <div className="text-sm font-bold">Stock vivo</div>
              <div className="text-xs opacity-55">Productos e insumos</div>
            </div>
            <div className="auth-feature space-y-2 rounded-2xl p-4">
              <ListChecks size={20} className="text-secondary" />
              <div className="text-sm font-bold">Pedidos</div>
              <div className="text-xs opacity-55">Preparación y entrega</div>
            </div>
            <div className="auth-feature space-y-2 rounded-2xl p-4">
              <History size={20} className="text-accent" />
              <div className="text-sm font-bold">Trazabilidad</div>
              <div className="text-xs opacity-55">Cada movimiento</div>
            </div>
          </div>

          <div className="auth-panel space-y-3 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="section-kicker">Estado de la plataforma</span>
              <span className="badge badge-success badge-sm gap-1"><Radio size={12} /> En línea</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-base-200/50 p-3">
                <Cpu size={16} className="mx-auto mb-1 text-primary" />
                <div className="text-lg font-black">API</div>
                <div className="text-[10px] opacity-50">activa</div>
              </div>
              <div className="rounded-xl bg-base-200/50 p-3">
                <ShieldCheck size={16} className="mx-auto mb-1 text-secondary" />
                <div className="text-lg font-black">Sesión</div>
                <div className="text-[10px] opacity-50">segura</div>
              </div>
              <div className="rounded-xl bg-base-200/50 p-3">
                <Sparkles size={16} className="mx-auto mb-1 text-accent" />
                <div className="text-lg font-black">Datos</div>
                <div className="text-[10px] opacity-50">sincronizados</div>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-panel relative w-full overflow-hidden rounded-3xl p-7 sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="auth-ring grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-primary to-secondary text-xl font-black text-primary-content shadow-lg">
                IP
              </div>
              <div className="mt-5 section-kicker">Acceso al panel</div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Bienvenido de vuelta</h2>
              <p className="mt-1 text-sm opacity-55">Ingresa tus credenciales para continuar.</p>
            </div>

            <form className="space-y-4" onSubmit={entrar}>
              <label className="form-control">
                <span className="label-text text-xs font-semibold tracking-wide">Usuario</span>
                <div className="relative mt-1">
                  <UserRound size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary/70" />
                  <input
                    className="input input-bordered w-full pl-10"
                    autoComplete="username"
                    placeholder="Tu usuario"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                  />
                </div>
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-semibold tracking-wide">Contraseña</span>
                <div className="relative mt-1">
                  <LockKeyhole size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary/70" />
                  <input
                    className="input input-bordered w-full pl-10 pr-12"
                    type={verPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm absolute right-1 top-1/2 -translate-y-1/2 px-2"
                    onClick={() => setVerPassword(!verPassword)}
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="alert alert-error text-sm">
                  <span>{error}</span>
                </div>
              )}

              <button className="btn btn-primary mt-2 w-full gap-2" type="submit" disabled={cargando}>
                {cargando ? <span className="loading loading-spinner loading-sm" /> : <ShieldCheck size={17} />}
                {cargando ? 'Entrando…' : 'Entrar al sistema'}
                {!cargando && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest opacity-40">
              <span className="live-dot" /> Acceso seguro
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
