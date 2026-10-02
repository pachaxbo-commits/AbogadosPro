import { MessageCircle } from 'lucide-react';
import { whatsappUrl } from '../../services/whatsapp';
export function WhatsAppContact({ phone, message }: { phone?: string; message?: string }) {
  if (!phone?.trim()) return null;
  const url = whatsappUrl(phone, message);
  if (!url) return <span className="text-xs text-slate-500">Para WhatsApp, completa el teléfono con su código internacional.</span>;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />WhatsApp</a>;
}
