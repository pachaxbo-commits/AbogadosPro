import { Cliente, Caso, Actividad, Evento, Pago, Gasto } from '../types';

/**
 * Generador de fechas demo relativas a la fecha actual del sistema.
 * Asegura que el entorno de demostración siempre tenga eventos coherentes
 * (Audiencia hoy, Plazo vence mañana, Audiencia en 3 días, etc.) sin quedar obsoleto.
 * NOTA: Esto aplica exclusivamente a los datos demo iniciales; los datos
 * introducidos manualmente por el usuario conservan su fecha exacta.
 */
export function getRelativeDemoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export function getInitialMockData() {
  const clients: Cliente[] = [
    {
      id: 'cli-1',
      nombre: 'Constructora del Sur S.R.L.',
      telefono: '+591 71234567',
      correo: 'gerencia@constructoradelsur.bo',
      identificacion: 'NIT 1029384751',
      notas: 'Empresa contratista del rubro de infraestructura vial y edificaciones. Contacto principal: Ing. Roberto Mendoza.',
      fechaRegistro: getRelativeDemoDate(-120),
    },
    {
      id: 'cli-2',
      nombre: 'Dra. Mariana Zeballos Arteaga',
      telefono: '+591 76543210',
      correo: 'mzeballos.med@gmail.com',
      identificacion: 'CI 4829104 SC',
      notas: 'Médico especialista. Procesos patrimoniales y familiares. Prefiere comunicación por las tardes.',
      fechaRegistro: getRelativeDemoDate(-90),
    },
    {
      id: 'cli-3',
      nombre: 'Carlos Eduardo Gutiérrez Prado',
      telefono: '+591 70112233',
      correo: 'carlos.gutierrez@pradologistica.com',
      identificacion: 'CI 3918274 LP',
      notas: 'Empresario del sector logístico y transporte terrestre.',
      fechaRegistro: getRelativeDemoDate(-75),
    },
    {
      id: 'cli-4',
      nombre: 'Elena Rocío Valdivia Ramos',
      telefono: '+591 78990011',
      correo: 'elena.valdivia@outlook.com',
      identificacion: 'CI 5123984 CB',
      notas: 'Docente universitaria. Causa por desvinculación laboral injustificada.',
      fechaRegistro: getRelativeDemoDate(-60),
    },
    {
      id: 'cli-5',
      nombre: 'Importadora Andina Los Andes S.A.',
      telefono: '+591 72334455',
      correo: 'legal@andinasa.com.bo',
      identificacion: 'NIT 2039485712',
      notas: 'Empresa importadora de maquinaria pesada. Procesos ejecutivos y mercantiles recurrentes.',
      fechaRegistro: getRelativeDemoDate(-45),
    },
  ];

  // NOTA JUDICIAL: Todos los números NUREJ y CUD a continuación son IDENTIFICADORES DEMO
  // COMPLETAMENTE FICTICIOS generados exclusivamente para ilustrar el formato de la interfaz.
  // No corresponden a procesos judiciales reales ni a expedientes del sistema judicial.
  const cases: Caso[] = [
    {
      id: 'cas-1',
      nombre: 'Constructora del Sur c/ Consorcio Vial Altiplano',
      clienteId: 'cli-1',
      area: 'Civil',
      estado: 'Activo',
      participacion: 'Demandante',
      tipoIdentificacionJudicial: 'NUREJ',
      numeroIdentificacionJudicial: '30123456', // NUREJ ficticio (identificador demo)
      descripcion: 'Demanda ordinaria civil por incumplimiento contractual y cobro de planillas de avance de obra en proyecto carretero.',
      fechaCreacion: getRelativeDemoDate(-100),
      honorariosAcordados: 18000,
      juzgadoTribunal: 'Juzgado 4° de Partido en lo Civil y Comercial',
    },
    {
      id: 'cas-2',
      nombre: 'Proceso Ejecutivo por Cobro de Pagarés Bancarios',
      clienteId: 'cli-5',
      area: 'Civil',
      estado: 'En trámite',
      participacion: 'Demandante',
      tipoIdentificacionJudicial: 'NUREJ',
      numeroIdentificacionJudicial: '30248911', // NUREJ ficticio (identificador demo)
      descripcion: 'Ejecución de títulos valores impagos por adquisición de maquinaria pesada con garantía hipotecaria.',
      fechaCreacion: getRelativeDemoDate(-40),
      honorariosAcordados: 12000,
      juzgadoTribunal: 'Juzgado 1° de Instrucción en lo Civil',
    },
    {
      id: 'cas-3',
      nombre: 'Ministerio Público c/ Gutiérrez Prado (Defensa Técnica)',
      clienteId: 'cli-3',
      area: 'Penal',
      estado: 'Activo',
      participacion: 'Imputado',
      tipoIdentificacionJudicial: 'CUD',
      numeroIdentificacionJudicial: '201102012300123', // CUD ficticio (identificador demo)
      descripcion: 'Patrocinio penal de defensa técnica en investigación por presunto delito tributario aduanero en despacho de carga.',
      fechaCreacion: getRelativeDemoDate(-70),
      honorariosAcordados: 25000,
      juzgadoTribunal: 'Juzgado 2° de Instrucción Cautelar en lo Penal',
    },
    {
      id: 'cas-4',
      nombre: 'Querella Penal por Estafa Agravada c/ R. Méndez',
      clienteId: 'cli-2',
      area: 'Penal',
      estado: 'En espera',
      participacion: 'Querellante',
      tipoIdentificacionJudicial: 'CUD',
      numeroIdentificacionJudicial: '201103049100582', // CUD ficticio (identificador demo)
      descripcion: 'Acusación particular por entrega de anticipo dinerario para compra de inmueble con doble venta simulada.',
      fechaCreacion: getRelativeDemoDate(-30),
      honorariosAcordados: 15000,
      juzgadoTribunal: 'Fiscalía Especializada en Delitos Patrimoniales',
    },
    {
      id: 'cas-5',
      nombre: 'Zeballos Arteaga c/ Mendoza (Divorcio y Asistencia Familiar)',
      clienteId: 'cli-2',
      area: 'Familiar',
      estado: 'Activo',
      participacion: 'Demandante',
      tipoIdentificacionJudicial: 'NUREJ',
      numeroIdentificacionJudicial: '40192837', // NUREJ ficticio (identificador demo)
      descripcion: 'Demanda de desvinculación conyugal, fijación de asistencia familiar de hijos menores y división patrimonial de bienes gananciales.',
      fechaCreacion: getRelativeDemoDate(-80),
      honorariosAcordados: 10000,
      juzgadoTribunal: 'Juzgado 3° Público de Familia',
    },
    {
      id: 'cas-6',
      nombre: 'Elena Valdivia c/ Instituto Tecnológico Metropolitano',
      clienteId: 'cli-4',
      area: 'Laboral',
      estado: 'Activo',
      participacion: 'Demandante',
      tipoIdentificacionJudicial: 'NUREJ',
      numeroIdentificacionJudicial: '50128492', // NUREJ ficticio (identificador demo)
      descripcion: 'Demanda laboral por reincorporación laboral, pago de salarios devengados y beneficios sociales por despido incausado.',
      fechaCreacion: getRelativeDemoDate(-50),
      honorariosAcordados: 8000,
      juzgadoTribunal: 'Juzgado 2° de Trabajo y Seguridad Social',
    },
    {
      id: 'cas-7',
      nombre: 'Constructora del Sur - Arbitraje Comercial CCI',
      clienteId: 'cli-1',
      area: 'Civil',
      estado: 'En trámite',
      participacion: 'Demandante',
      tipoIdentificacionJudicial: 'NUREJ',
      numeroIdentificacionJudicial: '30491820', // NUREJ ficticio (identificador demo)
      descripcion: 'Procedimiento de resolución de controversia contractual ante tribunal arbitral por rescisión unilateral.',
      fechaCreacion: getRelativeDemoDate(-20),
      honorariosAcordados: 20000,
      juzgadoTribunal: 'Centro de Conciliación y Arbitraje Comercial',
    },
    {
      id: 'cas-8',
      nombre: 'Defensa Laboral c/ Ex-Trabajadores Transporte Prado',
      clienteId: 'cli-3',
      area: 'Laboral',
      estado: 'Concluido',
      participacion: 'Demandado',
      tipoIdentificacionJudicial: 'NUREJ',
      numeroIdentificacionJudicial: '50291044', // NUREJ ficticio (identificador demo)
      descripcion: 'Atención de reclamo por quinquenios y finiquito ante Jefatura Departamental de Trabajo. Transacción aprobada satisfactoriamente.',
      fechaCreacion: getRelativeDemoDate(-72),
      honorariosAcordados: 6000,
      juzgadoTribunal: 'Jefatura Departamental de Trabajo',
    },
  ];

  // Fechas de eventos calculadas de forma relativa a hoy
  const events: Evento[] = [
    {
      id: 'ev-1',
      casoId: 'cas-1',
      tipo: 'Audiencia',
      titulo: 'Audiencia Preliminar de Conciliación y Saneamiento',
      fecha: getRelativeDemoDate(0), // HOY
      hora: '15:30',
      descripcion: 'Comparecencia con apoderado de Constructora del Sur y ratificación de los puntos de pericia técnica solicitados.',
      juzgado: 'Juzgado 4° de Partido en lo Civil y Comercial',
    },
    {
      id: 'ev-2',
      casoId: 'cas-6',
      tipo: 'Plazo',
      titulo: 'Vencimiento para responder a excepciones previas de la contraparte',
      fecha: getRelativeDemoDate(1), // MAÑANA
      hora: '18:00',
      descripcion: 'Ingreso físico y digital de memorial de contestación a excepción de falta de personería en juzgado laboral.',
      juzgado: 'Juzgado 2° de Trabajo y Seguridad Social',
    },
    {
      id: 'ev-3',
      casoId: 'cas-3',
      tipo: 'Audiencia',
      titulo: 'Audiencia de Consideración de Medidas Cautelares',
      fecha: getRelativeDemoDate(3), // EN 3 DÍAS
      hora: '10:00',
      descripcion: 'Presentación de arraigo natural y acreditación de actividad laboral lícita para desvirtuar riesgos procesales.',
      juzgado: 'Juzgado 2° de Instrucción Cautelar en lo Penal',
    },
    {
      id: 'ev-4',
      casoId: 'cas-5',
      tipo: 'Reunión',
      titulo: 'Reunión previa de liquidación de bienes y propuesta de pensión',
      fecha: getRelativeDemoDate(5), // EN 5 DÍAS
      hora: '16:00',
      descripcion: 'Reunión con Dra. Mariana Zeballos en despacho para definir la postura sobre los títulos del departamento conyugal.',
    },
    {
      id: 'ev-5',
      casoId: 'cas-2',
      tipo: 'Actuado',
      titulo: 'Embargo preventivo y anotación de maquinaria en Tránsito/Alcaldía',
      fecha: getRelativeDemoDate(8), // EN 8 DÍAS
      hora: '09:00',
      descripcion: 'Acompañamiento a oficial de diligencias para notificación de mandamiento.',
      juzgado: 'Juzgado 1° de Instrucción en lo Civil',
    },
    {
      id: 'ev-6',
      casoId: 'cas-7',
      tipo: 'Plazo',
      titulo: 'Plazo para proposición de árbitro de parte',
      fecha: getRelativeDemoDate(12), // EN 12 DÍAS
      hora: '17:00',
      descripcion: 'Remisión de carta formal con terna de árbitros habilitados.',
    },
  ];

  const activities: Actividad[] = [
    {
      id: 'act-1',
      casoId: 'cas-1',
      tipo: 'Memorial presentado',
      titulo: 'Presentación de memorial con pliego de preguntas y pruebas documentales',
      descripcion: 'Se adjuntaron planillas de pago suscrito por fiscal de obra del consorcio.',
      fecha: getRelativeDemoDate(-2),
      hora: '11:15',
    },
    {
      id: 'act-2',
      casoId: 'cas-1',
      tipo: 'Notificación recibida',
      titulo: 'Auto judicial de radicatoria y fijación de fecha de audiencia preliminar',
      descripcion: 'El juzgado fija audiencia bajo apercibimiento de ley.',
      fecha: getRelativeDemoDate(-6),
      hora: '16:40',
    },
    {
      id: 'act-3',
      casoId: 'cas-3',
      tipo: 'Memorial presentado',
      titulo: 'Acreditación de domicilio y actividad económica del imputado',
      descripcion: 'Se incorporaron facturas de servicios básicos, contrato de alquiler y certificación gremial.',
      fecha: getRelativeDemoDate(-4),
      hora: '10:00',
    },
    {
      id: 'act-4',
      casoId: 'cas-5',
      tipo: 'Reunión con cliente',
      titulo: 'Entrevista y revisión de recibos escolares y de salud de los menores',
      descripcion: 'Se cuantificaron los gastos fijos mensuales para el desglose pericial de asistencia familiar.',
      fecha: getRelativeDemoDate(-5),
      hora: '17:30',
    },
    {
      id: 'act-5',
      casoId: 'cas-6',
      tipo: 'Notificación recibida',
      titulo: 'Traslado de memorial de excepciones interpuestas por la parte demandada',
      descripcion: 'Se concede el plazo para pronunciarse sobre excepción de incompetencia y personería.',
      fecha: getRelativeDemoDate(-3),
      hora: '14:20',
    },
    {
      id: 'act-6',
      casoId: 'cas-8',
      tipo: 'Audiencia realizada',
      titulo: 'Firma de acuerdo transaccional definitivo en Ministerio de Trabajo',
      descripcion: 'Las partes firmaron el acta de homologación y desistimiento con entrega de cheque de gerencia.',
      fecha: getRelativeDemoDate(-35),
      hora: '11:00',
    },
    {
      id: 'act-7',
      casoId: 'cas-2',
      tipo: 'Documento presentado',
      titulo: 'Ingreso de pagarés originales en bóveda de juzgado',
      descripcion: 'Se obtuvo el cargo de custodia sellado por el secretario del juzgado.',
      fecha: getRelativeDemoDate(-8),
      hora: '09:45',
    },
    {
      id: 'act-8',
      casoId: 'cas-4',
      tipo: 'Nota interna',
      titulo: 'Revisión de informe preliminar de investigador asignado al caso',
      descripcion: 'Falta confirmar número de cuenta bancaria receptora del depósito para requerimiento fiscal.',
      fecha: getRelativeDemoDate(-12),
      hora: '12:00',
    },
  ];

  const payments: Pago[] = [
    // cas-1: Honorarios Bs 18.000 -> Pagos Bs 10.000 -> Saldo Bs 8.000
    {
      id: 'pag-1',
      casoId: 'cas-1',
      monto: 6000,
      fecha: getRelativeDemoDate(-95),
      nota: 'Anticipo inicial al momento de la suscripción del patrocinio',
    },
    {
      id: 'pag-2',
      casoId: 'cas-1',
      monto: 4000,
      fecha: getRelativeDemoDate(-30),
      nota: 'Segundo pago contra presentación de demanda admitida',
    },

    // cas-2: Honorarios Bs 12.000 -> Pagos Bs 5.000 -> Saldo Bs 7.000
    {
      id: 'pag-3',
      casoId: 'cas-2',
      monto: 5000,
      fecha: getRelativeDemoDate(-35),
      nota: 'Primer anticipo contra revisión de títulos ejecutivos',
    },

    // cas-3: Honorarios Bs 25.000 -> Pagos Bs 12.000 -> Saldo Bs 13.000
    {
      id: 'pag-4',
      casoId: 'cas-3',
      monto: 7000,
      fecha: getRelativeDemoDate(-65),
      nota: 'Anticipo por asunción de defensa técnica cautelar',
    },
    {
      id: 'pag-5',
      casoId: 'cas-3',
      monto: 5000,
      fecha: getRelativeDemoDate(-25),
      nota: 'Pago por proposición de diligencias investigativas',
    },

    // cas-4: Honorarios Bs 15.000 -> Pagos Bs 5.000 -> Saldo Bs 10.000
    {
      id: 'pag-6',
      casoId: 'cas-4',
      monto: 5000,
      fecha: getRelativeDemoDate(-28),
      nota: 'Anticipo inicial por redacción y formalización de querella',
    },

    // cas-5: Honorarios Bs 10.000 -> Pagos Bs 4.000 -> Saldo Bs 6.000
    {
      id: 'pag-7',
      casoId: 'cas-5',
      monto: 2000,
      fecha: getRelativeDemoDate(-18),
      nota: 'Primer pago a cuenta',
    },
    {
      id: 'pag-8',
      casoId: 'cas-5',
      monto: 2000,
      fecha: getRelativeDemoDate(-6),
      nota: 'Segundo pago a cuenta',
    },

    // cas-6: Honorarios Bs 8.000 -> Pagos Bs 3.500 -> Saldo Bs 4.500
    {
      id: 'pag-9',
      casoId: 'cas-6',
      monto: 3500,
      fecha: getRelativeDemoDate(-45),
      nota: 'Anticipo inicial por demanda laboral de reincorporación',
    },

    // cas-7: Honorarios Bs 20.000 -> Pagos Bs 8.000 -> Saldo Bs 12.000
    {
      id: 'pag-10',
      casoId: 'cas-7',
      monto: 8000,
      fecha: getRelativeDemoDate(-15),
      nota: 'Provisión inicial de honorarios de arbitraje',
    },

    // cas-8: Honorarios Bs 6.000 -> Pagos Bs 6.000 -> Saldo Bs 0 (Caso totalmente pagado)
    {
      id: 'pag-11',
      casoId: 'cas-8',
      monto: 3000,
      fecha: getRelativeDemoDate(-68),
      nota: 'Primer desembolso por inicio de negociación en Ministerio de Trabajo',
    },
    {
      id: 'pag-12',
      casoId: 'cas-8',
      monto: 3000,
      fecha: getRelativeDemoDate(-33),
      nota: 'Cancelación total de honorarios tras homologación de finiquito',
    },
  ];

  const expenses: Gasto[] = [
    {
      id: 'gst-1',
      casoId: 'cas-1',
      concepto: 'Fotocopias legalizadas de obrados en juzgado',
      monto: 85,
      fecha: getRelativeDemoDate(-70),
      nota: '2 juegos completos para peritaje',
    },
    {
      id: 'gst-2',
      casoId: 'cas-1',
      concepto: 'Timbres judiciales y arancel de legalización',
      monto: 140,
      fecha: getRelativeDemoDate(-68),
      nota: 'Comprobante N° 84920',
    },
    {
      id: 'gst-3',
      casoId: 'cas-1',
      concepto: 'Transporte a inspección técnica ocular en carretera',
      monto: 250,
      fecha: getRelativeDemoDate(-20),
      nota: 'Combustible y peajes ida y retorno',
    },
    {
      id: 'gst-4',
      casoId: 'cas-2',
      concepto: 'Notaría - Poder especial de representación mercantil',
      monto: 220,
      fecha: getRelativeDemoDate(-38),
      nota: 'Notaría de Fe Pública N° 12',
    },
    {
      id: 'gst-5',
      casoId: 'cas-3',
      concepto: 'Certificados oficiales de antecedentes (REJAP y FELCC)',
      monto: 160,
      fecha: getRelativeDemoDate(-60),
      nota: 'Valores judiciales oficiales',
    },
    {
      id: 'gst-6',
      casoId: 'cas-5',
      concepto: 'Certificados de nacimiento y matrimonio de SERECI',
      monto: 110,
      fecha: getRelativeDemoDate(-78),
      nota: 'Legalización rápida para expediente familiar',
    },
    {
      id: 'gst-7',
      casoId: 'cas-6',
      concepto: 'Fotocopias de demanda y anexos para notificación',
      monto: 45,
      fecha: getRelativeDemoDate(-48),
      nota: '3 copias para traslado oficial',
    },
  ];

  return {
    clients,
    cases,
    events,
    activities,
    payments,
    expenses,
  };
}

// Exportación constante inicial para primera carga
const initialData = getInitialMockData();
export const INITIAL_CLIENTS = initialData.clients;
export const INITIAL_CASES = initialData.cases;
export const INITIAL_EVENTS = initialData.events;
export const INITIAL_ACTIVITIES = initialData.activities;
export const INITIAL_PAYMENTS = initialData.payments;
export const INITIAL_EXPENSES = initialData.expenses;
