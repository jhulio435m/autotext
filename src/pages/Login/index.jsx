import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useDocumentStore from '../../store';
import { MOCK_USERS } from '../../data/users';
import { apiLogin } from '../../api/client';
import { setSessionToken } from '../../api/session';

function Login() {
  const navigate = useNavigate();
  const currentUser = useDocumentStore((state) => state.currentUser);
  const setCurrentUser = useDocumentStore((state) => state.setCurrentUser);
  const hydrateWorkspace = useDocumentStore((state) => state.hydrateWorkspace);

  const [email, setEmail] = useState('ingeniero@empresa.com');
  const [password, setPassword] = useState('demo1234');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const useApiAuth = import.meta.env.VITE_USE_API_AUTH === 'true';

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

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
        setCurrentUser({ ...(response?.user || {}), remember });

        if (response?.workspace) {
          hydrateWorkspace(response.workspace);
        }
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 400));
        const user = MOCK_USERS.find((item) => item.email === email && item.password === password);
        if (!user) {
          throw new Error('Credenciales invalidas. Usa ingeniero@empresa.com / demo1234');
        }
        setCurrentUser({ ...user, remember });
      }

      navigate('/dashboard');
    } catch (loginError) {
      setError(loginError?.message || 'No se pudo iniciar sesion. Verifica API y base de datos.');
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
            <p className='mt-3 text-sm text-slate-600'>Centraliza proyectos, estructuras jerarquicas, formularios inteligentes y exportacion documental para ingenieria.</p>
          </div>

          <ul className='space-y-3 text-sm text-slate-700'>
            <li className='flex gap-2'><span>1.</span><span>Control total de estructura hasta nivel 5 compatible con LaTeX.</span></li>
            <li className='flex gap-2'><span>2.</span><span>Formulario dinamico y reutilizacion de plantillas sin copiar datos.</span></li>
            <li className='flex gap-2'><span>3.</span><span>Vista previa y export .tex lista para compilacion profesional.</span></li>
          </ul>
        </div>
      </section>

      <section className='flex items-center justify-center bg-slate-100 p-6 text-slate-900'>
        <div className='w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm'>
          <h2 className='text-xl font-bold'>Ingresar al sistema</h2>
          <p className='mt-1 text-sm text-slate-500'>Accede con tus credenciales corporativas.</p>

          {error ? <div className='mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>{error}</div> : null}

          <div className='mt-4 space-y-4'>
            <div>
              <label className='mb-1 block text-xs font-semibold text-slate-600'>Email</label>
              <input
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

            <label className='flex items-center gap-2 text-sm text-slate-600'>
              <input type='checkbox' checked={remember} onChange={() => setRemember((prev) => !prev)} disabled={loading} />
              Recordarme
            </label>

            <button
              type='button'
              disabled={loading}
              onClick={handleLogin}
              className='btn-primary flex w-full items-center justify-center gap-2'
            >
              {loading ? <span className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' /> : null}
              {loading ? 'Ingresando...' : 'Ingresar al sistema'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Login;
