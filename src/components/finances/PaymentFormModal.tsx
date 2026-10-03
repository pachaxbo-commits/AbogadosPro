import React, { useRef, useState } from 'react';
import { currentFinanceTime, validFinanceTime } from '../../services/finance';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { formatBs, getLocalTodayIsoString } from '../../services/formatters';
import { Pago } from '../../types';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  casoId: string;
  saldoPendiente?: number;
  onSuccess?: () => void;
  pago?: Pago;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  casoId,
  saldoPendiente,
  onSuccess,
  pago,
}) => {
  const { addPayment, updatePayment, getCaseWithDetails } = useLegalData();

  const [monto, setMonto] = useState<string>(pago ? String(pago.monto) : '');
  const [fecha, setFecha] = useState(() => pago?.fecha ?? getLocalTodayIsoString());
  const [hora, setHora] = useState(() => pago ? pago.hora || '' : currentFinanceTime());
  const [nota, setNota] = useState(pago?.nota ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);
  const currentBalance = getCaseWithDetails(casoId)?.saldoPendiente ?? saldoPendiente;
  const availableBalance = currentBalance === undefined ? undefined : currentBalance + (pago?.monto ?? 0);
  const enteredAmount = Number(monto);
  const hasValidPreview = monto.trim() !== '' && Number.isFinite(enteredAmount) && enteredAmount > 0 &&
    availableBalance !== undefined && enteredAmount <= availableBalance;
  const balanceAfterPayment = hasValidPreview
    ? Math.round((availableBalance! - enteredAmount) * 100) / 100
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const parsedMonto = Number(monto);
    if (monto.trim() === '' || !Number.isFinite(parsedMonto) || parsedMonto <= 0) {
      setError('Ingresa un monto mayor a Bs 0.');
      return;
    }
    const latestBalance = (getCaseWithDetails(casoId)?.saldoPendiente ?? saldoPendiente ?? 0) + (pago?.monto ?? 0);
    if (parsedMonto > latestBalance) {
      setError(pago
        ? `El nuevo monto no puede superar ${formatBs(latestBalance)} al corregir este pago.`
        : `El monto no puede superar el saldo pendiente de ${formatBs(latestBalance)}.`);
      return;
    }
    if (!validFinanceTime(hora)) { setError('Ingresa una hora válida en HH:mm.'); return; }
    if (!fecha) {
      setError('Ingresa la fecha del pago.');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError('');
    try {
      const data = {
        casoId,
        monto: parsedMonto,
        fecha,
        hora: hora || undefined,
        nota: nota.trim() || undefined,
      };
      if (pago) await updatePayment(pago.id, data);
      else await addPayment(data);

      setMonto('');
      setNota('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError('No se pudo registrar el pago. Intenta nuevamente.');
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
      title={pago ? 'Editar pago de honorarios' : 'Registrar Pago de Honorarios'}
      subtitle="Abono o entrega a cuenta efectuada por el cliente"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-md">
            {error}
          </div>
        )}

        {currentBalance !== undefined && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex justify-between items-center gap-3 text-xs">
            <span className="text-slate-600">Saldo pendiente actual:</span>
            <span className="font-bold text-sm text-slate-900 font-mono tabular-nums whitespace-nowrap">
              {formatBs(currentBalance)}
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Monto Percibido (Bs) <span className="text-rose-500">*</span>
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
              placeholder="Ej: 2000"
              aria-invalid={Boolean(error) && (!monto || !Number.isFinite(enteredAmount) || enteredAmount <= 0 || (availableBalance !== undefined && enteredAmount > availableBalance))}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 font-mono"
            />
          </div>
          {balanceAfterPayment !== undefined && (
            <div className="mt-2 rounded-md border border-brand-100 bg-brand-50/50 px-3 py-2 text-xs text-slate-700" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <span>Saldo después del pago:</span>
                <strong className="font-mono tabular-nums text-sm text-brand-900 whitespace-nowrap">{formatBs(balanceAfterPayment)}</strong>
              </div>
              {balanceAfterPayment === 0 && <p className="mt-1 font-medium text-emerald-800">✓ Este pago completará los honorarios del caso.</p>}
            </div>
          )}
          {pago && hasValidPreview && enteredAmount !== pago.monto && (
            <p className="mt-1 text-xs text-slate-600">Pago anterior: {formatBs(pago.monto)} · Nuevo monto: {formatBs(enteredAmount)}</p>
          )}
        </div>
        {pago && <p className="text-xs text-slate-500">Al corregir este pago, puedes registrar hasta {formatBs(availableBalance ?? 0)}.</p>}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Fecha del Pago <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          />
        </div>

        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Hora
          <input aria-label="Hora" type="time" step="60" value={hora} onChange={e => setHora(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Concepto / Nota (Opcional)
          </label>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: Pago cuota 2, transferencia o recibo N° 45"
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
            {isSubmitting ? 'Guardando...' : pago ? 'Guardar cambios' : 'Registrar Pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
