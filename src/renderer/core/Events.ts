import type { EventRef } from './Component';
import type { NoteNode, TreeData } from '../models/NoteNode';

/** Type-safe event map for TreeNote. */
export interface TreeNoteEvents {
  'note-created': [node: NoteNode];
  'note-deleted': [nodeId: string];
  'note-renamed': [nodeId: string, newName: string];
  'note-content-changed': [nodeId: string, content: string];
  'note-moved': [nodeId: string, newParentId: string];
  'active-note-change': [node: NoteNode | null];
  'tree-changed': [];
  'data-loaded': [data: TreeData];
  'data-saved': [];
  'save-status-change': [status: 'saved' | 'unsaved' | 'saving' | 'error'];
  'layout-change': [];
  'focus-change': [viewType: string];
  'search-results': [results: NoteNode[]];
}

interface ListenerEntry {
  callback: (...args: unknown[]) => unknown;
  ctx?: unknown;
}

/**
 * Typed EventEmitter with EventRef tracking for Component integration.
 * Mirrors Obsidian's Events class.
 */
export class Events {
  private _listeners: Map<string, ListenerEntry[]> = new Map();
  private _nextId = 0;

  on<K extends keyof TreeNoteEvents>(
    name: K,
    callback: (...args: TreeNoteEvents[K]) => unknown,
    ctx?: unknown,
  ): EventRef;
  on(name: string, callback: (...args: unknown[]) => unknown, ctx?: unknown): EventRef {
    if (!this._listeners.has(name)) {
      this._listeners.set(name, []);
    }
    const entry: ListenerEntry = { callback, ctx };
    this._listeners.get(name)!.push(entry);
    return {
      id: Symbol(`event-${this._nextId++}`),
      eventName: name,
      callback,
      emitter: this,
    };
  }

  off(name: string, callback: (...args: unknown[]) => unknown): void {
    const listeners = this._listeners.get(name);
    if (!listeners) return;
    const index = listeners.findIndex((l) => l.callback === callback);
    if (index >= 0) listeners.splice(index, 1);
  }

  offref(ref: EventRef): void {
    this.off(ref.eventName, ref.callback);
  }

  trigger<K extends keyof TreeNoteEvents>(name: K, ...args: TreeNoteEvents[K]): void;
  trigger(name: string, ...args: unknown[]): void {
    const listeners = this._listeners.get(name);
    if (!listeners) return;
    for (const { callback, ctx } of [...listeners]) {
      try {
        callback.apply(ctx, args);
      } catch (e) {
        console.error(`Error in event handler for '${name}':`, e);
      }
    }
  }
}
