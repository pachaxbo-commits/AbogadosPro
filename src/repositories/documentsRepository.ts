import type { DatosDocumento, DocumentoCaso } from '../types';
import type { DocumentFileStore } from '../services/documentFiles';
import { cleanDocument, validateDocumentFile } from '../services/documents';

export interface DocumentRepository {
  getDocuments(casoId?: string): Promise<DocumentoCaso[]>;
  addDocument(casoId: string, data: DatosDocumento, file: File): Promise<DocumentoCaso>;
  updateDocument(casoId: string, id: string, data: DatosDocumento): Promise<DocumentoCaso>;
  deleteDocument(casoId: string, id: string): Promise<void>;
  getFileUrl(casoId: string, id: string): Promise<string | null>;
  reset(): Promise<void>;
}
export const DOCUMENT_STORAGE_KEY = 'abogadospro_documents_v1';

export class LocalDocumentRepository implements DocumentRepository {
  constructor(private files: DocumentFileStore, private caseExists: (id: string) => Promise<boolean>) {}

  private read(): DocumentoCaso[] {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(DOCUMENT_STORAGE_KEY) || '[]');
      if (!Array.isArray(raw)) throw new Error();
      return raw.map((value: unknown) => {
        if (!value || typeof value !== 'object') throw new Error();
        const item = value as Record<string, unknown>;
        for (const key of ['id', 'casoId', 'nombre', 'categoria', 'fechaCarga', 'nombreArchivo', 'mimeType', 'referenciaArchivo']) {
          if (typeof item[key] !== 'string' || !item[key]) throw new Error();
        }
        if (typeof item.tamano !== 'number' || !Number.isFinite(item.tamano) || item.tamano < 0 || !Number.isFinite(Date.parse(item.fechaCarga as string))) throw new Error();
        for (const key of ['fechaDocumento', 'descripcion']) if (item[key] !== undefined && typeof item[key] !== 'string') throw new Error();
        return item as unknown as DocumentoCaso;
      });
    } catch { throw new Error('No se pudieron cargar los documentos. La información guardada se conservó.'); }
  }
  private write(items: DocumentoCaso[]): void {
    try { localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(items)); }
    catch { throw new Error('No se pudo guardar el documento. Revisa el espacio y los permisos del navegador.'); }
  }
  private find(casoId: string, id: string): DocumentoCaso {
    const item = this.read().find((doc) => doc.id === id && doc.casoId === casoId);
    if (!item) throw new Error('El documento no pertenece a este caso o ya no existe.');
    return item;
  }
  async getDocuments(casoId?: string): Promise<DocumentoCaso[]> {
    return this.read().filter((item) => !casoId || item.casoId === casoId).sort((a, b) => b.fechaCarga.localeCompare(a.fechaCarga));
  }
  async addDocument(casoId: string, data: DatosDocumento, file: File): Promise<DocumentoCaso> {
    const clean = cleanDocument(data);
    if (!await this.caseExists(casoId)) throw new Error('El caso ya no existe.');
    const mimeType = await validateDocumentFile(file);
    const id = crypto.randomUUID();
    const reference = `local/${casoId}/${id}`;
    await this.files.save(reference, new Blob([file], { type: mimeType }));
    const doc: DocumentoCaso = { ...clean, id, casoId, fechaCarga: new Date().toISOString(), nombreArchivo: file.name, mimeType, tamano: file.size, referenciaArchivo: reference };
    try { this.write([doc, ...this.read()]); }
    catch (error) { await this.files.remove(reference); throw error; }
    return doc;
  }
  async updateDocument(casoId: string, id: string, data: DatosDocumento): Promise<DocumentoCaso> {
    const item = { ...this.find(casoId, id), ...cleanDocument(data) };
    this.write(this.read().map((doc) => doc.id === id && doc.casoId === casoId ? item : doc));
    return item;
  }
  async deleteDocument(casoId: string, id: string): Promise<void> {
    const item = this.find(casoId, id);
    this.write(this.read().filter((doc) => doc.id !== id || doc.casoId !== casoId));
    await this.files.remove(item.referenciaArchivo);
  }
  async getFileUrl(casoId: string, id: string): Promise<string | null> {
    return this.files.getUrl(this.find(casoId, id).referenciaArchivo);
  }
  async reset(): Promise<void> { this.write([]); await this.files.clear(); }
}
