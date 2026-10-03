import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { Cliente } from '../../types';
import { PhoneInput } from '../common/PhoneInput';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (clientId: string) => void;
  client?: Cliente;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  client,
}) => {
  const { addClient, updateClient } = useLegalData();
  const [tipoCliente, setTipoCliente] = useState<'Persona' | 'Empresa' | ''>(
    client?.tipoCliente || (client?.identificacion?.trim().toUpperCase().startsWith('NIT ') ? 'Empresa' : client?.identificacion?.trim().toUpperCase().startsWith('CI ') ? 'Persona' : '')
  );
  const [nombre, setNombre] = useState(client?.nombre || '');
  const [telefono, setTelefono] = useState(client?.telefono || '');
  const [correo, setCorreo] = useState(client?.correo || '');
  const [identificacion, setIdentificacion] = useState(client?.identificacion || '');
  const [direccion, setDireccion] = useState(client?.direccion || '');
  const [notas, setNotas] = useState(client?.notas || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre o razón social es obligatorio');
      return;
    }
    if (!tipoCliente) {
      setError('Selecciona el tipo de cliente');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const data = {
        tipoCliente,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        correo: correo.trim() || undefined,
        identificacion: identificacion.trim() || undefined,
        direccion: direccion.trim() || undefined,
        notas: notas.trim() || undefined,
      };
      const saved = client ? await updateClient(client.id, data) : await addClient(data);

      // Limpiar formulario
      setNombre('');
      setTipoCliente('');
      setTelefono('');
      setCorreo('');
      setIdentificacion('');
      setDireccion('');
      setNotas('');

      onClose();
      if (onSuccess) onSuccess(saved.id);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ocurrió un error al guardar el cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={client ? 'Editar cliente' : 'Nuevo Cliente'}
      subtitle={client ? undefined : 'Registrar nuevo cliente particular o institucional'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-md">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1" htmlFor="tipo-cliente">
            Tipo de cliente <span className="text-rose-500">*</span>
          </label>
          <select
            id="tipo-cliente"
            required
            value={tipoCliente}
            onChange={(e) => setTipoCliente(e.target.value as 'Persona' | 'Empresa' | '')}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          >
            <option value="">Seleccionar tipo</option>
            <option value="Persona">Persona</option>
            <option value="Empresa">Empresa</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            {tipoCliente === 'Persona' ? 'Nombre completo' : tipoCliente === 'Empresa' ? 'Razón social' : 'Nombre completo / Razón social'} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={tipoCliente === 'Persona' ? 'Ej: Marcelo Quiroga' : tipoCliente === 'Empresa' ? 'Ej: Empresa S.A.' : 'Nombre del cliente'}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="client-phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Teléfono / Celular
            </label>
            <PhoneInput id="client-phone" value={telefono} onChange={setTelefono} disabled={isSubmitting} />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {tipoCliente === 'Persona' ? 'CI' : tipoCliente === 'Empresa' ? 'NIT' : 'CI / NIT'}
            </label>
            <input
              type="text"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
              placeholder={tipoCliente === 'Persona' ? 'Ej: CI 4892011 SC' : tipoCliente === 'Empresa' ? 'Ej: NIT 1029384751' : 'CI o NIT'}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Correo Electrónico (Opcional)
          </label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="cliente@ejemplo.bo"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Dirección
          </label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-brand-900 focus:border-brand-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Notas de Contacto / Observaciones
          </label>
          <textarea
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Anotaciones sobre el cliente, disponibilidad o condiciones acordadas..."
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
            {isSubmitting ? 'Guardando...' : client ? 'Guardar cambios' : 'Guardar cliente'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
