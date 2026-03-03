import type { Events } from './Events';

/**
 * A reference to a registered event handler that can be detached.
 * Mirrors Obsidian's EventRef pattern.
 */
export interface EventRef {
  id: symbol;
  eventName: string;
  callback: (...args: unknown[]) => unknown;
  emitter: Events;
}

interface TrackedDomEvent {
  el: EventTarget;
  type: string;
  handler: EventListener;
  options?: boolean | AddEventListenerOptions;
}

/**
 * Base lifecycle class mirroring Obsidian's Component.
 * Provides automatic resource cleanup on unload.
 */
export class Component {
  private _loaded = false;
  private _children: Component[] = [];
  private _cleanups: (() => void)[] = [];
  private _eventRefs: EventRef[] = [];
  private _domEvents: TrackedDomEvent[] = [];
  private _intervals: number[] = [];

  get loaded(): boolean {
    return this._loaded;
  }

  /** Called by framework to initialize. Calls onload() and loads children. */
  load(): void {
    if (this._loaded) return;
    this._loaded = true;
    this.onload();
    // Load any children that were added before this component was loaded
    for (const child of this._children) {
      if (!child._loaded) child.load();
    }
  }

  /** Override to perform initialization. */
  onload(): void {
    // Subclasses override this
  }

  /** Called by framework to tear down. Calls onunload(), then cleans up all resources. */
  unload(): void {
    if (!this._loaded) return;
    this._loaded = false;
    this.onunload();

    // Unload children in reverse order
    for (let i = this._children.length - 1; i >= 0; i--) {
      this._children[i].unload();
    }
    this._children = [];

    // Run registered cleanup callbacks
    for (const cleanup of this._cleanups) {
      cleanup();
    }
    this._cleanups = [];

    // Detach tracked event refs
    for (const ref of this._eventRefs) {
      ref.emitter.offref(ref);
    }
    this._eventRefs = [];

    // Remove DOM event listeners
    for (const { el, type, handler, options } of this._domEvents) {
      el.removeEventListener(type, handler, options);
    }
    this._domEvents = [];

    // Clear intervals
    for (const id of this._intervals) {
      window.clearInterval(id);
    }
    this._intervals = [];
  }

  /** Override to perform cleanup before resource teardown. */
  onunload(): void {
    // Subclasses override this
  }

  /** Add a child component. It will be loaded if this component is loaded. */
  addChild<T extends Component>(component: T): T {
    this._children.push(component);
    if (this._loaded) component.load();
    return component;
  }

  /** Remove and unload a child component. */
  removeChild<T extends Component>(component: T): T {
    const index = this._children.indexOf(component);
    if (index >= 0) {
      this._children.splice(index, 1);
      component.unload();
    }
    return component;
  }

  /** Register a generic cleanup callback. */
  register(cb: () => void): void {
    this._cleanups.push(cb);
  }

  /** Register an EventRef for auto-detachment on unload. */
  registerEvent(eventRef: EventRef): void {
    this._eventRefs.push(eventRef);
  }

  /** Register a DOM event listener for auto-removal on unload. */
  registerDomEvent<K extends keyof HTMLElementEventMap>(
    el: HTMLElement,
    type: K,
    callback: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  registerDomEvent<K extends keyof DocumentEventMap>(
    el: Document,
    type: K,
    callback: (this: Document, ev: DocumentEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  registerDomEvent<K extends keyof WindowEventMap>(
    el: Window,
    type: K,
    callback: (this: Window, ev: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  registerDomEvent(
    el: EventTarget,
    type: string,
    callback: EventListener,
    options?: boolean | AddEventListenerOptions,
  ): void {
    el.addEventListener(type, callback, options);
    this._domEvents.push({ el, type, handler: callback, options });
  }

  /** Register a setInterval for auto-clearing on unload. */
  registerInterval(id: number): number {
    this._intervals.push(id);
    return id;
  }
}
