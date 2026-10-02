export type AreaCaso = 'Civil' | 'Penal' | 'Familiar' | 'Laboral';

export type EstadoCaso = 'Activo' | 'En trámite' | 'En espera' | 'Concluido';

export type ParticipacionCaso = 
  | 'Demandante'
  | 'Demandado'
  | 'Querellante'
  | 'Imputado'
  | 'Recurrente'
  | 'Tercero interesado'
  | 'Solicitante';

export type TipoIdentificacionJudicial = 'NUREJ' | 'CUD';

export type TipoActividad =
  | 'Memorial presentado'
  | 'Notificación recibida'
  | 'Audiencia realizada'
  | 'Documento presentado'
  | 'Reunión con cliente'
  | 'Nota interna';

export type TipoEvento =
  | 'Audiencia'
  | 'Plazo'
  | 'Actuado'
  | 'Reunión'
  | 'Recordatorio'
  | 'Otro';

export interface Cliente {
  id: string;
  tipoCliente?: 'Persona' | 'Empresa'; // Opcional para registros anteriores
  nombre: string;
  telefono: string;
  correo?: string;
  identificacion?: string; // CI / NIT
  direccion?: string;
  notas?: string;
  fechaRegistro: string;
}

export interface Caso {
  id: string;
  nombre: string;
  clienteId: string;
  area: AreaCaso;
  estado: EstadoCaso;
  participacion: ParticipacionCaso;
  tipoIdentificacionJudicial: TipoIdentificacionJudicial;
  numeroIdentificacionJudicial: string;
  descripcion: string;
  fechaCreacion: string;
  honorariosAcordados: number; // en Bs
  juzgadoTribunal?: string;
}

export interface Actividad {
  id: string;
  casoId: string;
  tipo: TipoActividad;
  titulo: string;
  descripcion: string;
  fecha: string; // YYYY-MM-DD
  hora?: string; // HH:mm
}

export interface Evento {
  id: string;
  casoId: string;
  tipo: TipoEvento;
  titulo: string;
  fecha: string; // YYYY-MM-DD
  hora?: string; // HH:mm
  descripcion?: string;
  juzgado?: string;
  realizado?: boolean;
}

export interface Pago {
  id: string;
  casoId: string;
  monto: number; // en Bs
  fecha: string; // YYYY-MM-DD
  nota?: string;
}

export interface Gasto {
  id: string;
  casoId: string;
  concepto: string;
  monto: number; // en Bs
  fecha: string; // YYYY-MM-DD
  nota?: string;
  reembolsable?: boolean; // Registros anteriores sin este dato no generan deuda nueva.
}

export interface Reembolso {
  id: string;
  casoId: string;
  monto: number;
  fecha: string;
  nota?: string;
}

// Modelos enriquecidos para la UI
export interface CasoConDetalles extends Caso {
  clienteNombre: string;
  totalPagado: number;
  saldoPendiente: number;
  totalGastos: number;
  gastosReembolsables: number;
  totalReembolsado: number;
  gastosPendientes: number;
  totalPendiente: number;
  proximoEvento?: Evento;
}

export interface ClienteConResumen extends Cliente {
  casosTotal: number;
  casosActivos: number;
  saldoPendienteTotal: number;
  honorariosPendientesTotal: number;
  gastosPendientesTotal: number;
}

export interface EventoConCaso extends Evento {
  casoNombre: string;
  clienteNombre: string;
  casoArea: AreaCaso;
  alertaVisual?: {
    mensaje: string;
    tipo: 'hoy' | 'urgente' | 'proximo' | 'pasado';
  };
}

// Tipos de Autenticación, Roles y Planes
export type Role = 'admin' | 'user';

export type AccountType = 'free' | 'trial' | 'admin';

export type PlanType = 'free' | 'trial' | 'pro' | 'estudio';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  studioName?: string;
  role: Role;
  accountType: AccountType;
  plan: PlanType;
  billingExempt: boolean;
  subscriptionStatus?: 'active' | 'trialing' | 'inactive';
  workspaceId: string;
  mustChangePassword?: boolean;
  createdAt: string;
}

