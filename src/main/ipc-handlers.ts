import { ipcMain, app } from 'electron';
import { IPC } from './constants';
import { FileManager } from './file-manager';
import { logger } from './logger';

export interface AppState {
  getFileManager(): FileManager;
}

/** Register all IPC handlers. Must be called once during app startup. */
export function registerIpcHandlers(state: AppState): void {
  ipcMain.handle(IPC.LOAD_FILE, async () => {
    return await state.getFileManager().read();
  });

  ipcMain.handle(IPC.SAVE_FILE, async (_event, content: string) => {
    await state.getFileManager().write(content);
  });

  ipcMain.handle(IPC.GET_APP_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC.GET_FILE_PATH, () => {
    return state.getFileManager().getFilePath();
  });

  ipcMain.on(IPC.LOG, (_event, level: string, ...args: unknown[]) => {
    switch (level) {
      case 'error':
        logger.error('[Renderer]', ...args);
        break;
      case 'debug':
        logger.debug('[Renderer] ' + String(args[0] ?? ''), ...args.slice(1));
        break;
      default:
        logger.info('[Renderer] ' + String(args[0] ?? ''), ...args.slice(1));
    }
  });
}
