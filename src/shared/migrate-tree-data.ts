import type { TreeData } from './tree-data';
import { CURRENT_TREE_VERSION } from './tree-version';

type Migrator = (data: TreeData) => TreeData;

/**
 * Version → migrator that upgrades data to the next schema version.
 * Add entries here when introducing breaking TreeData changes.
 */
const MIGRATIONS: Record<string, Migrator> = {
  // Example:
  // '1.0.0': (data) => ({
  //   ...data,
  //   metadata: { ...data.metadata, version: '1.1.0' },
  // }),
};

/**
 * Apply sequential migrations until CURRENT_TREE_VERSION is reached.
 * Unknown versions are left unchanged (caller may still use the data).
 */
export function migrateTreeData(data: TreeData): { data: TreeData; migrated: boolean } {
  let current = data;
  let migrated = false;
  let guard = 0;

  while (current.metadata.version !== CURRENT_TREE_VERSION && guard < 32) {
    guard += 1;
    const step = MIGRATIONS[current.metadata.version];
    if (!step) {
      break;
    }
    current = step(current);
    migrated = true;
  }

  return { data: current, migrated };
}
