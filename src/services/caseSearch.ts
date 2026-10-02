import type { CasoConDetalles } from '../types';

export const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
export function matchesCaseSearch(caso: CasoConDetalles | undefined, query: string): boolean {
  const term = normalizeSearch(query);
  return !!caso && [caso.nombre, caso.clienteNombre, caso.numeroIdentificacionJudicial,
    `${caso.tipoIdentificacionJudicial} ${caso.numeroIdentificacionJudicial}`].some((value) => normalizeSearch(value).includes(term));
}
export function searchCases(cases: CasoConDetalles[], query: string, limit = 10): CasoConDetalles[] {
  const active = (caso: CasoConDetalles) => caso.estado === 'Activo' || caso.estado === 'En trámite';
  return cases.filter((caso) => matchesCaseSearch(caso, query))
    .sort((a, b) => Number(active(b)) - Number(active(a)) || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, limit);
}
