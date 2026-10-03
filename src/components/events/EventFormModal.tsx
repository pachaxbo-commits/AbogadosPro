import React, { useId, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Modal } from '../common/Modal';
import { AssigneeSelect } from '../common/AssigneeSelect';
import { useLegalData } from '../../context/LegalDataContext';
import { useProfile } from '../../context/ProfileContext';
import { configuredReminders, validateReminders } from '../../services/reminders';
import { Evento, TipoEvento, type RecordatorioEvento } from '../../types';
import { calendarToday, googleCalendarUrl, openCalendarWindow } from '../../services/calendarService';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCasoId?: string;
  preselectedClientId?: string;
  evento?: Evento;
  onSuccess?: () => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  preselectedCasoId,
  preselectedClientId,
  evento,
  onSuccess,
}) => {
  const formId = useId();
  const { notificationPreferences, configuration } = useProfile();
  const [recordatorios, setRecordatorios] = useState(() => configuredReminders(evento, notificationPreferences.defaultReminder));
  const { cases, clients, addEvent, updateEvent } = useLegalData();
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const availableCases = preselectedClientId ? cases.filter((c) => c.clienteId === preselectedClientId) : cases;

  const [casoId, setCasoId] = useState(evento?.casoId || preselectedCasoId || (availableCases[0]?.id || ''));
  const [encargadoId, setEncargadoId] = useState(evento?.encargadoId || '');
  const [tipo, setTipo] = useState<TipoEvento>(evento?.tipo || configuration.categories.events[0]);
  const [titulo, setTitulo] = useState(evento?.titulo || '');
  const [fecha, setFecha] = useState(evento?.fecha || calendarToday());
  const [hora, setHora] = useState(evento ? evento.hora || '' : '10:00');
  const [descripcion, setDescripcion] = useState(evento?.descripcion || '');
  const [juzgado, setJuzgado] = useState(evento?.juzgado || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentCasoId = preselectedCasoId || casoId || (availableCases[0]?.id || '');
  const closeForm = () => {
    if (submitting.current) return;
    if (!evento) {
      setCasoId(preselectedCasoId || availableCases[0]?.id || '');
      setTipo(configuration.categories.events[0]);
      setTitulo('');
      setFecha(calendarToday());
      setHora('10:00');
      setDescripcion('');
      setJuzgado('');
      setEncargadoId('');
      setRecordatorios(configuredReminders(undefined, notificationPreferences.defaultReminder));
    }
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.SyntheticEvent, withCalendar = false) => {
    e.preventDefault();
    if (submitting.current) return;
    if (!titulo.trim()) {
      setError('El título del evento es obligatorio');
      return;
    }
    if (!currentCasoId) {
      setError('Debes asociar el evento a un caso');
      return;
    }
    if (!fecha) {
      setError('La fecha es obligatoria');
      return;
    }

    try {
      submitting.current = true;
      setIsSubmitting(true);
      setError('');
      const data = {
        casoId: currentCasoId,
        encargadoId,
        tipo,
        titulo: titulo.trim(),
        fecha,
        hora: hora.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        juzgado: juzgado.trim() || undefined,
        realizado: evento?.realizado,
        recordatorios: { unDiaAntes: false, unaHoraAntes: false, personalizados: validateReminders(recordatorios) },
      };
      if (withCalendar) {
        const caso = cases.find((item) => item.id === currentCasoId);
        openCalendarWindow(googleCalendarUrl({ ...data, id: evento?.id || '' }, caso, clients.find((item) => item.id === caso?.clienteId)));
        return;
      }
      if (evento) await updateEvent(evento.id, data);
      else await addEvent(data);

      // Limpiar formulario
      if (!evento) {
        setTitulo('');
        setDescripcion('');
        setJuzgado('');
        setEncargadoId('');
        setRecordatorios(configuredReminders(undefined, notificationPreferences.defaultReminder));
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : evento ? 'Error al editar el evento' : 'Error al agendar el evento');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeForm}
      title={evento ? 'Editar evento' : 'Agendar evento'}
      subtitle={evento ? 'Modificar los datos del evento' : 'Programar audiencia, vencimiento de plazo, actuado o reunión'}
      maxWidth="md"
      footer={<div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeForm}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit" form={formId}
            disabled={isSubmitting || availableCases.length === 0}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-900 rounded-md hover:bg-brand-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            {isSubmitting ? 'Guardando...' : evento ? 'Guardar cambios' : 'Agendar Evento'}
          </button>
        </div>}
    >
      <form ref={formRef} id={formId} onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-md">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Caso <span className="text-rose-500">*</span>
          </label>
          <select
            value={currentCasoId}
            onChange={(e) => setCasoId(e.target.value)}
            disabled={Boolean(preselectedCasoId || evento?.resultado || evento?.eventoOrigenId)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 bg-white disabled:bg-slate-100"
          >
            {availableCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.tipoIdentificacionJudicial}: {c.numeroIdentificacionJudicial})
              </option>
            ))}
          </select>
          {preselectedClientId && availableCases.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">Primero registra un caso para este cliente.</p>
          )}
        </div>

        <div>
          <label htmlFor={`${formId}-assignee`} className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">Encargado (opcional)</label>
          <AssigneeSelect id={`${formId}-assignee`} value={encargadoId} onChange={setEncargadoId} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-900 focus:outline-hidden focus:ring-1 focus:ring-brand-900" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Tipo de Evento <span className="text-rose-500">*</span>
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoEvento)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 bg-white"
            >
              {[...new Set([...configuration.categories.events, ...(evento && !configuration.categories.events.includes(evento.tipo) ? [evento.tipo] : [])])].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Juzgado / Sala (Opcional)
            </label>
            <input
              type="text"
              value={juzgado}
              onChange={(e) => setJuzgado(e.target.value)}
              placeholder="Ej: Juzgado 2° en lo Penal"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Título del Evento <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Audiencia de medidas cautelares o Vencimiento contestación..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Hora (Opcional)
            </label>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Notas / Instrucciones
          </label>
          <textarea
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Preparar credencial de abogado, copias legalizadas, testigos..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          />
        </div>

        <fieldset className="rounded-md border border-slate-200 bg-slate-50/50 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-700">Recordatorios</legend>
          <div className="space-y-2">
            {recordatorios.map((item, index) => <div key={index} className="flex items-center gap-2">
              <input aria-label={`Cantidad del recordatorio ${index + 1}`} type="number" min="1" max="525600" step="1" value={item.cantidad || ''} onChange={e => setRecordatorios(items => items.map((r, i) => i === index ? { ...r, cantidad: Number(e.target.value) } : r))} className="w-20 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" />
              <select aria-label={`Unidad del recordatorio ${index + 1}`} value={item.unidad} onChange={e => setRecordatorios(items => items.map((r, i) => i === index ? { ...r, unidad: e.target.value as RecordatorioEvento['unidad'] } : r))} className="min-w-0 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm">{['minutos', 'horas', 'días', 'semanas'].map(unit => <option key={unit}>{unit}</option>)}</select>
              <span className="text-xs">antes</span><button type="button" aria-label={`Eliminar recordatorio ${index + 1}`} onClick={() => setRecordatorios(items => items.filter((_, i) => i !== index))} className="rounded p-2 text-slate-600 hover:bg-slate-100">×</button>
            </div>)}
            <button type="button" disabled={recordatorios.length >= 10} onClick={() => setRecordatorios(items => [...items, { cantidad: 30, unidad: 'minutos' }])} className="py-2 text-sm font-semibold text-brand-900 disabled:opacity-50">+ Añadir recordatorio</button>
          </div>
          {!hora && <p className="mt-2 text-xs text-slate-500">Sin hora, los avisos se calculan desde el inicio del día en Bolivia.</p>}
          <p className="mt-2 text-xs text-slate-500">Estos avisos aparecen en AbogadosPro. En Google Calendar, configura los mismos avisos antes de guardar; el enlace no los activa automáticamente.</p>
        </fieldset>
        <button type="button" onClick={(e) => { if (formRef.current?.reportValidity()) void handleSubmit(e, true); }} disabled={isSubmitting || availableCases.length === 0} className="inline-flex items-center gap-2 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-50"><Calendar className="h-4 w-4" aria-hidden="true" />Agregar a Google Calendar</button>

      </form>
    </Modal>
  );
};
