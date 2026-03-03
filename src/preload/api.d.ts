import type { TreeNoteAPI } from './index';

declare global {
  interface Window {
    api: TreeNoteAPI;
  }
}
