import { LocalStorageLegalRepository } from './localStorageRepo';
import { ILegalRepository } from './types';

/**
 * Repositorio exclusivo para el MODO DEMO interactivo.
 * Opera 100% en memoria / LocalStorage del navegador.
 * NUNCA lee ni escribe en Cloud Firestore.
 */
export class DemoLegalRepository extends LocalStorageLegalRepository implements ILegalRepository {
  constructor() {
    super();
  }
}

export const demoLegalRepository: ILegalRepository = new DemoLegalRepository();
