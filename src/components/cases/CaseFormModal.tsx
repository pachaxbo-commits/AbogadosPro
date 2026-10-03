import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { useProfile } from '../../context/ProfileContext';
import { AssigneeSelect } from '../common/AssigneeSelect';
import { AreaCaso, Caso, EstadoCaso, ParticipacionCaso, TipoIdentificacionJudicial } from '../../types';

interface CaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedClientId?: string;
  caso?: Caso;
  onSuccess?: (caseId: string) => void;
}

export const CaseFormModal: React.FC<CaseFormModalProps> = ({
  isOpen,
  onClose,
  preselectedClientId,
  caso,
  onSuccess,
}) => {
  const { clients, addCase, updateCase } = useLegalData();
  const { configuration } = useProfile();

  const [nombre, setNombre] = useState(caso?.nombre || '');
  const [clienteId, setClienteId] = useState(caso?.clienteId || preselectedClientId || (clients[0]?.id || ''));
  const [encargadoId, setEncargadoId] = useState(caso?.encargadoId || '');
  const [seguimiento, setSeguimiento] = useState(() => caso?.seguimientoDias === null ? 'none' : [7, 15, 30, 60].includes(caso?.seguimientoDias ?? 30) ? String(caso?.seguimientoDias ?? 30) : 'custom');
  const [customDays, setCustomDays] = useState(() => caso?.seguimientoDias && ![7, 15, 30, 60].includes(caso.seguimientoDias) ? String(caso.seguimientoDias) : '');
  const [area, setArea] = useState<AreaCaso>(caso?.area || configuration.categories.areas[0]);
  const [estado, setEstado] = useState<EstadoCaso>(caso?.estado || 'Activo');
  const [participacion, setParticipacion] = useState<ParticipacionCaso>(caso?.participacion || 'Demandante');
  const [tipoIdentificacionJudicial, setTipoIdentificacionJudicial] = useState<TipoIdentificacionJudicial>(caso?.tipoIdentificacionJudicial || 'NUREJ');
  const [numeroIdentificacionJudicial, setNumeroIdentificacionJudicial] = useState(caso?.numeroIdentificacionJudicial || '');
  const [honorariosAcordados, setHonorariosAcordados] = useState<string>(caso ? String(caso.honorariosAcordados) : '');
  const [juzgadoTribunal, setJuzgadoTribunal] = useState(caso?.juzgadoTribunal || '');
  const [descripcion, setDescripcion] = useState(caso?.descripcion || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentClientId = clienteId || preselectedClientId || (clients[0]?.id || '');
  const currentTipoIdentificacion = tipoIdentificacionJudicial;

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
      setError(`El número de ${currentTipoIdentificacion} es obligatorio`);
      return;
    }

    const feesNumber = Number(honorariosAcordados) || 0;
    if (feesNumber < 0) {
      setError('Los honorarios acordados no pueden ser un valor negativo');
      return;
    }
    const seguimientoDias = seguimiento === 'none' ? null : seguimiento === 'custom' ? Number(customDays) : Number(seguimiento);
    if (seguimientoDias !== null && (!Number.isInteger(seguimientoDias) || seguimientoDias < 1 || seguimientoDias > 3650)) {
      setError('Indica un seguimiento de 1 a 3650 días.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const data = {
        nombre: nombre.trim(),
        clienteId: currentClientId,
        encargadoId,
        seguimientoDias,
        area,
        estado,
        participacion,
        tipoIdentificacionJudicial: currentTipoIdentificacion,
        numeroIdentificacionJudicial: numeroIdentificacionJudicial.trim(),
        descripcion: caso ? descripcion.trim() : descripcion.trim() || 'Sin descripción detallada.',
        honorariosAcordados: feesNumber,
        juzgadoTribunal: juzgadoTribunal.trim() || undefined,
      };
      const guardado = caso ? await updateCase(caso.id, data) : await addCase(data);

      // Limpiar formulario
      if (!caso) {
        setNombre('');
        setNumeroIdentificacionJudicial('');
        setHonorariosAcordados('');
        setJuzgadoTribunal('');
        setDescripcion('');
        setEncargadoId('');
        setSeguimiento('30');
        setCustomDays('');
      }

      onClose();
      if (onSuccess) onSuccess(guardado.id);
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : (caso ? 'Error al actualizar el caso' : 'Error al registrar el expediente')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={caso ? 'Editar caso' : 'Nuevo Caso'}
      subtitle={caso ? 'Modificar datos del caso' : 'Apertura formal de expediente judicial o patrocinio extrajudicial'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className={caso ? 'space-y-4' : 'space-y-3'}>
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-md">
            {error}
          </div>
        )}

        <section className={caso ? 'space-y-4' : 'space-y-3'}>
          {!caso && <h4 className="border-b border-slate-100 border-l-2 border-l-amber-400 pb-1.5 pl-2 text-xs font-bold text-brand-900">Datos del caso</h4>}
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

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${caso ? 'gap-4' : 'gap-3'}`}>
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
              {[...new Set([...configuration.categories.areas, ...(caso && !configuration.categories.areas.includes(caso.area) ? [caso.area] : [])])].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${caso ? 'gap-4' : 'gap-3'}`}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Rol del cliente <span className="text-rose-500">*</span>
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
              {caso ? 'Estado' : 'Estado Inicial'} <span className="text-rose-500">*</span>
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
        <div>
          <label htmlFor="case-assignee" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">Encargado del caso (opcional)</label>
          <AssigneeSelect id="case-assignee" value={encargadoId} onChange={setEncargadoId} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-900 focus:outline-hidden focus:ring-1 focus:ring-brand-900" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="case-follow-up" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">Seguimiento</label>
            <select id="case-follow-up" value={seguimiento} onChange={(event) => setSeguimiento(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-900 focus:outline-hidden focus:ring-1 focus:ring-brand-900">
              <option value="7">7 días</option><option value="15">15 días</option><option value="30">30 días</option><option value="60">60 días</option><option value="custom">Personalizado</option><option value="none">Sin seguimiento</option>
            </select>
          </div>
          {seguimiento === 'custom' && <div><label htmlFor="case-custom-follow-up" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">Días entre revisiones</label><input id="case-custom-follow-up" type="number" min="1" max="3650" step="1" required value={customDays} onChange={(event) => setCustomDays(event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-900 focus:outline-hidden focus:ring-1 focus:ring-brand-900" /></div>}
        </div>
        </section>

        {/* NUREJ / CUD */}
        <section className={caso ? '' : 'space-y-2'}>
          {!caso && <h4 className="border-b border-slate-100 border-l-2 border-l-amber-400 pb-1.5 pl-2 text-xs font-bold text-brand-900">Identificación judicial</h4>}
        <div className={caso ? 'grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200' : 'grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200'}>
          <div>
            {caso && <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Identificación Judicial
            </label>}
            <div className={caso ? 'flex gap-4 mt-2' : 'flex gap-4 sm:mt-7'}>
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
              Número de {currentTipoIdentificacion} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={numeroIdentificacionJudicial}
              onChange={(e) => setNumeroIdentificacionJudicial(e.target.value)}
              placeholder={currentTipoIdentificacion === 'NUREJ' ? 'Ej: 30123456' : 'Ej: 201102012300123'}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900 bg-white"
            />
          </div>
        </div>
        </section>

        <section className={caso ? 'space-y-4' : 'space-y-3'}>
          {!caso && <h4 className="border-b border-slate-100 border-l-2 border-l-amber-400 pb-1.5 pl-2 text-xs font-bold text-brand-900">Información adicional</h4>}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${caso ? 'gap-4' : 'gap-3'}`}>
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
            rows={caso ? 3 : 2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Resumen del objeto del proceso, hechos sustanciales o pretensión legal..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          />
        </div>
        </section>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-brand-900 transition-colors hover:bg-brand-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-10 rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : caso ? 'Guardar cambios' : 'Crear Caso'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
