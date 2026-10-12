import { useOffice } from '../../context/OfficeContext';
import type { OfficeRole } from '../../services/internalAuth';

export function OfficePeoplePicker({ value, onChange, role, label, excludeCurrent = false }: {
  value: string[];
  onChange: (value: string[]) => void;
  role: OfficeRole;
  label: string;
  excludeCurrent?: boolean;
}) {
  const { users, user } = useOffice();
  const available = users.filter(item => (item.role === role && item.active || value.includes(item.id)) && (!excludeCurrent || item.id !== user?.id));
  return <fieldset className="rounded-md border border-slate-200 p-3">
    <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-700">{label}</legend>
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {available.length ? available.map(item => <label key={item.id} className="inline-flex min-h-9 items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={value.includes(item.id)} disabled={!item.active && !value.includes(item.id)} onChange={event => onChange(event.target.checked ? [...value, item.id] : value.filter(id => id !== item.id))} className="accent-brand-900" />
        {item.displayName}{!item.active ? ' (inactivo)' : item.role !== role ? ' (rol cambiado)' : ''}
      </label>) : <span className="text-xs text-slate-500">No hay usuarios disponibles.</span>}
    </div>
  </fieldset>;
}
