/**
 * AbogadosPro - Guía y configuración preparada para Backend en Firebase
 * 
 * NOTA DE ARQUITECTURA:
 * El proyecto está 100% desacoplado a través de `ILegalRepository`.
 * 
 * Para activar Firebase en el futuro:
 * 1. Instalar dependencias oficiales:
 *    npm install firebase
 * 
 * 2. Crear las variables en .env.local basándote en .env.example:
 *    VITE_FIREBASE_API_KEY=...
 *    VITE_FIREBASE_PROJECT_ID=...
 *    etc.
 * 
 * 3. Descomentar la inicialización a continuación e implementar
 *    `FirebaseLegalRepository` cumpliendo la interfaz `ILegalRepository`.
 * 
 * 4. Cambiar en `src/repositories/index.ts`:
 *    export const legalRepository: ILegalRepository = new FirebaseLegalRepository();
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'tu_api_key_aqui'
  );
};
