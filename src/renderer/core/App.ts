import { Component } from './Component';
import { Events } from './Events';
import { Vault } from './Vault';
import { Workspace } from './Workspace';
import { HotkeyManager } from './HotkeyManager';
import { Logger } from './Logger';

/**
 * Singleton root object. Orchestrates all subsystems.
 * Mirrors Obsidian's App class.
 */
export class App extends Component {
  readonly events: Events;
  readonly vault: Vault;
  readonly workspace: Workspace;
  readonly hotkeys: HotkeyManager;
  readonly logger: Logger;
  readonly rootEl: HTMLElement;

  private static _instance: App | null = null;

  static getInstance(): App {
    if (!App._instance) {
      throw new Error('App not initialized. Call new App(rootEl) first.');
    }
    return App._instance;
  }

  constructor(rootEl: HTMLElement) {
    super();
    if (App._instance) {
      throw new Error('App is a singleton. Only one instance allowed.');
    }
    App._instance = this;
    this.rootEl = rootEl;

    // Create subsystems (order matters)
    this.events = new Events();
    this.logger = new Logger(this);
    this.vault = this.addChild(new Vault(this));
    this.hotkeys = this.addChild(new HotkeyManager(this));
    this.workspace = this.addChild(new Workspace(this));
  }

  async onload(): Promise<void> {
    this.logger.debug('App', 'Loading...');
    await this.vault.loadData();
    this.registerGlobalHotkeys();
    this.registerMenuActions();
    this.logger.debug('App', 'Loaded successfully.');
  }

  onunload(): void {
    this.logger.debug('App', 'Unloading...');
    App._instance = null;
  }

  private registerGlobalHotkeys(): void {
    this.hotkeys.register('Ctrl+S', 'Save', () => this.vault.saveNow());
    this.hotkeys.register('Ctrl+N', 'New Note', () => this.workspace.createNote());
    this.hotkeys.register('Ctrl+Shift+N', 'New Child Note', () =>
      this.workspace.createChildNote(),
    );
    this.hotkeys.register('F2', 'Rename Note', () => this.workspace.renameActiveNote());
    this.hotkeys.register('Delete', 'Delete Note', () => this.workspace.deleteActiveNote(), {
      when: 'tree',
    });
    this.hotkeys.register('Ctrl+F', 'Search', () => this.workspace.focusSearch());
    this.hotkeys.register('Ctrl+1', 'Focus Tree', () => this.workspace.focusView('tree'));
    this.hotkeys.register('Ctrl+2', 'Focus Editor', () => this.workspace.focusView('editor'));
    this.hotkeys.register('Ctrl+3', 'Focus Search', () => this.workspace.focusView('search'));
    this.hotkeys.register('Escape', 'Focus Tree', () => this.workspace.focusView('tree'));
  }

  private registerMenuActions(): void {
    if (!window.api?.onMenuAction) return;

    const unsubscribe = window.api.onMenuAction((action: string) => {
      switch (action) {
        case 'new-note':
          this.workspace.createNote();
          break;
        case 'new-child-note':
          this.workspace.createChildNote();
          break;
        case 'save':
          this.vault.saveNow();
          break;
        case 'find':
          this.workspace.focusSearch();
          break;
        case 'focus-tree':
          this.workspace.focusView('tree');
          break;
        case 'focus-editor':
          this.workspace.focusView('editor');
          break;
        case 'focus-search':
          this.workspace.focusView('search');
          break;
      }
    });

    this.register(unsubscribe);
  }
}
