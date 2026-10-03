import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../../context/ProfileContext';
import { ProfileAvatar } from './ProfileAvatar';
export function ProfileMenu() {
  const { profile, photoUrl } = useProfile();
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
  return <div className="relative" ref={root}>
    <button ref={button} type="button" aria-label="Menú de perfil" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><ProfileAvatar name={profile?.nombre} url={photoUrl} /></button>
    {open && <div id={id} className="absolute right-0 z-50 mt-2 w-40 rounded-md border border-slate-200 bg-white py-1 text-sm text-slate-800 shadow-sm"><Link to="/mi-perfil" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-brand-50">Mi perfil</Link><Link to="/configuracion" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-brand-50">Configuración</Link><Link to="/importar-datos" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-brand-50">Importar datos</Link></div>}
  </div>;
}
