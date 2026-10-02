import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../services/firebaseConfig';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  error: string | null;
  clearError: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, displayName: string, studioName?: string) => Promise<void>;
  logout: () => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  sendResetPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = 'abogadospro_demo_mode_active';

export function getFriendlyAuthErrorMessage(errorCodeOrMessage: string): string {
  if (errorCodeOrMessage.includes('auth/invalid-credential') || errorCodeOrMessage.includes('auth/wrong-password')) {
    return 'Correo o contraseña incorrectos. Verifique sus datos e intente nuevamente.';
  }
  if (errorCodeOrMessage.includes('auth/user-not-found')) {
    return 'No existe ninguna cuenta registrada con este correo electrónico.';
  }
  if (errorCodeOrMessage.includes('auth/email-already-in-use')) {
    return 'Este correo electrónico ya se encuentra registrado. Pruebe iniciando sesión.';
  }
  if (errorCodeOrMessage.includes('auth/weak-password')) {
    return 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
  }
  if (errorCodeOrMessage.includes('auth/invalid-email')) {
    return 'El formato de correo electrónico es inválido.';
  }
  if (errorCodeOrMessage.includes('auth/too-many-requests')) {
    return 'Demasiados intentos fallidos. Por seguridad, espere unos momentos antes de reintentar.';
  }
  if (errorCodeOrMessage.includes('auth/network-request-failed')) {
    return 'Error de conexión. Verifique su conexión a internet.';
  }
  if (errorCodeOrMessage.includes('auth/requires-recent-login')) {
    return 'Esta operación es sensible y requiere que vuelva a iniciar sesión antes de continuar.';
  }
  return errorCodeOrMessage || 'Ocurrió un error en la autenticación.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return sessionStorage.getItem(DEMO_STORAGE_KEY) === 'true';
  });

  const clearError = () => setError(null);

  // Carga o auto-creación del perfil en Firestore
  const fetchOrCreateProfile = useCallback(async (user: User): Promise<UserProfile> => {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return userDocSnap.data() as UserProfile;
    }

    // Si el usuario fue creado en la consola de Firebase u otro medio sin perfil Firestore
    const defaultProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Abogado',
      studioName: '',
      role: 'user',
      accountType: 'free',
      plan: 'free',
      billingExempt: false,
      subscriptionStatus: 'active',
      workspaceId: user.uid,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    };

    await setDoc(userDocRef, defaultProfile);

    // Asegurar workspace personal aislado
    const workspaceRef = doc(db, 'workspaces', user.uid);
    await setDoc(workspaceRef, {
      id: user.uid,
      name: defaultProfile.studioName || defaultProfile.displayName,
      ownerUid: user.uid,
      plan: 'free',
      createdAt: new Date().toISOString(),
    }, { merge: true });

    return defaultProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (currentUser) {
      try {
        const p = await fetchOrCreateProfile(currentUser);
        setUserProfile(p);
      } catch (e) {
        console.error('Error refreshing profile:', e);
      }
    }
  }, [currentUser, fetchOrCreateProfile]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      console.warn('Firebase no está configurado. Iniciando en modo seguro local.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const profile = await fetchOrCreateProfile(firebaseUser);
          setCurrentUser(firebaseUser);
          setUserProfile(profile);
          setIsDemo(false);
          sessionStorage.removeItem(DEMO_STORAGE_KEY);
        } catch (err) {
          console.error('Error al obtener perfil de usuario:', err);
          setError('No fue posible cargar el perfil del usuario.');
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        // Si no hay usuario y sessionStorage dice demo, activar demo
        if (sessionStorage.getItem(DEMO_STORAGE_KEY) === 'true') {
          setIsDemo(true);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchOrCreateProfile]);

  const login = async (email: string, pass: string): Promise<void> => {
    setError(null);
    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const profile = await fetchOrCreateProfile(cred.user);
      setCurrentUser(cred.user);
      setUserProfile(profile);
      setIsDemo(false);
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      const friendly = getFriendlyAuthErrorMessage(errMessage);
      setError(friendly);
      throw new Error(friendly);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    pass: string,
    displayName: string,
    studioName?: string
  ): Promise<void> => {
    setError(null);
    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      
      // Actualizar nombre en auth
      await updateProfile(cred.user, { displayName });

      // Enviar correo de verificación (no bloqueante para la UI pero ejecutado)
      try {
        await sendEmailVerification(cred.user);
      } catch (emailErr) {
        console.warn('No se pudo enviar email de verificación:', emailErr);
      }

      // Crear perfil oficial Free en Firestore
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || email.trim(),
        displayName,
        studioName: studioName?.trim() || '',
        role: 'user',
        accountType: 'free',
        plan: 'free',
        billingExempt: false,
        subscriptionStatus: 'active',
        workspaceId: cred.user.uid,
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', cred.user.uid), newProfile);

      // Crear workspace aislado
      await setDoc(doc(db, 'workspaces', cred.user.uid), {
        id: cred.user.uid,
        name: studioName?.trim() || displayName,
        ownerUid: cred.user.uid,
        plan: 'free',
        createdAt: new Date().toISOString(),
      });

      setCurrentUser(cred.user);
      setUserProfile(newProfile);
      setIsDemo(false);
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      const friendly = getFriendlyAuthErrorMessage(errMessage);
      setError(friendly);
      throw new Error(friendly);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Error signing out:', err);
    } finally {
      setCurrentUser(null);
      setUserProfile(null);
      setIsDemo(false);
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    }
  };

  const enterDemoMode = () => {
    sessionStorage.setItem(DEMO_STORAGE_KEY, 'true');
    setIsDemo(true);
    if (currentUser) {
      signOut(auth).catch(() => {});
      setCurrentUser(null);
      setUserProfile(null);
    }
  };

  const exitDemoMode = () => {
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
    setIsDemo(false);
  };

  const sendResetPassword = async (email: string): Promise<void> => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      const friendly = getFriendlyAuthErrorMessage(errMessage);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const changePassword = async (newPassword: string): Promise<void> => {
    if (!currentUser) throw new Error('No hay usuario autenticado.');
    setError(null);
    try {
      await updatePassword(currentUser, newPassword);
      // Desactivar bandera de cambio obligatorio en Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { mustChangePassword: false });
      if (userProfile) {
        setUserProfile({ ...userProfile, mustChangePassword: false });
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      const friendly = getFriendlyAuthErrorMessage(errMessage);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isDemo,
        error,
        clearError,
        login,
        register,
        logout,
        enterDemoMode,
        exitDemoMode,
        sendResetPassword,
        changePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
