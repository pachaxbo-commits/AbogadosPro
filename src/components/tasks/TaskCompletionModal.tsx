import { useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { useProfile } from '../../context/ProfileContext';
import { DOCUMENT_ACCEPT, documentSize, validateDocumentFile } from '../../services/documents';
import type { Tarea } from '../../types';

interface SelectedFile { file: File; nombre: string; error?: string }

export function TaskCompletionModal({ task, onClose, onSuccess }: { task: Tarea; onClose: () => void; onSuccess: () => void }) {
  const { completeTask } = useLegalData();
  const { configuration } = useProfile();
  const categories = configuration.categories.documents;
  const [resultado, setResultado] = useState('');
  const [categoria, setCategoria] = useState('');
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const selection = useRef(0);

  const selectFiles = async (selected: FileList) => {
    if (!selected.length || busy.current) return;
    const version = ++selection.current;
    setChecking(true);
    setError('');
    try {
      const checked = await Promise.all(Array.from(selected, async (file): Promise<SelectedFile> => {
        const nombre = file.name.replace(/\.[^.]+$/, '');
        try { await validateDocumentFile(file); return { file, nombre }; }
        catch (cause) { return { file, nombre, error: cause instanceof Error ? cause.message : 'Archivo no válido.' }; }
      }));
      if (version === selection.current) setFiles((current) => [...current, ...checked]);
    } finally { if (version === selection.current) setChecking(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current || checking) return;
    if (files.some((item) => item.error)) { setError('Quita los archivos no válidos antes de completar la tarea.'); return; }
    if (files.length && !categories.some((value) => value === categoria)) { setError('Selecciona una categoría para los documentos.'); return; }
    if (files.some((item) => !item.nombre.trim())) { setError('Escribe un nombre para cada documento.'); return; }
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await completeTask(task.id, resultado, files.map(({ file, nombre }) => ({ file, nombre, categoria })));
      onSuccess();
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo completar la tarea.'); }
    finally { busy.current = false; setSaving(false); }
  };

  return <Modal isOpen title="Completar tarea" subtitle={task.titulo} onClose={() => { if (!busy.current) onClose(); }} maxWidth="lg">
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div><label htmlFor="task-result" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Resultado / observación (opcional)</label><textarea id="task-result" rows={3} value={resultado} onChange={(event) => setResultado(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></div>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <label htmlFor="task-files" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Documentos (opcional)</label>
        <input id="task-files" type="file" multiple accept={DOCUMENT_ACCEPT} disabled={saving || checking} onChange={(event) => { if (event.target.files) void selectFiles(event.target.files); event.target.value = ''; }} className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-brand-900" />
        <p className="mt-2 text-xs text-slate-500">PDF, Word, Excel, JPG y PNG · Máximo 20 MB por archivo. Puedes completar sin adjuntar nada.</p>
        {checking && <p role="status" className="mt-2 text-xs text-slate-600">Comprobando archivos…</p>}
        {!!files.length && <div className="mt-3 space-y-2"><label htmlFor="task-category" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Categoría común *</label><select id="task-category" value={categoria} onChange={(event) => { setCategoria(event.target.value); setError(''); }} className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Seleccionar categoría</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
          <div className="max-h-56 space-y-2 overflow-y-auto" aria-label="Documentos seleccionados">{files.map((item, index) => <div key={`${index}-${item.file.name}`} className="rounded-md border border-slate-200 bg-white p-2"><div className="flex items-start justify-between gap-2"><span className="min-w-0 break-all text-xs text-slate-600">{item.file.name} · {documentSize(item.file.size)}</span><button type="button" disabled={saving} onClick={() => { setFiles((current) => current.filter((_, position) => position !== index)); setError(''); }} className="shrink-0 px-2 text-xs font-semibold text-brand-900 hover:underline">Quitar</button></div>{item.error ? <p role="alert" className="mt-1 text-xs text-rose-700">{item.error}</p> : <label className="mt-2 block text-xs text-slate-600">Nombre del documento<input value={item.nombre} onChange={(event) => setFiles((current) => current.map((entry, position) => position === index ? { ...entry, nombre: event.target.value } : entry))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-sm text-slate-900" /></label>}</div>)}</div>
        </div>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-md border border-slate-300 px-4 text-sm">Cancelar</button><button type="submit" disabled={saving || checking} className="min-h-11 rounded-md bg-brand-900 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{saving ? 'Completando…' : 'Completar tarea'}</button></div>
    </form>
  </Modal>;
}
