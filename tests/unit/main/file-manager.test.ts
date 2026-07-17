import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { load } from 'js-yaml';
import { FileManager } from '../../../src/main/file-manager';

describe('FileManager', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'treenote-file-manager-'));
    filePath = join(tempDir, 'vault', 'notes.yml');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should create missing file with initial content', async () => {
    const fm = new FileManager(filePath);

    await fm.ensureFileExists('root: true\n');

    expect(existsSync(filePath)).toBe(true);
    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe('root: true\n');
  });

  it('should not overwrite existing file in ensureFileExists', async () => {
    const fm = new FileManager(filePath);
    await fm.ensureFileExists('first\n');

    await fm.ensureFileExists('second\n');

    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe('first\n');
  });

  it('should return null when reading missing file', async () => {
    const fm = new FileManager(filePath);

    const value = await fm.read();

    expect(value).toBeNull();
  });

  it('should write JSON as YAML and read it back as JSON string', async () => {
    const fm = new FileManager(filePath);
    const json = JSON.stringify({
      root: {
        id: 'root',
        name: 'Root',
        children: [{ id: 'a', name: 'A', children: [] }],
      },
    });

    await fm.write(json);

    const yamlText = await readFile(filePath, 'utf-8');
    const parsedYaml = load(yamlText) as {
      root: { id: string; children: Array<{ id: string; name: string }> };
    };
    expect(parsedYaml.root.id).toBe('root');
    expect(parsedYaml.root.children[0].name).toBe('A');

    const readBack = await fm.read();
    expect(readBack).not.toBeNull();
    const parsedBack = JSON.parse(readBack as string) as {
      root: { id: string; children: Array<{ id: string; name: string }> };
    };
    expect(parsedBack.root.id).toBe('root');
    expect(parsedBack.root.children[0].id).toBe('a');
  });

  it('should throw when reading from a directory path', async () => {
    const dirAsFilePath = join(tempDir, 'as-dir');
    await mkdir(dirAsFilePath, { recursive: true });
    const fm = new FileManager(dirAsFilePath);

    await expect(fm.read()).rejects.toThrow();
  });

  it('should throw when writing to a directory path', async () => {
    const dirAsFilePath = join(tempDir, 'as-dir');
    await mkdir(dirAsFilePath, { recursive: true });
    const fm = new FileManager(dirAsFilePath);

    await expect(fm.write(JSON.stringify({ ok: true }))).rejects.toThrow();
  });

  it('should quarantine a corrupt file by renaming it aside', async () => {
    const fm = new FileManager(filePath);
    await fm.ensureFileExists('broken: [');

    const quarantinePath = await fm.quarantineCorrupt();

    expect(existsSync(filePath)).toBe(false);
    expect(existsSync(quarantinePath)).toBe(true);
    expect(quarantinePath).toContain('.corrupt-');
  });

  it('should create a rolling backup before overwriting an existing file', async () => {
    const fm = new FileManager(filePath);
    const first = JSON.stringify({
      root: { id: 'root', name: 'Root', children: [] },
    });
    const second = JSON.stringify({
      root: { id: 'root', name: 'Updated', children: [] },
    });

    await fm.write(first);
    await fm.write(second);

    const backupDir = join(tempDir, 'vault', 'backups');
    expect(existsSync(backupDir)).toBe(true);
    const backups = await readdir(backupDir);
    expect(backups.length).toBe(1);
    expect(backups[0]).toContain('notes.yml.');
  });
});
