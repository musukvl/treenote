import { ipcMain, dialog, app, type BrowserWindow } from 'electron';
import { IPC } from './constants';
import { FileManager } from './file-manager';
import { logger } from './logger';

export interface AppState {
  getFileManager(): FileManager;
  getMainWindow(): BrowserWindow | null;
}

/** Register all IPC handlers. Must be called once during app startup. */
export function registerIpcHandlers(state: AppState): void {
  ipcMain.handle(IPC.LOAD_FILE, async () => {
    return await state.getFileManager().read();
  });

  ipcMain.handle(IPC.SAVE_FILE, async (_event, content: string) => {
    await state.getFileManager().write(content);
  });

  ipcMain.handle(IPC.SHOW_SAVE_DIALOG, async () => {
    const mainWindow = state.getMainWindow();
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Notes',
      defaultPath: state.getFileManager().getFilePath(),
      filters: [
        { name: 'TreeNote Files', extensions: ['yaml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return null;
    state.getFileManager().setFilePath(result.filePath);
    return result.filePath;
  });

  ipcMain.handle(IPC.SHOW_OPEN_DIALOG, async () => {
    const mainWindow = state.getMainWindow();
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Notes',
      filters: [
        { name: 'TreeNote Files', extensions: ['yaml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    state.getFileManager().setFilePath(result.filePaths[0]);
    return result.filePaths[0];
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
