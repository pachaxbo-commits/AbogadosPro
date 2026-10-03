import { useState, type FormEvent } from 'react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { useTaskClock } from '../../hooks/useTaskClock';
import { caseFollowUp } from '../../services/caseFollowUp';
import { formatFecha } from '../../services/formatters';
import { taskToday } from '../../services/tasks';
import type { Caso } from '../../types';

export function CaseFollowUp({ caso }: { caso: Caso }) {
  const { activities, documents, tasks, events } = useLegalData();
  const now = useTaskClock();
  const review = caseFollowUp(caso, activities, documents, tasks, events, now);
  const [open, setOpen] = useState(false);
  return <>
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900">Seguimiento del caso</h2>
        <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${review.state === 'requiere' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{review.state === 'requiere' ? 'Requiere seguimiento' : review.state === 'sin' ? 'Sin seguimiento' : review.state === 'concluido' ? 'Concluido' : 'Al día'}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div><dt className="text-slate-500">Último movimiento</dt><dd className="font-medium text-slate-800">{review.lastMovement ? `${formatFecha(review.lastMovement.fecha)} · ${review.lastMovement.descripcion}` : `Sin movimientos · desde ${formatFecha(caso.fechaCreacion)}`}</dd></div>
        <div><dt className="text-slate-500">Días sin movimiento</dt><dd className="font-medium text-slate-800">{review.daysWithoutMovement}</dd></div>
        <div><dt className="text-slate-500">Frecuencia</dt><dd className="font-medium text-slate-800">{review.frequency === null ? 'Sin seguimiento' : `Cada ${review.frequency} días`}</dd></div>
        <div><dt className="text-slate-500">Próxima revisión</dt><dd className="font-medium text-slate-800">{review.state === 'concluido' || !review.nextReview ? '—' : formatFecha(review.nextReview)}</dd></div>
      </dl>
      {review.state === 'requiere' && <p className="mt-2 text-xs font-semibold text-amber-800">{review.overdueDays} {review.overdueDays === 1 ? 'día' : 'días'} de retraso</p>}
      <button type="button" onClick={() => setOpen(true)} className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-brand-900 hover:bg-brand-50">Registrar seguimiento</button>
    </div>
    {open && <FollowUpRegistrationModal casoId={caso.id} onClose={() => setOpen(false)} />}
  </>;
}

export function FollowUpRegistrationModal({ casoId, onClose }: { casoId: string; onClose: () => void }) {
  const { addActivity } = useLegalData();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await addActivity({ casoId, tipo: 'Nota interna', titulo: 'Seguimiento', descripcion: note.trim(), fecha: taskToday(new Date()) });
      setNote('');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el seguimiento.');
    } finally {
      setSaving(false);
    }
  };

  return <Modal isOpen title="Registrar seguimiento" subtitle="La nota quedará en Actividad del caso" onClose={() => { if (!saving) onClose(); }} maxWidth="md">
      <form onSubmit={(event) => void save(event)} className="space-y-4">
        <div><label htmlFor="follow-up-note" className="mb-1 block text-xs font-semibold uppercase text-slate-700">Nota breve</label><textarea id="follow-up-note" required maxLength={1000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-900 focus:outline-hidden" /></div>
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm text-brand-900">Cancelar</button><button type="submit" disabled={saving || !note.trim()} className="rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar seguimiento'}</button></div>
      </form>
    </Modal>;
}
