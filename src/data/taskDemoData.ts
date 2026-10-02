import type { Tarea } from '../types';
import { taskToday } from '../services/tasks';

export function getInitialTasks(caseIds: readonly string[], now = new Date()): Tarea[] {
  const relative = (days: number) => taskToday(new Date(now.getTime() + days * 86_400_000));
  const stamp = now.toISOString();
  const tasks: Tarea[] = [
    { id: 'task-demo-1', casoId: 'cas-1', titulo: 'Revisar pruebas documentales', fechaLimite: relative(-3), prioridad: 'Alta', estado: 'Pendiente', createdAt: stamp, updatedAt: stamp },
    { id: 'task-demo-2', casoId: 'cas-3', titulo: 'Preparar memorial', fechaLimite: relative(0), prioridad: 'Alta', estado: 'Pendiente', createdAt: stamp, updatedAt: stamp },
    { id: 'task-demo-3', casoId: 'cas-5', titulo: 'Llamar al cliente', fechaLimite: relative(2), horaLimite: '15:30', prioridad: 'Media', estado: 'Pendiente', createdAt: stamp, updatedAt: stamp },
    { id: 'task-demo-4', casoId: 'cas-1', titulo: 'Reunir documentación del caso', fechaLimite: relative(-1), prioridad: 'Normal', estado: 'Completada', createdAt: stamp, updatedAt: stamp, completedAt: stamp },
  ];
  return tasks.filter((task) => caseIds.includes(task.casoId));
}
