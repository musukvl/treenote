import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDomExtensions } from '../../../src/renderer/helpers/dom';
import { EditorView } from '../../../src/renderer/views/EditorView';
import { Events } from '../../../src/renderer/core/Events';
import type { NoteNode } from '../../../src/renderer/models/NoteNode';

installDomExtensions();

function makeNode(id: string, name: string, content = ''): NoteNode {
  return {
    id,
    name,
    content,
    children: [],
    parentId: 'root',
    createdAt: 0,
    updatedAt: 0,
    isExpanded: true,
  };
}

function createMockApp() {
  const events = new Events();
  const vault = {
    renameNote: vi.fn(),
    updateContent: vi.fn(),
  };

  return {
    events,
    vault,
  } as const;
}

describe('EditorView', () => {
  let parentEl: HTMLElement;
  let editorView: EditorView;
  let mockApp: ReturnType<typeof createMockApp>;

  beforeEach(() => {
    parentEl = document.createElement('div');
    document.body.appendChild(parentEl);
    mockApp = createMockApp();
    editorView = new EditorView(mockApp as never, parentEl);
    editorView.load();
  });

  afterEach(() => {
    editorView.unload();
    parentEl.remove();
    vi.useRealTimers();
  });

  it('shows empty state until a note is selected', () => {
    const emptyEl = parentEl.querySelector('.editor-view__empty') as HTMLElement;
    const titleInput = parentEl.querySelector('.editor-view__title') as HTMLInputElement;
    const contentArea = parentEl.querySelector('.editor-view__content') as HTMLTextAreaElement;

    expect(emptyEl).toBeTruthy();
    expect(emptyEl.style.display).not.toBe('none');
    expect(titleInput.style.display).toBe('none');
    expect(contentArea.style.display).toBe('none');
  });

  it('loads active note and toggles editor fields visibility', () => {
    const node = makeNode('n1', 'My Note', 'My content');

    mockApp.events.trigger('active-note-change', node);

    const emptyEl = parentEl.querySelector('.editor-view__empty') as HTMLElement;
    const titleInput = parentEl.querySelector('.editor-view__title') as HTMLInputElement;
    const contentArea = parentEl.querySelector('.editor-view__content') as HTMLTextAreaElement;

    expect(emptyEl.style.display).toBe('none');
    expect(titleInput.style.display).toBe('block');
    expect(contentArea.style.display).toBe('block');
    expect(titleInput.value).toBe('My Note');
    expect(contentArea.value).toBe('My content');
  });

  it('renames active note on title input', () => {
    const node = makeNode('n1', 'Old title', '');
    mockApp.events.trigger('active-note-change', node);

    const titleInput = parentEl.querySelector('.editor-view__title') as HTMLInputElement;
    titleInput.value = 'New title';
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(mockApp.vault.renameNote).toHaveBeenCalledWith('n1', 'New title');
  });

  it('updates content with debounce for active note', () => {
    vi.useFakeTimers();
    const node = makeNode('n1', 'Title', '');
    mockApp.events.trigger('active-note-change', node);

    const contentArea = parentEl.querySelector('.editor-view__content') as HTMLTextAreaElement;
    contentArea.value = 'A';
    contentArea.dispatchEvent(new Event('input', { bubbles: true }));
    contentArea.value = 'AB';
    contentArea.dispatchEvent(new Event('input', { bubbles: true }));

    expect(mockApp.vault.updateContent).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(mockApp.vault.updateContent).toHaveBeenCalledTimes(1);
    expect(mockApp.vault.updateContent).toHaveBeenCalledWith('n1', 'AB');
  });

  it('reflects external note rename for active note', () => {
    const node = makeNode('n1', 'Title', '');
    mockApp.events.trigger('active-note-change', node);

    mockApp.events.trigger('note-renamed', 'n1', 'Renamed by tree');

    const titleInput = parentEl.querySelector('.editor-view__title') as HTMLInputElement;
    expect(titleInput.value).toBe('Renamed by tree');
  });

  it('clears editor when active note is deleted', () => {
    const node = makeNode('n1', 'Title', 'Body');
    mockApp.events.trigger('active-note-change', node);

    mockApp.events.trigger('note-deleted', 'n1');

    const emptyEl = parentEl.querySelector('.editor-view__empty') as HTMLElement;
    const titleInput = parentEl.querySelector('.editor-view__title') as HTMLInputElement;
    const contentArea = parentEl.querySelector('.editor-view__content') as HTMLTextAreaElement;

    expect(emptyEl.style.display).toBe('flex');
    expect(titleInput.style.display).toBe('none');
    expect(contentArea.style.display).toBe('none');
  });
});
