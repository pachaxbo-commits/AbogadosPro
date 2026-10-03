import { DOCUMENT_CATEGORIES } from '../services/documents';

export const CATEGORY_DEFAULTS = {
  areas: ['Civil', 'Penal', 'Familiar', 'Laboral'],
  documents: [...DOCUMENT_CATEGORIES],
  events: ['Audiencia', 'Plazo', 'Actuado', 'Reunión', 'Recordatorio', 'Otro'],
  expenses: ['Fotocopias', 'Notaría', 'Transporte', 'Timbres judiciales', 'Peritaje'],
  activities: ['Memorial presentado', 'Notificación recibida', 'Audiencia realizada', 'Documento presentado', 'Reunión con cliente', 'Nota interna'],
} satisfies Record<string, string[]>;

export type CategoryGroup = keyof typeof CATEGORY_DEFAULTS;
export const CURRENCIES = [{ code: 'BOB', label: 'BOB - Bolivianos (Bs)' }] as const;
export interface AppConfiguration {
  categories: Record<CategoryGroup, string[]>;
  defaultCurrency: (typeof CURRENCIES)[number]['code'];
  expensesReimbursableByDefault: boolean;
}

const storageKey = (workspaceId: string) => `abogadospro_configuration_v1:${encodeURIComponent(workspaceId)}`;
const fresh = (): AppConfiguration => ({
  categories: Object.fromEntries(Object.entries(CATEGORY_DEFAULTS).map(([key, values]) => [key, [...values]])) as AppConfiguration['categories'],
  defaultCurrency: 'BOB',
  expensesReimbursableByDefault: false,
});

export const configurationRepository = {
  get(workspaceId: string): AppConfiguration {
    try {
      const raw = localStorage.getItem(storageKey(workspaceId));
      if (!raw) return fresh();
      const saved = JSON.parse(raw) as Partial<AppConfiguration>;
      const value = fresh();
      for (const group of Object.keys(CATEGORY_DEFAULTS) as CategoryGroup[]) {
        const options = saved.categories?.[group];
        if (Array.isArray(options) && options.every(option => typeof option === 'string' && option.trim())) value.categories[group] = options;
      }
      if (CURRENCIES.some((currency) => currency.code === saved.defaultCurrency)) value.defaultCurrency = saved.defaultCurrency!;
      if (typeof saved.expensesReimbursableByDefault === 'boolean') value.expensesReimbursableByDefault = saved.expensesReimbursableByDefault;
      return value;
    } catch { return fresh(); }
  },
  save(workspaceId: string, value: AppConfiguration): void {
    try { localStorage.setItem(storageKey(workspaceId), JSON.stringify(value)); }
    catch { throw new Error('No se pudo guardar la configuración en este navegador.'); }
  },
};
