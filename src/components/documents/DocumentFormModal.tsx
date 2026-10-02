import { useId, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { DOCUMENT_ACCEPT, DOCUMENT_CATEGORIES, documentErrors, documentExtension, documentSize, validateDocumentFile, type DocumentErrors } from '../../services/documents';
import type { DatosDocumento, DocumentoCaso } from '../../types';

const field = 'mt-1 w-full min-w-0 min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-brand-900';
const label = 'block text-xs font-semibold uppercase tracking-wider text-slate-700';
export function DocumentFormModal({ casoId, document: existing, onClose, onSuccess }: {
  casoId: string; document?: DocumentoCaso; onClose: () => void; onSuccess: () => void;
}) {
  const { addDocument, updateDocument } = useLegalData();
  const id = useId();
  const [data, setData] = useState<DatosDocumento>(() => ({ nombre: existing?.nombre || '', categoria: existing?.categoria || '', fechaDocumento: existing?.fechaDocumento || '', descripcion: existing?.descripcion || '' }));
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<DocumentErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const busy = useRef(false);
  const selection = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const patch = (value: Partial<DatosDocumento>) => { setData((prev) => ({ ...prev, ...value })); setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(value).map((key) => [key, undefined])) })); setError(''); };
  const choose = async (selected?: File) => {
    if (!selected || busy.current) return;
    const version = ++selection.current;
    setChecking(true); setFile(null); setErrors((prev) => ({ ...prev, archivo: undefined }));
    try {
      await validateDocumentFile(selected);
      if (version !== selection.current) return;
      setFile(selected);
      setData((prev) => ({ ...prev, nombre: prev.nombre.trim() ? prev.nombre : selected.name.replace(/\.[^.]+$/, '') }));
    } catch (err) {
      if (version === selection.current) setErrors((prev) => ({ ...prev, archivo: err instanceof Error ? err.message : 'No se pudo leer el archivo.' }));
    } finally { if (version === selection.current) setChecking(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current || checking) return;
    const validation = documentErrors(data);
    if (!existing && !file) validation.archivo = errors.archivo || 'Selecciona un archivo.';
    setErrors(validation);
    if (Object.keys(validation).length) return;
    busy.current = true; setSaving(true); setError('');
    try {
      if (existing) await updateDocument(casoId, existing.id, data);
      else if (file) await addDocument(casoId, data, file);
      onSuccess(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el documento.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const errorFor = (name: keyof DocumentErrors) => errors[name] ? <p id={`${id}-${name}-error`} role="alert" className="mt-1 text-xs text-rose-700">{errors[name]}</p> : null;
  return <Modal isOpen title={existing ? 'Editar documento' : 'Subir documento'} onClose={() => { if (!busy.current) onClose(); }} maxWidth="lg">
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div><label htmlFor={`${id}-nombre`} className={label}>Nombre del documento *</label><input id={`${id}-nombre`} required value={data.nombre} onChange={(e) => patch({ nombre: e.target.value })} className={field} aria-invalid={!!errors.nombre} aria-describedby={errors.nombre ? `${id}-nombre-error` : undefined} />{errorFor('nombre')}</div>
      <div><label htmlFor={`${id}-categoria`} className={label}>Categoría *</label><select id={`${id}-categoria`} required value={data.categoria} onChange={(e) => patch({ categoria: e.target.value })} className={field} aria-invalid={!!errors.categoria} aria-describedby={errors.categoria ? `${id}-categoria-error` : undefined}><option value="">Seleccionar categoría</option>{DOCUMENT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>{errorFor('categoria')}</div>
      {existing ? <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600 break-words"><span className="font-semibold">Archivo: </span>{existing.nombreArchivo}<p className="mt-1">La edición conserva el archivo original.</p></div> : <div>
        <label htmlFor={`${id}-archivo`} className={label}>Archivo *</label>
        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void choose(e.dataTransfer.files[0]); }} className="mt-1 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="mb-2 flex items-center gap-2 text-sm text-slate-600"><Upload className="h-4 w-4" />Selecciona o arrastra un archivo</p>
          <input ref={fileInput} id={`${id}-archivo`} type="file" accept={DOCUMENT_ACCEPT} disabled={saving} onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ''; }} className="hidden" />
          <button type="button" disabled={saving} onClick={() => fileInput.current?.click()} className="min-h-10 rounded border border-slate-300 bg-white px-3 py-2 text-xs text-brand-900 hover:bg-brand-50" aria-describedby={`${id}-archivo-help${errors.archivo ? ` ${id}-archivo-error` : ''}`}>{file ? 'Cambiar archivo' : 'Seleccionar archivo'}</button>
          {!file && !checking && <p className="mt-2 text-xs text-slate-500">Ningún archivo seleccionado.</p>}
          <p id={`${id}-archivo-help`} className="mt-2 text-xs text-slate-500">PDF, Word, Excel, JPG y PNG · Máximo 20 MB</p>
          {checking && <p role="status" className="mt-2 text-xs">Comprobando archivo…</p>}
          {file && <p className="mt-2 break-words text-sm text-slate-700">{file.name}<span className="mt-1 block text-xs text-slate-500">{documentExtension(file.name).toUpperCase()} · {documentSize(file.size)}</span></p>}
        </div>{errorFor('archivo')}
        <p className="mt-2 text-xs text-slate-500">El archivo estará disponible durante esta sesión. Al recargar se conservará su información, pero deberás conservar una copia del archivo en tu equipo.</p>
      </div>}
      <div><label htmlFor={`${id}-fecha`} className={label}>Fecha del documento (opcional)</label><input id={`${id}-fecha`} type="date" value={data.fechaDocumento} onChange={(e) => patch({ fechaDocumento: e.target.value })} className={field} aria-invalid={!!errors.fechaDocumento} aria-describedby={errors.fechaDocumento ? `${id}-fechaDocumento-error` : undefined} />{errorFor('fechaDocumento')}</div>
      <div><label htmlFor={`${id}-descripcion`} className={label}>Descripción / observaciones (opcional)</label><textarea id={`${id}-descripcion`} rows={3} value={data.descripcion} onChange={(e) => patch({ descripcion: e.target.value })} className={field} /></div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm">Cancelar</button><button disabled={saving || checking} className="min-h-11 rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar documento'}</button></div>
    </form>
  </Modal>;
}
