import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useLegalData } from '../context/LegalDataContext';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { canCreateCase, canCreateClient } from '../config/plans';
import { downloadImportTemplate, readImportFile, reviewImport, type ImportRow } from '../services/dataImport';
import { FolderDocumentImport } from '../components/import/FolderDocumentImport';

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-50';

export function ImportDataPage() {
  const { clients, cases, addClient, addCase, loading } = useLegalData();
  const { configuration } = useProfile();
  const { userProfile, isDemo } = useAuth();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ clients: number; cases: number } | null>(null);
  const review = useMemo(() => rows ? reviewImport(rows, clients, cases, configuration.categories.areas) : null, [rows, clients, cases, configuration.categories.areas]);
  const profile = isDemo ? null : userProfile;
  const clientLimit = review?.clients.length ? canCreateClient(profile, clients.length + review.clients.length - 1) : { allowed: true };
  const caseLimit = review?.cases.length ? canCreateCase(profile, cases.length + review.cases.length - 1) : { allowed: true };
  const planError = !clientLimit.allowed ? clientLimit.reason : !caseLimit.allowed ? caseLimit.reason : '';

  const selectFile = async (file?: File) => {
    if (!file) return;
    setRows(null); setResult(null); setFileName(file.name); setError(''); setReading(true);
    try {
      const parsed = await readImportFile(file);
      if (!parsed.length) throw new Error('La plantilla no contiene filas para importar.');
      setRows(parsed);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo leer el archivo.'); }
    finally { setReading(false); }
  };
  const importData = async () => {
    if (!rows || !review || review.issues.length || planError || importing || loading) return;
    const latest = reviewImport(rows, clients, cases, configuration.categories.areas);
    if (latest.issues.length) { setError('Los datos cambiaron. Revisa los errores antes de importar.'); return; }
    setImporting(true); setError('');
    let createdClients = 0;
    let createdCases = 0;
    try {
      const references = new Map(clients.flatMap((client) => [
        [client.id, client.id],
        ...(client.identificacion ? [[client.identificacion.trim().toLocaleLowerCase('es').replace(/^(ci|nit)\s*/, '').replace(/[\s.\-]/g, ''), client.id]] : []),
      ] as [string, string][]));
      for (const item of latest.clients) {
        const saved = await addClient(item.data);
        if (item.reference) {
          references.set(item.reference, saved.id);
          references.set(item.reference.trim().toLocaleLowerCase('es').replace(/^(ci|nit)\s*/, '').replace(/[\s.\-]/g, ''), saved.id);
        }
        createdClients++;
      }
      for (const item of latest.cases) {
        const clienteId = references.get(item.reference) || references.get(item.reference.trim().toLocaleLowerCase('es').replace(/^(ci|nit)\s*/, '').replace(/[\s.\-]/g, ''));
        if (!clienteId) throw new Error(`${item.sheet ? `Hoja ${item.sheet} · ` : ''}Fila ${item.row}: cliente asociado no disponible.`);
        await addCase({ ...item.data, clienteId });
        createdCases++;
      }
      setResult({ clients: createdClients, cases: createdCases });
      setRows(null); setFileName('');
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'Error desconocido.';
      setError(`La importación se interrumpió: ${detail} Se guardaron ${createdClients} clientes y ${createdCases} casos antes del error. Revisa los registros antes de reintentar.`);
    } finally { setImporting(false); }
  };
  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="border-b border-slate-200 pb-4"><h1 className="text-2xl font-bold text-slate-900">Importar datos</h1><p className="mt-1 text-sm text-slate-500">Agrega clientes y casos existentes de forma masiva.</p></div>
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-brand-900">1. Descarga la plantilla</h2>
      <p className="mt-1 text-sm text-slate-600">En Excel, completa CLIENTES y CASOS por separado. El CI/NIT de cada caso debe coincidir con el de un cliente importado o ya registrado. El CSV conserva el formato anterior con «Tipo» y «Referencia cliente».</p>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={button} onClick={() => void downloadImportTemplate('xlsx')}><Download className="h-4 w-4" />Plantilla Excel</button><button type="button" className={button} onClick={() => void downloadImportTemplate('csv')}><Download className="h-4 w-4" />Plantilla CSV</button></div>
      <p className="mt-3 text-xs text-slate-500">Completa Tipo de cliente y Nombre del cliente para clientes; Nombre del caso, Área, Estado y Rol del cliente para casos. NUREJ/CUD puede quedar vacío.</p>
      <details className="mt-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold text-brand-900">Ver valores admitidos</summary><p className="mt-2">Tipo de cliente: Persona o Empresa. Áreas: {configuration.categories.areas.join(', ')}. Estados: Activo, En trámite, En espera o Concluido. Roles: Demandante, Demandado, Querellante, Imputado, Recurrente, Tercero interesado o Solicitante. Identificación judicial: NUREJ o CUD.</p></details>
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-brand-900">2. Sube el archivo</h2>
      <label htmlFor="import-file" className="mt-3 block text-sm text-slate-600">Selecciona un archivo .xlsx o .csv. Podrás revisarlo antes de guardar.</label>
      <input id="import-file" type="file" accept=".xlsx,.csv" disabled={reading || importing} onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ''; }} className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-brand-900" />
      {reading && <p role="status" className="mt-3 text-sm text-slate-600">Leyendo archivo…</p>}
      {error && <p role="alert" className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {result && <div role="status" className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-bold">Importación completada</p><p>{result.clients} clientes importados</p><p>{result.cases} casos importados</p></div>}
    </section>
    {review && <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-900"><FileSpreadsheet className="h-5 w-5" />3. Revisa {fileName}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">{[
        ['Clientes detectados', review.clientsDetected], ['Casos detectados', review.casesDetected],
        ['Filas válidas', review.rows.length - new Set(review.issues.map((item) => `${item.sheet || 'CSV'}:${item.row}`)).size],
        ['Filas con errores', new Set(review.issues.map((item) => `${item.sheet || 'CSV'}:${item.row}`)).size],
      ].map(([label, value]) => <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}</p></div>)}</div>
      {review.issues.length > 0 && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3"><h3 className="text-sm font-semibold text-rose-800">Corrige el archivo antes de importar</h3><ul className="mt-2 max-h-44 space-y-1 overflow-y-auto text-sm text-rose-800">{review.issues.map((item, index) => <li key={`${item.sheet || 'CSV'}-${item.row}-${item.field}-${index}`}>{item.sheet && `Hoja ${item.sheet} · `}Fila {item.row} · {item.field} · {item.reason}</li>)}</ul></div>}
      {planError && <p role="alert" className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">{planError}</p>}
      <div className="mt-4 max-h-80 overflow-auto rounded-md border border-slate-200"><table className="mobile-data-table w-full text-left text-sm sm:min-w-[520px]"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">Fila</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Revisión</th></tr></thead><tbody>{review.rows.map((item) => <tr key={`${item.sheet || 'CSV'}-${item.row}`} className="border-t border-slate-100"><td className="px-3 py-2">{item.sheet ? `${item.sheet} · ` : ''}{item.row}</td><td data-label="Tipo" className="px-3 py-2">{item.type}</td><td data-label="Nombre" className="px-3 py-2 break-words">{item.label || '—'}</td><td data-label="Revisión" className={`px-3 py-2 font-medium ${item.valid ? 'text-emerald-800' : 'text-rose-700'}`}>{item.valid ? 'Válida' : 'Con errores'}</td></tr>)}</tbody></table></div>
      <div className="mt-5 flex justify-end"><button type="button" disabled={loading || importing || !!review.issues.length || !!planError} onClick={() => void importData()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"><Upload className="h-4 w-4" />{importing ? 'Importando…' : 'Importar datos'}</button></div>
    </section>}
    <FolderDocumentImport />
  </div>;
}
