import { Component } from './Component';
import type { App } from './App';

interface HotkeyBinding {
  key: string;
  description: string;
  callback: () => void;
  when?: string;
}

/**
 * Keyboard shortcut registration and dispatch.
 * Supports modifier combos (Ctrl+S) and context-sensitive bindings.
 */
export class HotkeyManager extends Component {
  private app: App;
  private bindings: HotkeyBinding[] = [];

  constructor(app: App) {
    super();
    this.app = app;
  }

  onload(): void {
    this.registerDomEvent(document, 'keydown', this.handleKeydown.bind(this));
  }

  /** Register a keyboard shortcut. */
  register(
    key: string,
    description: string,
    callback: () => void,
    options?: { when?: string },
  ): void {
    this.bindings.push({ key, description, callback, when: options?.when });
  }

  /** Get all registered bindings (for help display). */
  getBindings(): ReadonlyArray<{ key: string; description: string }> {
    return this.bindings;
  }

  private handleKeydown(e: KeyboardEvent): void {
    // Don't intercept when typing in inputs (unless it's a global shortcut)
    const target = e.target as HTMLElement;
    const isInputFocused =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    const combo = this.buildCombo(e);
    const activeViewType = this.app.workspace.getActiveViewType();

    for (const binding of this.bindings) {
      if (binding.key !== combo) continue;
      if (binding.when && binding.when !== activeViewType) continue;

      // Allow global shortcuts (with Ctrl) even in inputs
      // Block non-Ctrl shortcuts when in inputs
      if (isInputFocused && !e.ctrlKey && !e.metaKey && binding.key !== 'Escape') continue;

      e.preventDefault();
      binding.callback();
      return;
    }
  }

  private buildCombo(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    let key = e.key;
    // Normalize single-character keys to uppercase
    if (key.length === 1) key = key.toUpperCase();
    parts.push(key);
    return parts.join('+');
  }
}
