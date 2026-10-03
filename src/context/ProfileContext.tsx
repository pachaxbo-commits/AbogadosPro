import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { appearanceRepository, type Appearance } from '../repositories/appearanceRepository';
import { notificationPreferencesRepository, type NotificationPreferences } from '../repositories/notificationPreferencesRepository';
import { configurationRepository, type AppConfiguration, type CategoryGroup } from '../repositories/configurationRepository';
import { assigneesRepository } from '../repositories/assigneesRepository';
import type { Assignee, AssigneeInput } from '../types/assignee';
import { useAuth } from './AuthContext';
import type { ProfessionalProfile, ProfileData } from '../types/profile';
import { profileRepository } from '../repositories';

// Identidad local temporal. El proveedor recibirá el uid autenticado en la futura integración.
const DEMO_PROFILE_USER = 'demo-lawyer';
interface ProfileContextValue {
  profile: ProfessionalProfile | null;
  photoUrl: string | null;
  loading: boolean;
  error: string;
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  notificationPreferences: NotificationPreferences;
  setNotificationPreferences: (value: NotificationPreferences) => void;
  configuration: AppConfiguration;
  assignees: Assignee[];
  assigneesError: string;
  addAssignee: (data: AssigneeInput) => void;
  updateAssignee: (id: string, data: AssigneeInput) => void;
  setCategoryOptions: (group: CategoryGroup, options: string[]) => void;
  setExpensesReimbursableByDefault: (value: boolean) => void;
  save: (data: ProfileData, photo?: File) => Promise<void>;
}
const ProfileContext = createContext<ProfileContextValue | null>(null);
export function ProfileProvider({ children, userId = DEMO_PROFILE_USER }: { children: ReactNode; userId?: string }) {
  const { currentUser, userProfile } = useAuth();
  const workspaceScope = currentUser ? userProfile?.workspaceId || currentUser.uid : 'demo';
  return <ProfileSession key={`${userId}:${workspaceScope}`} userId={userId} workspaceScope={workspaceScope}>{children}</ProfileSession>;
}
function ProfileSession({ children, userId, workspaceScope }: { children: ReactNode; userId: string; workspaceScope: string }) {
  const [appearance, updateAppearance] = useState(() => appearanceRepository.get(userId));
  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = appearance === 'system' ? media.matches ? 'dark' : 'light' : appearance; };
    apply();
    if (appearance === 'system') media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [appearance]);
  const setAppearance = (value: Appearance) => { appearanceRepository.save(userId, value); updateAppearance(value); };
  const [notificationPreferences, updateNotificationPreferences] = useState(() => notificationPreferencesRepository.get(userId));
  const setNotificationPreferences = (value: NotificationPreferences) => { notificationPreferencesRepository.save(userId, value); updateNotificationPreferences(value); };
  const [configuration, updateConfiguration] = useState(() => configurationRepository.get(workspaceScope));
  const [assigneesState, setAssigneesState] = useState(() => {
    try { return { items: assigneesRepository.list(workspaceScope), error: '' }; }
    catch (cause) { return { items: [] as Assignee[], error: cause instanceof Error ? cause.message : 'No se pudieron cargar los encargados.' }; }
  });
  useEffect(() => {
    if (workspaceScope !== 'demo') return;
    const refresh = () => {
      updateAppearance(appearanceRepository.get(userId));
      updateNotificationPreferences(notificationPreferencesRepository.get(userId));
      updateConfiguration(configurationRepository.get(workspaceScope));
      setAssigneesState({ items: assigneesRepository.list(workspaceScope), error: '' });
      setProfile(null);
      setPhotoUrl(null);
    };
    window.addEventListener('abogadospro:demo-reset', refresh);
    return () => window.removeEventListener('abogadospro:demo-reset', refresh);
  }, [userId, workspaceScope]);
  const addAssignee = (data: AssigneeInput) => {
    const items = assigneesRepository.add(workspaceScope, data);
    setAssigneesState({ items, error: '' });
  };
  const updateAssignee = (id: string, data: AssigneeInput) => {
    const items = assigneesRepository.update(workspaceScope, id, data);
    setAssigneesState({ items, error: '' });
  };
  const setCategoryOptions = (group: CategoryGroup, options: string[]) => {
    const next = { ...configuration, categories: { ...configuration.categories, [group]: options } };
    configurationRepository.save(workspaceScope, next);
    updateConfiguration(next);
  };
  const setExpensesReimbursableByDefault = (value: boolean) => {
    const next = { ...configuration, expensesReimbursableByDefault: value };
    configurationRepository.save(workspaceScope, next);
    updateConfiguration(next);
  };
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const value = await profileRepository.get(userId);
        const url = value ? await profileRepository.photoUrl(value) : null;
        if (active) { setProfile(value); setPhotoUrl(url); }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [userId]);
  const save = async (data: ProfileData, photo?: File) => {
    const value = await profileRepository.save(userId, data, photo);
    const url = await profileRepository.photoUrl(value);
    setProfile(value); setPhotoUrl(url); setError('');
  };
  return <ProfileContext.Provider value={{ profile, photoUrl, loading, error, save, appearance, setAppearance, notificationPreferences, setNotificationPreferences, configuration, setCategoryOptions, setExpensesReimbursableByDefault, assignees: assigneesState.items, assigneesError: assigneesState.error, addAssignee, updateAssignee }}>{children}</ProfileContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('Falta ProfileProvider.');
  return context;
}
