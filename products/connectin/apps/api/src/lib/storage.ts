import { promises as fs } from 'fs';
import path from 'path';

export interface StorageAdapter {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor(baseDir?: string, baseUrl?: string) {
    this.baseDir =
      baseDir ||
      path.join(process.cwd(), 'uploads');
    this.baseUrl = baseUrl || '/uploads';
  }

  async upload(
    key: string,
    buffer: Buffer,
    _mimeType: string
  ): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist, ignore
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

let storageInstance: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    storageInstance = new LocalStorageAdapter();
  }
  return storageInstance;
}

export function setStorage(adapter: StorageAdapter): void {
  storageInstance = adapter;
}
