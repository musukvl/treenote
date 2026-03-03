import { View } from '../core/View';
import type { App } from '../core/App';
import type { NoteNode } from '../models/NoteNode';
import { createDiv, createSpan, createEl } from '../helpers/dom';
import { countDescendants } from '../helpers/tree-utils';

/**
 * Hierarchical tree panel with expand/collapse, keyboard navigation,
 * inline rename, and context menu.
 */
export class TreeView extends View {
  private treeContainerEl!: HTMLElement;
  private selectedNodeId: string | null = null;
  private nodeElements: Map<string, HTMLElement> = new Map();
  private draggedNodeId: string | null = null;
  private dropTargetId: string | null = null;
  private dropPosition: 'inside' | 'before' | 'after' | null = null;
  private dragExpandTimer: ReturnType<typeof setTimeout> | null = null;
  private activeModalEl: HTMLElement | null = null;

  getViewType(): string {
    return 'tree';
  }

  getDisplayText(): string {
    return 'Notes';
  }

  async onOpen(): Promise<void> {
    const headerEl = createDiv({ cls: 'tree-view__header', parent: this.contentEl });
    createSpan({ cls: 'tree-view__title', text: 'Notes', parent: headerEl });

    this.treeContainerEl = createDiv({ cls: 'tree-view__container', parent: this.contentEl });
    this.treeContainerEl.setAttribute('tabindex', '0');
    this.treeContainerEl.setAttribute('role', 'tree');

    this.renderTree();

    this.registerEvent(this.app.events.on('tree-changed', () => this.renderTree()));
    this.registerEvent(this.app.events.on('data-loaded', () => this.renderTree()));
    this.registerDomEvent(this.treeContainerEl, 'keydown', this.handleKeydown.bind(this));
    this.registerDomEvent(this.treeContainerEl, 'contextmenu', this.handleContextMenu.bind(this));
  }

  focus(): void {
    this.treeContainerEl?.focus();
  }

  private renderTree(): void {
    this.treeContainerEl.empty();
    this.nodeElements.clear();
    const root = this.app.vault.root;
    if (!root) return;

    for (const child of root.children) {
      this.renderNode(child, this.treeContainerEl, 0);
    }

    if (this.selectedNodeId) {
      this.highlightNode(this.selectedNodeId);
    }
  }

  private renderNode(node: NoteNode, parentEl: HTMLElement, depth: number): void {
    const itemEl = createDiv({ cls: 'tree-view__item', parent: parentEl });
    itemEl.dataset.nodeId = node.id;
    itemEl.setAttribute('role', 'treeitem');
    itemEl.setAttribute('aria-level', String(depth + 1));
    itemEl.setAttribute('aria-expanded', String(node.isExpanded));
    itemEl.style.paddingLeft = `${depth * 16 + 4}px`;

    // Expand/collapse chevron
    const chevronEl = createSpan({ cls: 'tree-view__chevron', parent: itemEl });
    if (node.children.length > 0) {
      chevronEl.addClass(
        node.isExpanded ? 'tree-view__chevron--expanded' : 'tree-view__chevron--collapsed',
      );
      this.registerDomEvent(chevronEl, 'click', (e) => {
        e.stopPropagation();
        this.toggleExpand(node.id);
      });
    } else {
      chevronEl.addClass('tree-view__chevron--leaf');
    }

    // Node label
    const labelEl = createSpan({ cls: 'tree-view__label', text: node.name, parent: itemEl });

    // Click to select
    this.registerDomEvent(itemEl, 'click', () => this.selectNode(node.id));

    // Double click to rename
    this.registerDomEvent(itemEl, 'dblclick', () => this.startInlineRename(node.id, labelEl));

    // Drag and drop
    itemEl.draggable = true;
    this.registerDomEvent(itemEl, 'dragstart', (e: DragEvent) => {
      this.draggedNodeId = node.id;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', node.id);
      }
      itemEl.addClass('tree-view__item--dragging');
    });

    this.registerDomEvent(itemEl, 'dragover', (e: DragEvent) => {
      if (!this.draggedNodeId || this.draggedNodeId === node.id) {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
        return;
      }
      if (this.app.vault.isDescendant(this.draggedNodeId, node.id)) {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
        return;
      }
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

      const position = this.getDropPosition(itemEl, e.clientY);
      if (this.dropTargetId !== node.id || this.dropPosition !== position) {
        this.clearDropTarget();
        this.dropTargetId = node.id;
        this.dropPosition = position;
        this.applyDropTargetClass(itemEl, position);

        if (position === 'inside' && node.children.length > 0 && !node.isExpanded) {
          this.dragExpandTimer = setTimeout(() => {
            this.toggleExpand(node.id);
          }, 600);
        }
      }
    });

    this.registerDomEvent(itemEl, 'dragleave', (e: DragEvent) => {
      // Only clear if leaving this item (not entering a child)
      if (!itemEl.contains(e.relatedTarget as Node)) {
        if (this.dropTargetId === node.id) {
          this.clearDropTarget();
        }
      }
    });

    this.registerDomEvent(itemEl, 'drop', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.draggedNodeId || this.draggedNodeId === node.id) return;

      const movedId = this.draggedNodeId;
      const position = this.dropTargetId === node.id ? this.dropPosition : 'inside';

      let success = false;
      if (position === 'inside') {
        const draggedNode = this.app.vault.findNode(movedId);
        if (draggedNode && draggedNode.parentId === node.id) {
          this.cleanupDrag();
          return;
        }
        node.isExpanded = true;
        success = this.app.vault.moveNote(movedId, node.id);
      } else {
        const parentId = node.parentId;
        if (!parentId) {
          this.cleanupDrag();
          return;
        }
        const parent = this.app.vault.findNode(parentId);
        if (!parent) {
          this.cleanupDrag();
          return;
        }
        const targetNodeIndex = parent.children.findIndex((child) => child.id === node.id);
        if (targetNodeIndex < 0) {
          this.cleanupDrag();
          return;
        }
        const targetIndex = position === 'before' ? targetNodeIndex : targetNodeIndex + 1;
        success = this.app.vault.moveNote(movedId, parentId, targetIndex);
      }

      if (success) {
        this.selectNode(movedId);
      }
      this.cleanupDrag();
    });

    this.registerDomEvent(itemEl, 'dragend', () => {
      this.cleanupDrag();
    });

    this.nodeElements.set(node.id, itemEl);

    // Render children if expanded
    if (node.isExpanded && node.children.length > 0) {
      const childrenEl = createDiv({ cls: 'tree-view__children', parent: parentEl });
      childrenEl.setAttribute('role', 'group');
      for (const child of node.children) {
        this.renderNode(child, childrenEl, depth + 1);
      }
    }
  }

  selectNode(nodeId: string): void {
    this.selectedNodeId = nodeId;
    this.highlightNode(nodeId);
    const node = this.app.vault.findNode(nodeId);
    this.app.events.trigger('active-note-change', node);
  }

  private highlightNode(nodeId: string): void {
    for (const el of this.nodeElements.values()) {
      el.removeClass('tree-view__item--selected');
    }
    const el = this.nodeElements.get(nodeId);
    if (el) {
      el.addClass('tree-view__item--selected');
    }
  }

  private toggleExpand(nodeId: string): void {
    const node = this.app.vault.findNode(nodeId);
    if (node) {
      node.isExpanded = !node.isExpanded;
      this.renderTree();
    }
  }

  private startInlineRename(nodeId: string, labelEl: HTMLElement): void {
    const node = this.app.vault.findNode(nodeId);
    if (!node) return;

    const input = createEl('input', { cls: 'tree-view__rename-input' }) as HTMLInputElement;
    input.type = 'text';
    input.value = node.name;
    labelEl.replaceWith(input);
    input.focus();
    input.select();

    const finish = (): void => {
      const newName = input.value.trim() || node.name;
      this.app.vault.renameNote(nodeId, newName);
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish();
      if (e.key === 'Escape') this.renderTree();
    });
  }

  private handleKeydown(e: KeyboardEvent): void {
    const items = Array.from(this.nodeElements.entries());
    const currentIndex = items.findIndex(([id]) => id === this.selectedNodeId);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          this.selectNode(items[currentIndex + 1][0]);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          this.selectNode(items[currentIndex - 1][0]);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (this.selectedNodeId) {
          const node = this.app.vault.findNode(this.selectedNodeId);
          if (node && node.children.length > 0 && !node.isExpanded) {
            this.toggleExpand(this.selectedNodeId);
          }
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (this.selectedNodeId) {
          const node = this.app.vault.findNode(this.selectedNodeId);
          if (node && node.isExpanded) {
            this.toggleExpand(this.selectedNodeId);
          } else if (node?.parentId) {
            this.selectNode(node.parentId);
          }
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (this.selectedNodeId) {
          this.app.workspace.focusView('editor');
        }
        break;
    }
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    const target = (e.target as HTMLElement).closest('.tree-view__item') as HTMLElement;
    if (!target) return;
    const nodeId = target.dataset.nodeId;
    if (!nodeId) return;
    this.selectNode(nodeId);
    this.showContextMenu(e.clientX, e.clientY);
  }

  private showContextMenu(x: number, y: number): void {
    document.querySelector('.context-menu')?.remove();

    const menu = createDiv({ cls: 'context-menu' });
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const items = [
      { label: 'New Note', action: () => this.createSiblingNote() },
      { label: 'New Child Note', action: () => this.createChildNote() },
      { label: 'Rename', action: () => this.renameSelectedNote() },
      { label: 'Delete', action: () => void this.deleteSelectedNote() },
    ];

    for (const item of items) {
      const itemEl = createDiv({ cls: 'context-menu__item', text: item.label, parent: menu });
      itemEl.addEventListener('click', () => {
        item.action();
        menu.remove();
      });
    }

    document.body.appendChild(menu);

    const closeHandler = (ev: MouseEvent): void => {
      if (!menu.contains(ev.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    requestAnimationFrame(() => document.addEventListener('click', closeHandler));
  }

  // --- Drag helpers ---

  private clearDropTarget(): void {
    if (this.dropTargetId) {
      const el = this.nodeElements.get(this.dropTargetId);
      if (el) {
        el.removeClass('tree-view__item--drop-target');
        el.removeClass('tree-view__item--drop-before');
        el.removeClass('tree-view__item--drop-after');
      }
      this.dropTargetId = null;
      this.dropPosition = null;
    }
    if (this.dragExpandTimer) {
      clearTimeout(this.dragExpandTimer);
      this.dragExpandTimer = null;
    }
  }

  private applyDropTargetClass(itemEl: HTMLElement, position: 'inside' | 'before' | 'after'): void {
    if (position === 'inside') {
      itemEl.addClass('tree-view__item--drop-target');
      return;
    }
    itemEl.addClass(position === 'before' ? 'tree-view__item--drop-before' : 'tree-view__item--drop-after');
  }

  private getDropPosition(itemEl: HTMLElement, clientY: number): 'inside' | 'before' | 'after' {
    const rect = itemEl.getBoundingClientRect();
    if (rect.height <= 0) return 'inside';

    const relativeY = clientY - rect.top;
    const edgeThreshold = rect.height * 0.25;
    if (relativeY <= edgeThreshold) return 'before';
    if (relativeY >= rect.height - edgeThreshold) return 'after';
    return 'inside';
  }

  private cleanupDrag(): void {
    if (this.draggedNodeId) {
      const el = this.nodeElements.get(this.draggedNodeId);
      if (el) el.removeClass('tree-view__item--dragging');
    }
    this.clearDropTarget();
    this.draggedNodeId = null;
  }

  // --- Public action methods ---

  createSiblingNote(): void {
    const root = this.app.vault.root;
    if (!root) return;
    const parentId = this.selectedNodeId
      ? (this.app.vault.findNode(this.selectedNodeId)?.parentId ?? root.id)
      : root.id;
    const node = this.app.vault.createNote(parentId, 'New Note');
    this.selectNode(node.id);
    const el = this.nodeElements.get(node.id);
    const label = el?.querySelector('.tree-view__label') as HTMLElement;
    if (label) this.startInlineRename(node.id, label);
  }

  createChildNote(): void {
    const root = this.app.vault.root;
    if (!root) return;
    const parentId = this.selectedNodeId ?? root.id;
    const parent = this.app.vault.findNode(parentId);
    if (parent) parent.isExpanded = true;
    const node = this.app.vault.createNote(parentId, 'New Note');
    this.selectNode(node.id);
    const el = this.nodeElements.get(node.id);
    const label = el?.querySelector('.tree-view__label') as HTMLElement;
    if (label) this.startInlineRename(node.id, label);
  }

  renameSelectedNote(): void {
    if (!this.selectedNodeId) return;
    const el = this.nodeElements.get(this.selectedNodeId);
    const label = el?.querySelector('.tree-view__label') as HTMLElement;
    if (label) this.startInlineRename(this.selectedNodeId, label);
  }

  async deleteSelectedNote(): Promise<void> {
    if (!this.selectedNodeId) return;
    const node = this.app.vault.findNode(this.selectedNodeId);
    if (!node) return;

    const childCount = countDescendants(node);
    const msg =
      childCount > 0
        ? `Delete "${node.name}" and ${childCount} child note(s)?`
        : `Delete "${node.name}"?`;

    const shouldDelete = await this.showDeleteConfirmation(msg);
    if (shouldDelete) {
      this.app.vault.deleteNote(this.selectedNodeId);
      this.selectedNodeId = null;
      this.app.events.trigger('active-note-change', null);
    }
  }

  private showDeleteConfirmation(message: string): Promise<boolean> {
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

  override onUnload(): void {
    this.activeModalEl?.remove();
    this.activeModalEl = null;
  }
}
