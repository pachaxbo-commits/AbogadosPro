import type { DatosDocumento } from '../types';
import { validTaskDate } from './tasks';

export const DOCUMENT_CATEGORIES = ['Contrato', 'Demanda', 'Memorial', 'Resolución', 'Notificación', 'Prueba', 'Poder', 'Documento del cliente', 'Comprobante', 'Otro'] as const;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_FORMATS: Record<string, { mime: string; signature: number[]; kind: 'pdf' | 'word' | 'excel' | 'image' }> = {
  pdf: { mime: 'application/pdf', signature: [37, 80, 68, 70, 45], kind: 'pdf' },
  doc: { mime: 'application/msword', signature: [208, 207, 17, 224, 161, 177, 26, 225], kind: 'word' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', signature: [80, 75, 3, 4], kind: 'word' },
  xls: { mime: 'application/vnd.ms-excel', signature: [208, 207, 17, 224, 161, 177, 26, 225], kind: 'excel' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', signature: [80, 75, 3, 4], kind: 'excel' },
  jpg: { mime: 'image/jpeg', signature: [255, 216, 255], kind: 'image' },
  jpeg: { mime: 'image/jpeg', signature: [255, 216, 255], kind: 'image' },
  png: { mime: 'image/png', signature: [137, 80, 78, 71, 13, 10, 26, 10], kind: 'image' },
};
export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_FORMATS).map((ext) => `.${ext}`).join(',');
export const documentExtension = (name: string) => name.split('.').pop()?.toLowerCase() || '';
export function documentSize(bytes: number): string {
  const unit = bytes >= 1024 * 1024 ? 'MB' : 'KB';
  return `${new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 }).format(bytes / (unit === 'MB' ? 1024 * 1024 : 1024))} ${unit}`;
}
export type DocumentErrors = Partial<Record<'nombre' | 'categoria' | 'fechaDocumento' | 'archivo', string>>;
export function documentErrors(data: DatosDocumento, categories: readonly string[] = DOCUMENT_CATEGORIES): DocumentErrors {
  const errors: DocumentErrors = {};
  if (!data.nombre.trim()) errors.nombre = 'Escribe el nombre del documento.';
  if (!categories.some((category) => category === data.categoria)) errors.categoria = 'Selecciona una categoría.';
  if (data.fechaDocumento && !validTaskDate(data.fechaDocumento)) errors.fechaDocumento = 'Ingresa una fecha válida.';
  return errors;
}
export function cleanDocument(data: DatosDocumento, categories: readonly string[] = DOCUMENT_CATEGORIES): DatosDocumento {
  const error = Object.values(documentErrors(data, categories))[0];
  if (error) throw new Error(error);
  return { nombre: data.nombre.trim(), categoria: data.categoria, fechaDocumento: data.fechaDocumento || undefined, descripcion: data.descripcion?.trim() || undefined, taskId: data.taskId || undefined };
}
export async function validateDocumentFile(file: File): Promise<string> {
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('El archivo supera el tamaño máximo permitido de 20 MB.');
  const format = DOCUMENT_FORMATS[documentExtension(file.name)];
  const mime = file.type.toLowerCase();
  if (!format || (mime && mime !== 'application/octet-stream' && mime !== format.mime)) throw new Error('Formato de archivo no permitido.');
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!format.signature.every((value, index) => bytes[index] === value)) throw new Error('Formato de archivo no permitido.');
  return format.mime;
}
