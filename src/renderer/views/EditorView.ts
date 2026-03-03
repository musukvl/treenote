import { View } from '../core/View';
import type { App } from '../core/App';
import type { NoteNode } from '../models/NoteNode';
import { createDiv, createEl } from '../helpers/dom';
import { debounce } from '../helpers/debounce';

/**
 * Note editor with title input and content textarea.
 */
export class EditorView extends View {
  private titleInput!: HTMLInputElement;
  private contentArea!: HTMLTextAreaElement;
  private emptyStateEl!: HTMLElement;
  private activeNodeId: string | null = null;
  private debouncedContentUpdate: ReturnType<typeof debounce>;

  constructor(app: App, parentEl: HTMLElement) {
    super(app, parentEl);
    this.debouncedContentUpdate = debounce((content: string) => {
      if (this.activeNodeId) {
        this.app.vault.updateContent(this.activeNodeId, content);
      }
    }, 300);
  }

  getViewType(): string {
    return 'editor';
  }

  getDisplayText(): string {
    return 'Editor';
  }

  async onOpen(): Promise<void> {
    this.emptyStateEl = createDiv({
      cls: 'editor-view__empty',
      text: 'Select a note to start editing',
      parent: this.contentEl,
    });

    this.titleInput = createEl('input', {
      cls: 'editor-view__title',
      attr: { type: 'text', placeholder: 'Note title...' },
      parent: this.contentEl,
    }) as HTMLInputElement;
    this.titleInput.style.display = 'none';

    this.contentArea = createEl('textarea', {
      cls: 'editor-view__content',
      attr: { placeholder: 'Start writing...' },
      parent: this.contentEl,
    }) as HTMLTextAreaElement;
    this.contentArea.style.display = 'none';

    // Listen for active note change
    this.registerEvent(
      this.app.events.on('active-note-change', (node) => this.loadNote(node)),
    );

    // Handle external rename
    this.registerEvent(
      this.app.events.on('note-renamed', (nodeId, newName) => {
        if (nodeId === this.activeNodeId) {
          this.titleInput.value = newName;
        }
      }),
    );

    // Handle note deletion
    this.registerEvent(
      this.app.events.on('note-deleted', (nodeId) => {
        if (nodeId === this.activeNodeId) {
          this.loadNote(null);
        }
      }),
    );

    // Title change
    this.registerDomEvent(this.titleInput, 'input', () => {
      if (this.activeNodeId) {
        this.app.vault.renameNote(this.activeNodeId, this.titleInput.value);
      }
    });

    // Content change (debounced)
    this.registerDomEvent(this.contentArea, 'input', () => {
      this.debouncedContentUpdate(this.contentArea.value);
    });

    this.register(() => this.debouncedContentUpdate.cancel());
  }

  focus(): void {
    if (this.activeNodeId) {
      this.contentArea?.focus();
    }
  }

  private loadNote(node: NoteNode | null): void {
    if (!node) {
      this.activeNodeId = null;
      this.titleInput.style.display = 'none';
      this.contentArea.style.display = 'none';
      this.emptyStateEl.style.display = 'flex';
      return;
    }

    this.activeNodeId = node.id;
    this.emptyStateEl.style.display = 'none';
    this.titleInput.style.display = 'block';
    this.contentArea.style.display = 'block';
    this.titleInput.value = node.name;
    this.contentArea.value = node.content;
  }
}
