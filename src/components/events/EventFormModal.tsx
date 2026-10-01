import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { Evento, TipoEvento } from '../../types';

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
  const { cases, addEvent, updateEvent } = useLegalData();
  const availableCases = preselectedClientId ? cases.filter((c) => c.clienteId === preselectedClientId) : cases;

  const [casoId, setCasoId] = useState(evento?.casoId || preselectedCasoId || (availableCases[0]?.id || ''));
  const [tipo, setTipo] = useState<TipoEvento>(evento?.tipo || 'Audiencia');
  const [titulo, setTitulo] = useState(evento?.titulo || '');
  const [fecha, setFecha] = useState(evento?.fecha || new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(evento ? evento.hora || '' : '10:00');
  const [descripcion, setDescripcion] = useState(evento?.descripcion || '');
  const [juzgado, setJuzgado] = useState(evento?.juzgado || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentCasoId = preselectedCasoId || casoId || (availableCases[0]?.id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setIsSubmitting(true);
      setError('');
      const data = {
        casoId: currentCasoId,
        tipo,
        titulo: titulo.trim(),
        fecha,
        hora: hora.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        juzgado: juzgado.trim() || undefined,
        realizado: evento?.realizado,
      };
      if (evento) await updateEvent(evento.id, data);
      else await addEvent(data);

      // Limpiar formulario
      if (!evento) {
        setTitulo('');
        setDescripcion('');
        setJuzgado('');
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError(evento ? 'Error al editar el evento' : 'Error al agendar el evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={evento ? 'Editar evento' : 'Agendar evento'}
      subtitle={evento ? 'Modificar los datos del evento' : 'Programar audiencia, vencimiento de plazo, actuado o reunión'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            disabled={Boolean(preselectedCasoId)}
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
              <option value="Audiencia">Audiencia</option>
              <option value="Plazo">Plazo</option>
              <option value="Actuado">Actuado</option>
              <option value="Reunión">Reunión</option>
              <option value="Recordatorio">Recordatorio</option>
              <option value="Otro">Otro</option>
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
            disabled={isSubmitting || availableCases.length === 0}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-900 rounded-md hover:bg-brand-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            {isSubmitting ? 'Guardando...' : evento ? 'Guardar cambios' : 'Agendar Evento'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
