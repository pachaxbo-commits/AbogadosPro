import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  casoId: string;
  onSuccess?: () => void;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  casoId,
  onSuccess,
}) => {
  const { addExpense } = useLegalData();

  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState<string>('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nota, setNota] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const quickConcepts = ['Fotocopias', 'Notaría', 'Transporte', 'Timbres judiciales', 'Peritaje'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concepto.trim()) {
      setError('El concepto del gasto es obligatorio');
      return;
    }
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
      await addExpense({
        casoId,
        concepto: concepto.trim(),
        monto: parsedMonto,
        fecha,
        nota: nota.trim() || undefined,
      });

      setConcepto('');
      setMonto('');
      setNota('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError('Error al registrar el gasto operativo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Gasto Operativo del Caso"
      subtitle="Erogaciones directas del expediente (fotocopias, diligencias, aranceles, traslados)"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej: Fotocopias legalizadas o Notaría"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          />

          {/* Sugerencias rápidas */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {quickConcepts.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setConcepto(item)}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
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
                step="5"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
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
            {isSubmitting ? 'Guardando...' : 'Registrar Gasto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
