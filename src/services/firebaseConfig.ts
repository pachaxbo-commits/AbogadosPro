import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/** Configuración web pública. Nunca colocar credenciales Admin aquí. */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;

export const isFirebaseConfigured = (): boolean => requiredFields.every((field) => {
  const value = firebaseConfig[field].trim();
  return Boolean(value) && !value.startsWith('tu_');
});

/** Inicialización bajo demanda: el modo local no abre conexiones a Firebase. */
export function getFirebaseServices() {
  if (!isFirebaseConfigured()) {
    throw new Error('Completa la configuración de Firebase en .env.local antes de conectar.');
  }
  const app = getApps().find((item) => item.name === 'abogadospro')
    ?? initializeApp(firebaseConfig, 'abogadospro');
  return { app, auth: getAuth(app), db: getFirestore(app) };
}
