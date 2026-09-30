// Utilidades de formato para el contexto boliviano y la interfaz de AbogadosPro

export function getTodayIsoString(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatBs(monto: number): string {
  if (isNaN(monto)) return 'Bs 0';
  return `Bs ${new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(monto)}`;
}

export function formatFecha(fechaStr?: string): string {
  if (!fechaStr) return '-';
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
    const [año, mes, dia] = partes;
    return `${dia}/${mes}/${año}`;
  }
  return fechaStr;
}

export function formatHora(horaStr?: string): string {
  if (!horaStr) return '';
  return horaStr;
}

/**
 * Calcula alertas visuales puramente a partir de las fechas manuales del usuario.
 * No realiza cálculos jurídicos ni procesales.
 */
export function calcularAlertaVisual(fechaStr: string, horaStr?: string, tipoEvento?: string): {
  mensaje: string;
  tipo: 'hoy' | 'urgente' | 'proximo' | 'pasado';
} | undefined {
  if (!fechaStr) return undefined;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [y, m, d] = fechaStr.split('-').map(Number);
  const fechaEvento = new Date(y, m - 1, d);
  fechaEvento.setHours(0, 0, 0, 0);

  const diffTime = fechaEvento.getTime() - hoy.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const prefijo = tipoEvento ? tipoEvento.toUpperCase() : 'EVENTO';

  if (diffDays === 0) {
    return {
      mensaje: horaStr ? `${prefijo} HOY a las ${horaStr}` : `${prefijo} HOY`,
      tipo: 'hoy',
    };
  }

  if (diffDays === 1) {
    return {
      mensaje: `${tipoEvento === 'Plazo' ? 'Plazo vence mañana' : `${prefijo} mañana`}${horaStr ? ` a las ${horaStr}` : ''}`,
      tipo: 'urgente',
    };
  }

  if (diffDays > 1 && diffDays <= 3) {
    return {
      mensaje: `${prefijo} en ${diffDays} días`,
      tipo: 'urgente',
    };
  }

  if (diffDays > 3 && diffDays <= 7) {
    return {
      mensaje: `${prefijo} en ${diffDays} días`,
      tipo: 'proximo',
    };
  }

  if (diffDays < 0) {
    return {
      mensaje: `Realizado hace ${Math.abs(diffDays)} días`,
      tipo: 'pasado',
    };
  }

  return undefined;
}
