/**
 * Shared IPC channel names and type contracts.
 * Importable by main, preload, and renderer processes.
 */
export const IpcChannels = {
  LOAD_FILE: 'file:load',
  OPEN_FILE: 'file:open',
  SAVE_FILE: 'file:save',
  GET_APP_VERSION: 'app:version',
  GET_FILE_PATH: 'file:path',
  LOG: 'log:write',
  MENU_ACTION: 'menu:action',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

/** Type-safe API contract exposed via contextBridge. */
export interface TreeNoteAPI {
  loadFile(): Promise<string | null>;
  openFile(): Promise<string | null>;
  saveFile(content: string): Promise<void>;
  getFilePath(): Promise<string>;
  getAppVersion(): Promise<string>;
  log(level: string, ...args: unknown[]): void;
  onMenuAction(callback: (action: string) => void): () => void;
}
