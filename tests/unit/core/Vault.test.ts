import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Vault } from '../../../src/renderer/core/Vault';
import { Events } from '../../../src/renderer/core/Events';
import type { NoteNode, TreeData } from '../../../src/renderer/models/NoteNode';

function makeNode(
  id: string,
  name: string,
  parentId: string | null,
  children: NoteNode[] = [],
): NoteNode {
  return {
    id,
    name,
    content: '',
    children,
    parentId,
    createdAt: 0,
    updatedAt: 0,
    isExpanded: true,
  };
}

function createTreeData(): TreeData {
  const a1 = makeNode('a1', 'A1', 'a');
  const a2 = makeNode('a2', 'A2', 'a');
  const b1 = makeNode('b1', 'B1', 'b');
  const a = makeNode('a', 'A', 'root', [a1, a2]);
  const b = makeNode('b', 'B', 'root', [b1]);
  const c = makeNode('c', 'C', 'root');
  const root = makeNode('root', 'Root', null, [a, b, c]);

  return {
    root,
    metadata: {
      version: '1.0.0',
      createdAt: 0,
      updatedAt: 0,
    },
  };
}

describe('Vault.moveNote ordering', () => {
  let vault: Vault;

  beforeEach(() => {
    const app = {
      events: new Events(),
      logger: {
        debug: vi.fn(),
        error: vi.fn(),
      },
    };

    vault = new Vault(app as never);
    vault.load();
    (vault as unknown as { _data: TreeData })._data = createTreeData();
  });

  afterEach(() => {
    vault.unload();
  });

  it('reorders within same parent when moving down', () => {
    const moved = vault.moveNote('a', 'root', 3);
    expect(moved).toBe(true);
    expect(vault.root?.children.map((child) => child.id)).toEqual(['b', 'c', 'a']);
  });

  it('reorders within same parent when moving up', () => {
    const moved = vault.moveNote('c', 'root', 0);
    expect(moved).toBe(true);
    expect(vault.root?.children.map((child) => child.id)).toEqual(['c', 'a', 'b']);
  });

  it('inserts at specific index when moving across parents', () => {
    const moved = vault.moveNote('b1', 'a', 1);
    expect(moved).toBe(true);

    const nodeA = vault.findNode('a');
    const nodeB = vault.findNode('b');

    expect(nodeA?.children.map((child) => child.id)).toEqual(['a1', 'b1', 'a2']);
    expect(nodeB?.children.map((child) => child.id)).toEqual([]);
    expect(vault.findNode('b1')?.parentId).toBe('a');
  });

  it('rejects moving a node into its descendant', () => {
    const moved = vault.moveNote('a', 'a1');
    expect(moved).toBe(false);
    expect(vault.root?.children.map((child) => child.id)).toEqual(['a', 'b', 'c']);
  });
});
