export interface Assignee {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  estado: 'Activo' | 'Inactivo';
  fechaCreacion: string;
}

export type AssigneeInput = Pick<Assignee, 'nombre' | 'telefono' | 'correo' | 'estado'>;
