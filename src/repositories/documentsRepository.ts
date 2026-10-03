import type { DatosDocumento, DocumentoCaso } from '../types';
import type { DocumentFileStore } from '../services/documentFiles';
import { cleanDocument, DOCUMENT_CATEGORIES, validateDocumentFile } from '../services/documents';

export interface DocumentRepository {
  getDocuments(casoId?: string): Promise<DocumentoCaso[]>;
  addDocument(casoId: string, data: DatosDocumento, file: File): Promise<DocumentoCaso>;
  addDocuments(casoId: string, items: { data: DatosDocumento; file: File }[]): Promise<DocumentoCaso[]>;
  removeDocuments(casoId: string, ids: string[]): Promise<void>;
  updateDocument(casoId: string, id: string, data: DatosDocumento): Promise<DocumentoCaso>;
  deleteDocument(casoId: string, id: string): Promise<void>;
  getFileUrl(casoId: string, id: string): Promise<string | null>;
  reset(): Promise<void>;
}
export const DOCUMENT_STORAGE_KEY = 'abogadospro_documents_v1';

export class LocalDocumentRepository implements DocumentRepository {
  constructor(private files: DocumentFileStore, private caseExists: (id: string) => Promise<boolean>, private storageKey = DOCUMENT_STORAGE_KEY, private getCategories: () => readonly string[] = () => DOCUMENT_CATEGORIES) {}

  private read(): DocumentoCaso[] {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      if (!Array.isArray(raw)) throw new Error();
      return raw.map((value: unknown) => {
        if (!value || typeof value !== 'object') throw new Error();
        const item = value as Record<string, unknown>;
        for (const key of ['id', 'casoId', 'nombre', 'categoria', 'fechaCarga', 'nombreArchivo', 'mimeType', 'referenciaArchivo']) {
          if (typeof item[key] !== 'string' || !item[key]) throw new Error();
        }
        if (typeof item.tamano !== 'number' || !Number.isFinite(item.tamano) || item.tamano < 0 || !Number.isFinite(Date.parse(item.fechaCarga as string))) throw new Error();
        for (const key of ['fechaDocumento', 'descripcion', 'taskId']) if (item[key] !== undefined && typeof item[key] !== 'string') throw new Error();
        return item as unknown as DocumentoCaso;
      });
    } catch { throw new Error('No se pudieron cargar los documentos. La información guardada se conservó.'); }
  }
  private write(items: DocumentoCaso[]): void {
    try { localStorage.setItem(this.storageKey, JSON.stringify(items)); }
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
    const [created] = await this.addDocuments(casoId, [{ data, file }]);
    return created;
  }
  async addDocuments(casoId: string, items: { data: DatosDocumento; file: File }[]): Promise<DocumentoCaso[]> {
    if (!items.length) throw new Error('Selecciona al menos un archivo.');
    if (!await this.caseExists(casoId)) throw new Error('El caso ya no existe.');
    const previous = this.read();
    const prepared = await Promise.all(items.map(async ({ data, file }) => ({ data: cleanDocument(data, this.getCategories()), file, mimeType: await validateDocumentFile(file) })));
    const saved: string[] = [];
    try {
      const created: DocumentoCaso[] = [];
      for (const { data, file, mimeType } of prepared) {
        const id = crypto.randomUUID();
        const reference = `local/${casoId}/${id}`;
        await this.files.save(reference, new Blob([file], { type: mimeType }));
        saved.push(reference);
        created.push({ ...data, id, casoId, fechaCarga: new Date().toISOString(), nombreArchivo: file.name, mimeType, tamano: file.size, referenciaArchivo: reference });
      }
      this.write([...created, ...previous]);
      return created;
    } catch (error) {
      await Promise.allSettled(saved.map((reference) => this.files.remove(reference)));
      throw error;
    }
  }
  async updateDocument(casoId: string, id: string, data: DatosDocumento): Promise<DocumentoCaso> {
    const existing = this.find(casoId, id);
    const item = { ...existing, ...cleanDocument({ ...data, taskId: existing.taskId }, this.getCategories()) };
    this.write(this.read().map((doc) => doc.id === id && doc.casoId === casoId ? item : doc));
    return item;
  }
  async removeDocuments(casoId: string, ids: string[]): Promise<void> {
    const selected = this.read().filter((doc) => doc.casoId === casoId && ids.includes(doc.id));
    this.write(this.read().filter((doc) => doc.casoId !== casoId || !ids.includes(doc.id)));
    await Promise.all(selected.map((doc) => this.files.remove(doc.referenciaArchivo)));
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
  async releaseFiles(documents: DocumentoCaso[]): Promise<void> {
    await Promise.all(documents.map(doc => this.files.remove(doc.referenciaArchivo)));
  }
  async clearTemporaryFiles(): Promise<void> { await this.files.clear(); }
}
