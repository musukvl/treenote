import {
  ipcMain,
  app,
  dialog,
  BrowserWindow,
  type IpcMainInvokeEvent,
  type IpcMainEvent,
} from 'electron';
import { IPC } from './constants';
import { FileManager } from './file-manager';
import { logger } from './logger';
import { isTrustedIpcSender } from './ipc-security';
import { validateTreeData } from '../shared/validate-tree-data';
import { LogLevels, type LogLevel } from '../shared/ipc';

export interface AppState {
  getFileManager(): FileManager;
  getMainWindow(): BrowserWindow | null;
}

function assertTrustedSender(event: IpcMainInvokeEvent | IpcMainEvent): void {
  if (!isTrustedIpcSender(event.senderFrame)) {
    throw new Error('Untrusted IPC sender');
  }
}

function parseAndValidateTreeJson(content: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Payload is not valid JSON');
  }

  if (!validateTreeData(parsed)) {
    throw new Error('Payload is not valid TreeNote data');
  }
}

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && (LogLevels as readonly string[]).includes(value);
}

/** Point the file manager at a new path, validating content and rolling back on failure. */
async function switchToFile(fileManager: FileManager, filePath: string): Promise<void> {
  const previousPath = fileManager.getFilePath();

  fileManager.setFilePath(filePath);
  await fileManager.ensureFileExists();

  try {
    const content = await fileManager.read();
    if (content !== null) {
      parseAndValidateTreeJson(content);
    }
  } catch (err) {
    fileManager.setFilePath(previousPath);
    logger.error(`Rejected open of invalid data file: ${filePath}`, err);
    throw err instanceof Error ? err : new Error('Failed to open data file');
  }

  logger.info(`Opened data file: ${filePath}`);
}

/** Register all IPC handlers. Must be called once during app startup. */
export function registerIpcHandlers(state: AppState): void {
  ipcMain.handle(IPC.LOAD_FILE, async (event) => {
    assertTrustedSender(event);
    return await state.getFileManager().read();
  });

  ipcMain.handle(IPC.OPEN_FILE, async (event) => {
    assertTrustedSender(event);

    const result = await dialog.showOpenDialog({
      title: 'Open TreeNote File',
      properties: ['openFile'],
      filters: [
        { name: 'TreeNote Files', extensions: ['tnyml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const [filePath] = result.filePaths;
    await switchToFile(state.getFileManager(), filePath);
    return filePath;
  });

  ipcMain.handle(IPC.OPEN_PATH, async (event, filePath: unknown) => {
    assertTrustedSender(event);

    if (typeof filePath !== 'string' || !filePath) {
      throw new Error('Open path payload must be a non-empty string');
    }

    await switchToFile(state.getFileManager(), filePath);
    return filePath;
  });

  ipcMain.handle(IPC.SAVE_FILE, async (event, content: unknown) => {
    assertTrustedSender(event);

    if (typeof content !== 'string') {
      throw new Error('Save payload must be a JSON string');
    }

    parseAndValidateTreeJson(content);
    await state.getFileManager().write(content);
  });

  ipcMain.handle(IPC.QUARANTINE_CORRUPT, async (event) => {
    assertTrustedSender(event);
    return await state.getFileManager().quarantineCorrupt();
  });

  ipcMain.handle(IPC.GET_APP_VERSION, (event) => {
    assertTrustedSender(event);
    return app.getVersion();
  });

  ipcMain.handle(IPC.GET_FILE_PATH, (event) => {
    assertTrustedSender(event);
    return state.getFileManager().getFilePath();
  });

  ipcMain.handle(IPC.SHOW_ERROR, async (event, title: unknown, detail: unknown) => {
    assertTrustedSender(event);

    const safeTitle = typeof title === 'string' && title.trim() ? title : 'TreeNote Error';
    const safeDetail = typeof detail === 'string' ? detail : String(detail ?? '');
    const win = state.getMainWindow();

    if (win) {
      await dialog.showMessageBox(win, {
        type: 'error',
        title: safeTitle,
        message: safeTitle,
        detail: safeDetail,
      });
    } else {
      await dialog.showMessageBox({
        type: 'error',
        title: safeTitle,
        message: safeTitle,
        detail: safeDetail,
      });
    }
  });

  ipcMain.on(IPC.LOG, (event, level: unknown, ...args: unknown[]) => {
    if (!isTrustedIpcSender(event.senderFrame)) {
      return;
    }

    if (!isLogLevel(level)) {
      return;
    }

    const serializedArgs = args.map((arg) => {
      if (typeof arg === 'string') return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    });

    switch (level) {
      case 'error':
        logger.error('[Renderer]', ...serializedArgs);
        break;
      case 'debug':
        logger.debug('[Renderer] ' + (serializedArgs[0] ?? ''), ...serializedArgs.slice(1));
        break;
      case 'info':
        logger.info('[Renderer] ' + (serializedArgs[0] ?? ''), ...serializedArgs.slice(1));
        break;
    }
  });
}
