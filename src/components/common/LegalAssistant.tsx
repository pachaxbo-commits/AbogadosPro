import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, FileSearch, Gavel, LibraryBig, MessageSquareText, Plus, Save, Send, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOffice } from '../../context/OfficeContext';
import { useLegalData } from '../../context/LegalDataContext';
import { Modal } from './Modal';
import { investigationAccess, investigationTypes, saveCaseInvestigation, type InvestigationType } from '../../services/caseInvestigations';
import { hasLegalSearchCriteria, searchLegalSources, type LegalSearchFilters, type LegalSearchKind, type LegalSearchResult } from '../../services/legalSearch';
import {
  createLegalAssistantChatStore, unavailableAssistantReply,
  type LegalAssistantAction, type LegalAssistantChat, type LegalAssistantContext, type LegalAssistantMessage,
} from '../../services/legalAssistantChats';

const quickActions = [
  { id: 'jurisprudencia', label: 'Buscar jurisprudencia', icon: Gavel },
  { id: 'normativa', label: 'Buscar normativa', icon: BookOpen },
  { id: 'resolucion', label: 'Analizar resolución', icon: FileSearch },
  { id: 'documentos', label: 'Consultar documentos del caso', icon: LibraryBig },
  { id: 'investigacion', label: 'Guardar investigación', icon: Save },
] as const;

function activeFilterLabels(filters: LegalSearchFilters) {
  const source = filters.source === 'Tribunal Supremo de Justicia · resúmenes' ? 'TSJ'
    : filters.source === 'Tribunal Constitucional Plurinacional' ? 'TCP' : filters.source;
  const from = filters.fromDate?.endsWith('-01-01') ? filters.fromDate.slice(0, 4) : filters.fromDate;
  const to = filters.toDate?.endsWith('-12-31') ? filters.toDate.slice(0, 4) : filters.toDate;
  return [source, filters.matter, filters.tribunal && `Tribunal: ${filters.tribunal}`,
    filters.chamber && `Sala: ${filters.chamber}`, (from || to) && `${from || '…'}–${to || '…'}`,
    filters.topic && `Tema: ${filters.topic}`, filters.resolutionType && `Tipo: ${filters.resolutionType}`,
    filters.reference && `Referencia: ${filters.reference}`,
    filters.requiredTerms && `Debe contener: ${filters.requiredTerms}`,
    filters.excludedTerms && `Excluir: ${filters.excludedTerms}`,
    filters.exactPhrase && 'Frase exacta', filters.searchField && filters.searchField !== 'all' && `Campo: ${filters.searchField}`,
    filters.sort && filters.sort !== 'relevance' && `Orden: ${filters.sort === 'newest' ? 'Más reciente' : 'Más antiguo'}`,
  ].filter(Boolean).join(' · ');
}

function highlightedExcerpt(value: string, terms: string[] = []) {
  const wanted = new Set(terms.map(term => term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  return value.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu)?.map((part, index) =>
    wanted.has(part.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())
      ? <mark key={index} className="rounded-sm bg-amber-100 px-0.5 text-inherit">{part}</mark> : part) || value;
}

function LegalResultCard({ result }: { result: LegalSearchResult }) {
  const label = result.relevance === 'strong' ? 'Muy relevante' : result.relevance === 'medium' ? 'Relevante' : 'Relacionado';
  const details = [result.number && !result.title.includes(result.number) ? `N.º ${result.number}` : undefined,
    result.tribunal, result.chamber, result.matter, result.process,
    result.resolutionType, result.date || result.year, result.source].filter(Boolean);
  const fragment = result.matchField === 'Título' || result.matchField === 'Número / referencia' || result.matchField === 'Materia'
    || result.matchField === 'Metadatos' && !result.snippet ? undefined : result.matchExcerpt;
  return <a href={result.url} target="_blank" rel="noopener noreferrer" className="block rounded-md border border-slate-200 bg-white p-2.5 hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500">
    <div className="mb-1 flex flex-wrap items-center gap-1.5"><span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${result.relevance === 'strong' ? 'bg-emerald-50 text-emerald-800' : result.relevance === 'medium' ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>{label}</span>{result.bestMatch && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">Mejor coincidencia</span>}</div>
    <strong className="block text-xs text-brand-900">{result.title}</strong>
    <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{details.join(' · ')}</span>
    {fragment && <span className="mt-1 block text-xs leading-snug text-slate-700">{highlightedExcerpt(fragment, result.highlightTerms)}</span>}
    <span className="mt-1 block text-[11px] text-slate-600">{result.matchReason || 'Coincidencia por metadata'} · <span className="font-semibold text-brand-900">Abrir documento oficial ↗</span></span>
  </a>;
}

export function LegalAssistant() {
  const { isDemo, userProfile } = useAuth();
  const { user } = useOffice();
  const { cases } = useLegalData();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [searchKind, setSearchKind] = useState<LegalSearchKind | null>(null);
  const [filters, setFilters] = useState<LegalSearchFilters>({});
  const [searching, setSearching] = useState(false);
  const [chats, setChats] = useState<LegalAssistantChat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [investigationTitle, setInvestigationTitle] = useState('');
  const [investigationType, setInvestigationType] = useState<InvestigationType>('Chat');
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [selectedResultUrls, setSelectedResultUrls] = useState<string[]>([]);
  const messagesRef = useRef<HTMLDivElement>(null);
  const advancedRef = useRef<HTMLDetailsElement>(null);
  const pendingResultIdRef = useRef<string | null>(null);

  const routeCaseId = /^\/casos\/([^/]+)$/.exec(pathname)?.[1];
  const caseOnRoute = cases.find(item => item.id === routeCaseId);
  const canUseCase = (item: typeof caseOnRoute) => Boolean(item && user && (
    user.role === 'abogado'
      ? item.ownerUserId === user.id || item.sharedWithUserIds?.includes(user.id)
      : item.assignedUserIds?.includes(user.id)
  ));
  const currentCase = canUseCase(caseOnRoute) ? caseOnRoute : undefined;
  const context: LegalAssistantContext | null = user ? {
    workspaceId: isDemo ? 'demo' : userProfile?.workspaceId || '',
    internalUserId: user.id,
    role: user.role,
    ...(currentCase ? {
      caseId: currentCase.id,
      sharePermission: user.role === 'asistente' ? 'assigned' as const
        : currentCase.ownerUserId === user.id ? 'owner' as const
          : currentCase.sharePermissions?.[user.id] || 'read' as const,
    } : {}),
  } : null;
  const workspaceId = context?.workspaceId;
  const internalUserId = context?.internalUserId;
  const role = context?.role;
  const store = useMemo(() => workspaceId && internalUserId && role
    ? createLegalAssistantChatStore({ workspaceId, internalUserId, role }, isDemo) : null,
  [workspaceId, internalUserId, role, isDemo]);

  useEffect(() => { setChats(store?.list() || []); setActiveId(null); setDraft(''); }, [store]);
  useEffect(() => {
    const container = messagesRef.current;
    if (!open || !container) return;
    const pendingId = pendingResultIdRef.current;
    const result = pendingId ? container.querySelector<HTMLElement>(`[data-message-id="${pendingId}"]`) : null;
    if (result) {
      container.scrollTop += result.getBoundingClientRect().top - container.getBoundingClientRect().top;
      pendingResultIdRef.current = null;
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [open, activeId, chats]);
  if (!context || !store) return null;

  const accessibleChats = chats.filter(chat => !chat.caseId || cases.some(item => item.id === chat.caseId && canUseCase(item)));
  const activeChat = accessibleChats.find(chat => chat.id === activeId);
  const canSaveInvestigation = Boolean(currentCase && activeChat?.caseId === currentCase.id && activeChat.messages.length && user && isDemo && ['owner', 'collaborate'].includes(investigationAccess(currentCase, user)));
  const openInvestigationForm = () => {
    if (!canSaveInvestigation || !activeChat) return;
    setInvestigationTitle(activeChat.title);
    setInvestigationType(activeChat.messages.findLast(message => message.search)?.search?.kind === 'jurisprudencia' ? 'Jurisprudencia'
      : activeChat.messages.findLast(message => message.search)?.search?.kind === 'normativa' ? 'Normativa' : 'Chat');
    setInvestigationNotes('');
    setSelectedResultUrls([...new Set(activeChat.messages.flatMap(message => message.search?.results.map(result => result.url) || []))]);
    setError('');
    setSaveOpen(true);
  };
  const saveInvestigation = () => {
    if (!currentCase || !user || !activeChat || !context.workspaceId) return;
    try {
      saveCaseInvestigation(context.workspaceId, currentCase, user, isDemo, {
        title: investigationTitle, type: investigationType, notes: investigationNotes,
        chatId: activeChat.id, messages: activeChat.messages.map(message => message.search ? {
          ...message, search: { ...message.search, results: message.search.results.filter(result => selectedResultUrls.includes(result.url)) },
        } : message),
      });
      setSaveOpen(false);
      setError('Investigación guardada en el caso.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la investigación.'); }
  };
  const saveChat = (chat: LegalAssistantChat) => {
    try { store.save(chat); setChats(store.list()); setActiveId(chat.id); setError(''); return true; }
    catch { setError('No se pudo guardar el chat local. Libera espacio del navegador e inténtalo de nuevo.'); return false; }
  };
  const submit = async (text: string, action?: LegalAssistantAction, fromAdvanced = false) => {
    const value = text.trim();
    const kind = action === 'jurisprudencia' || action === 'normativa' ? action : searchKind;
    if (searching || (!value && (!kind || !hasLegalSearchCriteria(filters)))) return;
    if (fromAdvanced && advancedRef.current) advancedRef.current.open = false;
    const now = new Date().toISOString();
    const target = activeChat?.caseId === context.caseId ? activeChat : undefined;
    const appliedFilters = { ...filters };
    const userMessage: LegalAssistantMessage = { id: crypto.randomUUID(), role: 'user', text: value || 'Búsqueda con filtros', createdAt: now };
    setSearching(true);
    let assistantMessage: LegalAssistantMessage;
    try {
      if (kind) {
        const response = await searchLegalSources(kind, value, appliedFilters);
        assistantMessage = {
          id: crypto.randomUUID(), role: 'assistant', text: response.notice, createdAt: new Date().toISOString(),
          search: { kind, query: value, filters: appliedFilters, results: response.results },
        };
      } else {
        assistantMessage = { id: crypto.randomUUID(), role: 'assistant', text: unavailableAssistantReply(isDemo, action), createdAt: new Date().toISOString() };
      }
    } catch (cause) {
      assistantMessage = { id: crypto.randomUUID(), role: 'assistant', text: cause instanceof Error ? cause.message : 'No se pudo realizar la búsqueda.', createdAt: new Date().toISOString() };
    } finally { setSearching(false); }
    if (fromAdvanced) pendingResultIdRef.current = assistantMessage.id;
    const messages = [userMessage, assistantMessage];
    const saved = saveChat(target ? { ...target, updatedAt: now, messages: [...target.messages, ...messages] } : {
      id: crypto.randomUUID(), title: (value || 'Búsqueda con filtros').slice(0, 54), caseId: context.caseId,
      createdAt: now, updatedAt: now, messages,
    });
    if (!saved) pendingResultIdRef.current = null;
    if (saved) setDraft('');
  };
  const selectChat = (chat: LegalAssistantChat) => {
    if (chat.caseId && chat.caseId !== context.caseId) navigate(`/casos/${encodeURIComponent(chat.caseId)}`);
    setActiveId(chat.id);
    setError('');
  };
  const removeChat = (id: string) => {
    store.remove(id); setChats(store.list());
    if (activeId === id) setActiveId(null);
  };

  if (!open) return <button type="button" onClick={() => setOpen(true)} aria-label="Abrir Asistente Jurídico" title="Asistente Jurídico" className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-amber-300 bg-brand-900 text-amber-300 shadow-lg transition hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"><MessageSquareText className="h-6 w-6" /></button>;

  return <><section aria-label="Asistente Jurídico" className="fixed bottom-5 right-5 z-50 flex h-[min(680px,calc(100dvh-2.5rem))] w-[min(410px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
    <header className="flex items-center justify-between bg-brand-900 px-4 py-3 text-white">
      <div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-amber-300" /><h2 className="font-serif text-lg font-bold">Asistente Jurídico</h2></div>
      <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar Asistente Jurídico" className="rounded-md p-1.5 hover:bg-brand-800"><X className="h-5 w-5" /></button>
    </header>
    {currentCase && <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-brand-900">Caso actual: <strong>{currentCase.nombre}</strong> · {context.sharePermission === 'owner' ? 'Propietario' : context.sharePermission === 'assigned' ? 'Asignado' : context.sharePermission === 'collaborate' ? 'Colaborar' : 'Solo lectura'}</p>}
    <div className="border-b border-slate-200 px-3 py-2">
      <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mis chats</span><div className="flex items-center gap-1">{canSaveInvestigation && <button type="button" onClick={openInvestigationForm} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-brand-900 hover:bg-brand-50"><Save className="h-3.5 w-3.5" />Guardar investigación</button>}<button type="button" onClick={() => { setActiveId(null); setDraft(''); setError(''); }} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-brand-900 hover:bg-brand-50"><Plus className="h-3.5 w-3.5" />Nuevo chat</button></div></div>
      {accessibleChats.length > 0 && <div className="mt-1 flex max-h-24 flex-col overflow-y-auto">{accessibleChats.map(chat => <div key={chat.id} className="flex items-center gap-1"><button type="button" onClick={() => selectChat(chat)} className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs ${activeId === chat.id ? 'bg-brand-50 font-semibold text-brand-900' : 'text-slate-600 hover:bg-slate-50'}`}>{chat.title}</button><button type="button" onClick={() => removeChat(chat.id)} aria-label={`Eliminar chat ${chat.title}`} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>}
    </div>
    <div ref={messagesRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
      {!activeChat?.messages.length ? <div className="space-y-4"><div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center"><MessageSquareText className="mx-auto h-7 w-7 text-brand-700" /><p className="mt-2 text-sm font-semibold text-slate-800">¿En qué puedo ayudarte?</p><p className="mt-1 text-xs text-slate-500">Busca referencias importadas en la base jurídica local. Comprueba siempre el documento original antes de citarlo.</p></div><div className="grid grid-cols-1 gap-2">{quickActions.map(action => <button key={action.id} type="button" onClick={() => action.id === 'investigacion' ? openInvestigationForm() : action.id === 'jurisprudencia' || action.id === 'normativa' ? (setSearchKind(action.id), setFilters({}), setDraft('')) : void submit(action.label, action.id)} disabled={action.id === 'investigacion' && !canSaveInvestigation} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-left text-xs font-medium text-brand-900 hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"><action.icon className="h-4 w-4 text-amber-700" />{action.label}</button>)}</div></div> : activeChat.messages.map(message => <div key={message.id} data-message-id={message.id} className={`max-w-[92%] rounded-lg px-3 py-2 text-sm ${message.role === 'user' ? 'ml-auto bg-brand-900 text-white' : 'border border-slate-200 bg-slate-50 text-slate-800'}`}><p>{message.text}</p>{message.search?.filters && activeFilterLabels(message.search.filters) && <p className="mt-1 text-xs text-slate-500">Filtros: {activeFilterLabels(message.search.filters)}</p>}{message.search && message.search.results.length > 0 && <div className="mt-2 space-y-2">{message.search.results.map(result => <LegalResultCard key={result.url} result={result} />)}</div>}</div>)}
    </div>
    {error && <p role="alert" className="px-4 pb-2 text-xs text-rose-700">{error}</p>}
    {searchKind && <div className="min-h-0 overflow-y-auto border-t border-slate-200 px-3 py-2 text-xs"><div className="flex items-center justify-between"><strong className="text-brand-900">Buscar {searchKind}</strong><button type="button" onClick={() => setSearchKind(null)} className="text-slate-500 underline">Salir de búsqueda</button></div><p className="mt-1 text-slate-500">Busca referencias oficiales importadas. La cobertura todavía es parcial.</p>{hasLegalSearchCriteria(filters) && <div className="mt-2 flex items-start justify-between gap-2 rounded-md bg-brand-50 px-2 py-1.5 text-brand-900"><p className="min-w-0 flex-1"><strong>Filtros activos:</strong> {activeFilterLabels(filters)}</p><button type="button" onClick={() => setFilters({})} className="shrink-0 font-semibold underline">Limpiar filtros</button></div>}<details ref={advancedRef} className="mt-2"><summary className="cursor-pointer font-medium text-brand-900">Búsqueda avanzada</summary><div className="mt-2 grid grid-cols-2 gap-2">
      <label className="col-span-2 font-semibold text-brand-900">Tema / subtema<input aria-label="Tema o subtema" placeholder="Ej.: divorcio, despido injustificado" value={filters.topic || ''} onChange={event => setFilters(current => ({ ...current, topic: event.target.value }))} className="mt-1 w-full rounded-md border border-brand-200 bg-brand-50 px-2 py-2 text-sm font-normal outline-none focus:border-brand-700" /></label>
      <input aria-label="Materia" placeholder="Materia" value={filters.matter || ''} onChange={event => setFilters(current => ({ ...current, matter: event.target.value }))} className="min-w-0 rounded border border-slate-200 p-1.5" />
      <input aria-label="Tribunal" placeholder="Tribunal" value={filters.tribunal || ''} onChange={event => setFilters(current => ({ ...current, tribunal: event.target.value }))} className="min-w-0 rounded border border-slate-200 p-1.5" />
      <label className="min-w-0 text-slate-600">Fecha desde<input type="date" aria-label="Desde" value={filters.fromDate || ''} onChange={event => setFilters(current => ({ ...current, fromDate: event.target.value }))} className="mt-1 w-full min-w-0 rounded border border-slate-200 p-1.5" /></label>
      <label className="min-w-0 text-slate-600">Fecha hasta<input type="date" aria-label="Hasta" value={filters.toDate || ''} onChange={event => setFilters(current => ({ ...current, toDate: event.target.value }))} className="mt-1 w-full min-w-0 rounded border border-slate-200 p-1.5" /></label>
      <div className="col-span-2 flex flex-wrap gap-2 pt-1"><button type="button" onClick={() => void submit(draft, undefined, true)} disabled={searching || (!draft.trim() && !hasLegalSearchCriteria(filters))} className="rounded-md bg-brand-900 px-3 py-2 font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">{searching ? 'Buscando…' : 'Buscar con filtros'}</button><button type="button" onClick={() => { setFilters({}); setError(''); }} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-brand-900 hover:bg-slate-50">Limpiar filtros</button></div>
      <details className="col-span-2 border-t border-slate-200 pt-2"><summary className="cursor-pointer font-medium text-brand-900">Más filtros</summary><div className="mt-2 grid grid-cols-2 gap-2">
        <select aria-label="Fuente jurídica" value={filters.source || ''} onChange={event => setFilters(current => ({ ...current, source: event.target.value || undefined }))} className="col-span-2 rounded border border-slate-200 bg-white p-1.5"><option value="">Todas las fuentes</option>{searchKind === 'jurisprudencia' ? <><option>Tribunal Agroambiental</option><option>Tribunal Constitucional Plurinacional</option><option>Tribunal Supremo de Justicia · resúmenes</option></> : <><option>Ministerio de Gobierno</option><option>Ministerio de Trabajo</option><option>ASFI</option><option>AGETIC · Normativa Nacional</option><option>Contraloría General del Estado</option></>}</select>
        <input aria-label="Sala" placeholder="Sala (si consta)" value={filters.chamber || ''} onChange={event => setFilters(current => ({ ...current, chamber: event.target.value }))} className="min-w-0 rounded border border-slate-200 p-1.5" />
        <input aria-label="Tipo de resolución o norma" placeholder="Tipo de resolución / norma" value={filters.resolutionType || ''} onChange={event => setFilters(current => ({ ...current, resolutionType: event.target.value }))} className="min-w-0 rounded border border-slate-200 p-1.5" />
        <input aria-label="Número o referencia" placeholder="Número / referencia" value={filters.reference || ''} onChange={event => setFilters(current => ({ ...current, reference: event.target.value }))} className="col-span-2 rounded border border-slate-200 p-1.5" />
        <select aria-label="Buscar dentro de" value={filters.searchField || 'all'} onChange={event => setFilters(current => ({ ...current, searchField: event.target.value as LegalSearchFilters['searchField'] }))} className="col-span-2 rounded border border-slate-200 bg-white p-1.5"><option value="all">Buscar en todo</option><option value="title">Título</option><option value="matter">Materia</option><option value="process">Proceso</option><option value="synopsis">Síntesis / extracto indexado</option><option value="keywords">Palabras clave / tema</option><option value="parties">Partes</option><option value="metadata">Metadatos</option></select>
        <label className="col-span-2 flex items-center gap-2 text-slate-700"><input type="checkbox" checked={Boolean(filters.exactPhrase)} onChange={event => setFilters(current => ({ ...current, exactPhrase: event.target.checked }))} />Frase exacta (también puedes usar comillas)</label>
        <input aria-label="Debe contener" placeholder="Debe contener estas palabras" value={filters.requiredTerms || ''} onChange={event => setFilters(current => ({ ...current, requiredTerms: event.target.value }))} className="col-span-2 rounded border border-slate-200 p-1.5" />
        <input aria-label="Excluir frase" placeholder="Excluir esta frase" value={filters.excludedTerms || ''} onChange={event => setFilters(current => ({ ...current, excludedTerms: event.target.value }))} className="col-span-2 rounded border border-slate-200 p-1.5" />
        <p className="col-span-2 text-slate-500">La ratio decidendi no está indexada por separado. Sala y fecha solo filtran registros con esos datos.</p>
      </div></details>
    </div></details></div>}
    <form onSubmit={event => { event.preventDefault(); void submit(draft); }} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3"><textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(draft); } }} aria-label="Mensaje para el asistente" placeholder={searchKind ? `Consulta de ${searchKind}…` : 'Escribe tu consulta…'} rows={2} className="min-h-11 max-h-28 min-w-0 flex-1 resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700" /><button type="submit" disabled={!draft.trim() || searching} aria-label="Enviar mensaje" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-900 text-white hover:bg-brand-800 disabled:opacity-50"><Send className="h-4 w-4" /></button></form>
  </section><Modal isOpen={saveOpen} onClose={() => setSaveOpen(false)} title="Guardar investigación" subtitle={currentCase ? `Caso: ${currentCase.nombre}` : undefined}>
    <form onSubmit={event => { event.preventDefault(); saveInvestigation(); }} className="space-y-4">
      <label className="block text-xs font-semibold text-slate-700">Título *<input required maxLength={160} value={investigationTitle} onChange={event => setInvestigationTitle(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /></label>
      <label className="block text-xs font-semibold text-slate-700">Tipo *<select value={investigationType} onChange={event => setInvestigationType(event.target.value as InvestigationType)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">{investigationTypes.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block text-xs font-semibold text-slate-700">Nota opcional<textarea value={investigationNotes} onChange={event => setInvestigationNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /></label>
      {activeChat && [...new Map(activeChat.messages.flatMap(message => message.search?.results || []).map(result => [result.url, result])).values()].length > 0 && <fieldset className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2"><legend className="px-1 text-xs font-semibold text-slate-700">Resultados a guardar</legend>{[...new Map(activeChat.messages.flatMap(message => message.search?.results || []).map(result => [result.url, result])).values()].map(result => <label key={result.url} className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={selectedResultUrls.includes(result.url)} onChange={event => setSelectedResultUrls(current => event.target.checked ? [...current, result.url] : current.filter(url => url !== result.url))} />{result.title} · {result.source}</label>)}</fieldset>}
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setSaveOpen(false)} className="rounded-md border border-slate-200 px-3 py-2 text-sm">Cancelar</button><button type="submit" className="rounded-md bg-brand-900 px-3 py-2 text-sm font-semibold text-white">Guardar investigación</button></div>
    </form>
  </Modal></>;
}
