import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { apiResetPassword } from '../../api/client';
import { createSuggestedPassword, getPasswordStrength } from '../../utils/passwordStrength';

function StrengthMeter({ value }) {
  const strength = getPasswordStrength(value);
  const color = strength.tone === 'emerald' ? 'bg-emerald-500' : strength.tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className='mt-2'>
      <div className='h-1.5 overflow-hidden rounded-full bg-slate-100'><div className={`h-full ${color}`} style={{ width: `${strength.percent}%` }} /></div>
      <p className='mt-1 text-xs text-slate-500'>Fortaleza: {strength.label}</p>
    </div>
  );
}

function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mismatch = useMemo(() => confirm && password !== confirm, [confirm, password]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('La confirmacion no coincide con la nueva contrasena.');
      return;
    }
    setLoading(true);
    try {
      await apiResetPassword({ token, newPassword: password });
      navigate('/', { replace: true, state: { message: 'Contrasena restablecida. Ingresa con tu nueva clave.' } });
    } catch (err) {
      setError(err?.message || 'No se pudo restablecer la contrasena.');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = () => setPassword(createSuggestedPassword());

  return (
    <main className='flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900'>
      <form onSubmit={handleSubmit} className='w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm'>
        <h1 className='text-xl font-bold'>Nueva contrasena</h1>
        <p className='mt-1 text-sm text-slate-500'>Define una clave robusta para recuperar el acceso.</p>
        <label className='mt-5 block text-sm font-medium text-slate-700'>Nueva contrasena</label>
        <input autoFocus type='password' value={password} disabled={loading} onChange={(event) => setPassword(event.target.value)} className='mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500' />
        <StrengthMeter value={password} />
        <button type='button' onClick={applySuggestion} className='mt-2 text-xs font-semibold text-sky-700 hover:text-sky-900'>Sugerir contrasena segura</button>
        <label className='mt-4 block text-sm font-medium text-slate-700'>Confirmar contrasena</label>
        <input type='password' value={confirm} disabled={loading} onChange={(event) => setConfirm(event.target.value)} className='mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500' />
        {mismatch ? <p className='mt-2 text-sm text-rose-600'>La confirmacion no coincide.</p> : null}
        {error ? <p className='mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>{error}</p> : null}
        <button type='submit' disabled={loading || !token || !password || !confirm || mismatch} className='mt-5 w-full rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:bg-slate-300'>
          {loading ? 'Guardando...' : 'Restablecer contrasena'}
        </button>
        <Link to='/' className='mt-4 block text-center text-sm font-medium text-slate-600 hover:text-slate-900'>Volver al login</Link>
      </form>
    </main>
  );
}

export default ResetPassword;
