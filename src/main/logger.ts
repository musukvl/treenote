/** Simple main-process logger. Writes to stdout/stderr. */
export class MainLogger {
  private _enabled: boolean;

  constructor(enabled = false) {
    this._enabled = enabled;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this._enabled) return;
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}

export const logger = new MainLogger(process.argv.includes('--debug'));
