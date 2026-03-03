import { ipcMain, dialog, app, type BrowserWindow } from 'electron';
import { IPC } from './constants';
import { FileManager } from './file-manager';
import { logger } from './logger';

/** Register all IPC handlers. */
export function registerIpcHandlers(fileManager: FileManager, mainWindow: BrowserWindow): void {
  ipcMain.handle(IPC.LOAD_FILE, async () => {
    return await fileManager.read();
  });

  ipcMain.handle(IPC.SAVE_FILE, async (_event, content: string) => {
    await fileManager.write(content);
  });

  ipcMain.handle(IPC.SHOW_SAVE_DIALOG, async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Notes',
      defaultPath: fileManager.getFilePath(),
      filters: [
        { name: 'TreeNote Files', extensions: ['yaml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return null;
    fileManager.setFilePath(result.filePath);
    return result.filePath;
  });

  ipcMain.handle(IPC.SHOW_OPEN_DIALOG, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Notes',
      filters: [
        { name: 'TreeNote Files', extensions: ['yaml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    fileManager.setFilePath(result.filePaths[0]);
    return result.filePaths[0];
  });

  ipcMain.handle(IPC.GET_APP_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC.GET_FILE_PATH, () => {
    return fileManager.getFilePath();
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
