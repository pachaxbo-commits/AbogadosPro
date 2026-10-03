import type { Caso, Gasto, Pago, Reembolso } from '../types';
import type { StudioExpense } from '../types/studioExpense';

export interface StudioDateRange { from: string; to: string }

export function inStudioRange(fecha: string, range: StudioDateRange): boolean {
  return (!range.from || fecha >= range.from) && (!range.to || fecha <= range.to);
}

export function studioFinanceSummary(cases: Caso[], payments: Pago[], expenses: Gasto[], reimbursements: Reembolso[], studioExpenses: StudioExpense[], range: StudioDateRange) {
  const income = payments.filter(item => inStudioRange(item.fecha, range)).reduce((sum, item) => sum + item.monto, 0);
  // Los adelantos reembolsables son cuentas por cobrar, no costos definitivos del estudio.
  const caseCosts = expenses.filter(item => item.reembolsable !== true && inStudioRange(item.fecha, range)).reduce((sum, item) => sum + item.monto, 0);
  const generalCosts = studioExpenses.filter(item => inStudioRange(item.fecha, range)).reduce((sum, item) => sum + item.monto, 0);

  // Por cobrar es un saldo al cierre: los modelos no registran fecha de vencimiento ni historial de cambios de honorarios.
  const eligibleCases = cases.filter(caso => !range.to || caso.fechaCreacion <= range.to);
  const receivable = eligibleCases.reduce((sum, caso) => {
    const paid = payments.filter(item => item.casoId === caso.id && (!range.to || item.fecha <= range.to)).reduce((value, item) => value + item.monto, 0);
    const advanced = expenses.filter(item => item.casoId === caso.id && item.reembolsable === true && (!range.to || item.fecha <= range.to)).reduce((value, item) => value + item.monto, 0);
    const recovered = reimbursements.filter(item => item.casoId === caso.id && (!range.to || item.fecha <= range.to)).reduce((value, item) => value + item.monto, 0);
    return sum + Math.max(0, caso.honorariosAcordados - paid) + Math.max(0, advanced - recovered);
  }, 0);

  const distribution = [
    { name: 'Gastos de casos', value: caseCosts },
    ...[...new Set(studioExpenses.map(item => item.categoria))].map(category => ({
      name: category,
      value: studioExpenses.filter(item => item.categoria === category && inStudioRange(item.fecha, range)).reduce((sum, item) => sum + item.monto, 0),
    })),
  ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);

  return { income, receivable, caseCosts, generalCosts, profit: income - caseCosts - generalCosts, distribution };
}
