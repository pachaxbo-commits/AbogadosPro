import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { StatusBadge, AreaBadge, JudicialIdBadge } from '../components/common/StatusBadge';
import { CaseFormModal } from '../components/cases/CaseFormModal';
import { ClientFormModal } from '../components/clients/ClientFormModal';
import { WhatsAppContact } from '../components/common/WhatsAppContact';
import { EventFormModal } from '../components/events/EventFormModal';
import { formatBs, formatFecha, formatHora, getTodayIsoString } from '../services/formatters';
import {
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Plus,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clientsWithSummary, casesWithDetails, eventsWithCase } = useLegalData();

  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const cliente = clientsWithSummary.find((c) => c.id === id);
  const clienteCasos = casesWithDetails.filter((c) => c.clienteId === id);
  const clienteCasoIds = new Set(clienteCasos.map((c) => c.id));
  const hoyStr = getTodayIsoString();
  const proximoEvento = eventsWithCase.find((event) => clienteCasoIds.has(event.casoId) && event.fecha >= hoyStr);

  if (!cliente) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">Cliente no encontrado</h2>
        <p className="text-sm text-slate-500 mt-1">El registro solicitado no existe o fue eliminado.</p>
        <Link
          to="/clientes"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-900 rounded-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Clientes</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón Volver */}
      <div>
        <Link
          to="/clientes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la lista de Clientes</span>
        </Link>
      </div>

      {/* Cabecera del Cliente */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-900 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
              {cliente.nombre.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{cliente.nombre}</h1>
                {cliente.identificacion && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {cliente.identificacion}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Registrado el {formatFecha(cliente.fechaRegistro)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onClick={() => setIsEditModalOpen(true)} className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors">
              Editar cliente
            </button>
            <button type="button" onClick={() => setIsCaseModalOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 rounded-md transition-colors shadow-xs">
              <Plus className="w-4 h-4" /> Nuevo caso
            </button>
            <button type="button" onClick={() => setIsEventModalOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors">
              <Plus className="w-4 h-4" /> Agendar evento
            </button>
          </div>
        </div>

        {/* Ficha de contacto y notas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-100">
          {(cliente.telefono || cliente.correo || cliente.direccion) && <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Datos de Contacto
            </h4>
            <div className="space-y-2 text-xs text-slate-700">
              {cliente.telefono && <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium">{cliente.telefono}</span>
              </div>}
              <WhatsAppContact phone={cliente.telefono} />
              {cliente.correo && <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{cliente.correo}</span>
              </div>}
              {cliente.direccion && <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{cliente.direccion}</span>
              </div>}
            </div>
          </div>}

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Resumen
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Casos totales:</span>
                <span className="font-semibold text-slate-800">{cliente.casosTotal}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Casos en curso:</span>
                <span className="font-semibold text-emerald-700">{cliente.casosActivos}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Total pendiente:</span>
                <span className="font-bold font-mono text-slate-900">
                  {formatBs(cliente.saldoPendienteTotal)}
                </span>
              </div>
              {cliente.gastosPendientesTotal > 0 && <div className="text-right text-[11px] text-slate-500">
                Honorarios: {formatBs(cliente.honorariosPendientesTotal)} · Gastos: {formatBs(cliente.gastosPendientesTotal)}
              </div>}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Notas y Observaciones
            </h4>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 leading-relaxed">
              {cliente.notas || 'No se registraron notas internas para este cliente.'}
            </p>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Calendar className="w-4 h-4 text-brand-900" /> Próximo evento
        </h2>
        {proximoEvento ? (
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{proximoEvento.tipo}: {proximoEvento.titulo}</p>
            <p>{formatFecha(proximoEvento.fecha)}{proximoEvento.hora ? ` · ${formatHora(proximoEvento.hora)}` : ''}</p>
            <p className="text-slate-500">{proximoEvento.casoNombre}</p>
          </div>
        ) : <p className="mt-2 text-sm text-slate-500">No hay eventos próximos</p>}
      </section>

      {/* Lista de Casos Asociados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-brand-900" />
            <h2 className="text-base font-bold text-slate-900">
              Casos Asociados ({clienteCasos.length})
            </h2>
          </div>
        </div>

        {clienteCasos.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-lg border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">Este cliente aún no tiene casos asociados.</p>
            <button
              onClick={() => setIsCaseModalOpen(true)}
              className="mt-3 text-xs font-semibold text-brand-900 hover:underline"
            >
              Abrir primer caso
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {clienteCasos.map((caso) => (
              <Link
                key={caso.id}
                to={`/casos/${caso.id}`}
                className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:bg-brand-50/60 hover:border-brand-200 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-brand-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <AreaBadge area={caso.area} />
                    <StatusBadge status={caso.estado} />
                    {caso.numeroIdentificacionJudicial && <JudicialIdBadge tipo={caso.tipoIdentificacionJudicial} numero={caso.numeroIdentificacionJudicial} />}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 hover:text-brand-900 transition-colors">
                    {caso.nombre}
                  </h3>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Total pendiente
                    </div>
                    <div
                      className={`text-sm font-bold font-mono ${
                        caso.totalPendiente > 0 ? 'text-amber-800' : 'text-slate-600'
                      }`}
                    >
                      {formatBs(caso.totalPendiente)}
                    </div>
                  </div>

                  <div className="flex items-center text-xs font-semibold text-brand-900 gap-1">
                    <span>Ver caso →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear caso directamente asignado a este cliente */}
      <CaseFormModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        preselectedClientId={cliente.id}
        onSuccess={(newCaseId) => navigate(`/casos/${newCaseId}`)}
      />
      {isEditModalOpen && (
        <ClientFormModal isOpen onClose={() => setIsEditModalOpen(false)} client={cliente} />
      )}
      {isEventModalOpen && (
        <EventFormModal isOpen onClose={() => setIsEventModalOpen(false)} preselectedClientId={cliente.id} />
      )}
    </div>
  );
};
