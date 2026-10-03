import type { RecordatorioEvento } from '../types';
import { validateReminders } from '../services/reminders';

export interface NotificationPreferences {
  internalEnabled: boolean;
  entryNotices: boolean;
  defaultReminder: RecordatorioEvento;
}

const defaults: NotificationPreferences = {
  internalEnabled: true,
  entryNotices: true,
  defaultReminder: { cantidad: 1, unidad: 'días' },
};
const key = (userId: string) => `abogadospro_notification_preferences_v1:${encodeURIComponent(userId)}`;

export const notificationPreferencesRepository = {
  get(userId: string): NotificationPreferences {
    try {
      const raw = localStorage.getItem(key(userId));
      if (!raw) return { ...defaults, defaultReminder: { ...defaults.defaultReminder } };
      const value = JSON.parse(raw) as Partial<NotificationPreferences>;
      const reminder = value.defaultReminder;
      return {
        internalEnabled: typeof value.internalEnabled === 'boolean' ? value.internalEnabled : defaults.internalEnabled,
        entryNotices: typeof value.entryNotices === 'boolean' ? value.entryNotices : defaults.entryNotices,
        defaultReminder: reminder && ['minutos', 'horas', 'días'].includes(reminder.unidad) ? validateReminders([reminder])[0] : { ...defaults.defaultReminder },
      };
    } catch { return { ...defaults, defaultReminder: { ...defaults.defaultReminder } }; }
  },
  save(userId: string, value: NotificationPreferences): void {
    if (!['minutos', 'horas', 'días'].includes(value.defaultReminder.unidad)) throw new Error('Selecciona una unidad válida.');
    validateReminders([value.defaultReminder]);
    try { localStorage.setItem(key(userId), JSON.stringify(value)); }
    catch { throw new Error('No se pudieron guardar las preferencias de notificaciones.'); }
  },
};
