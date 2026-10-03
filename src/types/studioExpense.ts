export const STUDIO_EXPENSE_CATEGORIES = [
  'Alquiler', 'Servicios', 'Personal', 'Software y suscripciones', 'Contabilidad',
  'Publicidad', 'Transporte', 'Material de oficina', 'Impuestos', 'Otros',
] as const;

export type StudioExpenseCategory = (typeof STUDIO_EXPENSE_CATEGORIES)[number];

export interface StudioExpense {
  id: string;
  concepto: string;
  categoria: StudioExpenseCategory;
  monto: number;
  fecha: string; // YYYY-MM-DD; permite futuras consultas por rango.
  nota?: string;
  createdAt: string;
  updatedAt: string;
}

export type StudioExpenseInput = Pick<StudioExpense, 'concepto' | 'categoria' | 'monto' | 'fecha' | 'nota'>;
