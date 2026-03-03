import { app, BrowserWindow } from 'electron';
import { join, dirname, extname, resolve } from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { buildMenu } from './menu';
import { FileManager } from './file-manager';
import { DATA_FILE_NAME } from './constants';
import { logger } from './logger';

let mainWindow: BrowserWindow | null = null;

function getDataFilePath(): string {
  // Portable mode: store data file next to the executable
  const exePath = app.getPath('exe');
  const exeDir = dirname(exePath);
  return join(exeDir, DATA_FILE_NAME);
}

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
    if (extension === '.yml' || extension === '.yaml') {
      return resolve(arg);
    }
  }

  return null;
}

function resolveDataFilePath(argv: string[]): string {
  return parseCliDataFilePath(argv) ?? getDataFilePath();
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
  const fileManager = new FileManager(filePath);
  await fileManager.ensureFileExists();

  registerIpcHandlers(fileManager, mainWindow);
  buildMenu(mainWindow);

  // In dev, load from vite dev server; in prod, load from file
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  logger.info(`TreeNote started. Data file: ${fileManager.getFilePath()}`);
}

app.whenReady().then(() => {
  void createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
