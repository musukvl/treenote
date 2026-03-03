import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installDomExtensions } from '../../../src/renderer/helpers/dom';
import { TreeView } from '../../../src/renderer/views/TreeView';
import { Events } from '../../../src/renderer/core/Events';
import type { NoteNode } from '../../../src/renderer/models/NoteNode';

// Install Obsidian-style HTMLElement extensions before tests
installDomExtensions();

/** Build a minimal NoteNode for testing. */
function makeNode(
  id: string,
  name: string,
  parentId: string | null,
  children: NoteNode[] = [],
): NoteNode {
  return {
    id,
    name,
    content: '',
    children,
    parentId,
    createdAt: 0,
    updatedAt: 0,
    isExpanded: true,
  };
}

/**
 * Build a test tree:
 *   root
 *   ├── A
 *   │   └── A1
 *   └── B
 */
function buildTree() {
  const a1 = makeNode('a1', 'A1', 'a');
  const a = makeNode('a', 'A', 'root', [a1]);
  const b = makeNode('b', 'B', 'root');
  const root = makeNode('root', 'Root', null, [a, b]);
  return { root, a, a1, b };
}

function findNodeById(root: NoteNode, id: string): NoteNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

function isDescendantOf(root: NoteNode, ancestorId: string, nodeId: string): boolean {
  const ancestor = findNodeById(root, ancestorId);
  if (!ancestor) return false;
  return !!findNodeById(ancestor, nodeId);
}

/** Create a mock App with a functional vault for drag tests. */
function createMockApp() {
  const { root, a, a1, b } = buildTree();
  const events = new Events();

  const vault = {
    root,
    findNode: vi.fn((id: string) => findNodeById(root, id)),
    isDescendant: vi.fn((ancestorId: string, nodeId: string) =>
      isDescendantOf(root, ancestorId, nodeId),
    ),
    moveNote: vi.fn(() => true),
    createNote: vi.fn(),
    renameNote: vi.fn(),
    deleteNote: vi.fn(),
  };

  const workspace = {
    focusView: vi.fn(),
  };

  const logger = {
    debug: vi.fn(),
    error: vi.fn(),
  };

  return {
    events,
    vault,
    workspace,
    logger,
    nodes: { root, a, a1, b },
  } as unknown;
}

/** Create a DragEvent with a mocked dataTransfer. */
function makeDragEvent(type: string, opts: Partial<DragEventInit> = {}): DragEvent {
  const dt = {
    effectAllowed: 'uninitialized' as string,
    dropEffect: 'none' as string,
    setData: vi.fn(),
    getData: vi.fn(() => ''),
  };
  // jsdom doesn't fully support DragEvent; use Event and attach dataTransfer
  const event = new Event(type, { bubbles: true, cancelable: true, ...opts });
  Object.defineProperty(event, 'dataTransfer', { value: dt });
  if (typeof opts.clientY === 'number') {
    Object.defineProperty(event, 'clientY', { value: opts.clientY });
  }
  return event as unknown as DragEvent;
}

describe('TreeView drag-and-drop', () => {
  let treeView: TreeView;
  let mockApp: ReturnType<typeof createMockApp>;
  let parentEl: HTMLElement;

  beforeEach(() => {
    parentEl = document.createElement('div');
    document.body.appendChild(parentEl);
    mockApp = createMockApp();
    // TreeView constructor calls View constructor which creates containerEl/contentEl
    treeView = new TreeView(mockApp as never, parentEl);
    treeView.load(); // triggers onOpen → renderTree
  });

  afterEach(() => {
    treeView.unload();
    parentEl.remove();
  });

  function getItemEl(nodeId: string): HTMLElement {
    const el = parentEl.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;
    expect(el).toBeTruthy();
    return el;
  }

  it('should make tree items draggable', () => {
    const itemA = getItemEl('a');
    expect(itemA.draggable).toBe(true);
  });

  it('should add dragging class on dragstart', () => {
    const itemA = getItemEl('a');
    const event = makeDragEvent('dragstart');
    itemA.dispatchEvent(event);
    expect(itemA.classList.contains('tree-view__item--dragging')).toBe(true);
  });

  it('should set dataTransfer.effectAllowed on dragstart', () => {
    const itemA = getItemEl('a');
    const event = makeDragEvent('dragstart');
    itemA.dispatchEvent(event);
    expect(event.dataTransfer!.effectAllowed).toBe('move');
  });

  it('should add drop-target class on valid dragover', () => {
    // Start dragging node B
    const itemB = getItemEl('b');
    itemB.dispatchEvent(makeDragEvent('dragstart'));

    // Dragover node A (valid target)
    const itemA = getItemEl('a');
    const dragover = makeDragEvent('dragover');
    itemA.dispatchEvent(dragover);
    expect(itemA.classList.contains('tree-view__item--drop-target')).toBe(true);
  });

  it('should not add drop-target class when dragging over self', () => {
    const itemA = getItemEl('a');
    itemA.dispatchEvent(makeDragEvent('dragstart'));

    const dragover = makeDragEvent('dragover');
    itemA.dispatchEvent(dragover);
    expect(itemA.classList.contains('tree-view__item--drop-target')).toBe(false);
  });

  it('should not add drop-target class when dragging over descendant', () => {
    // Start dragging node A (parent of A1)
    const itemA = getItemEl('a');
    itemA.dispatchEvent(makeDragEvent('dragstart'));

    // Dragover node A1 (descendant of A — invalid)
    const itemA1 = getItemEl('a1');
    const dragover = makeDragEvent('dragover');
    itemA1.dispatchEvent(dragover);
    expect(itemA1.classList.contains('tree-view__item--drop-target')).toBe(false);
  });

  it('should call vault.moveNote on valid drop', () => {
    const { vault } = mockApp as { vault: { moveNote: ReturnType<typeof vi.fn> } };

    // Drag B onto A
    getItemEl('b').dispatchEvent(makeDragEvent('dragstart'));
    const itemA = getItemEl('a');
    itemA.dispatchEvent(makeDragEvent('dragover', { clientY: 12 }));
    itemA.dispatchEvent(makeDragEvent('drop'));

    expect(vault.moveNote).toHaveBeenCalledWith('b', 'a');
  });

  it('should reorder before sibling on top-edge drop', () => {
    const { vault } = mockApp as { vault: { moveNote: ReturnType<typeof vi.fn> } };

    const itemA = getItemEl('a');
    Object.defineProperty(itemA, 'getBoundingClientRect', {
      value: () => ({ top: 100, height: 40, width: 0, left: 0, right: 0, bottom: 140, x: 0, y: 100, toJSON: () => ({}) }),
    });

    getItemEl('b').dispatchEvent(makeDragEvent('dragstart'));
    itemA.dispatchEvent(makeDragEvent('dragover', { clientY: 104 }));
    expect(itemA.classList.contains('tree-view__item--drop-before')).toBe(true);
    itemA.dispatchEvent(makeDragEvent('drop'));

    expect(vault.moveNote).toHaveBeenCalledWith('b', 'root', 0);
  });

  it('should reorder after sibling on bottom-edge drop', () => {
    const { vault } = mockApp as { vault: { moveNote: ReturnType<typeof vi.fn> } };

    const itemA = getItemEl('a');
    Object.defineProperty(itemA, 'getBoundingClientRect', {
      value: () => ({ top: 100, height: 40, width: 0, left: 0, right: 0, bottom: 140, x: 0, y: 100, toJSON: () => ({}) }),
    });

    getItemEl('b').dispatchEvent(makeDragEvent('dragstart'));
    itemA.dispatchEvent(makeDragEvent('dragover', { clientY: 138 }));
    expect(itemA.classList.contains('tree-view__item--drop-after')).toBe(true);
    itemA.dispatchEvent(makeDragEvent('drop'));

    expect(vault.moveNote).toHaveBeenCalledWith('b', 'root', 1);
  });

  it('should not call vault.moveNote when dropping on self', () => {
    const { vault } = mockApp as { vault: { moveNote: ReturnType<typeof vi.fn> } };

    const itemA = getItemEl('a');
    itemA.dispatchEvent(makeDragEvent('dragstart'));
    itemA.dispatchEvent(makeDragEvent('drop'));

    expect(vault.moveNote).not.toHaveBeenCalled();
  });

  it('should clean up drag state on dragend', () => {
    const itemA = getItemEl('a');
    itemA.dispatchEvent(makeDragEvent('dragstart'));
    expect(itemA.classList.contains('tree-view__item--dragging')).toBe(true);

    itemA.dispatchEvent(makeDragEvent('dragend'));
    expect(itemA.classList.contains('tree-view__item--dragging')).toBe(false);
  });

  it('should start auto-expand timer for collapsed nodes on dragover', () => {
    vi.useFakeTimers();
    const { nodes } = mockApp as { nodes: { a: NoteNode } };
    // Collapse node A (which has child A1)
    nodes.a.isExpanded = false;
    // Re-render tree to pick up the collapsed state
    treeView.unload();
    parentEl.innerHTML = '';
    treeView = new TreeView(mockApp as never, parentEl);
    treeView.load();

    // Drag B over collapsed A
    getItemEl('b').dispatchEvent(makeDragEvent('dragstart'));
    getItemEl('a').dispatchEvent(makeDragEvent('dragover', { clientY: 12 }));

    // Before 600ms, A should still be collapsed
    const vaultTyped = mockApp as { vault: { findNode: ReturnType<typeof vi.fn> } };
    expect(vaultTyped.vault.findNode('a')?.isExpanded).toBe(false);

    // After 600ms, auto-expand fires
    vi.advanceTimersByTime(600);
    // toggleExpand calls findNode and flips isExpanded
    expect(vaultTyped.vault.findNode('a')?.isExpanded).toBe(true);

    vi.useRealTimers();
  });

  it('should expand drop target parent after successful drop', () => {
    const { nodes } = mockApp as { nodes: { b: NoteNode } };
    // Collapse B (the drop target)
    nodes.b.isExpanded = false;

    // Drag A1 onto B
    getItemEl('a1').dispatchEvent(makeDragEvent('dragstart'));
    const itemB = getItemEl('b');
    itemB.dispatchEvent(makeDragEvent('dragover', { clientY: 12 }));
    itemB.dispatchEvent(makeDragEvent('drop'));

    expect(nodes.b.isExpanded).toBe(true);
  });

  it('should not call moveNote when dropping on current parent', () => {
    const { vault } = mockApp as { vault: { moveNote: ReturnType<typeof vi.fn> } };

    // A1's parent is A — dragging A1 onto A should be a no-op
    getItemEl('a1').dispatchEvent(makeDragEvent('dragstart'));
    const itemA = getItemEl('a');
    itemA.dispatchEvent(makeDragEvent('dragover', { clientY: 12 }));
    itemA.dispatchEvent(makeDragEvent('drop'));

    expect(vault.moveNote).not.toHaveBeenCalled();
  });
});

describe('TreeView delete confirmation', () => {
  let treeView: TreeView;
  let mockApp: ReturnType<typeof createMockApp>;
  let parentEl: HTMLElement;

  beforeEach(() => {
    parentEl = document.createElement('div');
    document.body.appendChild(parentEl);
    mockApp = createMockApp();
    treeView = new TreeView(mockApp as never, parentEl);
    treeView.load();
  });

  afterEach(() => {
    treeView.unload();
    parentEl.remove();
  });

  it('should show modal and cancel deletion', async () => {
    const app = mockApp as { vault: { deleteNote: ReturnType<typeof vi.fn> } };

    treeView.selectNode('a');
    const deletePromise = treeView.deleteSelectedNote();

    const modal = document.querySelector('.tree-view__modal-overlay');
    expect(modal).toBeTruthy();

    const cancelButton = document.querySelector('.tree-view__modal-btn') as HTMLButtonElement;
    expect(cancelButton.textContent).toBe('Cancel');
    cancelButton.click();

    await deletePromise;
    expect(app.vault.deleteNote).not.toHaveBeenCalled();
    expect(document.querySelector('.tree-view__modal-overlay')).toBeNull();
  });

  it('should delete note and clear active selection after confirmation', async () => {
    const app = mockApp as { vault: { deleteNote: ReturnType<typeof vi.fn> }; events: Events };
    const activeNoteChange = vi.fn();
    app.events.on('active-note-change', activeNoteChange);

    treeView.selectNode('a');
    const deletePromise = treeView.deleteSelectedNote();

    const deleteButton = document.querySelector(
      '.tree-view__modal-btn--danger',
    ) as HTMLButtonElement;
    expect(deleteButton).toBeTruthy();
    deleteButton.click();

    await deletePromise;
    expect(app.vault.deleteNote).toHaveBeenCalledWith('a');
    expect(activeNoteChange).toHaveBeenCalledWith(null);
    expect(document.querySelector('.tree-view__modal-overlay')).toBeNull();
  });
});
