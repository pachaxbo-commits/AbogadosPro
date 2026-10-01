import React, { useState } from 'react';
import { Modal } from '../common/Modal';

interface Props {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}

export const FinancialRowActions: React.FC<Props> = ({ label, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" aria-label={`Acciones de ${label}`} onClick={() => setOpen(true)}
      className="cursor-pointer select-none rounded px-2 py-1 text-base font-bold text-slate-600 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-900">
      ⋯
    </button>
    {open && <Modal isOpen onClose={() => setOpen(false)} title={`Acciones de ${label}`} maxWidth="sm">
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => { setOpen(false); onEdit(); }}
          className="rounded-md border border-slate-200 px-4 py-2 text-left text-sm font-medium text-brand-900 hover:bg-brand-50">
          Editar
        </button>
        <button type="button" onClick={() => { setOpen(false); onDelete(); }}
          className="rounded-md border border-rose-200 px-4 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50">
          Eliminar
        </button>
      </div>
    </Modal>}
  </>;
};
