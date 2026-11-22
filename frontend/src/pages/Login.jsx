import { useState } from 'react';
import { LockKeyhole, UserRound, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
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
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-base-200 p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="card border border-base-200 bg-base-100/95 shadow-2xl backdrop-blur">
          <div className="card-body gap-5 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-primary to-secondary text-2xl font-black text-primary-content shadow-lg">
                IP
              </div>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Inventario Perezosas</h1>
              <p className="text-sm opacity-60">Stock, fabricación, ventas y pedidos en un solo lugar.</p>
            </div>

            <form className="space-y-4" onSubmit={entrar}>
              <label className="form-control">
                <span className="label-text text-xs font-semibold">Usuario</span>
                <div className="relative">
                  <UserRound size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-45" />
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
                <span className="label-text text-xs font-semibold">Contraseña</span>
                <div className="relative">
                  <LockKeyhole size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-45" />
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

              <button className="btn btn-primary w-full gap-2" type="submit" disabled={cargando}>
                {cargando ? <span className="loading loading-spinner loading-sm" /> : <ShieldCheck size={17} />}
                {cargando ? 'Entrando…' : 'Entrar'}
                {!cargando && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="divider text-xs opacity-50">Acceso de pruebas</div>
            <p className="text-center text-xs opacity-60">
              Usa las credenciales entregadas para gestionar el inventario.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
