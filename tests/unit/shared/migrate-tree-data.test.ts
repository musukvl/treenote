import { describe, expect, it } from 'vitest';
import { migrateTreeData } from '../../../src/shared/migrate-tree-data';
import { CURRENT_TREE_VERSION } from '../../../src/shared/tree-version';
import type { TreeData } from '../../../src/shared/tree-data';

function sampleData(version: string): TreeData {
  return {
    root: {
      id: 'root',
      name: 'Root',
      content: '',
      children: [],
      parentId: null,
      createdAt: 1,
      updatedAt: 1,
      isExpanded: true,
    },
    metadata: {
      version,
      createdAt: 1,
      updatedAt: 1,
    },
  };
}

describe('migrateTreeData', () => {
  it('is a no-op when already on the current version', () => {
    const input = sampleData(CURRENT_TREE_VERSION);
    const result = migrateTreeData(input);

    expect(result.migrated).toBe(false);
    expect(result.data).toBe(input);
  });

  it('leaves unknown versions unchanged when no migrator exists', () => {
    const input = sampleData('0.9.0');
    const result = migrateTreeData(input);

    expect(result.migrated).toBe(false);
    expect(result.data.metadata.version).toBe('0.9.0');
  });
});
