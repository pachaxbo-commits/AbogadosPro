import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { appearanceRepository, type Appearance } from '../repositories/appearanceRepository';
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
  save: (data: ProfileData, photo?: File) => Promise<void>;
}
const ProfileContext = createContext<ProfileContextValue | null>(null);
export function ProfileProvider({ children, userId = DEMO_PROFILE_USER }: { children: ReactNode; userId?: string }) {
  return <ProfileSession key={userId} userId={userId}>{children}</ProfileSession>;
}
function ProfileSession({ children, userId }: { children: ReactNode; userId: string }) {
  const [appearance, updateAppearance] = useState(() => appearanceRepository.get(userId));
  useLayoutEffect(() => { document.documentElement.dataset.theme = appearance; }, [appearance]);
  const setAppearance = (value: Appearance) => { appearanceRepository.save(userId, value); updateAppearance(value); };
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
  return <ProfileContext.Provider value={{ profile, photoUrl, loading, error, save, appearance, setAppearance }}>{children}</ProfileContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('Falta ProfileProvider.');
  return context;
}
