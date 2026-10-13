import { useEffect, useState } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOffice } from '../../context/OfficeContext';
import { auth } from '../../services/firebaseConfig';

type Run = {
  status: 'running' | 'completed' | 'partial' | 'failed';
  startedAt: string;
  reviewed?: number;
  inserted: number;
  updated: number;
  unchanged: number;
  errors: { message: string }[];
};
type Source = { id: 'agroambiental' | 'mingobierno' | 'tcp' | 'mintrabajo' | 'asfi' | 'tsj-resumenes' | 'agetic' | 'contraloria'; name: string; documents: number; lastRun?: Run };

export function LegalSyncSettings() {
  const { isDemo } = useAuth();
  const { user, firebaseUser } = useOffice();
  const allowed = import.meta.env.DEV && user?.isOfficeAdmin === true;
  const [sources, setSources] = useState<Source[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const headers = async (): Promise<HeadersInit> => {
    if (isDemo) return { 'x-demo-admin': user?.id || '' };
    if (!auth?.currentUser || !firebaseUser) throw new Error('Se requiere la sesión interna del Admin.');
    return {
      Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
      'x-internal-token': await firebaseUser.getIdToken(),
    };
  };
  const readResponse = async (response: Response) => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo consultar la base jurídica.');
    return result as { sources: Source[]; run?: Run };
  };
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    void (async () => {
      try {
        const response = await fetch('/api/legal-sync', { headers: await headers() });
        const result = await readResponse(response);
        if (active) { setSources(result.sources); setError(''); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la sincronización.'); }
    })();
    return () => { active = false; };
  }, [allowed, isDemo, user?.id, firebaseUser]);

  if (!allowed) return null;
  const sync = async (source: Source) => {
    if (busy) return;
    setBusy(source.id); setError('');
    try {
      const response = await fetch('/api/legal-sync', {
        method: 'POST',
        headers: { ...await headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: source.id }),
      });
      const result = await readResponse(response);
      setSources(result.sources);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo sincronizar la fuente.'); }
    finally { setBusy(null); }
  };
  const statusLabel = (status?: Run['status']) => status === 'completed' ? 'Completada' : status === 'partial' ? 'Parcial' : status === 'failed' ? 'Fallida' : 'Sin sincronizar';

  return <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="settings-legal-base">
    <div className="flex items-start gap-2"><BookOpen className="mt-0.5 h-5 w-5 text-amber-600" /><div><h2 id="settings-legal-base" className="text-lg font-semibold text-brand-900">Base jurídica</h2><p className="mt-1 text-sm text-slate-500">Sincronización manual de las fuentes oficiales disponibles en esta base local.</p></div></div>
    {error && <p role="alert" className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="mt-4 space-y-3">{sources.map(source => {
      const run = source.lastRun;
      return <div key={source.id} className="rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-brand-900">{source.id === 'mingobierno' ? 'Normativa' : source.name}</h3><p className="text-xs text-slate-500">Fuente: {source.name} · {source.documents} registros locales</p></div><button type="button" disabled={Boolean(busy)} onClick={() => void sync(source)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-brand-900 px-3 text-sm font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy === source.id ? 'animate-spin' : ''}`} />{busy === source.id ? 'Sincronizando…' : 'Sincronizar'}</button></div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600"><span>Última sincronización: <strong>{run ? new Date(run.startedAt).toLocaleString('es-BO') : 'Nunca'}</strong></span><span>Estado: <strong className={run?.status === 'failed' ? 'text-rose-700' : run?.status === 'partial' ? 'text-amber-700' : 'text-emerald-700'}>{statusLabel(run?.status)}</strong></span></div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600"><span>Revisados: <strong>{run?.reviewed ?? 0}</strong></span><span>Nuevos: <strong>{run?.inserted ?? 0}</strong></span><span>Actualizados: <strong>{run?.updated ?? 0}</strong></span><span>Sin cambios: <strong>{run?.unchanged ?? 0}</strong></span><span>Errores: <strong>{run?.errors.length ?? 0}</strong></span></div>
        {run?.errors.length ? <p role="alert" className="mt-2 text-xs text-rose-700">{run.errors.map(item => item.message).join(' · ')}</p> : null}
      </div>;
    })}</div>
    <p className="mt-3 text-xs text-slate-500">La cobertura de estas fuentes oficiales es parcial; consulta el documento original antes de citarlo.</p>
  </section>;
}
