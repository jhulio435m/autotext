import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRegister } from '../../api/client';
import { setSessionToken } from '../../api/session';
import useDocumentStore from '../../store';

function Register() {
  const navigate = useNavigate();
  const setCurrentUser = useDocumentStore((state) => state.setCurrentUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');

    const validEmail = /^\S+@\S+\.\S+$/.test(email);
    if (!validEmail || !password.trim() || !name.trim()) {
      setError('Completa todos los campos.');
      return;
    }

    if (password.length < 12) {
      setError('La contrasena debe tener al menos 12 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiRegister({ email, password, name });
      if (!response?.token || !response?.user) {
        throw new Error('Respuesta de registro invalida.');
      }

      setSessionToken(response.token, false);
      setCurrentUser({ ...response.user, remember: false });
      navigate('/dashboard', { replace: true });
    } catch (registerError) {
      const message = registerError?.message || 'No se pudo completar el registro.';
      setError(message.includes('Failed to fetch') ? 'No se pudo conectar con la API.' : message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-slate-500 border-slate-300';

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
          <h2 className='text-xl font-bold'>Crear cuenta</h2>
          <p className='mt-1 text-sm text-slate-500'>Registrate para empezar a usar TechDoc Studio.</p>

          {error ? <div className='mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>{error}</div> : null}

          <form
            className='mt-4 space-y-4'
            onSubmit={(event) => {
              event.preventDefault();
              handleRegister();
            }}
          >
            <div>
              <label className='mb-1 block text-xs font-semibold text-slate-600'>Nombre</label>
              <input
                ref={(node) => node?.focus()}
                type='text'
                value={name}
                disabled={loading}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
                placeholder='Ing. Juan Perez'
              />
            </div>

            <div>
              <label className='mb-1 block text-xs font-semibold text-slate-600'>Email</label>
              <input
                type='email'
                value={email}
                disabled={loading}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                placeholder='usuario@ejemplo.com'
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
                  placeholder='Minimo 12 caracteres'
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

            <button
              type='submit'
              disabled={loading}
              className='flex w-full items-center justify-center gap-2 rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:border-sky-800 hover:bg-sky-800'
            >
              {loading ? <span className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' /> : null}
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>

            <p className='text-center text-sm text-slate-500'>
              Ya tienes cuenta?{' '}
              <Link to='/' className='font-medium text-sky-700 hover:text-sky-900'>Inicia sesion</Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Register;
