import type { App } from './App';

/**
 * Debug logger for the renderer process.
 * Logs to console and optionally forwards to main process via IPC.
 */
export class Logger {
  private app: App;
  private _enabled = false;

  constructor(app: App) {
    this.app = app;
    // Enable debug logging if URL has ?debug or env var is set
    this._enabled =
      typeof window !== 'undefined' && window.location?.search?.includes('debug');
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  debug(source: string, message: string, ...args: unknown[]): void {
    if (!this._enabled) return;
    // eslint-disable-next-line no-console
    console.log(`[${source}] ${message}`, ...args);
    this.sendToMain('debug', source, message, ...args);
  }

  info(source: string, message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(`[${source}] ${message}`, ...args);
    this.sendToMain('info', source, message, ...args);
  }

  error(source: string, message: string, ...args: unknown[]): void {
    console.error(`[${source}] ${message}`, ...args);
    this.sendToMain('error', source, message, ...args);
  }

  private sendToMain(level: string, source: string, message: string, ...args: unknown[]): void {
    if (typeof window !== 'undefined' && window.api?.log) {
      window.api.log(level, `[${source}] ${message}`, ...args);
    }
  }
}
