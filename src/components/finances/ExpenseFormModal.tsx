import React, { useRef, useState } from 'react';
import { currentFinanceTime, validFinanceTime } from '../../services/finance';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { Gasto } from '../../types';
import { formatBs, getLocalTodayIsoString } from '../../services/formatters';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  casoId: string;
  onSuccess?: () => void;
  gasto?: Gasto;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  casoId,
  onSuccess,
  gasto,
}) => {
  const { addExpense, updateExpense, getCaseWithDetails } = useLegalData();

  const [concepto, setConcepto] = useState(gasto?.concepto ?? '');
  const [monto, setMonto] = useState<string>(gasto ? String(gasto.monto) : '');
  const [fecha, setFecha] = useState(() => gasto?.fecha ?? getLocalTodayIsoString());
  const [hora, setHora] = useState(() => gasto ? gasto.hora || '' : currentFinanceTime());
  const [nota, setNota] = useState(gasto?.nota ?? '');
  const [reembolsable, setReembolsable] = useState(gasto?.reembolsable === true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  const quickConcepts = ['Fotocopias', 'Notaría', 'Transporte', 'Timbres judiciales', 'Peritaje'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!concepto.trim()) {
      setError('Ingresa el concepto del gasto.');
      return;
    }
    const parsedMonto = Number(monto);
    if (monto.trim() === '' || !Number.isFinite(parsedMonto) || parsedMonto <= 0) {
      setError('Ingresa un monto mayor a Bs 0.');
      return;
    }
    if (!validFinanceTime(hora)) { setError('Ingresa una hora válida en HH:mm.'); return; }
    if (!fecha) {
      setError('Ingresa la fecha del gasto.');
      return;
    }
    const caso = getCaseWithDetails(casoId);
    const nextReimbursable = (caso?.gastosReembolsables ?? 0) - (gasto?.reembolsable ? gasto.monto : 0) +
      (reembolsable ? parsedMonto : 0);
    if (caso && nextReimbursable < caso.totalReembolsado) {
      setError(`No puedes reducir los gastos reembolsables por debajo de ${formatBs(caso.totalReembolsado)} ya recibidos.`);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError('');
    try {
      const data = {
        casoId,
        concepto: concepto.trim(),
        monto: parsedMonto,
        fecha,
        hora: hora || undefined,
        nota: nota.trim() || undefined,
        reembolsable,
      };
      if (gasto) await updateExpense(gasto.id, data);
      else await addExpense(data);

      setConcepto('');
      setMonto('');
      setNota('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError('No se pudo registrar el gasto. Intenta nuevamente.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submittingRef.current) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={gasto ? 'Editar gasto operativo' : 'Registrar Gasto Operativo del Caso'}
      subtitle="Erogaciones directas del expediente (fotocopias, diligencias, aranceles, traslados)"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-md">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Concepto del Gasto <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={concepto}
            onChange={(e) => { setConcepto(e.target.value); setError(''); }}
            placeholder="Ej: Fotocopias legalizadas o Notaría"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          />

          {/* Sugerencias rápidas */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {quickConcepts.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setConcepto(item); setError(''); }}
                className="cursor-pointer text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 transition-colors"
              >
                + {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Monto (Bs) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-500">
                Bs
              </span>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={monto}
                onChange={(e) => { setMonto(e.target.value); setError(''); }}
                placeholder="Ej: 50"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Fecha <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
            />
          </div>
        </div>

        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Hora
          <input aria-label="Hora" type="time" step="60" value={hora} onChange={e => setHora(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input type="checkbox" checked={reembolsable} onChange={(e) => setReembolsable(e.target.checked)} className="accent-brand-900" />
            Reembolsable por el cliente
          </label>
          <p className="mt-1 pl-5 text-[11px] text-slate-500">Si lo marcas, este gasto se sumará a lo que debe el cliente.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Nota / Justificante (Opcional)
          </label>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: Factura N° 102 o Recibo de secretaría"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-900 rounded-md hover:bg-brand-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            {isSubmitting ? 'Guardando...' : gasto ? 'Guardar cambios' : 'Registrar Gasto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
