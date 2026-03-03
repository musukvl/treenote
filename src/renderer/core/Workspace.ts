import { Component } from './Component';
import type { App } from './App';
import type { View } from './View';
import { TreeView } from '../views/TreeView';
import { EditorView } from '../views/EditorView';
import { SearchView } from '../views/SearchView';
import { StatusBar } from '../views/StatusBar';
import { createDiv } from '../helpers/dom';

export type ViewType = 'tree' | 'editor' | 'search';

/**
 * Layout manager. Manages views, focus, and delegates actions.
 * Simplified from Obsidian's Workspace (fixed layout, no dynamic splits).
 */
export class Workspace extends Component {
  private app: App;
  private _activeView: ViewType = 'tree';
  private _views: Map<ViewType, View> = new Map();

  treeView!: TreeView;
  editorView!: EditorView;
  searchView!: SearchView;
  statusBar!: StatusBar;

  private sidebarEl!: HTMLElement;
  private mainEl!: HTMLElement;
  private statusBarEl!: HTMLElement;

  constructor(app: App) {
    super();
    this.app = app;
  }

  onload(): void {
    this.buildLayout();
    this.createViews();
    this.setupFocusTracking();
  }

  private buildLayout(): void {
    const root = this.app.rootEl;
    root.empty();
    root.addClass('app');

    this.sidebarEl = createDiv({ cls: 'workspace__sidebar', parent: root });
    this.mainEl = createDiv({ cls: 'workspace__main', parent: root });
    this.statusBarEl = createDiv({ cls: 'workspace__status-bar', parent: root });
  }

  private createViews(): void {
    this.searchView = this.addChild(new SearchView(this.app, this.sidebarEl));
    this._views.set('search', this.searchView);

    this.treeView = this.addChild(new TreeView(this.app, this.sidebarEl));
    this._views.set('tree', this.treeView);

    this.editorView = this.addChild(new EditorView(this.app, this.mainEl));
    this._views.set('editor', this.editorView);

    this.statusBar = this.addChild(new StatusBar(this.app, this.statusBarEl));
  }

  private setupFocusTracking(): void {
    for (const [type, view] of this._views) {
      this.registerDomEvent(view.containerEl, 'focusin', () => {
        this._activeView = type;
        this.app.events.trigger('focus-change', type);
      });
    }
  }

  focusView(type: ViewType): void {
    const view = this._views.get(type);
    if (view) {
      view.focus();
      this._activeView = type;
      this.app.events.trigger('focus-change', type);
    }
  }

  getActiveViewType(): ViewType {
    return this._activeView;
  }

  getView(type: ViewType): View | undefined {
    return this._views.get(type);
  }

  // Delegate actions (called by App hotkeys)
  createNote(): void {
    this.treeView.createSiblingNote();
  }

  createChildNote(): void {
    this.treeView.createChildNote();
  }

  renameActiveNote(): void {
    this.treeView.renameSelectedNote();
  }

  deleteActiveNote(): void {
    this.treeView.deleteSelectedNote();
  }

  focusSearch(): void {
    this.focusView('search');
    this.searchView.focusInput();
  }
}
