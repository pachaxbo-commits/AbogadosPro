import type { DocumentFileStore } from './documentFiles';
import { TemporaryDocumentFiles } from './documentFiles';

// Solo las fotos de perfiles ficticios se persisten. Los documentos mantienen su almacén temporal.
export class DemoProfileFiles implements DocumentFileStore {
  private database: Promise<IDBDatabase> | null = null;
  private urls = new Map<string, string>();

  constructor(private temporary: TemporaryDocumentFiles) {}

  private isDemo(reference: string) {
    return reference.startsWith('profile/demo-');
  }

  private open(): Promise<IDBDatabase> {
    if (!('indexedDB' in globalThis)) return Promise.reject(new Error('El almacenamiento local de fotos no está disponible.'));
    this.database ||= new Promise((resolve, reject) => {
      const request = indexedDB.open('abogadospro-demo-profile-photos-v1', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('photos')) request.result.createObjectStore('photos');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento local de fotos.'));
      request.onblocked = () => reject(new Error('Cierra otras pestañas de Demo e inténtalo de nuevo.'));
    });
    return this.database;
  }

  async save(reference: string, file: Blob): Promise<void> {
    if (!this.isDemo(reference)) return this.temporary.save(reference, file);
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('photos', 'readwrite');
      transaction.objectStore('photos').put(file, reference);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('No se pudo guardar la foto localmente.'));
      transaction.onabort = () => reject(new Error('No se pudo guardar la foto localmente.'));
    });
    this.revoke(reference);
  }

  async getUrl(reference: string): Promise<string | null> {
    if (!this.isDemo(reference)) return this.temporary.getUrl(reference);
    const existing = this.urls.get(reference);
    if (existing) return existing;
    const db = await this.open();
    const file = await new Promise<Blob | null>((resolve, reject) => {
      const request = db.transaction('photos', 'readonly').objectStore('photos').get(reference);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(new Error('No se pudo leer la foto local.'));
    });
    if (!file) return null;
    const url = URL.createObjectURL(file);
    this.urls.set(reference, url);
    return url;
  }

  private revoke(reference: string) {
    const url = this.urls.get(reference);
    if (url) URL.revokeObjectURL(url);
    this.urls.delete(reference);
  }

  async remove(reference: string): Promise<void> {
    if (!this.isDemo(reference)) return this.temporary.remove(reference);
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('photos', 'readwrite');
      transaction.objectStore('photos').delete(reference);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('No se pudo quitar la foto local.'));
      transaction.onabort = () => reject(new Error('No se pudo quitar la foto local.'));
    });
    this.revoke(reference);
  }

  async clear(): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('photos', 'readwrite');
      transaction.objectStore('photos').clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('No se pudieron limpiar las fotos locales.'));
      transaction.onabort = () => reject(new Error('No se pudieron limpiar las fotos locales.'));
    });
    for (const reference of this.urls.keys()) this.revoke(reference);
    await this.temporary.clear();
  }
}
