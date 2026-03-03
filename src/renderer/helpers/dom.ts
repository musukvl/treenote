/** Options for creating DOM elements. */
interface CreateElOptions {
  cls?: string;
  text?: string;
  attr?: Record<string, string>;
  parent?: HTMLElement;
}

/** Create a DOM element with optional class, text, attributes, and parent. */
export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: CreateElOptions,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (options?.cls) {
    for (const c of options.cls.split(' ')) {
      if (c) el.classList.add(c);
    }
  }
  if (options?.text) el.textContent = options.text;
  if (options?.attr) {
    for (const [key, value] of Object.entries(options.attr)) {
      el.setAttribute(key, value);
    }
  }
  if (options?.parent) options.parent.appendChild(el);
  return el;
}

/** Shorthand for createEl('div', options). */
export function createDiv(options?: CreateElOptions): HTMLDivElement {
  return createEl('div', options);
}

/** Shorthand for createEl('span', options). */
export function createSpan(options?: CreateElOptions): HTMLSpanElement {
  return createEl('span', options);
}

/**
 * Install Obsidian-style prototype extensions on HTMLElement.
 * Call once at app startup.
 */
export function installDomExtensions(): void {
  if (!HTMLElement.prototype.empty) {
    HTMLElement.prototype.empty = function () {
      while (this.firstChild) this.removeChild(this.firstChild);
    };
  }
  if (!HTMLElement.prototype.addClass) {
    HTMLElement.prototype.addClass = function (...cls: string[]) {
      this.classList.add(...cls);
    };
  }
  if (!HTMLElement.prototype.removeClass) {
    HTMLElement.prototype.removeClass = function (...cls: string[]) {
      this.classList.remove(...cls);
    };
  }
  if (!HTMLElement.prototype.toggleClass) {
    HTMLElement.prototype.toggleClass = function (cls: string, force?: boolean) {
      this.classList.toggle(cls, force);
    };
  }
}

// Augment HTMLElement with Obsidian-style methods
declare global {
  interface HTMLElement {
    empty(): void;
    addClass(...cls: string[]): void;
    removeClass(...cls: string[]): void;
    toggleClass(cls: string, force?: boolean): void;
  }
}
