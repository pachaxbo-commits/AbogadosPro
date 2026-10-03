import { useState } from 'react';
import { Bell, Monitor, Moon, Sun } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import type { Appearance } from '../repositories/appearanceRepository';
import type { NotificationPreferences } from '../repositories/notificationPreferencesRepository';
import type { RecordatorioEvento } from '../types';
import { validateReminders } from '../services/reminders';
import { CategorySettings } from '../components/settings/CategorySettings';
import { AssigneeSettings } from '../components/settings/AssigneeSettings';
import { CURRENCIES } from '../repositories/configurationRepository';

const appearances: { value: Appearance; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Oscuro', Icon: Moon },
  { value: 'system', label: 'Sistema', Icon: Monitor },
];

export function SettingsPage() {
  const { appearance, setAppearance, notificationPreferences, setNotificationPreferences, configuration, setExpensesReimbursableByDefault } = useProfile();
  const [error, setError] = useState('');
  const [reminderAmount, setReminderAmount] = useState(String(notificationPreferences.defaultReminder.cantidad));
  const saveNotifications = (patch: Partial<NotificationPreferences>) => {
    try { setNotificationPreferences({ ...notificationPreferences, ...patch }); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron guardar las preferencias.'); }
  };
  const setReminder = (patch: Partial<RecordatorioEvento>) => saveNotifications({ defaultReminder: { ...notificationPreferences.defaultReminder, ...patch } });
  const saveAmount = () => {
    const amount = Number(reminderAmount);
    if (!Number.isInteger(amount) || amount <= 0) { setError('Ingresa una cantidad entera positiva.'); setReminderAmount(String(notificationPreferences.defaultReminder.cantidad)); return; }
    try { validateReminders([{ cantidad: amount, unidad: notificationPreferences.defaultReminder.unidad }]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Recordatorio inválido.'); setReminderAmount(String(notificationPreferences.defaultReminder.cantidad)); return; }
    setReminder({ cantidad: amount });
  };
  return <div className="mx-auto max-w-3xl space-y-6">
    <div className="border-b border-slate-200 pb-4"><h1 className="text-2xl font-bold text-slate-900">Configuración</h1><p className="mt-1 text-sm text-slate-500">Preferencias de la aplicación</p></div>
    {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="settings-appearance">
      <h2 id="settings-appearance" className="text-lg font-semibold text-brand-900">Apariencia</h2>
      <p className="mt-1 text-sm text-slate-500">Elige cómo se muestra AbogadosPro.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Apariencia">{appearances.map(({ value, label, Icon }) => <button key={value} type="button" aria-pressed={appearance === value} onClick={() => { try { setAppearance(value); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la apariencia.'); } }} className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-semibold ${appearance === value ? 'border-brand-900 bg-brand-900 text-white' : 'border-slate-300 bg-white text-brand-900 hover:bg-brand-50'}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="settings-notifications">
      <h2 id="settings-notifications" className="flex items-center gap-2 text-lg font-semibold text-brand-900"><Bell className="h-5 w-5" />Notificaciones</h2>
      <div className="mt-4 space-y-4">
        <label className="flex min-h-11 items-center justify-between gap-4 border-b border-slate-100 pb-4"><span><span className="block text-sm font-medium text-slate-800">Notificaciones internas</span><span className="mt-1 block text-xs text-slate-500">Muestra las alertas dentro de la aplicación.</span></span><input type="checkbox" checked={notificationPreferences.internalEnabled} onChange={(event) => saveNotifications({ internalEnabled: event.target.checked })} className="h-5 w-5 shrink-0 accent-brand-900" /></label>
        <label className="flex min-h-11 items-center justify-between gap-4 border-b border-slate-100 pb-4"><span><span className="block text-sm font-medium text-slate-800">Avisos al entrar</span><span className="mt-1 block text-xs text-slate-500">Muestra el aviso breve de pendientes al abrir la aplicación.</span></span><input type="checkbox" checked={notificationPreferences.entryNotices} onChange={(event) => saveNotifications({ entryNotices: event.target.checked })} className="h-5 w-5 shrink-0 accent-brand-900" /></label>
        <div><label htmlFor="default-reminder-amount" className="block text-sm font-medium text-slate-800">Recordatorio predeterminado</label><p className="mt-1 text-xs text-slate-500">Se propone en eventos nuevos; cada evento puede tener sus propios recordatorios.</p><div className="mt-3 flex flex-wrap items-center gap-2"><input id="default-reminder-amount" type="number" min="1" max="525600" step="1" value={reminderAmount} onChange={(event) => setReminderAmount(event.target.value)} onBlur={saveAmount} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} className="min-h-11 w-24 rounded-md border border-slate-300 bg-white px-3 text-sm" /><select aria-label="Unidad del recordatorio predeterminado" value={notificationPreferences.defaultReminder.unidad} onChange={(event) => setReminder({ unidad: event.target.value as RecordatorioEvento['unidad'] })} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="minutos">minutos</option><option value="horas">horas</option><option value="días">días</option></select><span className="text-sm text-slate-600">antes</span></div></div>
      </div>
    </section>
    <CategorySettings />
    <AssigneeSettings />
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="settings-finances">
      <h2 id="settings-finances" className="text-lg font-semibold text-brand-900">Finanzas</h2>
      <label htmlFor="default-currency" className="mt-4 block text-sm font-medium text-slate-800">Moneda predeterminada</label>
      <select id="default-currency" value={configuration.defaultCurrency} disabled className="mt-2 min-h-11 w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 text-sm">{CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.label}</option>)}</select>
      <label className="mt-5 flex min-h-11 items-center justify-between gap-4 border-t border-slate-100 pt-4"><span><span className="block text-sm font-medium text-slate-800">Gastos reembolsables por defecto</span><span className="mt-1 block text-xs text-slate-500">Se puede cambiar al registrar cada gasto.</span></span><span className="flex shrink-0 items-center gap-2 text-sm text-slate-700">{configuration.expensesReimbursableByDefault ? 'Sí' : 'No'}<input type="checkbox" checked={configuration.expensesReimbursableByDefault} onChange={(event) => { try { setExpensesReimbursableByDefault(event.target.checked); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la preferencia.'); } }} className="h-5 w-5 accent-brand-900" /></span></label>
    </section>
  </div>;
}
