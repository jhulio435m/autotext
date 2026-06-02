import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useDocumentStore from '../../store';
import { apiLogin } from '../../api/client';
import { setSessionToken } from '../../api/session';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useDocumentStore((state) => state.currentUser);
  const setCurrentUser = useDocumentStore((state) => state.setCurrentUser);
  const hydrateWorkspace = useDocumentStore((state) => state.hydrateWorkspace);
  const setWorkspaceHydrated = useDocumentStore((state) => state.setWorkspaceHydrated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const useApiAuth = import.meta.env.VITE_USE_API_AUTH === 'true';
  const isDevBypass = !useApiAuth;

  useEffect(() => {
    if (currentUser) {
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    }
  }, [currentUser, location.state, navigate]);

  useEffect(() => {
    if (!isDevBypass || currentUser) return;

    setCurrentUser({
      email: 'dev@local',
      name: 'Usuario Dev',
      role: 'Dev',
      remember: true
    });
  }, [currentUser, isDevBypass, setCurrentUser]);

  const handleLogin = async () => {
    setError('');

    const validEmail = /^\S+@\S+\.\S+$/.test(email);
    if (!validEmail || !password.trim()) {
      setError('Completa un email valido y una contrasena.');
      return;
    }

    setLoading(true);

    try {
      if (useApiAuth) {
        const response = await apiLogin({ email, password });
        if (!response?.token || !response?.user) {
          throw new Error('Respuesta de autenticacion invalida.');
        }

        setSessionToken(response?.token || '', remember);

        if (response?.workspace) {
          hydrateWorkspace(response.workspace);
        } else {
          setWorkspaceHydrated(false);
        }

        setCurrentUser({ ...(response?.user || {}), remember });
      }

      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (loginError) {
      const message = loginError?.message || 'No se pudo iniciar sesion. Verifica API y base de datos.';
      setError(message.includes('Failed to fetch') ? 'No se pudo conectar con la API. Verifica que el servidor este activo.' : message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm outline-none ${error ? 'border-rose-400' : 'border-slate-300 focus:border-slate-500'}`;

  return (
    <div className='grid min-h-screen bg-slate-100 text-slate-900 lg:grid-cols-[40%_60%]'>
      <section className='border-b border-slate-200 bg-white p-10 lg:border-b-0 lg:border-r'>
        <div className='mx-auto flex h-full max-w-md flex-col justify-between'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.3em] text-slate-500'>TechDoc Studio</p>
            <h1 className='mt-4 text-3xl font-black leading-tight text-slate-900'>Plantillas tecnicas con salida LaTeX profesional.</h1>
            <p className='mt-3 text-sm text-slate-600'>Centraliza proyectos y construye documentos tecnicos paso a paso con datos guiados, contenido asistido y exportacion profesional.</p>
          </div>

          <ul className='space-y-3 text-sm text-slate-700'>
            <li className='flex gap-2'><span>1.</span><span>Constructor guiado para crear documentos sin tocar estructura tecnica.</span></li>
            <li className='flex gap-2'><span>2.</span><span>Datos reutilizables, contenido asistido y vista previa integrada.</span></li>
            <li className='flex gap-2'><span>3.</span><span>Editor avanzado disponible solo cuando necesitas ajustar la plantilla.</span></li>
          </ul>
        </div>
      </section>

      <section className='flex items-center justify-center bg-slate-100 p-6 text-slate-900'>
        <div className='w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm'>
          <h2 className='text-xl font-bold'>{isDevBypass ? 'Preparando entorno de desarrollo' : 'Ingresar al sistema'}</h2>
          <p className='mt-1 text-sm text-slate-500'>
            {isDevBypass ? 'La autenticación API está desactivada. Entrarás directamente al dashboard.' : 'Accede con tus credenciales corporativas.'}
          </p>

          {location.state?.message ? <div className='mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>{location.state.message}</div> : null}
          {error ? <div className='mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>{error}</div> : null}

          <form
            className='mt-4 space-y-4'
            onSubmit={(event) => {
              event.preventDefault();
              handleLogin();
            }}
          >
            {isDevBypass ? (
              <div className='rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600'>
                Redirigiendo con sesión de desarrollo.
              </div>
            ) : (
              <>
                <div>
                  <label className='mb-1 block text-xs font-semibold text-slate-600'>Email</label>
                  <input
                    ref={(node) => node?.focus()}
                    type='email'
                    value={email}
                    disabled={loading}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className='mb-1 block text-xs font-semibold text-slate-600'>Contrasena</label>
                  <div className='relative'>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      disabled={loading}
                      onChange={(event) => setPassword(event.target.value)}
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type='button'
                      aria-label='Mostrar u ocultar contrasena'
                      className='absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500'
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </div>

                <div className='flex items-center justify-between gap-3'>
                  <label className='flex items-center gap-2 text-sm text-slate-600'>
                    <input type='checkbox' checked={remember} onChange={() => setRemember((prev) => !prev)} disabled={loading} />
                    Recordarme
                  </label>
                  <Link to='/recuperar-contrasena' className='text-sm font-medium text-sky-700 hover:text-sky-900'>Olvide mi contrasena</Link>
                </div>

                <button
                  type='submit'
                  disabled={loading}
                  className='flex w-full items-center justify-center gap-2 rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:border-sky-800 hover:bg-sky-800'
                >
                  {loading ? <span className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' /> : null}
                  {loading ? 'Ingresando...' : 'Ingresar al sistema'}
                </button>
              </>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}

export default Login;
