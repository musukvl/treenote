import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerIpcHandlers } from '../../../src/main/ipc-handlers';
import { IPC } from '../../../src/main/constants';
import { logger } from '../../../src/main/logger';

const validTreeJson = JSON.stringify({
  root: {
    id: 'root-1',
    name: 'Root',
    content: '',
    children: [],
    parentId: null,
    createdAt: 1000,
    updatedAt: 2000,
    isExpanded: true,
  },
  metadata: {
    version: '1.0.0',
    createdAt: 1000,
    updatedAt: 2000,
  },
});

function trustedEvent(): { senderFrame: { url: string; detached: boolean } } {
  return { senderFrame: { url: 'file:///app/index.html', detached: false } };
}

function untrustedEvent(): { senderFrame: { url: string; detached: boolean } } {
  return { senderFrame: { url: 'https://evil.example', detached: false } };
}

const {
  handleCallbacks,
  onCallbacks,
  ipcMainHandle,
  ipcMainOn,
  getVersion,
  showOpenDialog,
  showMessageBox,
} = vi.hoisted(() => {
  const localHandleCallbacks = new Map<string, (...args: unknown[]) => unknown>();
  const localOnCallbacks = new Map<string, (...args: unknown[]) => void>();
  const localIpcMainHandle = vi.fn((channel: string, callback: (...args: unknown[]) => unknown) => {
    localHandleCallbacks.set(channel, callback);
  });
  const localIpcMainOn = vi.fn((channel: string, callback: (...args: unknown[]) => void) => {
    localOnCallbacks.set(channel, callback);
  });

  return {
    handleCallbacks: localHandleCallbacks,
    onCallbacks: localOnCallbacks,
    ipcMainHandle: localIpcMainHandle,
    ipcMainOn: localIpcMainOn,
    getVersion: vi.fn(() => '1.2.3-test'),
    showOpenDialog: vi.fn(),
    showMessageBox: vi.fn(async () => ({ response: 0 })),
  };
});

vi.mock('electron', () => ({
  ipcMain: {
    handle: ipcMainHandle,
    on: ipcMainOn,
  },
  app: {
    getVersion,
  },
  dialog: {
    showOpenDialog,
    showMessageBox,
  },
  BrowserWindow: {},
}));

vi.mock('../../../src/main/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

describe('registerIpcHandlers', () => {
  const fileManager = {
    read: vi.fn(async () => validTreeJson),
    write: vi.fn(async () => {}),
    getFilePath: vi.fn(() => '/tmp/notes.tnyml'),
    setFilePath: vi.fn(),
    ensureFileExists: vi.fn(async () => {}),
    quarantineCorrupt: vi.fn(async () => '/tmp/notes.tnyml.corrupt-stamp'),
  };

  beforeEach(() => {
    handleCallbacks.clear();
    onCallbacks.clear();
    vi.clearAllMocks();
    delete process.env.ELECTRON_RENDERER_URL;

    fileManager.read.mockResolvedValue(validTreeJson);
    fileManager.write.mockResolvedValue(undefined);
    fileManager.getFilePath.mockReturnValue('/tmp/notes.tnyml');
    fileManager.setFilePath.mockReturnValue(undefined);
    fileManager.ensureFileExists.mockResolvedValue(undefined);
    fileManager.quarantineCorrupt.mockResolvedValue('/tmp/notes.tnyml.corrupt-stamp');
    showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    registerIpcHandlers({
      getFileManager: () => fileManager as never,
      getMainWindow: () => null,
    });
  });

  it('registers all expected IPC handlers and listeners', () => {
    expect(ipcMainHandle).toHaveBeenCalledTimes(8);
    expect(ipcMainOn).toHaveBeenCalledTimes(1);

    expect(handleCallbacks.has(IPC.LOAD_FILE)).toBe(true);
    expect(handleCallbacks.has(IPC.OPEN_FILE)).toBe(true);
    expect(handleCallbacks.has(IPC.OPEN_PATH)).toBe(true);
    expect(handleCallbacks.has(IPC.SAVE_FILE)).toBe(true);
    expect(handleCallbacks.has(IPC.QUARANTINE_CORRUPT)).toBe(true);
    expect(handleCallbacks.has(IPC.GET_APP_VERSION)).toBe(true);
    expect(handleCallbacks.has(IPC.GET_FILE_PATH)).toBe(true);
    expect(handleCallbacks.has(IPC.SHOW_ERROR)).toBe(true);
    expect(onCallbacks.has(IPC.LOG)).toBe(true);
  });

  it('loads file through file manager', async () => {
    const handler = handleCallbacks.get(IPC.LOAD_FILE);
    expect(handler).toBeTruthy();

    const result = await handler!(trustedEvent());

    expect(fileManager.read).toHaveBeenCalledTimes(1);
    expect(result).toBe(validTreeJson);
  });

  it('rejects untrusted IPC senders', async () => {
    const handler = handleCallbacks.get(IPC.LOAD_FILE);
    await expect(handler!(untrustedEvent())).rejects.toThrow('Untrusted IPC sender');
    expect(fileManager.read).not.toHaveBeenCalled();
  });

  it('returns null when open file dialog is canceled', async () => {
    const handler = handleCallbacks.get(IPC.OPEN_FILE);
    expect(handler).toBeTruthy();

    const result = await handler!(trustedEvent());

    expect(showOpenDialog).toHaveBeenCalledWith({
      title: 'Open TreeNote File',
      properties: ['openFile'],
      filters: [
        { name: 'TreeNote Files', extensions: ['tnyml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    expect(result).toBeNull();
    expect(fileManager.setFilePath).not.toHaveBeenCalled();
    expect(fileManager.ensureFileExists).not.toHaveBeenCalled();
  });

  it('opens selected file and updates file manager path', async () => {
    const handler = handleCallbacks.get(IPC.OPEN_FILE);
    expect(handler).toBeTruthy();
    showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/tmp/selected-notes.tnyml'],
    });

    const result = await handler!(trustedEvent());

    expect(result).toBe('/tmp/selected-notes.tnyml');
    expect(fileManager.setFilePath).toHaveBeenCalledWith('/tmp/selected-notes.tnyml');
    expect(fileManager.ensureFileExists).toHaveBeenCalledTimes(1);
    expect(fileManager.read).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Opened data file: /tmp/selected-notes.tnyml');
  });

  it('rejects opening an invalid data file and restores the previous path', async () => {
    const handler = handleCallbacks.get(IPC.OPEN_FILE);
    showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/tmp/bad-notes.tnyml'],
    });
    fileManager.read.mockResolvedValue('{"not":"tree-data"}');

    await expect(handler!(trustedEvent())).rejects.toThrow('Payload is not valid TreeNote data');
    expect(fileManager.setFilePath).toHaveBeenNthCalledWith(1, '/tmp/bad-notes.tnyml');
    expect(fileManager.setFilePath).toHaveBeenNthCalledWith(2, '/tmp/notes.tnyml');
    expect(logger.error).toHaveBeenCalled();
  });

  it('opens an externally requested path and updates file manager path', async () => {
    const handler = handleCallbacks.get(IPC.OPEN_PATH);
    expect(handler).toBeTruthy();

    const result = await handler!(trustedEvent(), '/tmp/external-notes.tnyml');

    expect(result).toBe('/tmp/external-notes.tnyml');
    expect(fileManager.setFilePath).toHaveBeenCalledWith('/tmp/external-notes.tnyml');
    expect(fileManager.ensureFileExists).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Opened data file: /tmp/external-notes.tnyml');
  });

  it('rejects invalid external path payloads', async () => {
    const handler = handleCallbacks.get(IPC.OPEN_PATH);

    await expect(handler!(trustedEvent(), 42)).rejects.toThrow(
      'Open path payload must be a non-empty string',
    );
    await expect(handler!(trustedEvent(), '')).rejects.toThrow(
      'Open path payload must be a non-empty string',
    );
    expect(fileManager.setFilePath).not.toHaveBeenCalled();
  });

  it('rejects an externally requested file with invalid data and restores the previous path', async () => {
    const handler = handleCallbacks.get(IPC.OPEN_PATH);
    fileManager.read.mockResolvedValue('{"not":"tree-data"}');

    await expect(handler!(trustedEvent(), '/tmp/bad-external.tnyml')).rejects.toThrow(
      'Payload is not valid TreeNote data',
    );
    expect(fileManager.setFilePath).toHaveBeenNthCalledWith(1, '/tmp/bad-external.tnyml');
    expect(fileManager.setFilePath).toHaveBeenNthCalledWith(2, '/tmp/notes.tnyml');
    expect(logger.error).toHaveBeenCalled();
  });

  it('saves valid TreeData through file manager', async () => {
    const handler = handleCallbacks.get(IPC.SAVE_FILE);
    expect(handler).toBeTruthy();

    await handler!(trustedEvent(), validTreeJson);

    expect(fileManager.write).toHaveBeenCalledWith(validTreeJson);
  });

  it('rejects invalid save payloads', async () => {
    const handler = handleCallbacks.get(IPC.SAVE_FILE);

    await expect(handler!(trustedEvent(), '{"tree":1}')).rejects.toThrow(
      'Payload is not valid TreeNote data',
    );
    await expect(handler!(trustedEvent(), 42)).rejects.toThrow(
      'Save payload must be a JSON string',
    );
    expect(fileManager.write).not.toHaveBeenCalled();
  });

  it('returns app version and current file path', async () => {
    const getVersionHandler = handleCallbacks.get(IPC.GET_APP_VERSION);
    const getPathHandler = handleCallbacks.get(IPC.GET_FILE_PATH);

    expect(getVersionHandler).toBeTruthy();
    expect(getPathHandler).toBeTruthy();

    expect(getVersionHandler!(trustedEvent())).toBe('1.2.3-test');
    expect(getPathHandler!(trustedEvent())).toBe('/tmp/notes.tnyml');
    expect(getVersion).toHaveBeenCalledTimes(1);
    expect(fileManager.getFilePath).toHaveBeenCalled();
  });

  it('quarantines the active data file', async () => {
    const handler = handleCallbacks.get(IPC.QUARANTINE_CORRUPT);
    const result = await handler!(trustedEvent());

    expect(result).toBe('/tmp/notes.tnyml.corrupt-stamp');
    expect(fileManager.quarantineCorrupt).toHaveBeenCalledTimes(1);
  });

  it('shows an error dialog', async () => {
    const handler = handleCallbacks.get(IPC.SHOW_ERROR);
    await handler!(trustedEvent(), 'Title', 'Detail text');

    expect(showMessageBox).toHaveBeenCalledWith({
      type: 'error',
      title: 'Title',
      message: 'Title',
      detail: 'Detail text',
    });
  });

  it('routes renderer logs to appropriate logger methods', () => {
    const listener = onCallbacks.get(IPC.LOG);
    expect(listener).toBeTruthy();

    listener!(trustedEvent(), 'error', 'boom', 123);
    listener!(trustedEvent(), 'debug', 'dbg-msg', { x: 1 });
    listener!(trustedEvent(), 'info', 'hello', 'world');

    expect(logger.error).toHaveBeenCalledWith('[Renderer]', 'boom', '123');
    expect(logger.debug).toHaveBeenCalledWith('[Renderer] dbg-msg', '{"x":1}');
    expect(logger.info).toHaveBeenCalledWith('[Renderer] hello', 'world');
  });

  it('ignores untrusted or invalid log levels', () => {
    const listener = onCallbacks.get(IPC.LOG);

    listener!(untrustedEvent(), 'error', 'boom');
    listener!(trustedEvent(), 'trace', 'nope');
    listener!(trustedEvent(), 1, 'nope');

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });
});
