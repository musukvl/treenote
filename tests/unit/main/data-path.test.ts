import { afterEach, describe, expect, it, vi } from 'vitest';
import { dirname, join } from 'path';

const { getPath } = vi.hoisted(() => ({
  getPath: vi.fn(() => 'C:\\Users\\test\\AppData\\Roaming\\TreeNote'),
}));

vi.mock('electron', () => ({
  app: {
    getPath,
  },
}));

import { getDefaultDataFilePath } from '../../../src/main/data-path';
import { DATA_FILE_NAME } from '../../../src/main/constants';

describe('getDefaultDataFilePath', () => {
  const originalPortable = process.env.PORTABLE_EXECUTABLE_DIR;
  const originalAppImage = process.env.APPIMAGE;

  afterEach(() => {
    if (originalPortable === undefined) {
      delete process.env.PORTABLE_EXECUTABLE_DIR;
    } else {
      process.env.PORTABLE_EXECUTABLE_DIR = originalPortable;
    }

    if (originalAppImage === undefined) {
      delete process.env.APPIMAGE;
    } else {
      process.env.APPIMAGE = originalAppImage;
    }

    getPath.mockClear();
  });

  it('uses PORTABLE_EXECUTABLE_DIR when set', () => {
    process.env.PORTABLE_EXECUTABLE_DIR = 'D:\\TreeNotePortable';
    delete process.env.APPIMAGE;

    expect(getDefaultDataFilePath()).toBe(join('D:\\TreeNotePortable', DATA_FILE_NAME));
    expect(getPath).not.toHaveBeenCalled();
  });

  it('uses AppImage directory when APPIMAGE is set', () => {
    delete process.env.PORTABLE_EXECUTABLE_DIR;
    const appImagePath = '/home/user/TreeNote.AppImage';
    process.env.APPIMAGE = appImagePath;

    expect(getDefaultDataFilePath()).toBe(join(dirname(appImagePath), DATA_FILE_NAME));
  });

  it('falls back to userData for installed builds', () => {
    delete process.env.PORTABLE_EXECUTABLE_DIR;
    delete process.env.APPIMAGE;

    expect(getDefaultDataFilePath()).toBe(
      join('C:\\Users\\test\\AppData\\Roaming\\TreeNote', DATA_FILE_NAME),
    );
    expect(getPath).toHaveBeenCalledWith('userData');
  });
});
