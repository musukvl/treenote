import { createDiv, createEl } from '../../helpers/dom';

/**
 * Lightweight async confirmation modal used by TreeView delete action.
 */
export class DeleteConfirmationModal {
  private activeModalEl: HTMLElement | null = null;

  show(message: string): Promise<boolean> {
    this.activeModalEl?.remove();

    const overlayEl = createDiv({ cls: 'tree-view__modal-overlay' });
    const modalEl = createDiv({ cls: 'tree-view__modal', parent: overlayEl });
    createDiv({ cls: 'tree-view__modal-title', text: 'Delete note', parent: modalEl });
    createDiv({ cls: 'tree-view__modal-message', text: message, parent: modalEl });

    const actionsEl = createDiv({ cls: 'tree-view__modal-actions', parent: modalEl });
    const cancelButtonEl = createEl('button', {
      cls: 'tree-view__modal-btn',
      text: 'Cancel',
      parent: actionsEl,
    }) as HTMLButtonElement;
    cancelButtonEl.type = 'button';

    const deleteButtonEl = createEl('button', {
      cls: 'tree-view__modal-btn tree-view__modal-btn--danger',
      text: 'Delete',
      parent: actionsEl,
    }) as HTMLButtonElement;
    deleteButtonEl.type = 'button';

    document.body.appendChild(overlayEl);
    this.activeModalEl = overlayEl;

    return new Promise((resolve) => {
      const cleanup = (): void => {
        document.removeEventListener('keydown', handleKeydown);
        overlayEl.remove();
        if (this.activeModalEl === overlayEl) {
          this.activeModalEl = null;
        }
      };

      const finish = (result: boolean): void => {
        cleanup();
        resolve(result);
      };

      const handleKeydown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      };

      cancelButtonEl.addEventListener('click', () => finish(false));
      deleteButtonEl.addEventListener('click', () => finish(true));
      overlayEl.addEventListener('click', (e) => {
        if (e.target === overlayEl) {
          finish(false);
        }
      });

      document.addEventListener('keydown', handleKeydown);
      deleteButtonEl.focus();
    });
  }

  dispose(): void {
    this.activeModalEl?.remove();
    this.activeModalEl = null;
  }
}
