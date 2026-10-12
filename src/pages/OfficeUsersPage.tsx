import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useOffice } from '../context/OfficeContext';
import type { OfficeRole } from '../services/internalAuth';

export function OfficeUsersPage() {
  const { user, users, create, update, reset } = useOffice();
  const { currentUser, isDemo, changePassword: changeStudioPassword } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState<OfficeRole>('abogado');
  const [password, setPassword] = useState('');


  const [studioOldPassword, setStudioOldPassword] = useState('');
  const [studioNewPassword, setStudioNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const run = async (work: () => Promise<void>, success: string) => {
    setError(''); setMessage('');
    try { await work(); setMessage(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo completar la operación.'); }
  };
  return <div className="space-y-6">
    <header><h1 className="font-serif text-2xl font-bold text-brand-950">Usuarios del estudio</h1><p className="text-sm text-slate-600">{isDemo ? 'Prueba local: los perfiles y las contraseñas cambian solo en memoria.' : 'Perfiles personales de este workspace.'}</p></header>
    {error && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-rose-800">{error}</p>}
    {message && <p role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">{message}</p>}
    {user?.isOfficeAdmin && !isDemo && <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-brand-950">Contraseña principal del estudio</h2>
      <p className="mt-1 text-sm text-slate-600">Se requiere la contraseña actual de la cuenta del estudio.</p>
      <form onSubmit={event => { event.preventDefault(); void run(async () => {
        if (!currentUser?.email) throw new Error('No hay sesión del estudio.');
        await reauthenticateWithCredential(currentUser, EmailAuthProvider.credential(currentUser.email, studioOldPassword));
        await changeStudioPassword(studioNewPassword);
        setStudioOldPassword(''); setStudioNewPassword('');
      }, 'Contraseña principal actualizada.'); }} className="mt-3 flex flex-wrap gap-3">
        <input aria-label="Contraseña principal actual" required type="password" autoComplete="current-password" value={studioOldPassword} onChange={event => setStudioOldPassword(event.target.value)} placeholder="Contraseña actual del estudio" className="min-h-11 flex-1 rounded border border-slate-300 px-3" />
        <input aria-label="Nueva contraseña principal" required minLength={10} type="password" autoComplete="new-password" value={studioNewPassword} onChange={event => setStudioNewPassword(event.target.value)} placeholder="Nueva contraseña del estudio" className="min-h-11 flex-1 rounded border border-slate-300 px-3" />
        <button className="rounded bg-brand-900 px-4 py-2 font-semibold text-white">Cambiar contraseña principal</button>
      </form>
    </section>}
    {user?.isOfficeAdmin && <>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-brand-950">Nuevo usuario</h2>
        <form onSubmit={event => { event.preventDefault(); void run(async () => { await create(name, role, password); setName(''); setPassword(''); }, 'Usuario creado.'); }} className="mt-3 flex flex-wrap gap-3">
          <input aria-label="Nombre de usuario" required minLength={2} value={name} onChange={event => setName(event.target.value)} placeholder="Nombre completo" className="min-h-11 flex-1 rounded border border-slate-300 px-3" />
          <select aria-label="Rol" value={role} onChange={event => setRole(event.target.value as OfficeRole)} className="min-h-11 rounded border border-slate-300 px-3"><option value="abogado">Abogado</option><option value="asistente">Asistente</option></select>
          <input aria-label="Contraseña inicial" required minLength={10} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Contraseña inicial" className="min-h-11 flex-1 rounded border border-slate-300 px-3" />
          <button className="rounded bg-brand-900 px-4 py-2 font-semibold text-white">Crear usuario</button>
        </form>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-brand-950">Perfiles</h2>
        <div className="mt-3 divide-y divide-slate-100">{users.map(item => <div key={item.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
          <span className="min-w-40 flex-1 font-semibold">{item.displayName}{item.isOfficeAdmin ? ' · Admin' : ''}</span>

          <button type="button" disabled={item.id === user.id} onClick={() => void run(() => update(item.id, { active: !item.active }), 'Estado actualizado.')} className="rounded border px-3 py-2 disabled:opacity-50">{item.active ? 'Desactivar' : 'Activar'}</button>
          <button type="button" onClick={() => { const value = window.prompt(`Nueva contraseña de ${item.displayName} (mínimo 10 caracteres)`); if (value) void run(() => reset(item.id, value), 'Contraseña restablecida.'); }} className="rounded border px-3 py-2">Restablecer contraseña</button>
        </div>)}</div>
      </section>
    </>}
  </div>;
}
