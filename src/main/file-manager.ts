import { readFile, writeFile, rename, mkdir, unlink, copyFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, basename, join } from 'path';
import { load, dump } from 'js-yaml';
import { logger } from './logger';
import { BACKUP_DIR_NAME, MAX_BACKUPS } from './constants';

/**
 * Handles file I/O with atomic writes and YAML serialization.
 * Data is stored as YAML on disk but transmitted as JSON over IPC.
 */
export class FileManager {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  getFilePath(): string {
    return this.filePath;
  }

  setFilePath(filePath: string): void {
    this.filePath = filePath;
  }

  /** Ensure target file exists on disk. */
  async ensureFileExists(initialContent = ''): Promise<void> {
    await this.ensureDirectory();
    if (!existsSync(this.filePath)) {
      await writeFile(this.filePath, initialContent, 'utf-8');
      logger.info(`Created data file: ${this.filePath}`);
    }
  }

  /** Read the YAML file and return its contents as a JSON string. Returns null if file doesn't exist. */
  async read(): Promise<string | null> {
    if (!existsSync(this.filePath)) {
      logger.debug(`File not found: ${this.filePath}`);
      return null;
    }
    try {
      const content = await readFile(this.filePath, 'utf-8');
      // js-yaml v5 throws on empty input; treat an empty file as "no data"
      if (content.trim() === '') {
        return null;
      }
      const data = load(content);
      return JSON.stringify(data);
    } catch (err) {
      logger.error(`Failed to read file: ${this.filePath}`, err);
      throw err;
    }
  }

  /**
   * Rename a corrupt/unreadable data file aside so it is not overwritten.
   * Returns the quarantine path.
   */
  async quarantineCorrupt(): Promise<string> {
    if (!existsSync(this.filePath)) {
      throw new Error(`No data file to quarantine: ${this.filePath}`);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const quarantinePath = `${this.filePath}.corrupt-${stamp}`;
    await rename(this.filePath, quarantinePath);
    logger.info(`Quarantined corrupt data file: ${quarantinePath}`);
    return quarantinePath;
  }

  /** Write data to YAML file atomically. Expects JSON string input. */
  async write(jsonContent: string): Promise<void> {
    await this.ensureDirectory();

    if (existsSync(this.filePath)) {
      await this.createRollingBackup();
    }

    const data = JSON.parse(jsonContent);
    const yamlContent = dump(data, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });

    // Atomic write: write to temp file, then rename
    const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
    try {
      await writeFile(tmpPath, yamlContent, 'utf-8');
      await rename(tmpPath, this.filePath);
      logger.debug(`File saved: ${this.filePath}`);
    } catch (err) {
      // Clean up stale temp file on failure
      await unlink(tmpPath).catch(() => {});
      logger.error(`Failed to save file: ${this.filePath}`, err);
      throw err;
    }
  }

  private async createRollingBackup(): Promise<void> {
    try {
      const backupDir = join(dirname(this.filePath), BACKUP_DIR_NAME);
      await mkdir(backupDir, { recursive: true });

      const baseName = basename(this.filePath);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = join(backupDir, `${baseName}.${stamp}`);
      await copyFile(this.filePath, backupPath);

      await this.pruneBackups(backupDir, baseName);
    } catch (err) {
      // Backups are best-effort — never block a successful save path on backup failure.
      logger.error(`Failed to create rolling backup for ${this.filePath}`, err);
    }
  }

  private async pruneBackups(backupDir: string, baseName: string): Promise<void> {
    const prefix = `${baseName}.`;
    const entries = await readdir(backupDir);
    const backups = entries
      .filter((name) => name.startsWith(prefix))
      .map((name) => join(backupDir, name))
      .sort();

    const excess = backups.length - MAX_BACKUPS;
    if (excess <= 0) return;

    for (const stale of backups.slice(0, excess)) {
      await unlink(stale).catch(() => {});
    }
  }

  private async ensureDirectory(): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}
