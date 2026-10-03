import { formatFecha } from './formatters';
export function currentFinanceTime(now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}
export const validFinanceTime = (time?: string) => !time || /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
export const financialDate = (item: { fecha: string; hora?: string }) => formatFecha(item.fecha) + (item.hora ? ` · ${item.hora}` : '');
export const compareFinancialDate = (a: { fecha: string; hora?: string }, b: { fecha: string; hora?: string }) => `${b.fecha}T${b.hora || '00:00'}`.localeCompare(`${a.fecha}T${a.hora || '00:00'}`);
export function financialComposition(totals: { totalCobrado: number; totalGastos: number; totalReembolsado: number; saldoPendiente: number; gastosPendientes: number }) {
  // Base de caja: honorarios cobrados + reembolsos cobrados - todos los gastos pagados.
  // Reembolsos recuperan adelantos; no son nuevos honorarios. Lo pendiente nunca es utilidad.
  const utilidad = totals.totalCobrado + totals.totalReembolsado - totals.totalGastos;
  const gastos = Math.max(0, totals.totalGastos - totals.totalReembolsado);
  const porCobrar = totals.saldoPendiente + totals.gastosPendientes;
  return { utilidad, gastos, porCobrar };
}
