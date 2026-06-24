import { ipcMain, app, dialog } from 'electron';
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

  ipcMain.handle(IPC.OPEN_FILE, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open TreeNote File',
      properties: ['openFile'],
      filters: [
        { name: 'TreeNote Files', extensions: ['yaml', 'yml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const [filePath] = result.filePaths;
    const fileManager = state.getFileManager();
    fileManager.setFilePath(filePath);
    await fileManager.ensureFileExists();
    logger.info(`Opened data file: ${filePath}`);

    return filePath;
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
