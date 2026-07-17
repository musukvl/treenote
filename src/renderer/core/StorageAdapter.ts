/**
 * Abstraction over file I/O for the renderer process.
 * Allows Vault to operate without direct knowledge of the Electron bridge.
 */
export interface StorageAdapter {
  load(): Promise<string | null>;
  save(data: string): Promise<void>;
  getPath(): Promise<string>;
  quarantineCorrupt(): Promise<string>;
  showError(title: string, detail: string): Promise<void>;
}
