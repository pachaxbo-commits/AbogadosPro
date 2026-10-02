export interface DocumentFileStore {
  save(reference: string, file: Blob): Promise<void>;
  getUrl(reference: string): Promise<string | null>;
  remove(reference: string): Promise<void>;
  clear(): Promise<void>;
}

// Los archivos y sus URLs duran esta sesión. Nunca guardar blob URLs en metadata.
export class TemporaryDocumentFiles implements DocumentFileStore {
  private files = new Map<string, { blob: Blob; url?: string }>();
  async save(reference: string, file: Blob): Promise<void> { this.files.set(reference, { blob: file }); }
  async getUrl(reference: string): Promise<string | null> {
    const entry = this.files.get(reference);
    if (!entry) return null;
    entry.url ??= URL.createObjectURL(entry.blob);
    return entry.url;
  }
  async remove(reference: string): Promise<void> {
    const entry = this.files.get(reference);
    if (entry?.url) URL.revokeObjectURL(entry.url);
    this.files.delete(reference);
  }
  async clear(): Promise<void> { for (const reference of this.files.keys()) await this.remove(reference); }
}
