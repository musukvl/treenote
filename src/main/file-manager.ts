import { readFile, writeFile, rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import yaml from 'js-yaml';
import { logger } from './logger';

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

  /** Read the YAML file and return its contents as a JSON string. Returns null if file doesn't exist. */
  async read(): Promise<string | null> {
    if (!existsSync(this.filePath)) {
      logger.debug(`File not found: ${this.filePath}`);
      return null;
    }
    try {
      const content = await readFile(this.filePath, 'utf-8');
      const data = yaml.load(content);
      return JSON.stringify(data);
    } catch (err) {
      logger.error(`Failed to read file: ${this.filePath}`, err);
      throw err;
    }
  }

  /** Write data to YAML file atomically. Expects JSON string input. */
  async write(jsonContent: string): Promise<void> {
    await this.ensureDirectory();
    const data = JSON.parse(jsonContent);
    const yamlContent = yaml.dump(data, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });

    // Atomic write: write to temp file, then rename
    const tmpPath = this.filePath + '.tmp';
    try {
      await writeFile(tmpPath, yamlContent, 'utf-8');
      await rename(tmpPath, this.filePath);
      logger.debug(`File saved: ${this.filePath}`);
    } catch (err) {
      logger.error(`Failed to save file: ${this.filePath}`, err);
      throw err;
    }
  }

  private async ensureDirectory(): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}
