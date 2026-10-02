import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { Evento } from '../../types';
export function EventMenu({ evento, onEdit }: { evento: Evento; onEdit?: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('click', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('click', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);
  return (
    <div ref={menuRef} className="relative z-20">
      <button
        ref={menuButtonRef}
        type="button"
        aria-label={`Acciones para ${evento.titulo}`}
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((open) => !open)}
        className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-brand-900"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {isMenuOpen && (
        <div className="absolute right-0 z-30 mt-1 min-w-60 rounded-md border border-slate-200 bg-white py-1 shadow-sm">
          {onEdit && <button type="button" onClick={() => { setIsMenuOpen(false); onEdit?.(); }} className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-brand-50">
            Editar
          </button>}
        </div>
      )}
    </div>
  );
}
