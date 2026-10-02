import type { ProfileData } from '../types/profile';
import { whatsappNumber } from './whatsapp';
import { validateDocumentFile } from './documents';

export const PROFILE_FIELDS = [
  ['nombre', 'Nombre completo'], ['estudio', 'Nombre del estudio / bufete'],
  ['especialidad', 'Cargo o especialidad'], ['telefono', 'Celular / WhatsApp'],
  ['correo', 'Correo electrónico'], ['direccion', 'Dirección del estudio'],
  ['matricula', 'Matrícula profesional'], ['presentacion', 'Presentación profesional breve'],
] as const;

export function cleanProfile(data: ProfileData): ProfileData {
  const clean: ProfileData = { nombre: '' };
  for (const [key] of PROFILE_FIELDS) {
    const value = data[key];
    if (value !== undefined && typeof value !== 'string') throw new Error('Los datos del perfil no son válidos.');
    if (value?.trim()) clean[key] = value.trim();
  }
  if (!clean.nombre) throw new Error('El nombre completo es obligatorio.');
  if (clean.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.correo)) throw new Error('Ingresa un correo electrónico válido.');
  if (clean.telefono) {
    const phone = whatsappNumber(clean.telefono);
    if (!phone) throw new Error('Incluye el código internacional en el celular, por ejemplo +591 70000000.');
    clean.telefono = `+${phone}`;
  }
  return clean;
}
export function profileText(profile: ProfileData): string {
  const header = [profile.nombre?.trim() && `*${profile.nombre.trim()}*`, profile.especialidad?.trim(), profile.estudio?.trim()].filter(Boolean).join('\n');
  const contact = [
    profile.telefono?.trim() && `Celular / WhatsApp: ${profile.telefono.trim()}`,
    profile.correo?.trim() && `Correo: ${profile.correo.trim()}`,
    profile.direccion?.trim() && `Dirección: ${profile.direccion.trim()}`,
    profile.matricula?.trim() && `Matrícula profesional: ${profile.matricula.trim()}`,
  ].filter(Boolean).join('\n');
  return [header, contact, profile.presentacion?.trim()].filter(Boolean).join('\n\n');
}
export async function validateProfilePhoto(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) throw new Error('La foto no puede superar 2 MB.');
  if (!/\.(jpe?g|png)$/i.test(file.name)) throw new Error('Selecciona una imagen JPG, JPEG o PNG.');
  const mime = await validateDocumentFile(file);
  if (!['image/jpeg', 'image/png'].includes(mime)) throw new Error('Selecciona una imagen JPG, JPEG o PNG.');
  return mime;
}
