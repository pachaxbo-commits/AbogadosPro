import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { StatCard } from '../components/common/StatCard';
import { formatBs, formatFecha } from '../services/formatters';
import {
  Wallet,
  Clock,
  Receipt,
  ArrowRight,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const FinancesPage: React.FC = () => {
  const { casesWithDetails, payments, expenses, financialTotals, cases } = useLegalData();
  const navigate = useNavigate();

  // Casos con saldos pendientes (deuda > 0)
  const casosConSaldo = useMemo(() => {
    return casesWithDetails
      .filter((c) => c.saldoPendiente > 0)
      .sort((a, b) => b.saldoPendiente - a.saldoPendiente);
  }, [casesWithDetails]);

  // Movimientos recientes (pagos de honorarios y gastos operativos)
  const movimientosRecientes = useMemo(() => {
    const caseMap = new Map(cases.map((c) => [c.id, c]));
    const list = [
      ...payments.map((p) => ({
        id: p.id,
        tipo: 'pago' as const,
        titulo: 'Cobro de Honorarios',
        monto: p.monto,
        fecha: p.fecha,
        nota: p.nota,
        casoId: p.casoId,
        casoNombre: caseMap.get(p.casoId)?.nombre || 'Caso',
        casoArea: caseMap.get(p.casoId)?.area || 'Civil',
      })),
      ...expenses.map((g) => ({
        id: g.id,
        tipo: 'gasto' as const,
        titulo: g.concepto,
        monto: g.monto,
        fecha: g.fecha,
        nota: g.nota,
        casoId: g.casoId,
        casoNombre: caseMap.get(g.casoId)?.nombre || 'Caso',
        casoArea: caseMap.get(g.casoId)?.area || 'Civil',
      })),
    ];

    return list.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);
  }, [payments, expenses, cases]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Control Financiero General
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Resumen consolidado de honorarios pactados, cobranzas y gastos operativos
          </p>
        </div>
      </div>

      {/* 4 Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Acordado"
          value={formatBs(financialTotals.totalAcordado)}
          subtitle="Honorarios contractuales totales"
          icon={<Wallet className="w-5 h-5 text-brand-900" />}
        />
        <StatCard
          title="Total Cobrado"
          value={formatBs(financialTotals.totalCobrado)}
          subtitle="Ingresos por honorarios percibidos"
          icon={<TrendingUp className="w-5 h-5 text-emerald-700" />}
          badgeType="success"
        />
        <StatCard
          title="Saldo Pendiente"
          value={formatBs(financialTotals.saldoPendiente)}
          subtitle="Por cobrar a los clientes"
          icon={<Clock className="w-5 h-5 text-amber-700" />}
          badge={financialTotals.saldoPendiente > 0 ? 'Pendiente' : undefined}
          badgeType="warning"
        />
        <StatCard
          title="Gastos Registrados"
          value={formatBs(financialTotals.totalGastos)}
          subtitle="Erogaciones operativas en expedientes"
          icon={<Receipt className="w-5 h-5 text-slate-700" />}
        />
      </div>

      {/* Grid de Secciones: Saldos Pendientes y Movimientos Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECCIÓN 1: SALDOS PENDIENTES (2 columnas) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              SALDOS PENDIENTES POR CASO ({casosConSaldo.length})
            </h2>
            <span className="text-xs text-slate-500">
              Clic para acceder a las finanzas del caso
            </span>
          </div>

          {casosConSaldo.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-xs text-slate-500">
              No existen expedientes con saldo pendiente de pago. ¡Todas las cobranzas están al día!
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Cliente y Expediente</th>
                      <th className="px-4 py-3.5 text-right">Total Acordado</th>
                      <th className="px-4 py-3.5 text-right">Pagado</th>
                      <th className="px-5 py-3.5 text-right">Saldo Pendiente</th>
                      <th className="px-4 py-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {casosConSaldo.map((caso) => (
                      <tr
                        key={caso.id}
                        onClick={() => navigate(`/casos/${caso.id}?tab=finanzas`)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900 line-clamp-1">
                            {caso.nombre}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{caso.clienteNombre}</span>
                            <span>•</span>
                            <span className="font-mono">{caso.tipoIdentificacionJudicial}: {caso.numeroIdentificacionJudicial}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700">
                          {formatBs(caso.honorariosAcordados)}
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-emerald-800">
                          {formatBs(caso.totalPagado)}
                        </td>

                        <td className="px-5 py-3.5 text-right font-mono text-sm font-bold text-amber-900">
                          {formatBs(caso.saldoPendiente)}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center text-xs font-semibold text-brand-900">
                            Cobranza
                            <ChevronRight className="w-4 h-4 ml-0.5" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN 2: MOVIMIENTOS RECIENTES (1 columna) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              MOVIMIENTOS RECIENTES
            </h2>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 shadow-xs">
            {movimientosRecientes.map((mov) => {
              const isPago = mov.tipo === 'pago';
              return (
                <div key={mov.id} className="p-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        isPago
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isPago ? 'Cobro Recibido' : 'Gasto Operativo'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatFecha(mov.fecha)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {mov.titulo}
                    </div>
                    <div
                      className={`font-mono font-bold text-xs shrink-0 ${
                        isPago ? 'text-emerald-800' : 'text-slate-700'
                      }`}
                    >
                      {isPago ? `+${formatBs(mov.monto)}` : `-${formatBs(mov.monto)}`}
                    </div>
                  </div>

                  {mov.nota && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {mov.nota}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-50">
                    <span className="text-slate-400 truncate max-w-[170px]">
                      {mov.casoNombre}
                    </span>
                    <Link
                      to={`/casos/${mov.casoId}?tab=finanzas`}
                      className="font-medium text-brand-900 hover:underline flex items-center gap-0.5"
                    >
                      <span>Ver caso</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
