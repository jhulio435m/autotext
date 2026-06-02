import { Link } from 'react-router-dom';
import { useState } from 'react';
import { apiForgotPassword } from '../../api/client';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setDevToken('');
    setLoading(true);
    try {
      const payload = await apiForgotPassword({ email });
      setMessage(payload?.message || 'Si el email existe, recibiras instrucciones para restablecer la contrasena.');
      if (payload?.resetToken) setDevToken(payload.resetToken);
    } catch (err) {
      setError(err?.message || 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className='flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900'>
      <form onSubmit={handleSubmit} className='w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm'>
        <h1 className='text-xl font-bold'>Recuperar contrasena</h1>
        <p className='mt-1 text-sm text-slate-500'>Ingresa tu email corporativo para iniciar el restablecimiento.</p>
        <label className='mt-5 block text-sm font-medium text-slate-700'>Email</label>
        <input autoFocus type='email' value={email} disabled={loading} onChange={(event) => setEmail(event.target.value)} className='mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500' />
        {message ? <p className='mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>{message}</p> : null}
        {devToken ? <p className='mt-3 break-all rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'>Token dev: {devToken}</p> : null}
        {error ? <p className='mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>{error}</p> : null}
        <button type='submit' disabled={loading || !email.trim()} className='mt-5 w-full rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:bg-slate-300'>
          {loading ? 'Enviando...' : 'Enviar instrucciones'}
        </button>
        <Link to='/' className='mt-4 block text-center text-sm font-medium text-slate-600 hover:text-slate-900'>Volver al login</Link>
      </form>
    </main>
  );
}

export default ForgotPassword;
