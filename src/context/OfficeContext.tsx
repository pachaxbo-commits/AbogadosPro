import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { useAuth } from './AuthContext';
import { profileRepository } from '../repositories';
import { listDemoUsers, verifyDemoUser, createDemoUser, updateDemoUser, resetDemoPassword, changeDemoPassword, resetDemoUsers, updateOwnDemoProfile } from '../services/demoOffice';
import { changeOfficePassword, enterOfficeUser, leaveOfficeUser, officeRequest, officeAuthEnabled, type OfficeRole, type OfficeUser } from '../services/internalAuth';

type OfficeState = 'guest' | 'loading' | 'setup' | 'select' | 'active' | 'error';
type OfficeContextValue = {
  state: OfficeState; error: string; users: OfficeUser[]; user: OfficeUser | null; firebaseUser: User | null;
  refresh: () => Promise<void>; bootstrap: (password: string) => Promise<void>;
  select: (id: string, password: string) => Promise<void>; switchUser: () => Promise<void>;
  create: (name: string, role: OfficeRole, password: string) => Promise<void>;
  update: (id: string, changes: Partial<Pick<OfficeUser, 'role' | 'active'>>) => Promise<void>;
  saveOwnProfile: (displayName: string, photoUrl?: string) => Promise<void>;
  reset: (id: string, password: string) => Promise<void>; changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
};
const OfficeContext = createContext<OfficeContextValue | null>(null);

export function OfficeProvider({ children }: { children: ReactNode }) {
  const { currentUser, userProfile, isDemo, loading } = useAuth();
  const [state, setState] = useState<OfficeState>('guest');
  const [error, setError] = useState('');
  const [users, setUsers] = useState<OfficeUser[]>([]);
  const [user, setUser] = useState<OfficeUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const refresh = useCallback(async () => {
    if (isDemo) { setUsers(listDemoUsers()); setState('select'); return; }
    if (!officeAuthEnabled || !currentUser || userProfile?.role === 'admin') return;
    const result = await officeRequest<{ enabled: boolean; users: OfficeUser[] }>('list');
    setUsers(result.users);
    setState(result.enabled ? 'select' : 'setup');
  }, [currentUser, isDemo, userProfile?.role]);
  useEffect(() => {
    if (loading) return;
    if (isDemo) {
      setUsers(listDemoUsers()); setUser(null); setFirebaseUser(null); setState('select');
      let cancelled = false;
      void (async () => {
        for (const item of listDemoUsers()) {
          try {
            const profile = await profileRepository.get(item.id) || (item.id === 'demo-jefe' ? await profileRepository.get('demo-lawyer') : null);
            if (profile) updateOwnDemoProfile(item.id, profile.nombre, (await profileRepository.photoUrl(profile)) || undefined);
          } catch { /* El perfil local no debe impedir el acceso al demo. */ }
        }
        if (!cancelled) setUsers(listDemoUsers());
      })();
      return () => { cancelled = true; };
    }
    if (!officeAuthEnabled || !currentUser || userProfile?.role === 'admin') {
      setState('guest'); setUser(null); setFirebaseUser(null); setUsers([]);
      void leaveOfficeUser(); return;
    }
    let cancelled = false;
    setState('loading'); setError(''); setUser(null); setFirebaseUser(null);
    void leaveOfficeUser().then(() => officeRequest<{ enabled: boolean; users: OfficeUser[] }>('list')).then(result => {
      if (cancelled) return;
      setUsers(result.users);
      setState(result.enabled ? 'select' : 'setup');
    }).catch(err => { if (!cancelled) { setError(err instanceof Error ? err.message : 'No se pudo cargar el estudio.'); setState('error'); } });
    return () => { cancelled = true; };
  }, [currentUser?.uid, isDemo, loading, userProfile?.role]);
  useEffect(() => {
    if (state !== 'active' || !firebaseUser) return;
    let cancelled = false;
    const verifySession = async () => {
      try {
        const result = await officeRequest<{ user: OfficeUser }>('me', {}, firebaseUser);
        if (!cancelled) setUser(result.user);
      } catch {
        if (cancelled) return;
        await leaveOfficeUser();
        if (cancelled) return;
        setUser(null); setFirebaseUser(null); setState('select');
        officeRequest<{ users: OfficeUser[] }>('list').then(result => { if (!cancelled) setUsers(result.users); }).catch(() => {});
      }
    };
    const timer = window.setInterval(() => void verifySession(), 30_000);
    const onFocus = () => void verifySession();
    window.addEventListener('focus', onFocus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [state, firebaseUser]);
  useEffect(() => {
    if (!isDemo) return;
    const reset = () => { resetDemoUsers(); setUsers(listDemoUsers()); setUser(null); setFirebaseUser(null); setState('select'); };
    window.addEventListener('abogadospro:demo-reset', reset);
    return () => window.removeEventListener('abogadospro:demo-reset', reset);
  }, [isDemo]);
  const bootstrap = async (password: string) => {
    const name = userProfile?.displayName || 'Admin del estudio';
    await officeRequest('bootstrap', { displayName: name, password });
    await refresh();
  };
  const select = async (id: string, password: string) => {
    const selected = users.find(item => item.id === id && item.active);
    if (!selected) throw new Error('Selecciona un usuario activo.');
    if (isDemo) { setUser(await verifyDemoUser(id, password)); setState('active'); return; }
    const signedIn = await enterOfficeUser(selected, password);
    setFirebaseUser(signedIn); setUser(selected); setState('active');
  };
  const switchUser = async () => { if (!isDemo) await leaveOfficeUser(); setUser(null); setFirebaseUser(null); setState('select'); };
  const create = async (displayName: string, role: OfficeRole, password: string) => {
    if (isDemo) { if (!user?.isOfficeAdmin) throw new Error('Solo el Admin puede crear usuarios.'); await createDemoUser(displayName, role, password); setUsers(listDemoUsers()); return; }
    await officeRequest('create', { displayName, role, password }, firebaseUser); await refreshUsers();
  };
  const refreshUsers = async () => {
    if (isDemo) { setUsers(listDemoUsers()); return; }
    const result = await officeRequest<{ users: OfficeUser[] }>('list'); setUsers(result.users);
  };
  const update = async (userId: string, changes: Partial<Pick<OfficeUser, 'role' | 'active'>>) => {
    if (isDemo) { if (!user?.isOfficeAdmin) throw new Error('Solo el Admin puede editar usuarios.'); if (userId === user.id && changes.active === false) throw new Error('No puedes desactivar tu perfil actual.'); updateDemoUser(userId, changes); setUsers(listDemoUsers()); if (userId === user.id) setUser(listDemoUsers().find(item => item.id === userId) || null); return; }
    await officeRequest('update', { userId, ...changes }, firebaseUser); await refreshUsers();
    if (user?.id === userId) {
      const result = await officeRequest<{ user: OfficeUser }>('me', {}, firebaseUser);
      setUser(result.user);
    }
  };
  const saveOwnProfile = async (displayName: string, photoUrl?: string) => {
    if (!user) throw new Error('Selecciona tu perfil.');
    if (!isDemo) throw new Error('La edición del perfil interno requiere el endpoint seguro del estudio.');
    const updated = updateOwnDemoProfile(user.id, displayName, photoUrl);
    setUser(updated); setUsers(listDemoUsers());
  };
  const reset = async (userId: string, password: string) => { if (isDemo) { if (!user?.isOfficeAdmin) throw new Error('Solo el Admin puede restablecer contraseñas.'); await resetDemoPassword(userId, password); setUsers(listDemoUsers()); return; } await officeRequest('reset', { userId, password }, firebaseUser); await refreshUsers(); };
  return <OfficeContext.Provider value={{ state, error, users, user, firebaseUser, refresh, bootstrap, select, switchUser, create, update, saveOwnProfile, reset, changePassword: isDemo ? async (oldPassword: string, newPassword: string) => { if (!user) throw new Error('Selecciona un perfil.'); await changeDemoPassword(user.id, oldPassword, newPassword); } : changeOfficePassword }}>{children}</OfficeContext.Provider>;
}
export function useOffice() { const value = useContext(OfficeContext); if (!value) throw new Error('OfficeProvider ausente.'); return value; }
