import { ILegalRepository } from './types';
import { LocalStorageLegalRepository } from './localStorageRepo';
import { LocalDocumentRepository, type DocumentRepository } from './documentsRepository';
import { TemporaryDocumentFiles } from '../services/documentFiles';
import { LocalProfileRepository, type ProfileRepository } from './profileRepository';

// Instancia actual del repositorio (LocalStorage + datos iniciales demo).
// Para conectar Firebase en el futuro, simplemente crea un `FirebaseLegalRepository`
// que implemente `ILegalRepository` y sustituye la instancia aquí exportada.
export const legalRepository: ILegalRepository = new LocalStorageLegalRepository();
export const profileRepository: ProfileRepository = new LocalProfileRepository(new TemporaryDocumentFiles());
export const documentRepository: DocumentRepository = new LocalDocumentRepository(new TemporaryDocumentFiles(), async (id) => !!await legalRepository.getCaseById(id));

export * from './types';
