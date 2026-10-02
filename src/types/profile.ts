export interface ProfessionalProfile {
  userId: string;
  nombre: string;
  estudio?: string;
  especialidad?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  matricula?: string;
  presentacion?: string;
  foto?: { referencia: string; nombre: string; mime: string };
}
export type ProfileData = Omit<ProfessionalProfile, 'userId' | 'foto'>;
