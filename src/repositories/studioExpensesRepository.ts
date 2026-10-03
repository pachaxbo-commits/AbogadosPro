import { validTaskDate } from '../services/tasks';
import { STUDIO_EXPENSE_CATEGORIES, type StudioExpense, type StudioExpenseInput } from '../types/studioExpense';

const storageKey = (workspaceId: string) => `abogadospro_studio_expenses_v1:${encodeURIComponent(workspaceId)}`;

function validate(data: StudioExpenseInput): StudioExpenseInput {
  const concepto = data.concepto.trim();
  const nota = data.nota?.trim() || undefined;
  if (!concepto) throw new Error('Escribe el concepto del gasto.');
  if (concepto.length > 160) throw new Error('El concepto no puede superar 160 caracteres.');
  if (!STUDIO_EXPENSE_CATEGORIES.includes(data.categoria)) throw new Error('Selecciona una categoría válida.');
  if (!Number.isFinite(data.monto) || data.monto <= 0) throw new Error('Ingresa un monto mayor a cero.');
  if (!validTaskDate(data.fecha)) throw new Error('Ingresa una fecha válida.');
  if (nota && nota.length > 2000) throw new Error('La nota no puede superar 2000 caracteres.');
  return { concepto, categoria: data.categoria, monto: data.monto, fecha: data.fecha, nota };
}

function read(workspaceId: string): StudioExpense[] {
  let raw: string | null;
  try { raw = localStorage.getItem(storageKey(workspaceId)); }
  catch { throw new Error('No se pudieron leer los gastos generales de este navegador.'); }
  if (raw === null) return [];
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new Error('Los gastos generales guardados no se pudieron leer. Los datos locales se conservaron.'); }
  if (!Array.isArray(value) || !value.every((item) => item && typeof item === 'object' &&
    typeof item.id === 'string' && typeof item.concepto === 'string' &&
    STUDIO_EXPENSE_CATEGORIES.includes(item.categoria) &&
    typeof item.monto === 'number' && Number.isFinite(item.monto) && item.monto > 0 &&
    typeof item.fecha === 'string' && validTaskDate(item.fecha) &&
    (item.nota === undefined || typeof item.nota === 'string') &&
    typeof item.createdAt === 'string' && typeof item.updatedAt === 'string'
  )) throw new Error('Los gastos generales guardados tienen un formato inválido. Los datos locales se conservaron.');
  return value as StudioExpense[];
}

function write(workspaceId: string, items: StudioExpense[]): StudioExpense[] {
  try { localStorage.setItem(storageKey(workspaceId), JSON.stringify(items)); }
  catch { throw new Error('No se pudieron guardar los gastos generales en este navegador.'); }
  return items;
}

export const studioExpensesRepository = {
  list: read,
  add(workspaceId: string, data: StudioExpenseInput): StudioExpense[] {
    const stamp = new Date().toISOString();
    return write(workspaceId, [{ ...validate(data), id: crypto.randomUUID(), createdAt: stamp, updatedAt: stamp }, ...read(workspaceId)]);
  },
  update(workspaceId: string, id: string, data: StudioExpenseInput): StudioExpense[] {
    const current = read(workspaceId);
    if (!current.some(item => item.id === id)) throw new Error('El gasto general ya no existe.');
    const changes = validate(data);
    const stamp = new Date().toISOString();
    return write(workspaceId, current.map(item => item.id === id ? { ...item, ...changes, updatedAt: stamp } : item));
  },
  remove(workspaceId: string, id: string): StudioExpense[] {
    const current = read(workspaceId);
    if (!current.some(item => item.id === id)) throw new Error('El gasto general ya no existe.');
    return write(workspaceId, current.filter(item => item.id !== id));
  },
};
