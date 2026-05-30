/** IPC channel names. */
export const IPC = {
  LOAD_FILE: 'file:load',
  SAVE_FILE: 'file:save',
  GET_APP_VERSION: 'app:version',
  GET_FILE_PATH: 'file:path',
  LOG: 'log:write',
  MENU_ACTION: 'menu:action',
} as const;

/** Default data file name. */
export const DATA_FILE_NAME = 'notes.yaml';
