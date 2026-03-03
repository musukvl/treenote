import { Component } from './Component';
import type { App } from './App';
import { createDiv } from '../helpers/dom';

/**
 * Abstract base class for all views (panels).
 * Mirrors Obsidian's ItemView with two-level DOM structure.
 */
export abstract class View extends Component {
  readonly app: App;

  /** Outer wrapper element for this view. */
  readonly containerEl: HTMLElement;

  /** Inner content element where the view renders. */
  readonly contentEl: HTMLElement;

  constructor(app: App, parentEl: HTMLElement) {
    super();
    this.app = app;

    this.containerEl = createDiv({
      cls: `view-container view-container--${this.getViewType()}`,
      parent: parentEl,
    });
    this.contentEl = createDiv({
      cls: 'view-content',
      parent: this.containerEl,
    });
  }

  /** Unique string identifier for this view type. */
  abstract getViewType(): string;

  /** Human-readable display name. */
  abstract getDisplayText(): string;

  /** Called when the view should take focus. */
  abstract focus(): void;

  /** Override for async initialization after DOM is ready. */
  async onOpen(): Promise<void> {
    // Subclasses override this
  }

  /** Override for cleanup before view is removed. */
  async onClose(): Promise<void> {
    // Subclasses override this
  }

  onload(): void {
    this.onOpen();
  }

  onunload(): void {
    this.onClose();
    this.containerEl.remove();
  }
}
