import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import { PHONE_COUNTRIES, splitPhone, joinPhone, type PhoneParts } from '../../services/phone';

export function PhoneInput({ id, value, onChange, disabled = false }: {
  id: string; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const [parts, setParts] = useState(() => splitPhone(value));
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const options = [...PHONE_COUNTRIES, ['', 'Otro (internacional)']] as const;
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const update = (next: PhoneParts) => { setParts(next); onChange(joinPhone(next)); };
  const field = 'min-w-0 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-brand-900';
  return <div className="mt-1">
    <div className="flex gap-2">
      <div ref={root} className="relative w-[42%] min-w-[100px] shrink-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
        <button ref={trigger} type="button" aria-label={`Código de país: ${options.find(([code]) => code === parts.code)?.[1]}${parts.code ? ` (+${parts.code})` : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} disabled={disabled} className={`${field} flex w-full items-center justify-between gap-1`} onClick={() => setOpen(!open)} onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); } }}>
          {parts.code && <CountryFlag code={parts.code} />}<span>{parts.code ? `+${parts.code}` : 'Otro'}</span><ChevronDown className="h-3 w-3 shrink-0" />
        </button>
        {open && <div id={listId} role="listbox" aria-label="Código de país" className="absolute left-0 top-full z-50 mt-1 max-h-52 w-64 max-w-[75vw] overflow-y-auto rounded-md border border-slate-300 bg-white p-1 shadow-sm" onKeyDown={event => {
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
          const current = items.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (current + 1) % items.length : event.key === 'ArrowUp' ? (current - 1 + items.length) % items.length : -1;
          if (next >= 0) { event.preventDefault(); items[next].focus(); }
        }}>{options.map(([code, country]) => <button key={code} role="option" aria-selected={parts.code === code} tabIndex={parts.code === code ? 0 : -1} type="button" className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-slate-700 hover:bg-brand-50" onClick={() => {
          update({ code, number: code === '' ? joinPhone(parts) : (parts.code ? parts.number : splitPhone(parts.number).number).replace(/^\+/, '') }); setOpen(false); trigger.current?.focus();
        }}>{code && <CountryFlag code={code} />}<span>{country}{code && ` (+${code})`}</span></button>)}</div>}
      </div>
      <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" disabled={disabled} value={parts.number} maxLength={30} pattern={String.raw`[0-9\s\(\)\+\-]*`} title="Usa números, espacios, paréntesis o guiones." placeholder={parts.code ? 'Número local' : '+ código y número'} className={`${field} flex-1 w-0`} onChange={event => {
        const number = event.target.value;
        update(/^\s*(\+|00)/.test(number) ? splitPhone(number) : { ...parts, number });
      }} />
    </div>
    {!parts.code && <p className="mt-1 text-xs text-slate-500">Escribe el número completo con su código internacional.</p>}
  </div>;
}

