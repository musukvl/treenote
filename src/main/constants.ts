export { IpcChannels as IPC } from '../shared/ipc';

/** Default data file name. */
export const DATA_FILE_NAME = 'notes.yaml';

/** Directory name for rolling backups, next to the data file. */
export const BACKUP_DIR_NAME = 'backups';

/** Maximum number of rolling backup copies to retain. */
export const MAX_BACKUPS = 10;
