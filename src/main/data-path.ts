import { join, dirname } from 'path';
import { app } from 'electron';
import { DATA_FILE_NAME } from './constants';

/**
 * Resolve the default notes.yaml location.
 * Portable / AppImage builds keep data next to the executable;
 * installed builds use the platform userData directory.
 */
export function getDefaultDataFilePath(): string {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir) {
    return join(portableDir, DATA_FILE_NAME);
  }

  if (process.env.APPIMAGE) {
    return join(dirname(process.env.APPIMAGE), DATA_FILE_NAME);
  }

  return join(app.getPath('userData'), DATA_FILE_NAME);
}
