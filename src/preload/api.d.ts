import type { TreeNoteAPI } from '../shared/ipc';

declare global {
  interface Window {
    api: TreeNoteAPI;
  }
}
