import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { useProfile } from '../../context/ProfileContext';
import { TipoActividad } from '../../types';

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  casoId: string;
  onSuccess?: () => void;
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
  casoId,
  onSuccess,
}) => {
  const { addActivity } = useLegalData();
  const { configuration } = useProfile();

  const [tipo, setTipo] = useState<TipoActividad>(configuration.categories.activities[0]);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setError('El título o resumen de la actividad es obligatorio');
      return;
    }
    if (!fecha) {
      setError('La fecha es obligatoria');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await addActivity({
        casoId,
        tipo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha,
        hora: hora.trim() || undefined,
      });

      // Limpiar formulario
      setTitulo('');
      setDescripcion('');
      setHora('');

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError('Error al registrar la actividad');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Actividad del Caso"
      subtitle="Incorporar un hecho procesal, presentación de memorial, notificación o nota"
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
            Tipo de Actividad <span className="text-rose-500">*</span>
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoActividad)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 bg-white"
          >
            {configuration.categories.activities.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Título / Resumen Breve <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Presentación de memorial de subsanación..."
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
            Detalle / Descripción
          </label>
          <textarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción detallada de la actuación, número de fojas, personas presentes o acuerdos..."
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
            {isSubmitting ? 'Guardando...' : 'Guardar Actividad'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
