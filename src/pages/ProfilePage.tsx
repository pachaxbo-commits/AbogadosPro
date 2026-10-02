import { useEffect, useRef, useState } from 'react';
import { Copy, MessageCircle, Pencil, Share2, Sun, Moon } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import type { ProfileData } from '../types/profile';
import { PROFILE_FIELDS, profileText, validateProfilePhoto } from '../services/profile';
import { whatsappShareUrl } from '../services/whatsapp';
import { Modal } from '../components/common/Modal';
import { ProfileAvatar } from '../components/profile/ProfileAvatar';
import { PhoneInput } from '../components/common/PhoneInput';

const secondary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-50';
const primary = 'inline-flex min-h-10 items-center justify-center rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50';

function ProfileCard({ profile, photoUrl }: { profile: ProfileData; photoUrl: string | null }) {
  return <div className="space-y-6 break-words">
    <div className="flex flex-wrap items-center gap-5 rounded-lg border border-brand-100 bg-brand-50 p-5"><ProfileAvatar name={profile.nombre} url={photoUrl} large /><div className="min-w-0 flex-1"><h2 className="text-2xl font-bold text-brand-900">{profile.nombre}</h2>{profile.especialidad && <p className="mt-1 text-sm text-slate-600">{profile.especialidad}</p>}{profile.estudio && <p className="mt-1 text-sm font-semibold text-slate-700">{profile.estudio}</p>}</div></div>
    <dl className="grid gap-4 sm:grid-cols-2">{PROFILE_FIELDS.filter(([key]) => !['nombre', 'estudio', 'especialidad', 'presentacion'].includes(key) && profile[key]).map(([key, label]) => <div key={key}><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{profile[key]}</dd></div>)}</dl>
    {profile.presentacion && <section className="border-t border-slate-200 pt-5"><h3 className="text-sm font-semibold text-brand-900">Presentación profesional</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{profile.presentacion}</p></section>}
  </div>;
}

function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { profile, photoUrl, save } = useProfile();
  const [draft, setDraft] = useState<ProfileData>(() => Object.fromEntries(PROFILE_FIELDS.map(([key]) => [key, profile?.[key] || ''])) as unknown as ProfileData);
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const previewRef = useRef<string | undefined>(undefined);
  const selection = useRef(0);
  const [checkingPhoto, setCheckingPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => () => { selection.current++; if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  return <form className="space-y-5" onSubmit={async event => {
    event.preventDefault();
    if (guard.current || checkingPhoto) return;
    guard.current = true; setBusy(true); setError('');
    try { await save(draft, photo); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.'); }
    finally { guard.current = false; setBusy(false); }
  }}>
    {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-5 rounded-lg border border-brand-100 bg-brand-50 p-5"><ProfileAvatar name={draft.nombre} url={preview || photoUrl} large /><div className="min-w-0 w-full sm:w-auto sm:flex-1">
      <h2 className="mb-1 text-xl font-bold text-brand-900">{draft.nombre.trim() || 'Tu perfil profesional'}</h2>
      {(draft.especialidad || draft.estudio) && <p className="mb-3 text-sm text-slate-600">{[draft.especialidad, draft.estudio].filter(Boolean).join(' · ')}</p>}
      <label htmlFor="profile-photo" className="block text-sm font-semibold text-slate-700">Foto de perfil</label>
      <input id="profile-photo" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" disabled={busy} className="mt-2 block w-full text-xs" onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        const current = ++selection.current; setCheckingPhoto(true); setError('');
        try {
          await validateProfilePhoto(file);
          if (current !== selection.current) return;
          const url = URL.createObjectURL(file);
          if (previewRef.current) URL.revokeObjectURL(previewRef.current);
          previewRef.current = url; setPreview(url); setPhoto(file);
        } catch (err) { if (current === selection.current) setError(err instanceof Error ? err.message : 'No se pudo cargar la imagen.'); }
        finally { if (current === selection.current) setCheckingPhoto(false); }
      }} />
      <p className="mt-2 text-xs text-slate-500">JPG o PNG, máximo 2 MB. La foto dura esta sesión; al recargar se mostrarán tus iniciales.</p>
      {checkingPhoto && <p role="status" className="mt-1 text-xs text-slate-500">Validando imagen…</p>}
    </div></div>
    {[
      { title: 'Información profesional', fields: ['nombre', 'estudio', 'especialidad', 'matricula'] },
      { title: 'Información de contacto', fields: ['telefono', 'correo', 'direccion'] },
      { title: 'Presentación profesional', fields: ['presentacion'] },
    ].map(section => <section key={section.title} className="border-t border-slate-200 pt-5"><h3 className="mb-4 text-base font-semibold text-brand-900">{section.title}</h3><div className="grid gap-4 sm:grid-cols-2">{section.fields.map(field => {
      const [key, label] = PROFILE_FIELDS.find(([key]) => key === field)!;
      return <div key={key} className={key === 'presentacion' || key === 'direccion' ? 'sm:col-span-2' : ''}>
      <label htmlFor={`profile-${key}`} className="block text-sm font-semibold text-slate-700">{label}{key === 'nombre' && ' *'}</label>
      {key === 'telefono' ? <PhoneInput id="profile-telefono" value={draft.telefono || ''} disabled={busy} onChange={telefono => setDraft(prev => ({ ...prev, telefono }))} /> : key === 'presentacion' ? <textarea id={`profile-${key}`} value={draft[key] || ''} rows={3} maxLength={1000} disabled={busy} onChange={event => setDraft(prev => ({ ...prev, [key]: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /> : <input id={`profile-${key}`} type={key === 'correo' ? 'email' : 'text'} required={key === 'nombre'} maxLength={key === 'direccion' ? 400 : 160} value={draft[key] || ''} disabled={busy} onChange={event => setDraft(prev => ({ ...prev, [key]: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />}
    </div>})}</div></section>)}
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={busy} className={secondary} onClick={onClose}>Cancelar</button><button type="submit" disabled={busy || checkingPhoto} className={primary}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>
  </form>;
}

export function ProfilePage() {
  const { profile, photoUrl, loading, error, appearance, setAppearance } = useProfile();
  const [appearanceError, setAppearanceError] = useState('');
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [copyError, setCopyError] = useState('');
  return <div className="mx-auto max-w-3xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4"><div><h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1><p className="mt-1 text-sm text-slate-500">Tu información y presentación profesional</p></div>{!editing && !loading && !error && <button type="button" className={secondary} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Editar perfil</button>}</div>
    {loading ? <p>Cargando perfil…</p> : error ? <p role="alert" className="rounded-md bg-rose-50 p-4 text-sm text-rose-800">{error}</p> : <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      {editing ? <ProfileEditor onClose={() => setEditing(false)} /> : profile ? <><ProfileCard profile={profile} photoUrl={photoUrl} />{profile.foto && !photoUrl && <p className="mt-4 text-xs text-slate-500">La foto de la sesión anterior ya no está disponible. Puedes seleccionarla de nuevo al editar.</p>}<button type="button" className={`${secondary} mt-6`} onClick={() => { setSharing(true); setCopyStatus(''); setCopyError(''); }}><Share2 className="h-4 w-4" />Compartir presentación</button></> : <p className="text-sm text-slate-600">Aún no has configurado tu perfil. Pulsa «Editar perfil» para completar tus datos.</p>}
    </section>}
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-brand-900">Personalización</h2>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span id="appearance-label" className="text-sm font-medium text-slate-700">Apariencia</span><div role="group" aria-labelledby="appearance-label" className="flex gap-2">{(['light', 'dark'] as const).map(value => {
        const Icon = value === 'light' ? Sun : Moon;
        return <button key={value} type="button" aria-pressed={appearance === value} className={`${appearance === value ? primary : secondary} gap-2`} onClick={() => {
          try { setAppearance(value); setAppearanceError(''); } catch (err) { setAppearanceError(err instanceof Error ? err.message : 'No se pudo guardar la apariencia.'); }
        }}><Icon className="h-4 w-4" />{value === 'light' ? 'Claro' : 'Oscuro'}</button>;
      })}</div></div>
      {appearanceError && <p role="alert" className="mt-3 text-sm text-rose-700">{appearanceError}</p>}
    </section>
    {sharing && profile && <Modal isOpen onClose={() => setSharing(false)} title="Presentación profesional" maxWidth="lg">
      <ProfileCard profile={profile} photoUrl={photoUrl} />
      <div className="mt-6 flex flex-wrap gap-2"><a href={whatsappShareUrl(profileText(profile))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"><MessageCircle className="h-4 w-4" />Compartir por WhatsApp</a><button type="button" className={secondary} onClick={async () => {
        setCopyError(''); setCopyStatus('');
        try { await navigator.clipboard.writeText(profileText(profile)); setCopyStatus('Información copiada'); }
        catch { setCopyError('No se pudo acceder al portapapeles. Puedes seleccionar y copiar el texto de la presentación.'); }
      }}><Copy className="h-4 w-4" />Copiar información</button></div>
      {copyStatus && <p role="status" className="mt-3 text-sm text-emerald-800">{copyStatus}</p>}{copyError && <p role="alert" className="mt-3 text-sm text-slate-600">{copyError}</p>}
    </Modal>}
  </div>;
}
