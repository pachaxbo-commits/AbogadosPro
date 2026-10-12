import { useState } from 'react';
import { ArrowLeft, LockKeyhole, Scale, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOffice } from '../../context/OfficeContext';
import { DEMO_OFFICE_PASSWORD } from '../../services/demoOffice';
import type { OfficeUser } from '../../services/internalAuth';

function UserPortrait({ user, selected = false }: { user: OfficeUser; selected?: boolean }) {
  const initials = user.displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 bg-brand-800 text-white shadow-xl transition-all duration-200 ${selected ? 'h-32 w-32 border-amber-400 text-4xl shadow-amber-500/20' : 'h-24 w-24 border-slate-200 text-3xl group-hover:scale-105 group-hover:border-amber-400'}`}>
    {user.photoUrl ? <img src={user.photoUrl} alt={`Foto de ${user.displayName}`} className="h-full w-full object-cover" /> : initials || <UserRound className="h-10 w-10" />}
  </span>;
}

export function OfficeEntry() {
  const { userProfile, logout, exitDemoMode, isDemo } = useAuth();
  const { state, error: loadError, users, bootstrap, select, refresh } = useOffice();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const current = users.find(item => item.id === selected && item.active);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (state === 'setup') await bootstrap(password);
      else if (current) await select(current.id, password);
      setPassword('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo abrir el perfil.'); }
    finally { setBusy(false); }
  };
  const close = () => { if (isDemo) { exitDemoMode(); navigate('/'); } else void logout(); };
  return <main className="relative flex min-h-screen flex-col overflow-hidden bg-slate-50 text-brand-950">
    {isDemo && <div className="relative z-10 bg-amber-400 px-4 py-2 text-center text-xs font-bold text-brand-950">Modo Demostración Activo · Perfiles ficticios · Sin cambios en Firebase</div>}
    <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 15% 25%, rgba(241,185,52,.15), transparent 32%), radial-gradient(circle at 85% 75%, rgba(20,65,105,.12), transparent 38%), linear-gradient(135deg,#f7f9fc,#e9eff6)' }} />
    <header className="relative z-10 flex items-center justify-between gap-4 bg-brand-900 px-5 py-6 text-white shadow-sm sm:px-10">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/30 bg-white/10 text-amber-400"><Scale className="h-6 w-6" /></span><div><p className="font-serif text-xl font-bold">Abogados<span className="text-amber-400">Pro</span></p><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Gestión jurídica</p></div></div>
      <button type="button" onClick={close} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-3 text-xs font-semibold text-slate-200 hover:bg-white/10"><X className="h-4 w-4" />{isDemo ? 'Salir de la demo' : 'Cerrar sesión del estudio'}</button>
    </header>
    <div className="relative z-10 mx-auto my-auto flex w-[calc(100%-2rem)] max-w-5xl min-h-[540px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/90 px-5 py-10 text-center shadow-xl shadow-brand-900/10 sm:my-12 sm:px-10">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl bg-amber-400" />
      {state === 'loading' && <p>Cargando perfiles…</p>}
      {state === 'error' && <div role="alert" className="space-y-4"><p className="text-rose-700">{loadError}</p><button type="button" onClick={() => void refresh()} className="rounded-lg border border-slate-300 px-5 py-2">Reintentar</button></div>}
      {state === 'setup' && <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-7 text-left shadow-sm">
        <h1 className="font-serif text-2xl font-bold">Configurar Admin del estudio</h1>
        <p className="mt-2 text-sm text-slate-600">Crea su contraseña personal. La cuenta y contraseña principal del estudio permanecen iguales.</p>
        <form onSubmit={event => void submit(event)} className="mt-6 space-y-4">
          <label className="block text-sm">Contraseña personal<input required minLength={10} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-brand-950" /></label>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-brand-950 disabled:opacity-50">{busy ? 'Guardando…' : 'Crear perfil Admin'}</button>
        </form>
      </div>}
      {state === 'select' && <>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">Estudio jurídico</p>
        <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">{current ? 'Ingresa a tu perfil' : '¿Quién va a trabajar hoy?'}</h1>
        <p className="mt-3 text-sm text-slate-600">{isDemo ? 'Estudio de demostración' : userProfile?.studioName || userProfile?.displayName}</p>
        {!current ? <div className="mt-12 flex max-w-4xl flex-wrap items-start justify-center gap-7 sm:gap-10">
          {users.filter(item => item.active).map(item => <button key={item.id} type="button" onClick={() => { setSelected(item.id); setPassword(''); setError(''); }} className="group flex w-32 flex-col items-center gap-3 rounded-xl border border-transparent bg-slate-50/70 p-2 transition-colors hover:border-slate-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
            <UserPortrait user={item} />
            <span className="max-w-full break-words text-center text-sm font-semibold">{item.displayName}</span>
            <span className="text-xs capitalize text-slate-600">{item.isOfficeAdmin ? 'Admin · Abogado' : item.role}</span>
          </button>)}
          {!users.some(item => item.active) && <p className="text-slate-600">No hay perfiles activos.</p>}
        </div> : <div className="mt-9 flex w-full max-w-sm flex-col items-center">
          <UserPortrait user={current} selected />
          <h2 className="mt-5 font-serif text-2xl font-bold">{current.displayName}</h2>
          <p className="mt-1 text-sm capitalize text-amber-700">{current.isOfficeAdmin ? 'Admin · Abogado' : current.role}</p>
          <form onSubmit={event => void submit(event)} className="mt-7 w-full space-y-4">
            <label className="block text-left text-sm font-medium text-slate-700">Contraseña personal
              <span className="relative mt-2 block"><LockKeyhole className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input autoFocus required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-brand-950 outline-none focus:border-amber-400" /></span>
            </label>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <button disabled={busy} className="w-full rounded-lg bg-amber-400 px-5 py-3 font-bold text-brand-950 hover:bg-amber-300 disabled:opacity-50">{busy ? 'Comprobando…' : 'Entrar a AbogadosPro'}</button>
          </form>
          <button type="button" onClick={() => { setSelected(''); setPassword(''); setError(''); }} className="mt-5 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-900"><ArrowLeft className="h-4 w-4" />Elegir otro usuario</button>
        </div>}
        {isDemo && <p className="mt-10 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">Contraseña inicial de prueba: <strong>{DEMO_OFFICE_PASSWORD}</strong> · Los perfiles se reinician al recargar.</p>}
      </>}
    </div>
  </main>;
}
