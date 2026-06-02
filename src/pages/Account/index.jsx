import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, KeyRound, Save, ShieldCheck, UserRound, XCircle } from 'lucide-react';
import { apiChangePassword, apiGetCurrentUser, apiListSessions, apiRevokeOtherSessions, apiRevokeSession, apiUpdateCurrentUser } from '../../api/client';
import useDocumentStore from '../../store';
import { createSuggestedPassword, getPasswordStrength } from '../../utils/passwordStrength';

function Account() {
  const currentUser = useDocumentStore((state) => state.currentUser);
  const setCurrentUser = useDocumentStore((state) => state.setCurrentUser);
  const pushToast = useDocumentStore((state) => state.pushToast);
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sessionsError, setSessionsError] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [avatarData, setAvatarData] = useState(null);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const fileInputRef = useRef(null);



  async function refreshSessions() {
    setSessionsLoading(true);
    setSessionsError('');
    try {
      const payload = await apiListSessions();
      setSessions(Array.isArray(payload?.sessions) ? payload.sessions : []);
    } catch (error) {
      setSessionsError(error?.message || 'No se pudieron cargar las sesiones.');
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const payload = await apiGetCurrentUser();
        if (cancelled || !payload?.user) return;
        setCurrentUser(payload.user);
        setProfileName(payload.user.name || '');
      } catch (error) {
        if (!cancelled) {
          setProfileError(error?.message || 'No se pudo cargar la cuenta.');
        }
      }
    }

    loadCurrentUser();
    refreshSessions();
    return () => {
      cancelled = true;
    };
  }, [setCurrentUser]);

  const profileChanged = useMemo(() => {
    return profileName.trim().replace(/\s+/g, ' ') !== String(currentUser?.name || '').trim().replace(/\s+/g, ' ');
  }, [currentUser?.name, profileName]);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      setProfileError('La imagen no debe superar los 500 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarData(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarData('');
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError('');
    setProfileLoading(true);

    try {
      const body = { name: profileName };
      if (avatarData !== null) {
        body.avatar = avatarData;
      }
      const payload = await apiUpdateCurrentUser(body);
      if (payload?.user) {
        setCurrentUser(payload.user);
        setProfileName(payload.user.name || '');
      }
      setAvatarData(null);
      pushToast('Perfil actualizado.', 'success');
    } catch (error) {
      setProfileError(error?.message || 'No se pudo actualizar el perfil.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError('');

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('La confirmacion no coincide con la nueva contrasena.');
      return;
    }

    setPasswordLoading(true);
    try {
      const payload = await apiChangePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      if (payload?.user) {
        setCurrentUser(payload.user);
      }
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      pushToast('Contrasena actualizada.', 'success');
      refreshSessions();
    } catch (error) {
      setPasswordError(error?.message || 'No se pudo cambiar la contrasena.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const strength = getPasswordStrength(passwords.newPassword);

  const handleSuggestPassword = () => {
    const suggested = createSuggestedPassword();
    setPasswords((state) => ({ ...state, newPassword: suggested, confirmPassword: suggested }));
  };

  const handleRevokeSession = async (sessionId) => {
    await apiRevokeSession(sessionId);
    await refreshSessions();
    pushToast('Sesion cerrada.', 'success');
  };

  const handleRevokeOthers = async () => {
    await apiRevokeOtherSessions();
    await refreshSessions();
    pushToast('Otras sesiones cerradas.', 'success');
  };

  return (
    <div className='mx-auto flex max-w-5xl flex-col gap-4'>
      <section className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 text-slate-900'>
              <UserRound className='h-5 w-5 text-slate-500' />
              <h1 className='text-lg font-semibold'>Cuenta</h1>
            </div>
            <p className='mt-1 text-sm text-slate-500'>Administra los datos visibles de tu usuario y la contrasena de acceso.</p>
          </div>
          <div className='rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm'>
            <p className='font-semibold text-slate-900'>{currentUser?.email || 'Email no disponible'}</p>
            <p className='mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-slate-500'>{currentUser?.role || 'Usuario'}</p>
          </div>
        </div>
      </section>

      <div className='grid gap-4 lg:grid-cols-[1fr_1fr]'>
        <form onSubmit={handleProfileSubmit} className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='mb-4'>
            <h2 className='text-base font-semibold text-slate-900'>Perfil</h2>
            <p className='mt-1 text-sm text-slate-500'>Este nombre aparece en la sesion y en el menu de usuario.</p>
          </div>

          <div className='mb-4 flex items-center gap-3'>
            <div className='relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100'>
              {avatarData || currentUser?.avatar ? (
                <img src={avatarData || currentUser.avatar} alt="" className='h-full w-full object-cover' />
              ) : (
                <div className='flex h-full w-full items-center justify-center text-lg font-bold text-slate-500'>
                  {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <button type='button' onClick={() => fileInputRef.current?.click()} className='inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
                <Camera className='h-4 w-4' />
                {currentUser?.avatar ? 'Cambiar foto' : 'Subir foto'}
              </button>
              <input ref={fileInputRef} type='file' accept='image/png,image/jpeg,image/webp' onChange={handleAvatarChange} className='hidden' />
              {avatarData ? <p className='mt-1 text-xs text-slate-500'>Nueva foto lista para guardar.</p> : null}
              {currentUser?.avatar && avatarData === null ? <button type='button' onClick={handleRemoveAvatar} className='mt-1 block text-xs font-semibold text-rose-600 hover:text-rose-800'>Eliminar foto</button> : null}
            </div>
          </div>

          <label className='block text-sm font-medium text-slate-700' htmlFor='account-name'>
            Nombre visible
          </label>
          <input
            id='account-name'
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            maxLength={120}
            className='mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
            autoComplete='name'
          />

          {profileError ? <p className='mt-3 text-sm text-rose-600'>{profileError}</p> : null}

          <button
            type='submit'
            disabled={profileLoading || !profileChanged}
            className='mt-5 inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300'
          >
            <Save className='h-4 w-4' />
            {profileLoading ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='mb-4'>
            <div className='flex items-center gap-2'>
              <KeyRound className='h-5 w-5 text-slate-500' />
              <h2 className='text-base font-semibold text-slate-900'>Contrasena</h2>
            </div>
            <p className='mt-1 text-sm text-slate-500'>El cambio revoca otras sesiones activas y conserva esta sesion.</p>
          </div>

          <div className='space-y-3'>
            <label className='block text-sm font-medium text-slate-700' htmlFor='current-password'>
              Contrasena actual
              <input
                id='current-password'
                type='password'
                value={passwords.currentPassword}
                onChange={(event) => setPasswords((state) => ({ ...state, currentPassword: event.target.value }))}
                className='mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                autoComplete='current-password'
              />
            </label>

            <label className='block text-sm font-medium text-slate-700' htmlFor='new-password'>
              Nueva contrasena
              <input
                id='new-password'
                type='password'
                value={passwords.newPassword}
                onChange={(event) => setPasswords((state) => ({ ...state, newPassword: event.target.value }))}
                className='mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                autoComplete='new-password'
              />
              <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100'><div className={`${strength.tone === 'emerald' ? 'bg-emerald-500' : strength.tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'} h-full`} style={{ width: `${strength.percent}%` }} /></div>
              <div className='mt-1 flex items-center justify-between gap-2 text-xs text-slate-500'><span>Fortaleza: {strength.label}</span><button type='button' onClick={handleSuggestPassword} className='font-semibold text-sky-700 hover:text-sky-900'>Sugerir segura</button></div>
            </label>

            <label className='block text-sm font-medium text-slate-700' htmlFor='confirm-password'>
              Confirmar nueva contrasena
              <input
                id='confirm-password'
                type='password'
                value={passwords.confirmPassword}
                onChange={(event) => setPasswords((state) => ({ ...state, confirmPassword: event.target.value }))}
                className='mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                autoComplete='new-password'
              />
            </label>
          </div>

          {passwordError ? <p className='mt-3 text-sm text-rose-600'>{passwordError}</p> : null}

          <button
            type='submit'
            disabled={passwordLoading || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
            className='mt-5 inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300'
          >
            <KeyRound className='h-4 w-4' />
            {passwordLoading ? 'Cambiando...' : 'Cambiar contrasena'}
          </button>
        </form>
      </div>

      <section className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-center gap-2'>
            <ShieldCheck className='h-5 w-5 text-slate-500' />
            <div>
              <h2 className='text-base font-semibold text-slate-900'>Sesiones activas</h2>
              <p className='text-sm text-slate-500'>Dispositivos con acceso vigente a tu cuenta.</p>
            </div>
          </div>
          <button type='button' onClick={handleRevokeOthers} disabled={sessionsLoading || sessions.filter((item) => !item.current).length === 0} className='rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'>Cerrar todas las demas</button>
        </div>
        {sessionsError ? <p className='mb-3 text-sm text-rose-600'>{sessionsError}</p> : null}
        <div className='divide-y divide-slate-100 rounded-md border border-slate-200'>
          {sessionsLoading && !sessions.length ? <p className='p-3 text-sm text-slate-500'>Cargando sesiones...</p> : null}
          {!sessionsLoading && !sessions.length ? <p className='p-3 text-sm text-slate-500'>No hay sesiones activas para mostrar.</p> : null}
          {sessions.map((session) => (
            <div key={session.id} className='flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between'>
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold text-slate-900'>{session.current ? 'Sesion actual' : 'Sesion remota'} · {session.ipAddress || 'IP no disponible'}</p>
                <p className='mt-1 truncate text-xs text-slate-500'>{session.userAgent || 'User-Agent no disponible'}</p>
                <p className='mt-1 text-xs text-slate-400'>Ultima actividad: {session.lastSeenAt ? new Date(session.lastSeenAt).toLocaleString('es-PE') : 'sin dato'}</p>
              </div>
              <button type='button' onClick={() => handleRevokeSession(session.id)} disabled={session.current} className='inline-flex items-center justify-center gap-2 rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40'>
                <XCircle className='h-4 w-4' />
                Cerrar
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Account;
