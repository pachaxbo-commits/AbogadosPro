export * from './types';
export * from './localStorageRepo';
export * from './demoRepo';
export * from './firestoreRepo';

import { demoLegalRepository } from './demoRepo';
import { LocalDocumentRepository, type DocumentRepository } from './documentsRepository';
import { LocalProfileRepository, type ProfileRepository } from './profileRepository';
import { TemporaryDocumentFiles } from '../services/documentFiles';

export const legalRepository = demoLegalRepository;

const temporaryFiles = new TemporaryDocumentFiles();

export const profileRepository: ProfileRepository =
  new LocalProfileRepository(temporaryFiles);

export const documentRepository: DocumentRepository =
  new LocalDocumentRepository(
    temporaryFiles,
    async (id: string) => (await legalRepository.getCaseById(id)) !== null,
  );