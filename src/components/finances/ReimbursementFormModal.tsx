import React, { useRef, useState } from 'react';
import { currentFinanceTime, validFinanceTime } from '../../services/finance';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { formatBs, getLocalTodayIsoString } from '../../services/formatters';
import { Reembolso } from '../../types';

interface Props {
  casoId: string;
  reembolso?: Reembolso;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReimbursementFormModal: React.FC<Props> = ({ casoId, reembolso, onClose, onSuccess }) => {
  const { getCaseWithDetails, addReimbursement, updateReimbursement } = useLegalData();
  const [monto, setMonto] = useState(reembolso ? String(reembolso.monto) : '');
  const [fecha, setFecha] = useState(() => reembolso?.fecha ?? getLocalTodayIsoString());
  const [hora, setHora] = useState(() => reembolso ? reembolso.hora || '' : currentFinanceTime());
  const [nota, setNota] = useState(reembolso?.nota ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const available = (getCaseWithDetails(casoId)?.gastosPendientes ?? 0) + (reembolso?.monto ?? 0);
  const amount = Number(monto);
  const preview = monto.trim() && Number.isFinite(amount) && amount > 0 && amount <= available
    ? Math.round((available - amount) * 100) / 100 : undefined;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current) return;
    if (!monto.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Ingresa un monto mayor a Bs 0.');
      return;
    }
    const currentAvailable = (getCaseWithDetails(casoId)?.gastosPendientes ?? 0) + (reembolso?.monto ?? 0);
    if (amount > currentAvailable) {
      setError(`El monto no puede superar los gastos pendientes de ${formatBs(currentAvailable)}.`);
      return;
    }
    if (!validFinanceTime(hora)) { setError('Ingresa una hora válida en HH:mm.'); return; }
    if (!fecha) {
      setError('Ingresa la fecha del reembolso.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const data = { casoId, monto: amount, fecha, hora: hora || undefined, nota: nota.trim() || undefined };
      if (reembolso) await updateReimbursement(reembolso.id, data);
      else await addReimbursement(data);
      onSuccess();
      onClose();
    } catch (caught) {
      console.error(caught);
      setError('No se pudo guardar el reembolso. Intenta nuevamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={() => { if (!savingRef.current) onClose(); }}
      title={reembolso ? 'Editar reembolso' : 'Registrar reembolso'} maxWidth="sm">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
        <div className="flex justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <span>Gastos pendientes de reembolso:</span>
          <strong className="font-mono text-sm whitespace-nowrap">{formatBs(getCaseWithDetails(casoId)?.gastosPendientes ?? 0)}</strong>
        </div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Monto recibido (Bs) *
          <input type="number" min="0" step="any" value={monto} onChange={(event) => { setMonto(event.target.value); setError(''); }}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900" />
        </label>
        {preview !== undefined && <p aria-live="polite" className="rounded-md border border-brand-100 bg-brand-50/50 p-3 text-xs">
          Pendiente después: <strong className="font-mono">{formatBs(preview)}</strong>
        </p>}
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Fecha *
          <input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900" />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Hora
          <input aria-label="Hora" type="time" step="60" value={hora} onChange={e => setHora(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Concepto / Nota (opcional)
          <input type="text" value={nota} onChange={(event) => setNota(event.target.value)} placeholder="Ej: Reembolso de fotocopias"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900" />
        </label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
            {saving ? 'Guardando...' : reembolso ? 'Guardar cambios' : 'Registrar reembolso'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
