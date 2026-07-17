import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vault } from '../../../src/renderer/core/Vault';
import { Events } from '../../../src/renderer/core/Events';
import type { StorageAdapter } from '../../../src/renderer/core/StorageAdapter';
import { CURRENT_TREE_VERSION } from '../../../src/shared/tree-version';

function validTreeJson(): string {
  return JSON.stringify({
    root: {
      id: 'root-1',
      name: 'Root',
      content: '',
      children: [],
      parentId: null,
      createdAt: 1000,
      updatedAt: 2000,
      isExpanded: true,
    },
    metadata: {
      version: CURRENT_TREE_VERSION,
      createdAt: 1000,
      updatedAt: 2000,
    },
  });
}

describe('Vault.loadData integrity', () => {
  let storage: StorageAdapter;
  let vault: Vault;
  let showError: ReturnType<typeof vi.fn>;
  let quarantineCorrupt: ReturnType<typeof vi.fn>;
  let save: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    showError = vi.fn().mockResolvedValue(undefined);
    quarantineCorrupt = vi.fn().mockResolvedValue('/tmp/notes.yaml.corrupt-stamp');
    save = vi.fn().mockResolvedValue(undefined);

    storage = {
      load: vi.fn(),
      save,
      getPath: vi.fn().mockResolvedValue('/tmp/notes.yaml'),
      quarantineCorrupt,
      showError,
    };

    const app = {
      events: new Events(),
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
      },
    };

    vault = new Vault(app as never, storage);
    vault.load();
  });

  afterEach(() => {
    vault.unload();
  });

  it('quarantines invalid structure instead of overwriting it silently', async () => {
    (storage.load as ReturnType<typeof vi.fn>).mockResolvedValue('{"not":"tree"}');

    await vault.loadData();

    expect(quarantineCorrupt).toHaveBeenCalledTimes(1);
    expect(showError).toHaveBeenCalledWith('Invalid data file', expect.stringContaining('corrupt'));
    expect(save).toHaveBeenCalledTimes(1);
    expect(vault.root?.name).toBe('My Notes');
  });

  it('loads valid data without quarantining', async () => {
    (storage.load as ReturnType<typeof vi.fn>).mockResolvedValue(validTreeJson());

    await vault.loadData();

    expect(quarantineCorrupt).not.toHaveBeenCalled();
    expect(showError).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(vault.root?.id).toBe('root-1');
  });

  it('shows an error dialog after repeated save failures', async () => {
    (storage.load as ReturnType<typeof vi.fn>).mockResolvedValue(validTreeJson());
    await vault.loadData();
    save.mockRejectedValue(new Error('disk full'));

    vault.renameNote('root-1', 'Renamed');
    await vault.saveNow();
    await vault.saveNow();

    expect(showError).toHaveBeenCalledWith(
      'Save failed',
      expect.stringContaining('could not save'),
    );
  });
});
