export * from './types';
export * from './localStorageRepo';
export * from './demoRepo';
export * from './firestoreRepo';

import { demoLegalRepository } from './demoRepo';
export const legalRepository = demoLegalRepository;
