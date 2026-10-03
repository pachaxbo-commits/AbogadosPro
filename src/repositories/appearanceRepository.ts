export type Appearance = 'light' | 'dark' | 'system';
export interface AppearanceRepository {
  get(userId: string): Appearance;
  save(userId: string, appearance: Appearance): void;
}
const key = (userId: string) => `abogadospro_appearance_v1:${encodeURIComponent(userId)}`;
export const appearanceRepository: AppearanceRepository = {
  get(userId) {
    try { const value = localStorage.getItem(key(userId)); return value === 'dark' || value === 'system' ? value : 'light'; }
    catch { return 'light'; }
  },
  save(userId, appearance) {
    try { localStorage.setItem(key(userId), appearance); }
    catch { throw new Error('No se pudo guardar la apariencia en este navegador.'); }
  },
};
