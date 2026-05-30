import { Component } from './Component';
import type { App } from './App';
import type { StorageAdapter } from './StorageAdapter';
import type { NoteNode, TreeData } from '../models/NoteNode';
import { createNoteNode, createWelcomeData } from '../models/NoteNode';
import { validateTreeData } from '../models/validate';
import { removeNodeById, insertNode } from '../helpers/tree-utils';
import { debounce } from '../helpers/debounce';

const AUTO_SAVE_DELAY = 2000;

/**
 * Data persistence layer.
 * Manages the note tree in memory and coordinates with the main process for file I/O.
 */
export class Vault extends Component {
  private app: App;
  private storage: StorageAdapter;
  private _data: TreeData | null = null;
  private _dirty = false;
  private _debouncedSave: ReturnType<typeof debounce>;
  private _index: Map<string, NoteNode> = new Map();

  constructor(app: App, storage: StorageAdapter) {
    super();
    this.app = app;
    this.storage = storage;
    this._debouncedSave = debounce(() => this.save(), AUTO_SAVE_DELAY);
  }

  get root(): NoteNode | null {
    return this._data?.root ?? null;
  }

  get data(): TreeData | null {
    return this._data;
  }

  get isDirty(): boolean {
    return this._dirty;
  }

  onload(): void {
    this.register(() => {
      this._debouncedSave.cancel();
    });
  }

  /** Load data from file via IPC. Creates welcome data if no file exists. */
  async loadData(): Promise<void> {
    this.app.logger.debug('Vault', 'Loading data...');
    try {
      const raw = await this.storage.load();
      if (raw) {
        const parsed = JSON.parse(raw);
        const validated = validateTreeData(parsed);
        if (validated) {
          this._data = validated;
          this.app.logger.debug('Vault', `Loaded ${this.countNodes()} notes.`);
        } else {
          this.app.logger.error('Vault', 'Invalid data file structure, creating fresh data.');
          this._data = createWelcomeData();
          this._dirty = true;
          await this.save();
        }
      } else {
        this._data = createWelcomeData();
        this._dirty = true;
        await this.save();
        this.app.logger.debug('Vault', 'Created welcome note.');
      }
      this.rebuildIndex();
      this.app.events.trigger('data-loaded', this._data);
    } catch (err) {
      this.app.logger.error('Vault', 'Failed to load data', err);
      this._data = createWelcomeData();
      this.rebuildIndex();
      this.app.events.trigger('data-loaded', this._data);
    }
  }

  // --- CRUD Operations ---

  createNote(parentId: string, name: string): NoteNode {
    const parent = this.findNode(parentId);
    if (!parent) throw new Error(`Parent node not found: ${parentId}`);
    const node = createNoteNode(name, parentId);
    parent.children.push(node);
    this.indexNode(node);
    this.markDirty();
    this.app.events.trigger('note-created', node);
    this.app.events.trigger('tree-changed');
    return node;
  }

  renameNote(nodeId: string, newName: string): void {
    const node = this.findNode(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    node.name = newName;
    node.updatedAt = Date.now();
    this.markDirty();
    this.app.events.trigger('note-renamed', nodeId, newName);
    this.app.events.trigger('tree-changed');
  }

  updateContent(nodeId: string, content: string): void {
    const node = this.findNode(nodeId);
    if (!node) return;
    node.content = content;
    node.updatedAt = Date.now();
    this.markDirty();
    this.app.events.trigger('note-content-changed', nodeId, content);
  }

  deleteNote(nodeId: string): boolean {
    if (!this._data) return false;
    if (nodeId === this._data.root.id) return false;
    const node = this.findNode(nodeId);
    const removed = removeNodeById(this._data.root, nodeId);
    if (removed) {
      if (node) this.unindexNode(node);
      this.markDirty();
      this.app.events.trigger('note-deleted', nodeId);
      this.app.events.trigger('tree-changed');
    }
    return removed;
  }

  moveNote(nodeId: string, newParentId: string, newIndex?: number): boolean {
    if (!this._data) return false;
    const node = this.findNode(nodeId);
    if (!node) return false;
    if (this.isDescendant(nodeId, newParentId)) return false;

    const previousParentId = node.parentId;
    const previousParent = previousParentId ? this.findNode(previousParentId) : null;
    const originalIndex = previousParent
      ? previousParent.children.findIndex((child) => child.id === nodeId)
      : -1;

    const removed = removeNodeById(this._data.root, nodeId);
    if (!removed) return false;

    let targetIndex = newIndex;
    if (targetIndex !== undefined && previousParentId === newParentId && originalIndex >= 0) {
      if (targetIndex > originalIndex) {
        targetIndex -= 1;
      }
    }

    const success = insertNode(this._data.root, newParentId, node, targetIndex);
    if (success) {
      node.parentId = newParentId;
      const parent = this.findNode(newParentId);
      const finalIndex = parent
        ? parent.children.findIndex((child) => child.id === nodeId)
        : undefined;
      this.markDirty();
      this.app.events.trigger('note-moved', nodeId, newParentId, finalIndex);
      this.app.events.trigger('tree-changed');
      return true;
    }

    if (previousParentId) {
      insertNode(this._data.root, previousParentId, node);
    }
    return false;
  }

  findNode(nodeId: string): NoteNode | null {
    if (!this._data) return null;
    return this._index.get(nodeId) ?? null;
  }

  // --- Index ---

  private rebuildIndex(): void {
    this._index.clear();
    if (!this._data) return;
    const walk = (node: NoteNode): void => {
      this._index.set(node.id, node);
      for (const child of node.children) walk(child);
    };
    walk(this._data.root);
  }

  private indexNode(node: NoteNode): void {
    this._index.set(node.id, node);
    for (const child of node.children) this.indexNode(child);
  }

  private unindexNode(node: NoteNode): void {
    this._index.delete(node.id);
    for (const child of node.children) this.unindexNode(child);
  }

  // --- Persistence ---

  /** Update expansion state for a node and mark dirty for save. */
  setExpanded(nodeId: string, expanded: boolean): void {
    const node = this.findNode(nodeId);
    if (!node) return;
    node.isExpanded = expanded;
    this.markDirty();
  }

  private markDirty(): void {
    this._dirty = true;
    this.app.events.trigger('save-status-change', 'unsaved');
    this._debouncedSave();
  }

  /** Force immediate save. */
  async saveNow(): Promise<void> {
    this._debouncedSave.cancel();
    await this.save();
  }

  private async save(): Promise<void> {
    if (!this._data || !this._dirty) return;
    this.app.events.trigger('save-status-change', 'saving');
    try {
      this._data.metadata.updatedAt = Date.now();
      const json = JSON.stringify(this._data);
      await this.storage.save(json);
      this._dirty = false;
      this.app.events.trigger('save-status-change', 'saved');
      this.app.events.trigger('data-saved');
      this.app.logger.debug('Vault', 'Data saved.');
    } catch (err) {
      this.app.events.trigger('save-status-change', 'error');
      this.app.logger.error('Vault', 'Failed to save', err);
    }
  }

  private countNodes(): number {
    if (!this._data) return 0;
    let count = 0;
    const walk = (node: NoteNode): void => {
      count++;
      node.children.forEach(walk);
    };
    walk(this._data.root);
    return count;
  }

  isDescendant(ancestorId: string, nodeId: string): boolean {
    let current = this.findNode(nodeId);
    while (current) {
      if (current.id === ancestorId) return true;
      current = current.parentId ? this.findNode(current.parentId) : null;
    }
    return false;
  }
}
