import { useOffice } from '../../context/OfficeContext';
import type { OfficeRole } from '../../services/internalAuth';

export function OfficeAssignmentSelect({ id, value, onChange, role, className }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  role?: OfficeRole;
  className?: string;
}) {
  const { users } = useOffice();
  return <select id={id} value={value} onChange={event => onChange(event.target.value)} className={className}>
    <option value="">Sin asignar</option>
    {users.filter(item => (item.active || item.id === value) && (!role || item.role === role))
      .map(item => <option key={item.id} value={item.id}>{item.displayName}{item.active ? '' : ' (inactivo)'}</option>)}
  </select>;
}
