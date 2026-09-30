import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  casoId: string;
  saldoPendiente?: number;
  onSuccess?: () => void;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  casoId,
  saldoPendiente,
  onSuccess,
}) => {
  const { addPayment } = useLegalData();

  const [monto, setMonto] = useState<string>('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nota, setNota] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = Number(monto);
    if (!parsedMonto || parsedMonto <= 0) {
      setError('Introduce un monto válido mayor a 0');
      return;
    }
    if (!fecha) {
      setError('La fecha es obligatoria');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await addPayment({
        casoId,
        monto: parsedMonto,
        fecha,
        nota: nota.trim() || undefined,
      });

      setMonto('');
      setNota('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError('Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Pago de Honorarios"
      subtitle="Abono o entrega a cuenta efectuada por el cliente"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-md">
            {error}
          </div>
        )}

        {saldoPendiente !== undefined && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex justify-between items-center text-xs">
            <span className="text-slate-600">Saldo pendiente actual:</span>
            <span className="font-bold text-slate-900 font-mono">
              Bs {saldoPendiente.toLocaleString('es-BO')}
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
              step="10"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 2000"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 font-mono"
            />
          </div>
        </div>

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
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-900 rounded-md hover:bg-brand-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            {isSubmitting ? 'Guardando...' : 'Registrar Pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
