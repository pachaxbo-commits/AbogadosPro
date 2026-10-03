export type AreaCaso = string;

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

export type TipoActividad = string;

export type TipoEvento = string;

export type PrioridadTarea = 'Alta' | 'Media' | 'Normal';
export type EstadoTarea = 'Pendiente' | 'Completada';

export interface Tarea {
  id: string;
  casoId: string;
  encargadoId?: string;
  titulo: string;
  descripcion?: string;
  fechaLimite: string; // Fecha ingresada por el usuario, YYYY-MM-DD (Bolivia).
  horaLimite?: string; // HH:mm; su ausencia no implica una hora determinada.
  prioridad: PrioridadTarea;
  estado: EstadoTarea;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  resultadoFinalizacion?: string;
}

export type DatosTarea = Pick<Tarea, 'casoId' | 'encargadoId' | 'titulo' | 'descripcion' | 'fechaLimite' | 'horaLimite' | 'prioridad'>;

export interface DocumentoCaso {
  id: string;
  casoId: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  fechaDocumento?: string;
  fechaCarga: string;
  nombreArchivo: string;
  mimeType: string;
  tamano: number;
  referenciaArchivo: string;
  taskId?: string;
}
export type DatosDocumento = Pick<DocumentoCaso, 'nombre' | 'categoria' | 'descripcion' | 'fechaDocumento' | 'taskId'>;

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
  encargadoId?: string;
  seguimientoDias?: number | null; // Ausente en casos anteriores: 30 días; null: sin seguimiento.
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

export type TipoResultadoEvento = 'Realizada' | 'Suspendida' | 'Reprogramada' | 'Cancelada' | 'Otro';
export interface DatosResultadoEvento {
  tipo: TipoResultadoEvento;
  observaciones: string;
  proximosPasos?: string;
  fecha: string;
  nuevaFecha?: string;
  nuevaHora?: string;
}
export interface ResultadoEvento extends DatosResultadoEvento {
  registradoEn: string;
  actualizadoEn: string;
  eventoReprogramadoId?: string;
}

export interface RecordatorioEvento { cantidad: number; unidad: 'minutos' | 'horas' | 'días' | 'semanas' }

export interface Evento {
  id: string;
  casoId: string;
  encargadoId?: string;
  tipo: TipoEvento;
  titulo: string;
  fecha: string; // YYYY-MM-DD
  hora?: string; // HH:mm
  descripcion?: string;
  juzgado?: string;
  realizado?: boolean;
  estado?: 'Próximo' | 'Realizado' | 'Cancelado';
  resultado?: ResultadoEvento;
  eventoOrigenId?: string;
  // Preferencias locales para la futura capa de notificaciones; no programan avisos.
  recordatorios?: { unDiaAntes: boolean; unaHoraAntes: boolean; personalizados?: RecordatorioEvento[] };
}

export interface Pago {
  id: string;
  casoId: string;
  monto: number; // en Bs
  fecha: string;
  hora?: string; // HH:mm; opcional para movimientos anteriores. // YYYY-MM-DD
  nota?: string;
}

export interface Gasto {
  id: string;
  casoId: string;
  concepto: string;
  categoria?: string;
  monto: number; // en Bs
  fecha: string;
  hora?: string; // HH:mm; opcional para movimientos anteriores. // YYYY-MM-DD
  nota?: string;
  reembolsable?: boolean; // Registros anteriores sin este dato no generan deuda nueva.
}

export interface Reembolso {
  id: string;
  casoId: string;
  monto: number;
  fecha: string;
  hora?: string; // HH:mm; opcional para movimientos anteriores.
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

