import { useEffect, useState, useRef } from 'react';
import { FileText, FileSpreadsheet, Image, Plus, FolderOpen } from 'lucide-react';
import { useLegalData } from '../../context/LegalDataContext';
import { Modal } from '../common/Modal';
import { DocumentFormModal } from './DocumentFormModal';
import { DOCUMENT_CATEGORIES, DOCUMENT_FORMATS, documentExtension, documentSize } from '../../services/documents';
import { formatFecha } from '../../services/formatters';
import type { DocumentoCaso } from '../../types';

const button = 'min-h-11 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 disabled:opacity-50';
function DocumentRow({ item, onEdit, onDelete }: { item: DocumentoCaso; onEdit: () => void; onDelete: () => void }) {
  const { getDocumentUrl } = useLegalData();
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [actions, setActions] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    let active = true;
    getDocumentUrl(item.casoId, item.id).then((value) => { if (active) { setUrl(value); setLoaded(true); } }).catch((err: unknown) => { if (active) { setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.'); setLoaded(true); } });
    return () => { active = false; };
  }, [item.casoId, item.id, getDocumentUrl]);
  const extension = documentExtension(item.nombreArchivo);
  const kind = DOCUMENT_FORMATS[extension]?.kind;
  const Icon = kind === 'image' ? Image : kind === 'excel' ? FileSpreadsheet : FileText;
  return <article aria-label={item.nombre} className="flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
    <Icon aria-hidden className="mt-1 h-5 w-5 shrink-0 text-brand-900" />
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{item.nombre}</h3><span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">{item.categoria}</span></div>
      <p className="break-words text-xs text-slate-500 [overflow-wrap:anywhere]">{item.nombreArchivo}<span className="mt-1 block">{extension.toUpperCase()} · {documentSize(item.tamano)}</span></p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">{item.fechaDocumento && <span>Fecha del documento: {formatFecha(item.fechaDocumento)}</span>}<span>Agregado: {new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.fechaCarga))}</span></div>
      {item.descripcion && <p className="line-clamp-2 break-words text-sm text-slate-600 [overflow-wrap:anywhere]">{item.descripcion}</p>}
      {loaded && !url && <p className="text-xs text-amber-800">{error || 'Archivo no disponible temporalmente. Su información se conserva; el archivo de esta sesión ya no está disponible.'}</p>}
    </div>
    <button type="button" aria-label={`Acciones de ${item.nombre}`} onClick={() => setActions(true)} className="min-h-11 min-w-11 shrink-0 rounded-md text-xl font-bold text-slate-600 hover:bg-brand-50">⋯</button>
    {actions && <Modal isOpen title={item.nombre} onClose={() => setActions(false)} maxWidth="sm"><div className="flex flex-col gap-2">
      {!url && <p className="text-sm text-slate-600">{loaded ? 'Archivo no disponible temporalmente.' : 'Comprobando archivo…'}</p>}
      <button type="button" disabled={!url} className={button} onClick={() => { setActions(false); setPreview(true); }}>Abrir / Ver</button>
      {url ? <a className={`${button} text-center`} href={url} download={item.nombreArchivo} onClick={() => setActions(false)}>Descargar</a> : <button disabled className={button}>Descargar</button>}
      <button type="button" className={button} onClick={() => { setActions(false); onEdit(); }}>Editar información</button>
      <button type="button" className={`${button} text-rose-700`} onClick={() => { setActions(false); onDelete(); }}>Eliminar</button>
    </div></Modal>}
    {preview && url && <Modal isOpen title={item.nombre} onClose={() => setPreview(false)} maxWidth="2xl">
      {kind === 'image' ? <img src={url} alt={item.nombre} className="mx-auto max-h-[60vh] max-w-full object-contain" /> : kind === 'pdf' ? <iframe src={url} title={item.nombre} className="h-[60vh] w-full rounded border border-slate-200" /> : <p className="text-sm text-slate-600">Descarga el archivo para abrirlo con Word, Excel u otra aplicación compatible.</p>}
      <a className={`${button} mt-4 inline-flex items-center`} href={url} download={item.nombreArchivo}>Descargar archivo</a>
    </Modal>}
  </article>;
}

export function CaseDocuments({ casoId }: { casoId: string }) {
  const { documents, documentsError, deleteDocument, loading } = useLegalData();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [order, setOrder] = useState('recent');
  const [form, setForm] = useState<DocumentoCaso | 'new' | null>(null);
  const [deleting, setDeleting] = useState<DocumentoCaso | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const normalize = (value: string) => value.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
  const all = documents.filter((doc) => doc.casoId === casoId);
  const term = normalize(search);
  const visible = all.filter((doc) => (!category || doc.categoria === category) && (!term || [doc.nombre, doc.nombreArchivo, doc.categoria, doc.descripcion || ''].some((value) => normalize(value).includes(term))))
    .sort((a, b) => order === 'name' ? a.nombre.localeCompare(b.nombre, 'es') : order === 'old' ? a.fechaCarga.localeCompare(b.fechaCarga) : b.fechaCarga.localeCompare(a.fechaCarga));
  const remove = async () => {
    if (!deleting || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try { await deleteDocument(casoId, deleting.id); setDeleting(null); setMessage('Documento eliminado correctamente.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo eliminar el documento.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Documentos del caso</h2><p className="mt-1 text-xs text-slate-500">Archivos, escritos, pruebas y documentación vinculada al expediente.</p></div><button type="button" disabled={loading || !!documentsError} onClick={() => { setMessage(''); setForm('new'); }} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"><Plus className="h-4 w-4" />Subir documento</button></div>
    {message && <p role="status" className="rounded-md bg-brand-50 p-3 text-sm text-brand-900">{message}</p>}
    {documentsError ? <p role="alert" className="text-sm text-rose-800">{documentsError}</p> : loading ? <p>Cargando documentos…</p> : all.length === 0 ? <div className="rounded-lg border border-slate-200 bg-white p-8 text-center"><FolderOpen className="mx-auto mb-3 h-8 w-8 text-slate-400" /><p className="font-semibold text-slate-800">Este caso todavía no tiene documentos.</p><p className="mt-2 text-sm text-slate-500">Los documentos, escritos y pruebas vinculados al expediente aparecerán aquí.</p><button type="button" onClick={() => setForm('new')} className={`${button} mt-4`}>+ Subir primer documento</button></div> : <>
      <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-3"><input aria-label="Buscar documentos" placeholder="Buscar documentos..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-11 min-w-0 flex-[2_1_200px] rounded-md border border-slate-200 px-3 text-sm" /><select aria-label="Filtrar categoría" value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm"><option value="">Todas las categorías</option>{DOCUMENT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Orden de documentos" value={order} onChange={(e) => setOrder(e.target.value)} className="min-h-11 rounded-md border border-slate-200 bg-white px-2 text-sm"><option value="recent">Más recientes</option><option value="old">Más antiguos</option><option value="name">Nombre</option></select></div>
      {visible.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">No hay documentos que coincidan con la búsqueda y la categoría.</p>}
      {visible.map((item) => <DocumentRow key={item.id} item={item} onEdit={() => setForm(item)} onDelete={() => { setError(''); setDeleting(item); }} />)}
    </>}
    {form && <DocumentFormModal casoId={casoId} document={form === 'new' ? undefined : form} onClose={() => setForm(null)} onSuccess={() => setMessage(form === 'new' ? 'Documento guardado correctamente.' : 'Documento actualizado correctamente.')} />}
    {deleting && <Modal isOpen title="¿Eliminar este documento?" onClose={() => { if (!busyRef.current) setDeleting(null); }} maxWidth="sm"><p className="break-words font-semibold text-slate-900">{deleting.nombre}</p><p className="mt-2 text-sm text-slate-600">Esta acción quitará el documento del expediente.</p>{error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}<div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} className={button} onClick={() => setDeleting(null)}>Cancelar</button><button type="button" disabled={busy} onClick={() => void remove()} className="min-h-11 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Eliminando…' : 'Eliminar documento'}</button></div></Modal>}
  </section>;
}
