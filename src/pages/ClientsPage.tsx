import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { ClientFormModal } from '../components/clients/ClientFormModal';
import { formatBs } from '../services/formatters';
import {
  Users,
  Search,
  UserPlus,
  Briefcase,
  Phone,
  Mail,
} from 'lucide-react';

type EstadoFiltro = 'Todos' | 'Con casos activos' | 'Con saldo pendiente';
type AreaFiltro = 'Todas' | 'Civil' | 'Penal' | 'Familiar' | 'Laboral';

export const ClientsPage: React.FC = () => {
  const { clientsWithSummary, casesWithDetails } = useLegalData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<EstadoFiltro>('Todos');
  const [selectedArea, setSelectedArea] = useState<AreaFiltro>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return clientsWithSummary.filter((cliente) => {
      const matchesSearch = !term ||
        cliente.nombre.toLowerCase().includes(term) ||
        cliente.identificacion?.toLowerCase().includes(term) ||
        cliente.telefono.toLowerCase().includes(term) ||
        cliente.correo?.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (selectedArea === 'Todas') {
        return selectedEstado === 'Todos' ||
          (selectedEstado === 'Con casos activos' && cliente.casosActivos > 0) ||
          (selectedEstado === 'Con saldo pendiente' && cliente.saldoPendienteTotal > 0);
      }

      return casesWithDetails.some((caso) =>
        caso.clienteId === cliente.id &&
        caso.area === selectedArea &&
        (selectedEstado === 'Todos' ||
          (selectedEstado === 'Con casos activos' && (caso.estado === 'Activo' || caso.estado === 'En trámite')) ||
          (selectedEstado === 'Con saldo pendiente' && caso.totalPendiente > 0))
      );
    });
  }, [clientsWithSummary, casesWithDetails, searchTerm, selectedEstado, selectedArea]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-brand-800 bg-brand-900 px-5 py-6 text-white shadow-sm sm:flex-row sm:items-center sm:px-7">
        <div>
          <span className="mb-3 block h-0.5 w-9 bg-amber-400" aria-hidden="true" />
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Cartera de Clientes
          </h1>
          <p className="mt-2 text-sm text-slate-200">
            Gestión de patrocinados particulares y corporativos
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-amber-400 bg-amber-400 px-4 py-2.5 text-sm font-bold text-brand-950 transition-colors hover:bg-amber-300"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4">
        {/* Barra de búsqueda */}
        <div className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 px-3 focus-within:border-brand-500">
          <Search className="h-4 w-4 shrink-0 text-brand-700" />
          <input
            type="text"
            aria-label="Buscar clientes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, CI, NIT, teléfono o correo..."
            className="min-w-0 w-full bg-transparent text-sm placeholder-slate-400 focus:outline-hidden"
          />
          {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="min-h-9 rounded px-2 text-xs font-medium text-brand-900 hover:bg-brand-50">Limpiar</button>}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          Estado
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value as EstadoFiltro)}
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-brand-900"
          >
            <option value="Todos">Todos</option>
            <option value="Con casos activos">Con casos activos</option>
            <option value="Con saldo pendiente">Con saldo pendiente</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          Área
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value as AreaFiltro)}
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-brand-900"
          >
            <option value="Todas">Todas</option>
            <option value="Civil">Civil</option>
            <option value="Penal">Penal</option>
            <option value="Familiar">Familiar</option>
            <option value="Laboral">Laboral</option>
          </select>
        </label>
        <span className="ml-auto text-xs font-medium text-slate-500">{filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}</span>
        </div>
      </div>

      {/* Tabla en Desktop / Tarjetas en Móvil */}
      {filteredClients.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <Users className="mx-auto mb-3 h-9 w-9 text-brand-700" />
          <p className="text-sm font-semibold text-slate-700">{searchTerm || selectedEstado !== 'Todos' || selectedArea !== 'Todas' ? 'No se encontraron clientes' : 'No hay clientes registrados todavía.'}</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm || selectedEstado !== 'Todos' || selectedArea !== 'Todas'
              ? 'Prueba con otra búsqueda o cambia los filtros'
              : 'Registra el primer cliente para comenzar'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="mobile-data-table w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-brand-50/50 text-brand-900 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Cliente / Razón Social
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Contacto
                  </th>
                  <th scope="col" className="px-4 py-3 text-center">
                    Casos
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Total pendiente
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredClients.map((cliente) => (
                  <tr
                    key={cliente.id}
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                    tabIndex={0}
                    role="link"
                    aria-label={`Ver cliente ${cliente.nombre}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/clientes/${cliente.id}`); } }}
                    className="group cursor-pointer select-none transition-colors hover:bg-brand-50/60 focus-visible:bg-brand-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-900"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{cliente.nombre}</div>
                      {cliente.identificacion && (
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {cliente.identificacion}
                        </div>
                      )}
                    </td>

                    <td data-label="Contacto" className="px-4 py-3 text-xs text-slate-600">
                      {cliente.telefono && <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cliente.telefono}</span>
                      </div>}
                      {cliente.correo && (
                        <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[200px]">{cliente.correo}</span>
                        </div>
                      )}
                    </td>

                    <td data-label="Casos" className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-md border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900">
                        <Briefcase className="h-3 w-3 text-brand-700" />
                        <span>
                          {cliente.casosTotal} {cliente.casosTotal === 1 ? 'caso' : 'casos'}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-emerald-700 font-semibold">
                          {cliente.casosActivos} {cliente.casosActivos === 1 ? 'activo' : 'activos'}
                        </span>
                      </span>
                    </td>

                    <td data-label="Pendiente" className="px-4 py-3 text-right">
                      <span
                        className={`text-sm font-semibold font-mono ${
                          cliente.saldoPendienteTotal > 0
                            ? 'text-amber-800'
                            : 'text-slate-500'
                        }`}
                      >
                        {formatBs(cliente.saldoPendienteTotal)}
                      </span>
                    </td>

                    <td data-label="Acción" className="px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-brand-900 transition-colors group-hover:bg-brand-100">
                        Ver cliente →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuevo Cliente */}
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newId) => navigate(`/clientes/${newId}`)}
      />
    </div>
  );
};
