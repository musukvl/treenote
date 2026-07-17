import type { NoteNode, TreeData, TreeDataMetadata } from '../../shared/tree-data';
import { CURRENT_TREE_VERSION } from '../../shared/tree-version';

export type { NoteNode, TreeData, TreeDataMetadata };

/** Generate a simple UUID v4. */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Create a new NoteNode with defaults. */
export function createNoteNode(name: string, parentId: string | null): NoteNode {
  const now = Date.now();
  return {
    id: generateId(),
    name,
    content: '',
    children: [],
    parentId,
    createdAt: now,
    updatedAt: now,
    isExpanded: false,
  };
}

/** Create the default welcome data for a new file. */
export function createWelcomeData(): TreeData {
  const root = createNoteNode('My Notes', null);
  root.isExpanded = true;

  const welcome = createNoteNode('Welcome', root.id);
  welcome.content = [
    'Welcome to TreeNote!',
    '',
    'This is your first note. You can:',
    '- Create new notes with Ctrl+N',
    '- Create child notes with Ctrl+Shift+N',
    '- Search notes with Ctrl+F',
    '- Save manually with Ctrl+S (auto-save is also enabled)',
    '',
    'Start organizing your thoughts in a tree!',
  ].join('\n');
  root.children.push(welcome);

  return {
    root,
    metadata: {
      version: CURRENT_TREE_VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
}
