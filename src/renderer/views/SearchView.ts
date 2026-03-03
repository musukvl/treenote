import { View } from '../core/View';
import type { App } from '../core/App';
import type { NoteNode } from '../models/NoteNode';
import { createDiv, createEl, createSpan } from '../helpers/dom';
import { flattenTree } from '../helpers/tree-utils';

/**
 * Search panel with input and results list.
 * Searches both note names and content (case-insensitive).
 */
export class SearchView extends View {
  private inputEl!: HTMLInputElement;
  private resultsEl!: HTMLElement;
  private resultCountEl!: HTMLElement;

  getViewType(): string {
    return 'search';
  }

  getDisplayText(): string {
    return 'Search';
  }

  async onOpen(): Promise<void> {
    const searchBarEl = createDiv({ cls: 'search-view__bar', parent: this.contentEl });
    this.inputEl = createEl('input', {
      cls: 'search-view__input',
      attr: { type: 'text', placeholder: 'Search notes...' },
      parent: searchBarEl,
    }) as HTMLInputElement;
    this.resultCountEl = createSpan({ cls: 'search-view__count', parent: searchBarEl });

    this.resultsEl = createDiv({ cls: 'search-view__results', parent: this.contentEl });

    this.registerDomEvent(this.inputEl, 'input', () => this.performSearch());

    this.registerDomEvent(this.inputEl, 'keydown', (e) => {
      if (e.key === 'Escape') {
        this.inputEl.value = '';
        this.performSearch();
        this.app.workspace.focusView('tree');
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const first = this.resultsEl.querySelector('.search-view__result') as HTMLElement;
        first?.focus();
      }
    });

    this.registerEvent(
      this.app.events.on('tree-changed', () => {
        if (this.inputEl.value) this.performSearch();
      }),
    );
  }

  focus(): void {
    this.inputEl?.focus();
  }

  focusInput(): void {
    this.inputEl?.focus();
    this.inputEl?.select();
  }

  private performSearch(): void {
    const query = this.inputEl.value.trim().toLowerCase();
    this.resultsEl.empty();

    if (!query) {
      this.resultCountEl.textContent = '';
      this.app.events.trigger('search-results', []);
      return;
    }

    const root = this.app.vault.root;
    if (!root) return;

    const allNodes = flattenTree(root);
    // Skip the root node itself from results
    const results = allNodes
      .filter((node) => node.parentId !== null)
      .filter(
        (node) =>
          node.name.toLowerCase().includes(query) ||
          node.content.toLowerCase().includes(query),
      );

    this.resultCountEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;

    for (const node of results) {
      const resultEl = createDiv({
        cls: 'search-view__result',
        parent: this.resultsEl,
      });
      resultEl.setAttribute('tabindex', '0');

      createSpan({ cls: 'search-view__result-name', text: node.name, parent: resultEl });

      // Show content snippet if content matches
      if (node.content.toLowerCase().includes(query)) {
        const idx = node.content.toLowerCase().indexOf(query);
        const start = Math.max(0, idx - 30);
        const end = Math.min(node.content.length, idx + query.length + 30);
        let snippet = node.content.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < node.content.length) snippet = snippet + '...';
        const snippetEl = createSpan({
          cls: 'search-view__result-snippet',
          parent: resultEl,
        });
        snippetEl.textContent = snippet;
      }

      this.registerDomEvent(resultEl, 'click', () => {
        this.app.workspace.treeView.selectNode(node.id);
        this.app.workspace.focusView('editor');
      });

      this.registerDomEvent(resultEl, 'keydown', (e) => {
        if (e.key === 'Enter') {
          this.app.workspace.treeView.selectNode(node.id);
          this.app.workspace.focusView('editor');
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          (resultEl.nextElementSibling as HTMLElement)?.focus();
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = resultEl.previousElementSibling as HTMLElement;
          if (prev) prev.focus();
          else this.inputEl.focus();
        }
      });
    }

    this.app.events.trigger('search-results', results);
  }
}
