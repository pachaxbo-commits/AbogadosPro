import { eventState } from '../services/eventResults';
import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { useProfile } from '../context/ProfileContext';
import { StatusBadge, AreaBadge, JudicialIdBadge } from '../components/common/StatusBadge';
import { CaseFormModal } from '../components/cases/CaseFormModal';
import { formatFecha, formatHora, getTodayIsoString } from '../services/formatters';
import { caseFollowUp } from '../services/caseFollowUp';
import { useTaskClock } from '../hooks/useTaskClock';
import {
  Briefcase,
  Search,
  Filter,
  FilePlus,
  Calendar,
  User,
} from 'lucide-react';

type QuickFilter = 'Todos' | 'Activos';

const normalizeSearch = (value: string) => value.toLowerCase().trim().replace(/\s+/g, ' ');

export const CasesPage: React.FC = () => {
  const { casesWithDetails, clients, eventsWithCase, activities, documents, tasks, events } = useLegalData();
  const { assignees } = useProfile();
  const now = useTaskClock();
  const navigate = useNavigate();
  const location = useLocation();
  const [caseDeletedNotice, setCaseDeletedNotice] = useState(() => Boolean((location.state as { caseDeleted?: boolean } | null)?.caseDeleted));
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('Todas');
  const [selectedEstado, setSelectedEstado] = useState<string>('Todos');
  const [selectedEncargado, setSelectedEncargado] = useState('');
  const [selectedSeguimiento, setSelectedSeguimiento] = useState('todos');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(() => searchParams.get('estado') === 'activos' ? 'Activos' : 'Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const clientMap = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const assigneeMap = useMemo(() => new Map(assignees.map((item) => [item.id, item.nombre])), [assignees]);
  const areas = [...new Set(['Civil', 'Penal', 'Familiar', 'Laboral', ...casesWithDetails.map((caso) => caso.area)])];
  const today = getTodayIsoString();
  const upcomingByCase = useMemo(() => {
    const upcoming = new Map<string, (typeof eventsWithCase)[number]>();
    for (const event of eventsWithCase) {
      if (event.fecha >= today && eventState(event) === 'Próximo' && !upcoming.has(event.casoId)) upcoming.set(event.casoId, event);
    }
    return upcoming;
  }, [eventsWithCase, today]);
  const followUpByCase = useMemo(() => new Map(casesWithDetails.map((caso) => [caso.id, caseFollowUp(caso, activities, documents, tasks, events, now)])), [casesWithDetails, activities, documents, tasks, events, now]);

  const filteredCases = useMemo(() => {
    const term = normalizeSearch(searchTerm);
    const compactTerm = term.replace(/\s/g, '');
    const phoneTerm = term.replace(/\D/g, '');
    return casesWithDetails.filter((caso) => {
      const client = clientMap.get(caso.clienteId);
      const fields = [caso.nombre, caso.tipoIdentificacionJudicial, caso.numeroIdentificacionJudicial, caso.clienteNombre, client?.identificacion, client?.telefono, client?.correo];
      const matchesSearch = !term || fields.some((field) => field && normalizeSearch(field).includes(term)) ||
        (compactTerm && [caso.numeroIdentificacionJudicial, client?.identificacion].some((field) => field?.toLowerCase().replace(/\s/g, '').includes(compactTerm))) ||
        (phoneTerm.length >= 4 && client?.telefono.replace(/\D/g, '').includes(phoneTerm));

      // Filtro Área
      const matchesArea =
        selectedArea === 'Todas' || caso.area === selectedArea;

      // Filtro Estado
      const matchesEstado =
        selectedEstado === 'Todos' ||
        (selectedEstado === 'Activos'
          ? caso.estado === 'Activo' || caso.estado === 'En trámite'
          : caso.estado === selectedEstado);

      const matchesQuickFilter = quickFilter === 'Todos' ||
        (quickFilter === 'Activos' && (caso.estado === 'Activo' || caso.estado === 'En trámite'));

      const matchesAssignee = !selectedEncargado || (selectedEncargado === '__unassigned__' ? !caso.encargadoId : caso.encargadoId === selectedEncargado);
      const followUp = followUpByCase.get(caso.id);
      const matchesFollowUp = selectedSeguimiento === 'todos' || (selectedSeguimiento === 'sin' ? followUp?.frequency === null : selectedSeguimiento === 'al-dia' ? followUp?.state === 'al-dia' || (followUp?.state === 'concluido' && followUp.frequency !== null) : followUp?.state === selectedSeguimiento);

      return matchesSearch && matchesArea && matchesEstado && matchesQuickFilter && matchesAssignee && matchesFollowUp;
    });
  }, [casesWithDetails, clientMap, searchTerm, selectedArea, selectedEstado, selectedEncargado, selectedSeguimiento, quickFilter, followUpByCase]);

  return (
    <div className="space-y-5">
      {caseDeletedNotice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Caso eliminado correctamente.<button type="button" aria-label="Cerrar confirmación" onClick={() => setCaseDeletedNotice(false)} className="float-right ml-3">×</button></div>}
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-brand-800 bg-brand-900 px-5 py-6 text-white shadow-sm sm:flex-row sm:items-center sm:px-7">
        <div>
          <span className="mb-3 block h-0.5 w-9 bg-amber-400" aria-hidden="true" />
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Casos
          </h1>
          <p className="mt-2 text-sm text-slate-200">
            Control integral de procesos judiciales y arbitrales
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-amber-400 bg-amber-400 px-4 py-2.5 text-sm font-bold text-brand-950 transition-colors hover:bg-amber-300"
        >
          <FilePlus className="w-4 h-4" />
          <span>Nuevo Caso</span>
        </button>
      </div>

      {/* Controles: Búsqueda y Filtros */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4 xl:flex-row">
        {/* Buscador */}
        <div className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-slate-200 px-3 focus-within:border-brand-500">
          <Search className="h-4 w-4 shrink-0 text-brand-700" />
          <input
            type="text"
            aria-label="Buscar casos"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar caso, cliente, CI, teléfono, NUREJ o CUD..."
            className="min-w-0 w-full bg-transparent text-sm placeholder-slate-400 focus:outline-hidden"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              type="button"
              className="min-h-9 rounded px-2 text-xs font-medium text-brand-900 hover:bg-brand-50"
            >
              ×
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 xl:flex-nowrap">
          <div className="flex items-center gap-1 text-xs text-brand-700">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Filtros:</span>
          </div>

          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="min-h-10 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-brand-900"
          >
            <option value="Todas">Todas las áreas</option>
            {areas.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>

          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="min-h-10 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-brand-900"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activos">Activos (incluye en trámite)</option>
            <option value="Activo">Activo</option>
            <option value="En trámite">En trámite</option>
            <option value="En espera">En espera</option>
            <option value="Concluido">Concluido</option>
          </select>

          <select aria-label="Filtrar casos por encargado" value={selectedEncargado} onChange={(e) => setSelectedEncargado(e.target.value)} className="min-h-10 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-brand-900">
            <option value="">Todos los encargados</option>
            <option value="__unassigned__">Sin encargado</option>
            {assignees.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.estado === 'Inactivo' ? ' (inactivo)' : ''}</option>)}
          </select>
          <select aria-label="Filtrar casos por seguimiento" value={selectedSeguimiento} onChange={(e) => setSelectedSeguimiento(e.target.value)} className="min-h-10 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-brand-900">
            <option value="todos">Todo seguimiento</option><option value="al-dia">Al día</option><option value="requiere">Requieren seguimiento</option><option value="sin">Sin seguimiento</option>
          </select>

          {(selectedArea !== 'Todas' || selectedEstado !== 'Todos' || selectedEncargado || selectedSeguimiento !== 'todos' || searchTerm || quickFilter !== 'Todos') && (
            <button
              onClick={() => {
                setSelectedArea('Todas');
                setSelectedEstado('Todos');
                setSelectedEncargado('');
                setSelectedSeguimiento('todos');
                setSearchTerm('');
                setQuickFilter('Todos');
              }}
              type="button"
              className="rounded px-2 py-1 text-xs font-medium text-brand-900 hover:bg-brand-50"
            >
              Restablecer
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" aria-label="Filtros rápidos de casos">
        {(['Todos', 'Activos'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setQuickFilter(option)}
            aria-pressed={quickFilter === option}
            className={`min-h-9 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${quickFilter === option ? 'border-brand-900 bg-brand-900 text-white' : 'border-slate-200 bg-white text-brand-900 hover:bg-brand-50'}`}
          >
            {option}
          </button>
        ))}
        <span className="ml-auto text-xs font-medium text-slate-500">{filteredCases.length} {filteredCases.length === 1 ? 'caso' : 'casos'}</span>
      </div>

      {/* Lista / Tabla de Casos */}
      {filteredCases.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <Briefcase className="mx-auto mb-3 h-9 w-9 text-brand-700" />
          <p className="text-sm font-semibold text-slate-700">{searchTerm || selectedArea !== 'Todas' || selectedEstado !== 'Todos' || selectedEncargado || selectedSeguimiento !== 'todos' || quickFilter !== 'Todos' ? 'No se encontraron casos' : 'No hay casos registrados todavía.'}</p>
          <p className="text-xs text-slate-500 mt-1">
            Modifica los filtros seleccionados o abre un nuevo caso.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="mobile-data-table w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-brand-50/50 text-brand-900 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Caso
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Área / Estado
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Identificación Judicial
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Próximo Evento
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredCases.map((caso) => (
                  <tr
                    key={caso.id}
                    onClick={() => navigate(`/casos/${caso.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/casos/${caso.id}`); } }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Ver caso ${caso.nombre}`}
                    className="group cursor-pointer select-none transition-colors hover:bg-brand-50/60 focus-visible:bg-brand-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-900"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 group-hover:text-brand-900">
                        {caso.nombre}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
                        <span>Rol: <span className="font-medium text-slate-600">{caso.participacion}</span></span>
                        <span>Encargado: <span className="font-medium text-slate-700">{caso.encargadoId ? assigneeMap.get(caso.encargadoId) || 'No disponible' : 'Sin encargado'}</span></span>
                      </div>
                      <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${followUpByCase.get(caso.id)?.state === 'requiere' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{followUpByCase.get(caso.id)?.state === 'requiere' ? `Requiere seguimiento · ${followUpByCase.get(caso.id)?.overdueDays} d` : followUpByCase.get(caso.id)?.state === 'sin' ? 'Sin seguimiento' : followUpByCase.get(caso.id)?.state === 'concluido' ? 'Concluido' : 'Al día'}</span>
                    </td>

                    <td data-label="Cliente" className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{caso.clienteNombre}</span>
                      </div>
                    </td>

                    <td data-label="Área / Estado" className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <AreaBadge area={caso.area} />
                        <StatusBadge status={caso.estado} />
                      </div>
                    </td>

                    <td data-label="Identificación" className="px-4 py-3">
                      <JudicialIdBadge
                        tipo={caso.tipoIdentificacionJudicial}
                        numero={caso.numeroIdentificacionJudicial}
                      />
                    </td>

                    <td data-label="Próximo evento" className="px-4 py-3 md:min-w-44">
                      {upcomingByCase.get(caso.id) ? (
                        <div className="text-xs space-y-0.5">
                          <div className="font-semibold text-slate-800">
                            {upcomingByCase.get(caso.id)?.tipo}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{formatFecha(upcomingByCase.get(caso.id)?.fecha)}{upcomingByCase.get(caso.id)?.hora && ` · ${formatHora(upcomingByCase.get(caso.id)?.hora)}`}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin eventos futuros</span>
                      )}
                    </td>

                    <td data-label="Acción" className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-brand-900 transition-colors group-hover:bg-brand-100 whitespace-nowrap">
                        Ver caso →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuevo Caso */}
      <CaseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newId) => navigate(`/casos/${newId}`)}
      />
    </div>
  );
};
