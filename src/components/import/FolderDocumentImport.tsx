import { useRef, useState } from 'react';
import { FolderOpen, Upload } from 'lucide-react';
import { useLegalData } from '../../context/LegalDataContext';
import { useProfile } from '../../context/ProfileContext';
import { DOCUMENT_FORMATS, documentExtension, documentSize, validateDocumentFile } from '../../services/documents';

interface FolderFile {
  id: number;
  file: File;
  subfolder: string;
  caseId: string;
  category: string;
  validationError?: string;
  saveError?: string;
}

interface ImportResult {
  imported: number;
  notImported: number;
  errors: string[];
}

const selectClass = 'min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800';

function subfolderOf(file: File): string {
  const parts = file.webkitRelativePath.split('/');
  return parts.length > 2 ? parts.slice(1, -1).join('/') : '';
}

function fileType(file: File): string {
  const extension = documentExtension(file.name);
  const kind = DOCUMENT_FORMATS[extension]?.kind;
  return kind ? `${kind === 'image' ? 'Imagen' : kind === 'word' ? 'Word' : kind === 'excel' ? 'Excel' : 'PDF'} · ${extension.toUpperCase()}` : extension.toUpperCase() || 'Desconocido';
}

export function FolderDocumentImport() {
  const { cases, addDocuments, loading, documentsError } = useLegalData();
  const { configuration } = useProfile();
  const categories = configuration.categories.documents;
  const input = useRef<HTMLInputElement>(null);
  const selection = useRef(0);
  const busy = useRef(false);
  const [files, setFiles] = useState<FolderFile[]>([]);
  const [commonCaseId, setCommonCaseId] = useState('');
  const [commonCategory, setCommonCategory] = useState('');
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const validCaseIds = new Set(cases.map((item) => item.id));
  const validCategories = new Set(categories);
  const ready = files.filter((item) => !item.validationError && validCaseIds.has(item.caseId) && validCategories.has(item.category));
  const validFileCount = files.filter((item) => !item.validationError).length;
  const totalSize = files.reduce((sum, item) => sum + item.file.size, 0);

  const chooseFolder = async (selected: File[]) => {
    if (busy.current) return;
    const version = ++selection.current;
    setFiles([]);
    setResult(null);
    setMessage('');
    setCommonCaseId('');
    setCommonCategory('');
    if (!selected.length) {
      setMessage('La carpeta no contiene archivos para importar.');
      return;
    }
    setChecking(true);
    const reviewed = await Promise.all(selected.map(async (file, id): Promise<FolderFile> => {
      try {
        await validateDocumentFile(file);
        return { id, file, subfolder: subfolderOf(file), caseId: '', category: '' };
      } catch (error) {
        return { id, file, subfolder: subfolderOf(file), caseId: '', category: '', validationError: error instanceof Error ? error.message : 'Archivo no válido.' };
      }
    }));
    if (version === selection.current) {
      setFiles(reviewed);
      setChecking(false);
    }
  };

  const updateFile = (id: number, update: Partial<Pick<FolderFile, 'caseId' | 'category'>>) => {
    setFiles((current) => current.map((item) => item.id === id ? { ...item, ...update, saveError: undefined } : item));
    setResult(null);
  };

  const importDocuments = async () => {
    if (busy.current || checking || loading || documentsError || ready.length === 0) return;
    busy.current = true;
    setImporting(true);
    setResult(null);
    setMessage('');
    const groups = new Map<string, FolderFile[]>();
    for (const item of ready) groups.set(item.caseId, [...(groups.get(item.caseId) || []), item]);
    const importedIds = new Set<number>();
    const failures = new Map<number, string>();
    for (const [caseId, group] of groups) {
      try {
        await addDocuments(caseId, group.map((item) => ({
          file: item.file,
          data: { nombre: item.file.name.replace(/\.[^.]+$/, ''), categoria: item.category },
        })));
        group.forEach((item) => importedIds.add(item.id));
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'No se pudo guardar el documento.';
        group.forEach((item) => failures.set(item.id, reason));
      }
    }
    const errors = files.filter((item) => !importedIds.has(item.id)).map((item) => {
      const reason = failures.get(item.id) || item.validationError || (!validCaseIds.has(item.caseId) ? 'Selecciona un caso válido.' : !validCategories.has(item.category) ? 'Selecciona una categoría válida.' : 'No se importó.');
      return `${item.file.webkitRelativePath || item.file.name}: ${reason}`;
    });
    setFiles((current) => current.filter((item) => !importedIds.has(item.id)).map((item) => ({ ...item, saveError: failures.get(item.id) })));
    setResult({ imported: importedIds.size, notImported: files.length - importedIds.size, errors });
    busy.current = false;
    setImporting(false);
  };

  return <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-brand-900">Importar documentos</h2><p className="mt-1 text-sm text-slate-600">Agrega varios archivos existentes a un expediente sin subirlos uno por uno.</p></div>
      <input ref={(node) => { input.current = node; node?.setAttribute('webkitdirectory', ''); node?.setAttribute('directory', ''); }} type="file" multiple className="hidden" aria-label="Seleccionar carpeta de documentos" disabled={checking || importing} onChange={(event) => { void chooseFolder(Array.from(event.target.files || [])); event.target.value = ''; }} />
      <button type="button" disabled={checking || importing} onClick={() => input.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-50"><FolderOpen className="h-4 w-4" />Seleccionar carpeta</button>
    </div>
    <p className="mt-3 text-xs text-slate-500">PDF, Word, Excel, JPG y PNG · Máximo 20 MB por archivo. Las carpetas vacías se ignoran.</p>
    <p className="mt-1 text-xs text-slate-500">Los archivos estarán disponibles durante esta sesión. Al recargar se conservará su información, pero deberás conservar una copia en tu equipo.</p>
    {checking && <p role="status" className="mt-4 text-sm text-slate-600">Comprobando archivos…</p>}
    {message && <p role="alert" className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
    {documentsError && <p role="alert" className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{documentsError}</p>}
    {result && <div role="status" className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"><p className="font-bold">Importación completada</p><p>{result.imported} documentos importados</p><p>{result.notImported} documentos no importados</p>{result.errors.length > 0 && <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-rose-800">{result.errors.map((error, index) => <li key={index} className="break-all">{error}</li>)}</ul>}</div>}
    {files.length > 0 && <>
      <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-700"><span><strong>{files.length}</strong> detectados</span><span><strong>{validFileCount}</strong> archivos válidos</span><span><strong>{files.length - validFileCount}</strong> con errores</span><span><strong>{documentSize(totalSize)}</strong> en total</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Caso para todos<select value={commonCaseId} disabled={importing || loading} onChange={(event) => { const value = event.target.value; setCommonCaseId(value); setFiles((current) => current.map((item) => ({ ...item, caseId: value, saveError: undefined }))); setResult(null); }} className={`mt-1 ${selectClass}`}><option value="">Seleccionar caso</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Categoría para todos<select value={commonCategory} disabled={importing} onChange={(event) => { const value = event.target.value; setCommonCategory(value); setFiles((current) => current.map((item) => ({ ...item, category: value, saveError: undefined }))); setResult(null); }} className={`mt-1 ${selectClass}`}><option value="">Seleccionar categoría</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <div className="mt-4 max-h-[28rem] overflow-auto rounded-md border border-slate-200"><table className="mobile-data-table w-full text-left text-sm sm:min-w-[840px]"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">Archivo</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Tamaño</th><th className="w-48 px-3 py-2">Caso</th><th className="w-40 px-3 py-2">Categoría</th><th className="w-44 px-3 py-2">Validación</th></tr></thead><tbody>{files.map((item) => {
        const issue = item.validationError || item.saveError || (!validCaseIds.has(item.caseId) ? 'Selecciona un caso.' : !validCategories.has(item.category) ? 'Selecciona una categoría.' : '');
        return <tr key={item.id} className="border-t border-slate-100 align-top"><td className="max-w-56 px-3 py-2"><span className="block break-all font-medium text-slate-900">{item.file.name}</span>{item.subfolder && <span className="mt-1 block break-all text-xs text-slate-500">Subcarpeta: {item.subfolder}</span>}</td><td data-label="Tipo" className="px-3 py-2 text-slate-600">{fileType(item.file)}</td><td data-label="Tamaño" className="whitespace-nowrap px-3 py-2 text-slate-600">{documentSize(item.file.size)}</td><td data-label="Caso" className="px-3 py-2"><select aria-label={`Caso de ${item.file.name}`} value={item.caseId} disabled={importing || loading} onChange={(event) => updateFile(item.id, { caseId: event.target.value })} className={selectClass}><option value="">Seleccionar caso</option>{cases.map((entry) => <option key={entry.id} value={entry.id}>{entry.nombre}</option>)}</select></td><td data-label="Categoría" className="px-3 py-2"><select aria-label={`Categoría de ${item.file.name}`} value={item.category} disabled={importing} onChange={(event) => updateFile(item.id, { category: event.target.value })} className={selectClass}><option value="">Seleccionar categoría</option>{categories.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></td><td data-label="Validación" className={`break-words px-3 py-2 text-xs font-medium ${issue ? 'text-rose-700' : 'text-emerald-800'}`}>{issue || 'Listo para importar'}</td></tr>;
      })}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-600">Se importarán {ready.length} archivos listos. Los demás quedarán sin importar y se mostrarán en el resultado.</p><button type="button" disabled={importing || checking || loading || !!documentsError || ready.length === 0} onClick={() => void importDocuments()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"><Upload className="h-4 w-4" />{importing ? 'Importando…' : 'Importar documentos'}</button></div>
    </>}
  </section>;
}
