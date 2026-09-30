import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { TipoEvento } from '../../types';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCasoId?: string;
  onSuccess?: () => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  preselectedCasoId,
  onSuccess,
}) => {
  const { cases, addEvent } = useLegalData();

  const [casoId, setCasoId] = useState(preselectedCasoId || (cases[0]?.id || ''));
  const [tipo, setTipo] = useState<TipoEvento>('Audiencia');
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('10:00');
  const [descripcion, setDescripcion] = useState('');
  const [juzgado, setJuzgado] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentCasoId = casoId || preselectedCasoId || (cases[0]?.id || '');

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
      await addEvent({
        casoId: currentCasoId,
        tipo,
        titulo: titulo.trim(),
        fecha,
        hora: hora.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        juzgado: juzgado.trim() || undefined,
      });

      // Limpiar formulario
      setTitulo('');
      setDescripcion('');
      setJuzgado('');

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError('Error al agendar el evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agendar Evento Judicial"
      subtitle="Programar audiencia, vencimiento de plazo, actuado o reunión"
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
            Caso Asociado <span className="text-rose-500">*</span>
          </label>
          <select
            value={currentCasoId}
            onChange={(e) => setCasoId(e.target.value)}
            disabled={Boolean(preselectedCasoId)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 bg-white disabled:bg-slate-100"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.tipoIdentificacionJudicial}: {c.numeroIdentificacionJudicial})
              </option>
            ))}
          </select>
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
            Instrucciones / Observaciones
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
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-900 rounded-md hover:bg-brand-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            {isSubmitting ? 'Guardando...' : 'Agendar Evento'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
