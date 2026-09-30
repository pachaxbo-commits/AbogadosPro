import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { AreaCaso, EstadoCaso, ParticipacionCaso, TipoIdentificacionJudicial } from '../../types';

interface CaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedClientId?: string;
  onSuccess?: (caseId: string) => void;
}

export const CaseFormModal: React.FC<CaseFormModalProps> = ({
  isOpen,
  onClose,
  preselectedClientId,
  onSuccess,
}) => {
  const { clients, addCase } = useLegalData();

  const [nombre, setNombre] = useState('');
  const [clienteId, setClienteId] = useState(preselectedClientId || (clients[0]?.id || ''));
  const [area, setArea] = useState<AreaCaso>('Civil');
  const [estado, setEstado] = useState<EstadoCaso>('Activo');
  const [participacion, setParticipacion] = useState<ParticipacionCaso>('Demandante');
  const [tipoIdentificacionJudicial, setTipoIdentificacionJudicial] = useState<TipoIdentificacionJudicial>('NUREJ');
  const [numeroIdentificacionJudicial, setNumeroIdentificacionJudicial] = useState('');
  const [honorariosAcordados, setHonorariosAcordados] = useState<string>('');
  const [juzgadoTribunal, setJuzgadoTribunal] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentClientId = clienteId || preselectedClientId || (clients[0]?.id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('La carátula o nombre del caso es obligatoria');
      return;
    }
    if (!currentClientId) {
      setError('Debes asociar el caso a un cliente');
      return;
    }
    if (!numeroIdentificacionJudicial.trim()) {
      setError(`El número de ${tipoIdentificacionJudicial} es obligatorio`);
      return;
    }

    const feesNumber = Number(honorariosAcordados) || 0;
    if (feesNumber < 0) {
      setError('Los honorarios acordados no pueden ser un valor negativo');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const nuevo = await addCase({
        nombre: nombre.trim(),
        clienteId: currentClientId,
        area,
        estado,
        participacion,
        tipoIdentificacionJudicial,
        numeroIdentificacionJudicial: numeroIdentificacionJudicial.trim(),
        descripcion: descripcion.trim() || 'Sin descripción detallada.',
        honorariosAcordados: feesNumber,
        juzgadoTribunal: juzgadoTribunal.trim() || undefined,
      });

      // Limpiar formulario
      setNombre('');
      setNumeroIdentificacionJudicial('');
      setHonorariosAcordados('');
      setJuzgadoTribunal('');
      setDescripcion('');

      onClose();
      if (onSuccess) onSuccess(nuevo.id);
    } catch (err) {
      console.error(err);
      setError('Error al registrar el expediente');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Caso / Expediente"
      subtitle="Apertura formal de expediente judicial o patrocinio extrajudicial"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-md">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Carátula / Nombre del Caso <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Demandante c/ Demandado (Proceso Ordinario)"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Cliente Asignado <span className="text-rose-500">*</span>
            </label>
            <select
              value={currentClientId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 bg-white"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Área Jurídica <span className="text-rose-500">*</span>
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value as AreaCaso)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 bg-white"
            >
              <option value="Civil">Civil</option>
              <option value="Penal">Penal</option>
              <option value="Familiar">Familiar</option>
              <option value="Laboral">Laboral</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Calidad de Participación <span className="text-rose-500">*</span>
            </label>
            <select
              value={participacion}
              onChange={(e) => setParticipacion(e.target.value as ParticipacionCaso)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 bg-white"
            >
              <option value="Demandante">Demandante</option>
              <option value="Demandado">Demandado</option>
              <option value="Querellante">Querellante</option>
              <option value="Imputado">Imputado</option>
              <option value="Recurrente">Recurrente</option>
              <option value="Tercero interesado">Tercero interesado</option>
              <option value="Solicitante">Solicitante</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Estado Inicial <span className="text-rose-500">*</span>
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoCaso)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 bg-white"
            >
              <option value="Activo">Activo</option>
              <option value="En trámite">En trámite</option>
              <option value="En espera">En espera</option>
              <option value="Concluido">Concluido</option>
            </select>
          </div>
        </div>

        {/* NUREJ / CUD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Identificación Judicial
            </label>
            <div className="flex gap-4 mt-2">
              <label className="inline-flex items-center text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="tipoId"
                  checked={tipoIdentificacionJudicial === 'NUREJ'}
                  onChange={() => setTipoIdentificacionJudicial('NUREJ')}
                  className="mr-1.5 text-brand-900 focus:ring-brand-900"
                />
                NUREJ
              </label>
              <label className="inline-flex items-center text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="tipoId"
                  checked={tipoIdentificacionJudicial === 'CUD'}
                  onChange={() => setTipoIdentificacionJudicial('CUD')}
                  className="mr-1.5 text-brand-900 focus:ring-brand-900"
                />
                CUD
              </label>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Número de {tipoIdentificacionJudicial} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={numeroIdentificacionJudicial}
              onChange={(e) => setNumeroIdentificacionJudicial(e.target.value)}
              placeholder={tipoIdentificacionJudicial === 'NUREJ' ? 'Ej: 30123456' : 'Ej: 201102012300123'}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Honorarios Acordados (Bs)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-500">
                Bs
              </span>
              <input
                type="number"
                min="0"
                step="50"
                value={honorariosAcordados}
                onChange={(e) => setHonorariosAcordados(e.target.value)}
                placeholder="Ej: 10000"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Juzgado / Tribunal / Fiscal
            </label>
            <input
              type="text"
              value={juzgadoTribunal}
              onChange={(e) => setJuzgadoTribunal(e.target.value)}
              placeholder="Ej: Juzgado 3° de Partido en lo Civil"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Descripción y Objeto de la Causa
          </label>
          <textarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Resumen del objeto del proceso, hechos sustanciales o pretensión legal..."
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
            {isSubmitting ? 'Guardando...' : 'Crear Caso'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
