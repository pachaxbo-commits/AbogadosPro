import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { StatusBadge, AreaBadge, JudicialIdBadge } from '../components/common/StatusBadge';
import { CaseFormModal } from '../components/cases/CaseFormModal';
import { formatFecha, formatHora } from '../services/formatters';
import {
  Briefcase,
  Search,
  Filter,
  FilePlus,
  Calendar,
  ChevronRight,
  User,
} from 'lucide-react';

export const CasesPage: React.FC = () => {
  const { casesWithDetails } = useLegalData();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('Todas');
  const [selectedEstado, setSelectedEstado] = useState<string>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredCases = useMemo(() => {
    return casesWithDetails.filter((caso) => {
      // Búsqueda
      const matchesSearch =
        !searchTerm.trim() ||
        caso.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caso.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caso.numeroIdentificacionJudicial.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro Área
      const matchesArea =
        selectedArea === 'Todas' || caso.area === selectedArea;

      // Filtro Estado
      const matchesEstado =
        selectedEstado === 'Todos' || caso.estado === selectedEstado;

      return matchesSearch && matchesArea && matchesEstado;
    });
  }, [casesWithDetails, searchTerm, selectedArea, selectedEstado]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Expedientes y Causas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Control integral de procesos judiciales y arbitrales
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 rounded-md transition-colors shadow-xs"
        >
          <FilePlus className="w-4 h-4" />
          <span>Nuevo Caso</span>
        </button>
      </div>

      {/* Controles: Búsqueda y Filtros */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        {/* Buscador */}
        <div className="flex-1 flex items-center gap-2 px-2 border border-slate-200 rounded-md focus-within:border-brand-900">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por carátula, NUREJ/CUD o cliente..."
            className="w-full py-1.5 text-sm bg-transparent focus:outline-hidden"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Filtros:</span>
          </div>

          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-brand-900"
          >
            <option value="Todas">Todas las áreas</option>
            <option value="Civil">Civil</option>
            <option value="Penal">Penal</option>
            <option value="Familiar">Familiar</option>
            <option value="Laboral">Laboral</option>
          </select>

          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-brand-900"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="En trámite">En trámite</option>
            <option value="En espera">En espera</option>
            <option value="Concluido">Concluido</option>
          </select>

          {(selectedArea !== 'Todas' || selectedEstado !== 'Todos' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedArea('Todas');
                setSelectedEstado('Todos');
                setSearchTerm('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline px-1"
            >
              Restablecer
            </button>
          )}
        </div>
      </div>

      {/* Lista / Tabla de Casos */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200 p-6">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No se encontraron expedientes</p>
          <p className="text-xs text-slate-500 mt-1">
            Modifica los filtros seleccionados o abre un nuevo caso.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Expediente / Carátula
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Cliente Patrocinado
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Área / Estado
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Identificación Judicial
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Próximo Evento
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredCases.map((caso) => (
                  <tr
                    key={caso.id}
                    onClick={() => navigate(`/casos/${caso.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 group-hover:text-brand-900">
                        {caso.nombre}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Rol: <span className="font-medium text-slate-600">{caso.participacion}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{caso.clienteNombre}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <AreaBadge area={caso.area} />
                        <StatusBadge status={caso.estado} />
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <JudicialIdBadge
                        tipo={caso.tipoIdentificacionJudicial}
                        numero={caso.numeroIdentificacionJudicial}
                      />
                    </td>

                    <td className="px-5 py-4">
                      {caso.proximoEvento ? (
                        <div className="text-xs space-y-0.5">
                          <div className="font-semibold text-slate-800 line-clamp-1">
                            {caso.proximoEvento.tipo}: {caso.proximoEvento.titulo}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatFecha(caso.proximoEvento.fecha)}</span>
                            {caso.proximoEvento.hora && (
                              <span>· {formatHora(caso.proximoEvento.hora)}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin eventos futuros</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center text-xs font-semibold text-brand-900">
                        Abrir
                        <ChevronRight className="w-4 h-4 ml-0.5" />
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
