import { ILegalRepository } from './types';
import { LocalStorageLegalRepository } from './localStorageRepo';

// Instancia actual del repositorio (LocalStorage + datos iniciales demo).
// Para conectar Firebase en el futuro, simplemente crea un `FirebaseLegalRepository`
// que implemente `ILegalRepository` y sustituye la instancia aquí exportada.
export const legalRepository: ILegalRepository = new LocalStorageLegalRepository();

export * from './types';
