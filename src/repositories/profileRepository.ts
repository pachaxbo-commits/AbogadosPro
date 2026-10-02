import type { ProfessionalProfile, ProfileData } from '../types/profile';
import type { DocumentFileStore } from '../services/documentFiles';
import { cleanProfile, validateProfilePhoto } from '../services/profile';

export interface ProfileRepository {
  get(userId: string): Promise<ProfessionalProfile | null>;
  save(userId: string, data: ProfileData, photo?: File): Promise<ProfessionalProfile>;
  photoUrl(profile: ProfessionalProfile): Promise<string | null>;
}

export class LocalProfileRepository implements ProfileRepository {
  constructor(private photos: DocumentFileStore) {}
  private key(userId: string) {
    if (!userId.trim()) throw new Error('Falta el identificador del perfil.');
    return `abogadospro_profile_v1:${encodeURIComponent(userId)}`;
  }
  async get(userId: string): Promise<ProfessionalProfile | null> {
    try {
      const raw = localStorage.getItem(this.key(userId));
      if (!raw) return null;
      const data = JSON.parse(raw) as ProfessionalProfile;
      if (!data || data.userId !== userId) throw new Error();
      const clean = cleanProfile(data);
      if (data.foto && (typeof data.foto.referencia !== 'string' || !data.foto.referencia.startsWith(`profile/${encodeURIComponent(userId)}/`) || typeof data.foto.nombre !== 'string' || !['image/jpeg', 'image/png'].includes(data.foto.mime))) throw new Error();
      return { ...clean, userId, foto: data.foto };
    } catch { throw new Error('No se pudo leer el perfil local. Los datos guardados se conservaron.'); }
  }
  async save(userId: string, data: ProfileData, photo?: File): Promise<ProfessionalProfile> {
    const clean = cleanProfile(data);
    const previous = await this.get(userId);
    let foto = previous?.foto;
    if (photo) {
      const mime = await validateProfilePhoto(photo);
      const referencia = `profile/${encodeURIComponent(userId)}/${crypto.randomUUID()}`;
      await this.photos.save(referencia, new Blob([photo], { type: mime }));
      foto = { referencia, nombre: photo.name, mime };
    }
    const profile = { ...clean, userId, foto };
    try { localStorage.setItem(this.key(userId), JSON.stringify(profile)); }
    catch {
      if (photo && foto) await this.photos.remove(foto.referencia);
      throw new Error('No se pudo guardar el perfil. Revisa el espacio y los permisos del navegador.');
    }
    if (photo && previous?.foto) await this.photos.remove(previous.foto.referencia);
    return profile;
  }
  async photoUrl(profile: ProfessionalProfile) {
    return profile.foto ? this.photos.getUrl(profile.foto.referencia) : null;
  }
}
