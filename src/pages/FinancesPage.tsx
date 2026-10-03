import { FinancialDonut } from '../components/finances/FinancialDonut';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { StatCard } from '../components/common/StatCard';
import { financialDate, compareFinancialDate } from '../services/finance';
import { formatBs } from '../services/formatters';
import {
  Wallet,
  Clock,
  Receipt,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const FinancesPage: React.FC = () => {
  const { casesWithDetails, payments, expenses, reimbursements, financialTotals, cases } = useLegalData();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [selectedMetric, setSelectedMetric] = useState<'acordado' | 'cobrado' | 'pendiente' | 'gastos' | null>(null);

  useEffect(() => {
    if (hash === '#saldos-pendientes') {
      document.getElementById('saldos-pendientes')?.scrollIntoView();
    }
  }, [hash]);

  // Casos con saldos pendientes (deuda > 0)
  const casosConSaldo = useMemo(() => {
    return casesWithDetails
      .filter((c) => c.totalPendiente > 0)
      .sort((a, b) => b.totalPendiente - a.totalPendiente);
  }, [casesWithDetails]);

  // Los mismos pagos y gastos alimentan tanto los totales como sus vistas filtradas.
  const movimientos = useMemo(() => {
    const caseMap = new Map(cases.map((c) => [c.id, c]));
    const list = [
      ...payments.map((p) => ({
        id: p.id,
        tipo: 'pago' as const,
        titulo: 'Cobro de Honorarios',
        monto: p.monto,
        fecha: p.fecha,
        hora: p.hora,
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
        hora: g.hora,
        nota: g.nota,
        casoId: g.casoId,
        casoNombre: caseMap.get(g.casoId)?.nombre || 'Caso',
        casoArea: caseMap.get(g.casoId)?.area || 'Civil',
      })),
      ...reimbursements.map((r) => ({
        id: r.id,
        tipo: 'reembolso' as const,
        titulo: 'Reembolso de gasto',
        monto: r.monto,
        fecha: r.fecha,
        hora: r.hora,
        nota: r.nota,
        casoId: r.casoId,
        casoNombre: caseMap.get(r.casoId)?.nombre || 'Caso',
        casoArea: caseMap.get(r.casoId)?.area || 'Civil',
      })),
    ];

    return list.sort((a, b) => compareFinancialDate(a, b));
  }, [payments, expenses, reimbursements, cases]);

  const isCasesView = selectedMetric !== 'cobrado' && selectedMetric !== 'gastos';
  const visibleCases = selectedMetric === 'acordado'
    ? casesWithDetails.filter((caso) => caso.honorariosAcordados > 0)
    : casosConSaldo;
  const visibleMovements = selectedMetric === 'cobrado'
    ? movimientos.filter((mov) => mov.tipo === 'pago')
    : selectedMetric === 'gastos'
      ? movimientos.filter((mov) => mov.tipo === 'gasto')
      : movimientos.slice(0, 8);
  const showMovements = selectedMetric === null || selectedMetric === 'cobrado' || selectedMetric === 'gastos';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <StatCard
          title="Total Acordado"
          value={formatBs(financialTotals.totalAcordado)}
          subtitle="Honorarios contractuales totales"
          icon={<Wallet className="w-5 h-5 text-brand-900" />}
          onClick={() => setSelectedMetric(selectedMetric === 'acordado' ? null : 'acordado')}
          selected={selectedMetric === 'acordado'}
        />
        <StatCard
          title="Total Cobrado"
          value={formatBs(financialTotals.totalCobrado)}
          subtitle="Ingresos por honorarios percibidos"
          icon={<TrendingUp className="w-5 h-5 text-emerald-700" />}
          badgeType="success"
          onClick={() => setSelectedMetric(selectedMetric === 'cobrado' ? null : 'cobrado')}
          selected={selectedMetric === 'cobrado'}
        />
        <StatCard
          title="Total pendiente"
          value={formatBs(financialTotals.totalPendienteClientes)}
          subtitle="Honorarios y gastos por cobrar"
          icon={<Clock className="w-5 h-5 text-amber-700" />}
          badge={financialTotals.totalPendienteClientes > 0 ? 'Pendiente' : undefined}
          badgeType="warning"
          onClick={() => setSelectedMetric(selectedMetric === 'pendiente' ? null : 'pendiente')}
          selected={selectedMetric === 'pendiente'}
        />
        <StatCard
          title="Gastos Registrados"
          value={formatBs(financialTotals.totalGastos)}
          subtitle="Erogaciones operativas en expedientes"
          icon={<Receipt className="w-5 h-5 text-slate-700" />}
          onClick={() => setSelectedMetric(selectedMetric === 'gastos' ? null : 'gastos')}
          selected={selectedMetric === 'gastos'}
        />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600">
        <span>Honorarios pendientes: <strong className="font-mono text-slate-900">{formatBs(financialTotals.saldoPendiente)}</strong></span>
        <span>Gastos reembolsables: <strong className="font-mono text-slate-900">{formatBs(financialTotals.gastosReembolsables)}</strong></span>
        <span>Gastos pendientes de reembolso: <strong className="font-mono text-slate-900">{formatBs(financialTotals.gastosPendientes)}</strong></span>
        <span>Gastos reembolsados: <strong className="font-mono text-slate-900">{formatBs(financialTotals.totalReembolsado)}</strong></span>
      </div>

      {/* Grid de Secciones: Saldos Pendientes y Movimientos Recientes */}
      <FinancialDonut totals={financialTotals} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECCIÓN 1: SALDOS PENDIENTES (2 columnas) */}
        {isCasesView && <div id="saldos-pendientes" className={`${selectedMetric ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4 scroll-mt-28`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {selectedMetric === 'acordado' ? 'HONORARIOS ACORDADOS' : 'TOTAL PENDIENTE'} POR CASO ({visibleCases.length})
            </h2>
            <span className="text-xs text-slate-500">
              Clic para acceder a las finanzas del caso
            </span>
          </div>

          {visibleCases.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-xs text-slate-500">
              {selectedMetric === 'acordado' ? 'No hay casos con honorarios acordados.' : 'No hay casos con importes pendientes.'}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="mobile-data-table w-full text-left text-sm divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Cliente y Expediente</th>
                      <th className="px-4 py-3.5 text-right">Total Acordado</th>
                      <th className="px-4 py-3.5 text-right">Pagado</th>
                      <th className="px-4 py-3.5 text-right">Honorarios pendientes</th>
                      <th className="px-4 py-3.5 text-right">Gastos pendientes</th>
                      <th className="px-5 py-3.5 text-right">Total pendiente</th>
                      <th className="px-4 py-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {visibleCases.map((caso) => (
                      <tr
                        key={caso.id}
                        onClick={() => navigate(`/casos/${caso.id}?tab=finanzas`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/casos/${caso.id}?tab=finanzas`);
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`Ver finanzas de ${caso.nombre}`}
                        className="hover:bg-brand-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900 line-clamp-1">
                            {caso.nombre}
                          </div>
                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>{caso.clienteNombre}</span>
                            <span>•</span>
                            <span className="font-mono">{caso.tipoIdentificacionJudicial}: {caso.numeroIdentificacionJudicial}</span>
                          </div>
                        </td>

                        <td data-label="Acordado" className="px-4 py-3.5 text-right font-mono text-xs text-slate-700">
                          {formatBs(caso.honorariosAcordados)}
                        </td>

                        <td data-label="Pagado" className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-emerald-800">
                          {formatBs(caso.totalPagado)}
                        </td>

                        <td data-label="Honorarios pendientes" className="px-4 py-3.5 text-right font-mono text-xs text-amber-900">
                          {formatBs(caso.saldoPendiente)}
                        </td>
                        <td data-label="Gastos pendientes" className="px-4 py-3.5 text-right font-mono text-xs text-amber-900">{formatBs(caso.gastosPendientes)}</td>
                        <td data-label="Total pendiente" className="px-5 py-3.5 text-right font-mono text-sm font-bold text-amber-900">{formatBs(caso.totalPendiente)}</td>

                        <td data-label="Acción" className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center whitespace-nowrap text-xs font-semibold text-brand-900">
                            Ver finanzas →
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>}

        {/* SECCIÓN 2: MOVIMIENTOS RECIENTES (1 columna) */}
        {showMovements && <div className={`${selectedMetric ? 'lg:col-span-3' : ''} space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {selectedMetric === 'cobrado' ? 'COBROS REGISTRADOS' : selectedMetric === 'gastos' ? 'GASTOS REGISTRADOS' : 'MOVIMIENTOS RECIENTES'}
            </h2>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 shadow-xs">
            {visibleMovements.length === 0 && <div className="p-6 text-sm text-slate-500">No hay movimientos registrados.</div>}
            {visibleMovements.map((mov) => {
              const isPago = mov.tipo === 'pago';
              const isIngreso = isPago || mov.tipo === 'reembolso';
              return (
                <Link
                  key={mov.id}
                  to={`/casos/${mov.casoId}?tab=finanzas`}
                  className="block p-4 hover:bg-brand-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        isIngreso
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isPago ? 'Cobro Recibido' : mov.tipo === 'reembolso' ? 'Reembolso de gasto' : 'Gasto Operativo'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                      {financialDate(mov)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {isIngreso ? mov.nota || mov.titulo : mov.titulo}
                    </div>
                    <div
                      className={`font-mono font-bold text-sm tabular-nums shrink-0 ${
                        isIngreso ? 'text-emerald-800' : 'text-slate-700'
                      }`}
                    >
                      {isIngreso ? `+${formatBs(mov.monto)}` : `-${formatBs(mov.monto)}`}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-50">
                    <span className="text-slate-400 truncate max-w-[170px]">
                      {mov.casoNombre}
                    </span>
                    <span className="font-medium text-brand-900 flex items-center gap-0.5 whitespace-nowrap">
                      <span>Ver caso</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>}
      </div>
    </div>
  );
};
