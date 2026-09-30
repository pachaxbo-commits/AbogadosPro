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
  ChevronRight,
} from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const { clientsWithSummary } = useLegalData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clientsWithSummary;
    const term = searchTerm.toLowerCase();
    return clientsWithSummary.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        (c.identificacion && c.identificacion.toLowerCase().includes(term)) ||
        c.telefono.toLowerCase().includes(term)
    );
  }, [clientsWithSummary, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cartera de Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de patrocinados particulares y corporativos
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 rounded-md transition-colors shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, CI, NIT o teléfono..."
          className="w-full text-sm placeholder-slate-400 bg-transparent focus:outline-hidden"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla en Desktop / Tarjetas en Móvil */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200 p-6">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No se encontraron clientes</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm ? 'Intenta con otro término de búsqueda' : 'Registra el primer cliente para comenzar'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Cliente / Razón Social
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Contacto
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-center">
                    Expedientes
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Saldo Pendiente
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredClients.map((cliente) => (
                  <tr
                    key={cliente.id}
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{cliente.nombre}</div>
                      {cliente.identificacion && (
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {cliente.identificacion}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cliente.telefono}</span>
                      </div>
                      {cliente.correo && (
                        <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[200px]">{cliente.correo}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        <Briefcase className="w-3 h-3 text-slate-500" />
                        <span>
                          {cliente.casosTotal} {cliente.casosTotal === 1 ? 'caso' : 'casos'}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-emerald-700 font-semibold">
                          {cliente.casosActivos} act.
                        </span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
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

                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center text-xs font-semibold text-brand-900 group-hover:text-brand-700">
                        Ver ficha
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

      {/* Modal Nuevo Cliente */}
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newId) => navigate(`/clientes/${newId}`)}
      />
    </div>
  );
};
