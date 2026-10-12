import { useState } from 'react';
import { useOffice } from '../context/OfficeContext';
import { ProfilePage } from './ProfilePage';

export function InternalProfilePage() {
  const { changePassword } = useOffice();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return <div className="space-y-6">
    <ProfilePage />
    <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-brand-900">Seguridad · contraseña personal</h2>
      <p className="mt-1 text-sm text-slate-600">Esta contraseña pertenece únicamente a tu usuario interno.</p>
      {error && <p role="alert" className="mt-3 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {message && <p role="status" className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <form onSubmit={async event => {
        event.preventDefault(); setBusy(true); setError(''); setMessage('');
        try { await changePassword(oldPassword, newPassword); setOldPassword(''); setNewPassword(''); setMessage('Contraseña personal actualizada.'); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cambiar la contraseña.'); }
        finally { setBusy(false); }
      }} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Contraseña actual<input required type="password" autoComplete="current-password" value={oldPassword} onChange={event => setOldPassword(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label>
        <label className="text-sm font-medium text-slate-700">Nueva contraseña<input required minLength={10} type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label>
        <div className="sm:col-span-2"><button disabled={busy} className="rounded-md bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Guardando…' : 'Cambiar contraseña'}</button></div>
      </form>
    </section>
  </div>;
}
