import { Component } from '../core/Component';
import type { App } from '../core/App';
import type { NoteNode } from '../models/NoteNode';
import { createSpan } from '../helpers/dom';

/**
 * Bottom status bar showing save status and note count.
 */
export class StatusBar extends Component {
  private app: App;
  private containerEl: HTMLElement;
  private saveStatusEl!: HTMLElement;
  private noteCountEl!: HTMLElement;

  constructor(app: App, parentEl: HTMLElement) {
    super();
    this.app = app;
    this.containerEl = parentEl;
  }

  onload(): void {
    this.containerEl.addClass('status-bar');
    this.saveStatusEl = createSpan({
      cls: 'status-bar__save-status',
      text: 'Saved',
      parent: this.containerEl,
    });
    this.noteCountEl = createSpan({
      cls: 'status-bar__note-count',
      parent: this.containerEl,
    });

    this.registerEvent(
      this.app.events.on('save-status-change', async (status) => {
        const labels: Record<string, string> = {
          saved: 'Saved',
          unsaved: 'Unsaved changes',
          saving: 'Saving...',
          error: 'Save failed!',
        };
        const label = labels[status] ?? status;
        if (status === 'saved') {
          const filePath = await window.api.getFilePath();
          this.saveStatusEl.textContent = `${label} — ${filePath}`;
        } else {
          this.saveStatusEl.textContent = label;
        }
        this.saveStatusEl.className = `status-bar__save-status status-bar__save-status--${status}`;
      }),
    );

    this.registerEvent(
      this.app.events.on('tree-changed', () => this.updateNoteCount()),
    );
    this.registerEvent(
      this.app.events.on('data-loaded', () => this.updateNoteCount()),
    );
  }

  private updateNoteCount(): void {
    const root = this.app.vault.root;
    if (!root) return;
    let count = -1; // Exclude root itself
    const walk = (node: NoteNode): void => {
      count++;
      node.children.forEach(walk);
    };
    walk(root);
    this.noteCountEl.textContent = `${count} note${count !== 1 ? 's' : ''}`;
  }
}
