import { app, BrowserWindow, ipcMain } from 'electron';
import { join, extname, resolve } from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { registerNavigationGuards } from './navigation-guards';
import { buildMenu } from './menu';
import { FileManager } from './file-manager';
import { IPC } from './constants';
import { getDefaultDataFilePath } from './data-path';
import { logger } from './logger';
import { isTrustedIpcSender } from './ipc-security';

const LINUX_DESKTOP_NAME = 'com.treenote.app.desktop';
const QUIT_FLUSH_TIMEOUT_MS = 5000;

app.setName('TreeNote');

if (process.platform === 'linux') {
  app.setDesktopName(LINUX_DESKTOP_NAME);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let fileManager: FileManager | null = null;
let allowClose = false;
let flushInProgress = false;
/** File requested by the OS (macOS open-file) before the window existed. */
let pendingExternalFilePath: string | null = null;

function parseCliDataFilePath(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--file' || arg === '-f') {
      const value = argv[i + 1];
      if (!value) return null;
      return resolve(value);
    }

    if (arg.startsWith('--file=')) {
      const value = arg.slice('--file='.length);
      if (!value) return null;
      return resolve(value);
    }

    const extension = extname(arg).toLowerCase();
    if (extension === '.tnyml') {
      return resolve(arg);
    }
  }

  return null;
}

function resolveDataFilePath(argv: string[]): string {
  if (pendingExternalFilePath) {
    const requested = pendingExternalFilePath;
    pendingExternalFilePath = null;
    return requested;
  }
  return parseCliDataFilePath(argv) ?? getDefaultDataFilePath();
}

/**
 * Handle a file opened via OS file association while the app is running.
 * The renderer flushes pending saves to the current file first, then asks
 * the main process to switch paths and reloads.
 */
function applyExternalFile(filePath: string): void {
  logger.info(`External open requested: ${filePath}`);
  if (mainWindow) {
    mainWindow.webContents.send(IPC.EXTERNAL_OPEN, filePath);
  } else {
    pendingExternalFilePath = filePath;
  }
}

function focusMainWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

function requestRendererFlush(win: BrowserWindow): void {
  if (flushInProgress) return;
  flushInProgress = true;
  win.webContents.send(IPC.PREPARE_QUIT);

  setTimeout(() => {
    if (!allowClose) {
      logger.info('Quit flush timed out; closing window.');
      allowClose = true;
      flushInProgress = false;
      win.close();
    }
  }, QUIT_FLUSH_TIMEOUT_MS);
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'TreeNote',
  });

  const filePath = resolveDataFilePath(process.argv);
  fileManager = new FileManager(filePath);
  await fileManager.ensureFileExists();

  buildMenu(mainWindow);

  mainWindow.on('close', (event) => {
    if (allowClose) return;
    event.preventDefault();
    if (mainWindow) {
      requestRendererFlush(mainWindow);
    }
  });

  // In dev, load from vite dev server; in prod, load from file
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    flushInProgress = false;
  });

  logger.info(`TreeNote started. Data file: ${fileManager.getFilePath()}`);
}

if (gotSingleInstanceLock) {
  // macOS delivers file-association opens via this event instead of argv.
  // Must be registered before app is ready to catch cold-start opens.
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    applyExternalFile(resolve(filePath));
  });

  app.on('second-instance', (_event, argv) => {
    focusMainWindow();

    const requestedPath = parseCliDataFilePath(argv);
    if (requestedPath) {
      applyExternalFile(requestedPath);
    }
  });

  app.whenReady().then(() => {
    registerNavigationGuards();

    registerIpcHandlers({
      getFileManager: () => fileManager!,
      getMainWindow: () => mainWindow,
    });

    ipcMain.on(IPC.READY_TO_QUIT, (event) => {
      if (!isTrustedIpcSender(event.senderFrame)) {
        return;
      }
      allowClose = true;
      flushInProgress = false;
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.close();
    });

    void createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        allowClose = false;
        void createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
