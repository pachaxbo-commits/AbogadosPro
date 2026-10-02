import { useId, useRef, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { DatosResultadoEvento, Evento, TipoResultadoEvento } from '../../types';
import { useLegalData } from '../../context/LegalDataContext';
import { Modal } from '../common/Modal';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { EVENT_RESULTS, eventState, pendingEventResult } from '../../services/eventResults';
import { formatFecha } from '../../services/formatters';
import { useTaskClock } from '../../hooks/useTaskClock';

const field = 'mt-1 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const label = 'block text-xs font-semibold uppercase tracking-wider text-slate-700';
const button = 'min-h-10 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-50';
export function EventResultStatus({ event }: { event: Evento }) {
  const now = useTaskClock();
  const text = event.resultado?.tipo || (pendingEventResult(event, now) ? 'Resultado pendiente' : eventState(event) !== 'Próximo' ? eventState(event) : '');
  return text ? <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">{event.resultado ? text.toUpperCase() : text}</span> : null;
}

function ResultForm({ event, onClose, onSuccess }: { event: Evento; onClose: () => void; onSuccess: () => void }) {
  const { saveEventResult, cases } = useLegalData();
  const id = useId();
  const [data, setData] = useState<DatosResultadoEvento>(() => ({ tipo: event.resultado?.tipo || 'Realizada', observaciones: event.resultado?.observaciones || '', proximosPasos: event.resultado?.proximosPasos || '', fecha: event.resultado?.fecha || event.fecha, nuevaFecha: event.resultado?.nuevaFecha || '', nuevaHora: event.resultado?.nuevaHora || '' }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const change = (value: Partial<DatosResultadoEvento>) => { setData((prev) => ({ ...prev, ...value })); setError(''); };
  return <Modal isOpen title={event.resultado ? 'Editar resultado' : 'Registrar resultado'} onClose={() => { if (!guard.current) onClose(); }} maxWidth="lg" footer={<div className="flex flex-wrap justify-end gap-2"><button type="button" className={button} disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" form={`${id}-form`} disabled={busy} className="min-h-10 rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar resultado'}</button></div>}>
    <p className="mb-4 text-sm text-slate-600">{event.tipo} · {event.titulo}<span className="mt-1 block text-xs">{cases.find((caso) => caso.id === event.casoId)?.nombre} · {formatFecha(event.fecha)}{event.hora && ` · ${event.hora}`}</span></p>
    <form id={`${id}-form`} className="space-y-4" noValidate onSubmit={async (e) => {
      e.preventDefault(); if (guard.current) return; guard.current = true; setBusy(true); setError('');
      try { await saveEventResult(event.casoId, event.id, data); onSuccess(); onClose(); }
      catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el resultado.'); }
      finally { guard.current = false; setBusy(false); }
    }}>
      {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div><label htmlFor={`${id}-type`} className={label}>Resultado *</label><select id={`${id}-type`} className={field} value={data.tipo} onChange={(e) => change({ tipo: e.target.value as TipoResultadoEvento })}>{EVENT_RESULTS.map((value) => <option key={value}>{value}</option>)}</select></div>
      <div><label htmlFor={`${id}-notes`} className={label}>Observaciones / resultado de la actuación *</label><textarea id={`${id}-notes`} required rows={4} className={field} value={data.observaciones} onChange={(e) => change({ observaciones: e.target.value })} /></div>
      <div><label htmlFor={`${id}-next`} className={label}>Próximos pasos (opcional)</label><textarea id={`${id}-next`} rows={2} className={field} value={data.proximosPasos} onChange={(e) => change({ proximosPasos: e.target.value })} /></div>
      <div><label htmlFor={`${id}-date`} className={label}>Fecha del resultado</label><input id={`${id}-date`} type="date" required className={field} value={data.fecha} onChange={(e) => change({ fecha: e.target.value })} /></div>
      {data.tipo === 'Reprogramada' && <div className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2"><div><label htmlFor={`${id}-newdate`} className={label}>Nueva fecha *</label><input id={`${id}-newdate`} type="date" required className={field} value={data.nuevaFecha} onChange={(e) => change({ nuevaFecha: e.target.value })} /></div><div><label htmlFor={`${id}-time`} className={label}>Nueva hora (opcional)</label><input id={`${id}-time`} type="time" className={field} value={data.nuevaHora} onChange={(e) => change({ nuevaHora: e.target.value })} /></div><p className="text-xs text-slate-500 sm:col-span-2">Se conservará el evento original y se {event.resultado?.eventoReprogramadoId ? 'actualizará la cita vinculada' : 'creará una nueva cita para este caso'}.</p></div>}
      {event.resultado?.tipo === 'Reprogramada' && data.tipo !== 'Reprogramada' && <p className="text-xs text-amber-800">La cita creada al reprogramar se conservará como cancelada si aún no tiene un resultado.</p>}
    </form>
  </Modal>;
}

export function EventResultAction({ event }: { event: Evento }) {
  const [mode, setMode] = useState<'view' | 'edit' | null>(null);
  const [task, setTask] = useState(false);
  const [message, setMessage] = useState('');
  const result = event.resultado;
  return <div className="relative z-20 mt-2">
    <button type="button" className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${result ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-brand-200 bg-white text-brand-900 hover:bg-brand-50'}`} onClick={() => setMode(result ? 'view' : 'edit')}><ClipboardCheck aria-hidden="true" className="h-3.5 w-3.5" />{result ? 'Ver resultado' : 'Registrar resultado'}</button>
    {message && <span role="status" className="ml-2 text-xs text-brand-900">{message}</span>}
    {mode === 'edit' && <ResultForm event={event} onClose={() => setMode(null)} onSuccess={() => setMessage('Resultado guardado correctamente.')} />}
    {mode === 'view' && result && <Modal isOpen title="Resultado del evento" onClose={() => setMode(null)} maxWidth="lg">
      <p className="text-sm font-semibold text-slate-900">{event.tipo} · {event.titulo}</p><p className="mt-2 text-sm text-slate-600">{result.tipo} · {formatFecha(result.fecha)}</p>
      <h4 className="mt-4 text-xs font-semibold uppercase text-slate-700">Observaciones / resultado de la actuación</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{result.observaciones}</p>
      {result.proximosPasos && <><h4 className="mt-4 text-xs font-semibold uppercase text-slate-700">Próximos pasos</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{result.proximosPasos}</p></>}
      {result.nuevaFecha && <p className="mt-4 text-sm text-slate-600">Nueva fecha: {formatFecha(result.nuevaFecha)}{result.nuevaHora && ` · ${result.nuevaHora}`}</p>}
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setMode('edit')}>Editar resultado</button><button type="button" className={button} onClick={() => { setMode(null); setTask(true); }}>+ Crear tarea</button></div>
    </Modal>}
    {task && <TaskFormModal casoId={event.casoId} onClose={() => setTask(false)} />}
  </div>;
}
