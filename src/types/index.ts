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
  nombre: string;
  telefono: string;
  correo?: string;
  identificacion?: string; // CI / NIT
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
}

// Modelos enriquecidos para la UI
export interface CasoConDetalles extends Caso {
  clienteNombre: string;
  totalPagado: number;
  saldoPendiente: number;
  totalGastos: number;
  proximoEvento?: Evento;
}

export interface ClienteConResumen extends Cliente {
  casosTotal: number;
  casosActivos: number;
  saldoPendienteTotal: number;
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
