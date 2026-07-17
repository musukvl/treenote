import type { StorageAdapter } from './StorageAdapter';

/**
 * StorageAdapter implementation that delegates to the Electron preload bridge.
 */
export class ElectronStorageAdapter implements StorageAdapter {
  async load(): Promise<string | null> {
    return window.api.loadFile();
  }

  async save(data: string): Promise<void> {
    await window.api.saveFile(data);
  }

  async getPath(): Promise<string> {
    return window.api.getFilePath();
  }

  async quarantineCorrupt(): Promise<string> {
    return window.api.quarantineCorrupt();
  }

  async showError(title: string, detail: string): Promise<void> {
    await window.api.showError(title, detail);
  }
}
