import type { App } from '../../core/App';
import type { NoteNode } from '../../models/NoteNode';

type DropPosition = 'inside' | 'before' | 'after';

type RegisterItemEvent = (type: string, handler: EventListener) => void;

interface TreeDragDropControllerOptions {
  app: App;
  nodeElements: Map<string, HTMLElement>;
  toggleExpand: (nodeId: string) => void;
  selectNode: (nodeId: string) => void;
}

/**
 * Handles drag-and-drop state and behavior for tree items.
 */
export class TreeDragDropController {
  private readonly app: App;
  private readonly nodeElements: Map<string, HTMLElement>;
  private readonly toggleExpand: (nodeId: string) => void;
  private readonly selectNode: (nodeId: string) => void;

  private draggedNodeId: string | null = null;
  private dropTargetId: string | null = null;
  private dropPosition: DropPosition | null = null;
  private dragExpandTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: TreeDragDropControllerOptions) {
    this.app = options.app;
    this.nodeElements = options.nodeElements;
    this.toggleExpand = options.toggleExpand;
    this.selectNode = options.selectNode;
  }

  registerItem(itemEl: HTMLElement, node: NoteNode, register: RegisterItemEvent): void {
    itemEl.draggable = true;

    register('dragstart', (event: Event) => {
      const e = event as DragEvent;
      this.draggedNodeId = node.id;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', node.id);
      }
      itemEl.addClass('tree-view__item--dragging');
    });

    register('dragover', (event: Event) => {
      const e = event as DragEvent;
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

    register('dragleave', (event: Event) => {
      const e = event as DragEvent;
      if (!itemEl.contains(e.relatedTarget as Node)) {
        if (this.dropTargetId === node.id) {
          this.clearDropTarget();
        }
      }
    });

    register('drop', (event: Event) => {
      const e = event as DragEvent;
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

    register('dragend', () => {
      this.cleanupDrag();
    });
  }

  dispose(): void {
    this.cleanupDrag();
  }

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

  private applyDropTargetClass(itemEl: HTMLElement, position: DropPosition): void {
    if (position === 'inside') {
      itemEl.addClass('tree-view__item--drop-target');
      return;
    }

    itemEl.addClass(position === 'before' ? 'tree-view__item--drop-before' : 'tree-view__item--drop-after');
  }

  private getDropPosition(itemEl: HTMLElement, clientY: number): DropPosition {
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
}
