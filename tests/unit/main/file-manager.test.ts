import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import yaml from 'js-yaml';
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
    const parsedYaml = yaml.load(yamlText) as {
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
});
