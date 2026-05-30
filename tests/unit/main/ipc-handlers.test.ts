import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerIpcHandlers } from '../../../src/main/ipc-handlers';
import { IPC } from '../../../src/main/constants';
import { logger } from '../../../src/main/logger';

const { handleCallbacks, onCallbacks, ipcMainHandle, ipcMainOn, getVersion } = vi.hoisted(() => {
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
    read: vi.fn(async () => '{"ok":true}'),
    write: vi.fn(async () => {}),
    getFilePath: vi.fn(() => '/tmp/notes.yaml'),
  };

  beforeEach(() => {
    handleCallbacks.clear();
    onCallbacks.clear();
    vi.clearAllMocks();

    fileManager.read.mockResolvedValue('{"ok":true}');
    fileManager.write.mockResolvedValue(undefined);
    fileManager.getFilePath.mockReturnValue('/tmp/notes.yaml');

    registerIpcHandlers({
      getFileManager: () => fileManager as never,
    });
  });

  it('registers all expected IPC handlers and listeners', () => {
    expect(ipcMainHandle).toHaveBeenCalledTimes(4);
    expect(ipcMainOn).toHaveBeenCalledTimes(1);

    expect(handleCallbacks.has(IPC.LOAD_FILE)).toBe(true);
    expect(handleCallbacks.has(IPC.SAVE_FILE)).toBe(true);
    expect(handleCallbacks.has(IPC.GET_APP_VERSION)).toBe(true);
    expect(handleCallbacks.has(IPC.GET_FILE_PATH)).toBe(true);
    expect(onCallbacks.has(IPC.LOG)).toBe(true);
  });

  it('loads file through file manager', async () => {
    const handler = handleCallbacks.get(IPC.LOAD_FILE);
    expect(handler).toBeTruthy();

    const result = await handler!();

    expect(fileManager.read).toHaveBeenCalledTimes(1);
    expect(result).toBe('{"ok":true}');
  });

  it('saves file content through file manager', async () => {
    const handler = handleCallbacks.get(IPC.SAVE_FILE);
    expect(handler).toBeTruthy();

    await handler!({}, '{"tree":1}');

    expect(fileManager.write).toHaveBeenCalledWith('{"tree":1}');
  });

  it('returns app version and current file path', async () => {
    const getVersionHandler = handleCallbacks.get(IPC.GET_APP_VERSION);
    const getPathHandler = handleCallbacks.get(IPC.GET_FILE_PATH);

    expect(getVersionHandler).toBeTruthy();
    expect(getPathHandler).toBeTruthy();

    expect(getVersionHandler!()).toBe('1.2.3-test');
    expect(getPathHandler!()).toBe('/tmp/notes.yaml');
    expect(getVersion).toHaveBeenCalledTimes(1);
    expect(fileManager.getFilePath).toHaveBeenCalled();
  });

  it('routes renderer logs to appropriate logger methods', () => {
    const listener = onCallbacks.get(IPC.LOG);
    expect(listener).toBeTruthy();

    listener!({}, 'error', 'boom', 123);
    listener!({}, 'debug', 'dbg-msg', { x: 1 });
    listener!({}, 'info', 'hello', 'world');

    expect(logger.error).toHaveBeenCalledWith('[Renderer]', 'boom', 123);
    expect(logger.debug).toHaveBeenCalledWith('[Renderer] dbg-msg', { x: 1 });
    expect(logger.info).toHaveBeenCalledWith('[Renderer] hello', 'world');
  });
});
