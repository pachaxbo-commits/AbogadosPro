import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProfile } from '../../context/ProfileContext';
import { ProfileAvatar } from './ProfileAvatar';
import { useOffice } from '../../context/OfficeContext';
import { useAuth } from '../../context/AuthContext';

export function ProfileMenu() {
  const { profile, photoUrl } = useProfile();
  const { state, user, switchUser } = useOffice();
  const { logout, exitDemoMode, isDemo } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('click', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('click', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const closeStudio = () => {
    setOpen(false);
    if (isDemo) { exitDemoMode(); navigate('/'); }
    else void logout();
  };
  return <div className="relative" ref={root}>
    <button ref={button} type="button" aria-label="Menú de perfil" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
      <ProfileAvatar name={user?.displayName || profile?.nombre} url={user ? user.photoUrl : photoUrl} />
    </button>
    {open && <div id={id} className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-slate-200 bg-white py-1 text-sm text-slate-800 shadow-sm">
      {user && <p className="border-b border-slate-100 px-4 py-2 text-xs font-semibold text-brand-900">{user.displayName} · {user.isOfficeAdmin ? 'Admin' : user.role}</p>}
      <Link to="/mi-perfil" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-brand-50">Mi perfil</Link>
      {user?.role !== 'asistente' && <>

        <Link to="/configuracion" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-brand-50">Configuración</Link>
        <Link to="/importar-datos" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-brand-50">Importar datos</Link>
      </>}
      {state === 'active' && <>
        {user?.isOfficeAdmin && <Link to="/usuarios-estudio" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-brand-50">Usuarios del estudio</Link>}
        <button type="button" onClick={() => { setOpen(false); void switchUser(); }} className="block w-full px-4 py-3 text-left hover:bg-brand-50">Cambiar usuario</button>
        <button type="button" onClick={() => { setOpen(false); void switchUser(); }} className="block w-full px-4 py-3 text-left hover:bg-brand-50">Bloquear sesión</button>
        <button type="button" onClick={closeStudio} className="block w-full px-4 py-3 text-left hover:bg-brand-50">{isDemo ? 'Cerrar sesión de demo' : 'Cerrar sesión del estudio'}</button>
      </>}
    </div>}
  </div>;
}
