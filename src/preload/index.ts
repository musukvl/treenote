import { contextBridge, ipcRenderer } from 'electron';

export interface TreeNoteAPI {
  loadFile(): Promise<string | null>;
  saveFile(content: string): Promise<void>;
  showSaveDialog(): Promise<string | null>;
  showOpenDialog(): Promise<string | null>;
  getFilePath(): Promise<string>;
  getAppVersion(): Promise<string>;
  log(level: string, ...args: unknown[]): void;
  onMenuAction(callback: (action: string) => void): () => void;
}

contextBridge.exposeInMainWorld('api', {
  loadFile: (): Promise<string | null> => ipcRenderer.invoke('file:load'),
  saveFile: (content: string): Promise<void> => ipcRenderer.invoke('file:save', content),
  showSaveDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:save'),
  showOpenDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:open'),
  getFilePath: (): Promise<string> => ipcRenderer.invoke('file:path'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  log: (level: string, ...args: unknown[]): void => {
    ipcRenderer.send('log:write', level, ...args);
  },
  onMenuAction: (callback: (action: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string): void => callback(action);
    ipcRenderer.on('menu:action', handler);
    return () => ipcRenderer.removeListener('menu:action', handler);
  },
} satisfies TreeNoteAPI);
