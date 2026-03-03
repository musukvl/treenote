import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDomExtensions } from '../../../src/renderer/helpers/dom';
import { SearchView } from '../../../src/renderer/views/SearchView';
import { Events } from '../../../src/renderer/core/Events';
import type { NoteNode } from '../../../src/renderer/models/NoteNode';

installDomExtensions();

function makeNode(
  id: string,
  name: string,
  parentId: string | null,
  content = '',
  children: NoteNode[] = [],
): NoteNode {
  return {
    id,
    name,
    content,
    children,
    parentId,
    createdAt: 0,
    updatedAt: 0,
    isExpanded: true,
  };
}

function createMockApp() {
  const root = makeNode('root', 'Root', null, '', [
    makeNode('a', 'Alpha', 'root', 'Alpha content'),
    makeNode('b', 'Beta', 'root', 'Contains keyword snippet for testing'),
  ]);

  const events = new Events();
  const workspace = {
    focusView: vi.fn(),
    treeView: {
      selectNode: vi.fn(),
    },
  };

  return {
    events,
    workspace,
    vault: { root },
  } as const;
}

describe('SearchView', () => {
  let parentEl: HTMLElement;
  let searchView: SearchView;
  let mockApp: ReturnType<typeof createMockApp>;

  beforeEach(() => {
    parentEl = document.createElement('div');
    document.body.appendChild(parentEl);
    mockApp = createMockApp();
    searchView = new SearchView(mockApp as never, parentEl);
    searchView.load();
  });

  afterEach(() => {
    searchView.unload();
    parentEl.remove();
  });

  it('renders no results and empty count for empty query', () => {
    const resultsSpy = vi.fn();
    mockApp.events.on('search-results', resultsSpy);

    const input = parentEl.querySelector('.search-view__input') as HTMLInputElement;
    input.value = '   ';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const count = parentEl.querySelector('.search-view__count') as HTMLElement;
    const resultItems = parentEl.querySelectorAll('.search-view__result');

    expect(count.textContent).toBe('');
    expect(resultItems.length).toBe(0);
    expect(resultsSpy).toHaveBeenCalledWith([]);
  });

  it('searches by note name and content and emits results', () => {
    const resultsSpy = vi.fn();
    mockApp.events.on('search-results', resultsSpy);

    const input = parentEl.querySelector('.search-view__input') as HTMLInputElement;
    input.value = 'alpha';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const count = parentEl.querySelector('.search-view__count') as HTMLElement;
    const resultItems = parentEl.querySelectorAll('.search-view__result');

    expect(count.textContent).toBe('1 result');
    expect(resultItems.length).toBe(1);
    expect(parentEl.textContent).toContain('Alpha');
    expect(resultsSpy).toHaveBeenCalled();

    input.value = 'keyword';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const snippet = parentEl.querySelector('.search-view__result-snippet') as HTMLElement;
    expect(snippet).toBeTruthy();
    expect(snippet.textContent?.toLowerCase()).toContain('keyword');
  });

  it('selects result and focuses editor on click', () => {
    const input = parentEl.querySelector('.search-view__input') as HTMLInputElement;
    input.value = 'beta';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const result = parentEl.querySelector('.search-view__result') as HTMLElement;
    result.click();

    expect(mockApp.workspace.treeView.selectNode).toHaveBeenCalledWith('b');
    expect(mockApp.workspace.focusView).toHaveBeenCalledWith('editor');
  });

  it('handles escape key by clearing query and focusing tree', () => {
    const input = parentEl.querySelector('.search-view__input') as HTMLInputElement;
    input.value = 'beta';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    const count = parentEl.querySelector('.search-view__count') as HTMLElement;
    expect(input.value).toBe('');
    expect(count.textContent).toBe('');
    expect(mockApp.workspace.focusView).toHaveBeenCalledWith('tree');
  });

  it('focuses first result on ArrowDown from input', () => {
    const input = parentEl.querySelector('.search-view__input') as HTMLInputElement;
    input.value = 'beta';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const firstResult = parentEl.querySelector('.search-view__result') as HTMLElement;
    expect(document.activeElement).toBe(firstResult);
  });

  it('refreshes results when tree changes while query is active', () => {
    const input = parentEl.querySelector('.search-view__input') as HTMLInputElement;
    input.value = 'beta';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const root = mockApp.vault.root;
    root.children.push(makeNode('c', 'Beta Child', 'root', 'new'));

    mockApp.events.trigger('tree-changed');

    const count = parentEl.querySelector('.search-view__count') as HTMLElement;
    expect(count.textContent).toBe('2 results');
  });
});
