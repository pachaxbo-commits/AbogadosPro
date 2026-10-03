import { useId, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { useProfile } from '../../context/ProfileContext';
import { DOCUMENT_ACCEPT, documentErrors, documentExtension, documentSize, validateDocumentFile, type DocumentErrors } from '../../services/documents';
import type { DatosDocumento, DocumentoCaso } from '../../types';

const field = 'mt-1 w-full min-w-0 min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-brand-900';
const label = 'block text-xs font-semibold uppercase tracking-wider text-slate-700';
interface SelectedFile { file: File; nombre: string; error?: string }
export function DocumentFormModal({ casoId, document: existing, onClose, onSuccess }: {
  casoId: string; document?: DocumentoCaso; onClose: () => void; onSuccess: (count: number) => void;
}) {
  const { addDocument, addDocuments, updateDocument } = useLegalData();
  const { configuration } = useProfile();
  const categories = configuration.categories.documents;
  const id = useId();
  const [data, setData] = useState<DatosDocumento>(() => ({ nombre: existing?.nombre || '', categoria: existing?.categoria || '', fechaDocumento: existing?.fechaDocumento || '', descripcion: existing?.descripcion || '' }));
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const multiple = selectedFiles.length > 1;
  const file = selectedFiles.length === 1 && !selectedFiles[0].error ? selectedFiles[0].file : null;
  const [errors, setErrors] = useState<DocumentErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const busy = useRef(false);
  const selection = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const patch = (value: Partial<DatosDocumento>) => { setData((prev) => ({ ...prev, ...value })); setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(value).map((key) => [key, undefined])) })); setError(''); };
  const choose = async (files: FileList | File[]) => {
    if (!files.length || busy.current) return;
    const version = ++selection.current;
    setChecking(true); setSelectedFiles([]); setErrors((prev) => ({ ...prev, archivo: undefined }));
    try {
      const selected = await Promise.all(Array.from(files, async (candidate) => {
        try {
          await validateDocumentFile(candidate);
          return { file: candidate, nombre: candidate.name.replace(/\.[^.]+$/, '') };
        } catch (err) {
          return { file: candidate, nombre: candidate.name.replace(/\.[^.]+$/, ''), error: err instanceof Error ? err.message : 'Archivo no válido.' };
        }
      }));
      if (version !== selection.current) return;
      setSelectedFiles(selected);
      if (selected.length === 1) {
        setData((prev) => ({ ...prev, nombre: prev.nombre.trim() ? prev.nombre : selected[0].nombre }));
        if (selected[0].error) setErrors((prev) => ({ ...prev, archivo: selected[0].error }));
      }
    } finally { if (version === selection.current) setChecking(false); }
  };
  const removeFile = (index: number) => {
    const remaining = selectedFiles.filter((_, current) => current !== index);
    setSelectedFiles(remaining);
    if (remaining.length === 1) setData((prev) => ({ ...prev, nombre: remaining[0].nombre }));
    setErrors((prev) => ({ ...prev, archivo: undefined }));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current || checking) return;
    const validation = multiple ? documentErrors({ nombre: selectedFiles[0].nombre, categoria: data.categoria }, categories) : documentErrors(data, categories);
    if (!existing && selectedFiles.length === 0) validation.archivo = 'Selecciona un archivo.';
    if (!existing && selectedFiles.some((item) => item.error)) validation.archivo = 'Quita los archivos no válidos antes de guardar.';
    if (!existing && selectedFiles.some((item) => !item.nombre.trim())) validation.nombre = 'Escribe un nombre para cada documento.';
    setErrors(validation);
    if (Object.keys(validation).length) return;
    busy.current = true; setSaving(true); setError('');
    try {
      if (existing) await updateDocument(casoId, existing.id, data);
      else if (multiple) await addDocuments(casoId, selectedFiles.map((item) => ({ file: item.file, data: { nombre: item.nombre, categoria: data.categoria } })));
      else if (file) await addDocument(casoId, data, file);
      onSuccess(multiple ? selectedFiles.length : 1); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el documento.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const errorFor = (name: keyof DocumentErrors) => errors[name] ? <p id={`${id}-${name}-error`} role="alert" className="mt-1 text-xs text-rose-700">{errors[name]}</p> : null;
  return <Modal isOpen title={existing ? 'Editar documento' : 'Subir documento'} onClose={() => { if (!busy.current) onClose(); }} maxWidth="lg">
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {!multiple && <div><label htmlFor={`${id}-nombre`} className={label}>Nombre del documento *</label><input id={`${id}-nombre`} required value={data.nombre} onChange={(e) => patch({ nombre: e.target.value })} className={field} aria-invalid={!!errors.nombre} aria-describedby={errors.nombre ? `${id}-nombre-error` : undefined} />{errorFor('nombre')}</div>}
      <div><label htmlFor={`${id}-categoria`} className={label}>{multiple ? 'Categoría común' : 'Categoría'} *</label><select id={`${id}-categoria`} required value={data.categoria} onChange={(e) => patch({ categoria: e.target.value })} className={field} aria-invalid={!!errors.categoria} aria-describedby={errors.categoria ? `${id}-categoria-error` : undefined}><option value="">Seleccionar categoría</option>{[...new Set([...categories, ...(existing && !categories.includes(existing.categoria) ? [existing.categoria] : [])])].map((category) => <option key={category}>{category}</option>)}</select>{errorFor('categoria')}</div>
      {existing ? <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600 break-words"><span className="font-semibold">Archivo: </span>{existing.nombreArchivo}<p className="mt-1">La edición conserva el archivo original.</p></div> : <div>
        <label htmlFor={`${id}-archivo`} className={label}>{multiple ? 'Archivos' : 'Archivo'} *</label>
        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void choose(e.dataTransfer.files); }} className="mt-1 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="mb-2 flex items-center gap-2 text-sm text-slate-600"><Upload className="h-4 w-4" />Selecciona o arrastra uno o varios archivos</p>
          <input ref={fileInput} id={`${id}-archivo`} type="file" multiple accept={DOCUMENT_ACCEPT} disabled={saving || checking} onChange={(e) => { if (e.target.files) void choose(e.target.files); e.target.value = ''; }} className="hidden" />
          <button type="button" disabled={saving || checking} onClick={() => fileInput.current?.click()} className="min-h-10 rounded border border-slate-300 bg-white px-3 py-2 text-xs text-brand-900 hover:bg-brand-50" aria-describedby={`${id}-archivo-help${errors.archivo ? ` ${id}-archivo-error` : ''}`}>{selectedFiles.length ? 'Cambiar selección' : 'Seleccionar archivos'}</button>
          {!selectedFiles.length && !checking && <p className="mt-2 text-xs text-slate-500">Ningún archivo seleccionado.</p>}
          <p id={`${id}-archivo-help`} className="mt-2 text-xs text-slate-500">PDF, Word, Excel, JPG y PNG · Máximo 20 MB</p>
          {checking && <p role="status" className="mt-2 text-xs">Comprobando archivo…</p>}
          {!multiple && file && <p className="mt-2 break-words text-sm text-slate-700">{file.name}<span className="mt-1 block text-xs text-slate-500">{documentExtension(file.name).toUpperCase()} · {documentSize(file.size)}</span></p>}
          {!multiple && selectedFiles[0]?.error && <p className="mt-2 break-words text-xs text-rose-700">{selectedFiles[0].file.name}: {selectedFiles[0].error}</p>}
          {multiple && <div className="mt-3 max-h-64 space-y-2 overflow-y-auto" aria-label="Archivos seleccionados">{selectedFiles.map((item, index) => <div key={`${index}-${item.file.name}`} className="rounded-md border border-slate-200 bg-white p-2">
            <div className="flex items-center justify-between gap-2"><span className="min-w-0 break-all text-xs text-slate-600">{item.file.name} · {documentSize(item.file.size)}</span><button type="button" onClick={() => removeFile(index)} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-brand-900 hover:bg-brand-50" aria-label={`Quitar ${item.file.name}`}>Quitar</button></div>
            {item.error ? <p role="alert" className="mt-1 text-xs text-rose-700">{item.error}</p> : <label className="mt-2 block text-xs text-slate-600">Nombre del documento<input value={item.nombre} onChange={(e) => setSelectedFiles((current) => current.map((entry, position) => position === index ? { ...entry, nombre: e.target.value } : entry))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-sm text-slate-900" /></label>}
          </div>)}</div>}
        </div>{errorFor('archivo')}{multiple && errorFor('nombre')}
        <p className="mt-2 text-xs text-slate-500">El archivo estará disponible durante esta sesión. Al recargar se conservará su información, pero deberás conservar una copia del archivo en tu equipo.</p>
      </div>}
      {!multiple && <><div><label htmlFor={`${id}-fecha`} className={label}>Fecha del documento (opcional)</label><input id={`${id}-fecha`} type="date" value={data.fechaDocumento} onChange={(e) => patch({ fechaDocumento: e.target.value })} className={field} aria-invalid={!!errors.fechaDocumento} aria-describedby={errors.fechaDocumento ? `${id}-fechaDocumento-error` : undefined} />{errorFor('fechaDocumento')}</div>
      <div><label htmlFor={`${id}-descripcion`} className={label}>Descripción / observaciones (opcional)</label><textarea id={`${id}-descripcion`} rows={3} value={data.descripcion} onChange={(e) => patch({ descripcion: e.target.value })} className={field} /></div></>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm">Cancelar</button><button disabled={saving || checking} className="min-h-11 rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{saving ? 'Guardando…' : multiple ? `Subir ${selectedFiles.length} documentos` : 'Guardar documento'}</button></div>
    </form>
  </Modal>;
}
