import { useProfile } from '../../context/ProfileContext';

interface AssigneeSelectProps {
  id?: string;
  value: string;
  onChange: (id: string) => void;
  className: string;
}

export function AssigneeSelect({ id, value, onChange, className }: AssigneeSelectProps) {
  const { assignees } = useProfile();
  const options = assignees.filter((item) => item.estado === 'Activo' || item.id === value);
  return <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={className}>
    <option value="">Sin encargado</option>
    {options.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.estado === 'Inactivo' ? ' (inactivo)' : ''}</option>)}
    {value && !assignees.some((item) => item.id === value) && <option value={value}>Encargado no disponible</option>}
  </select>;
}
