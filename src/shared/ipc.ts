/**
 * Shared IPC channel names and type contracts.
 * Importable by main, preload, and renderer processes.
 */
export const IpcChannels = {
  LOAD_FILE: 'file:load',
  OPEN_FILE: 'file:open',
  SAVE_FILE: 'file:save',
  QUARANTINE_CORRUPT: 'file:quarantine-corrupt',
  GET_APP_VERSION: 'app:version',
  GET_FILE_PATH: 'file:path',
  SHOW_ERROR: 'dialog:error',
  LOG: 'log:write',
  MENU_ACTION: 'menu:action',
  PREPARE_QUIT: 'app:prepare-quit',
  READY_TO_QUIT: 'app:ready-to-quit',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

export const LogLevels = ['error', 'debug', 'info'] as const;
export type LogLevel = (typeof LogLevels)[number];

/** Type-safe API contract exposed via contextBridge. */
export interface TreeNoteAPI {
  loadFile(): Promise<string | null>;
  openFile(): Promise<string | null>;
  saveFile(content: string): Promise<void>;
  quarantineCorrupt(): Promise<string>;
  getFilePath(): Promise<string>;
  getAppVersion(): Promise<string>;
  showError(title: string, detail: string): Promise<void>;
  log(level: LogLevel, ...args: unknown[]): void;
  onMenuAction(callback: (action: string) => void): () => void;
  onPrepareQuit(callback: () => void | Promise<void>): () => void;
  readyToQuit(): void;
}
