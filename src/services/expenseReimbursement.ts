import type { Gasto, Reembolso } from '../types';

export function expenseReimbursementStatus(expense: Gasto, reimbursements: readonly Reembolso[]): NonNullable<Gasto['reimbursementStatus']> {
  if (!expense.reembolsable) return 'Sin desglose';
  const linked = reimbursements.filter(item => item.casoId === expense.casoId && item.gastoId === expense.id)
    .reduce((sum, item) => sum + item.monto, 0);
  if (linked >= expense.monto - 0.005) return 'Reembolsado';
  if (reimbursements.some(item => item.casoId === expense.casoId && !item.gastoId)) return 'Sin desglose';
  return linked > 0 ? 'Parcial' : 'Pendiente';
}
