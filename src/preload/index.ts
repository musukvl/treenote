import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from '../shared/ipc';
import type { TreeNoteAPI } from '../shared/ipc';

contextBridge.exposeInMainWorld('api', {
  loadFile: (): Promise<string | null> => ipcRenderer.invoke(IpcChannels.LOAD_FILE),
  openFile: (): Promise<string | null> => ipcRenderer.invoke(IpcChannels.OPEN_FILE),
  saveFile: (content: string): Promise<void> => ipcRenderer.invoke(IpcChannels.SAVE_FILE, content),
  quarantineCorrupt: (): Promise<string> => ipcRenderer.invoke(IpcChannels.QUARANTINE_CORRUPT),
  getFilePath: (): Promise<string> => ipcRenderer.invoke(IpcChannels.GET_FILE_PATH),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IpcChannels.GET_APP_VERSION),
  showError: (title: string, detail: string): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.SHOW_ERROR, title, detail),
  log: (level, ...args: unknown[]): void => {
    ipcRenderer.send(IpcChannels.LOG, level, ...args);
  },
  onMenuAction: (callback: (action: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string): void => callback(action);
    ipcRenderer.on(IpcChannels.MENU_ACTION, handler);
    return () => ipcRenderer.removeListener(IpcChannels.MENU_ACTION, handler);
  },
  onPrepareQuit: (callback: () => void | Promise<void>): (() => void) => {
    const handler = (): void => {
      void Promise.resolve(callback());
    };
    ipcRenderer.on(IpcChannels.PREPARE_QUIT, handler);
    return () => ipcRenderer.removeListener(IpcChannels.PREPARE_QUIT, handler);
  },
  readyToQuit: (): void => {
    ipcRenderer.send(IpcChannels.READY_TO_QUIT);
  },
} satisfies TreeNoteAPI);
