import { useState } from 'react';
import { UserRound } from 'lucide-react';
export function ProfileAvatar({ name = '', url, large = false }: { name?: string; url?: string | null; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-200 bg-brand-50 font-semibold text-brand-900 ${large ? 'h-20 w-20 text-2xl' : 'h-9 w-9 text-xs'}`}>
    {url && failedUrl !== url ? <img src={url} alt={`Foto de ${name || 'perfil'}`} className="h-full w-full object-cover" onError={() => setFailedUrl(url)} /> : initials || <UserRound aria-hidden="true" className={large ? 'h-9 w-9' : 'h-5 w-5'} />}
  </span>;
}
