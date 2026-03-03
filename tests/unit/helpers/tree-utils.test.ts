import { describe, it, expect } from 'vitest';
import { findNodeById, removeNodeById, insertNode, flattenTree, getNodePath, countDescendants } from '../../../src/renderer/helpers/tree-utils';
import { createNoteNode } from '../../../src/renderer/models/NoteNode';
import type { NoteNode } from '../../../src/renderer/models/NoteNode';

function buildTestTree(): NoteNode {
  const root = createNoteNode('Root', null);
  const a = createNoteNode('A', root.id);
  const b = createNoteNode('B', root.id);
  const a1 = createNoteNode('A1', a.id);
  const a2 = createNoteNode('A2', a.id);
  const b1 = createNoteNode('B1', b.id);
  a.children = [a1, a2];
  b.children = [b1];
  root.children = [a, b];
  return root;
}

describe('tree-utils', () => {
  describe('findNodeById', () => {
    it('should find the root node', () => {
      const root = buildTestTree();
      expect(findNodeById(root, root.id)).toBe(root);
    });

    it('should find a nested node', () => {
      const root = buildTestTree();
      const a1 = root.children[0].children[0];
      expect(findNodeById(root, a1.id)).toBe(a1);
    });

    it('should return null for non-existent ID', () => {
      const root = buildTestTree();
      expect(findNodeById(root, 'nonexistent')).toBeNull();
    });
  });

  describe('removeNodeById', () => {
    it('should remove a leaf node', () => {
      const root = buildTestTree();
      const b1 = root.children[1].children[0];
      expect(removeNodeById(root, b1.id)).toBe(true);
      expect(root.children[1].children).toHaveLength(0);
    });

    it('should remove a node with children', () => {
      const root = buildTestTree();
      const a = root.children[0];
      expect(removeNodeById(root, a.id)).toBe(true);
      expect(root.children).toHaveLength(1);
    });

    it('should return false for non-existent ID', () => {
      const root = buildTestTree();
      expect(removeNodeById(root, 'nonexistent')).toBe(false);
    });

    it('should not remove the root itself', () => {
      const root = buildTestTree();
      expect(removeNodeById(root, root.id)).toBe(false);
    });
  });

  describe('insertNode', () => {
    it('should insert a node as a child of the target parent', () => {
      const root = buildTestTree();
      const newNode = createNoteNode('New', root.children[1].id);
      expect(insertNode(root, root.children[1].id, newNode)).toBe(true);
      expect(root.children[1].children).toHaveLength(2);
    });

    it('should return false if parent not found', () => {
      const root = buildTestTree();
      const newNode = createNoteNode('New', 'nonexistent');
      expect(insertNode(root, 'nonexistent', newNode)).toBe(false);
    });
  });

  describe('flattenTree', () => {
    it('should return all nodes in depth-first order', () => {
      const root = buildTestTree();
      const flat = flattenTree(root);
      expect(flat).toHaveLength(6); // root + A + A1 + A2 + B + B1
      expect(flat[0].name).toBe('Root');
      expect(flat[1].name).toBe('A');
      expect(flat[2].name).toBe('A1');
      expect(flat[3].name).toBe('A2');
      expect(flat[4].name).toBe('B');
      expect(flat[5].name).toBe('B1');
    });

    it('should return single node for leaf', () => {
      const leaf = createNoteNode('Leaf', null);
      expect(flattenTree(leaf)).toHaveLength(1);
    });
  });

  describe('getNodePath', () => {
    it('should return path from root to target', () => {
      const root = buildTestTree();
      const a1 = root.children[0].children[0];
      const path = getNodePath(root, a1.id);
      expect(path.map((n) => n.name)).toEqual(['Root', 'A', 'A1']);
    });

    it('should return empty array if target not found', () => {
      const root = buildTestTree();
      expect(getNodePath(root, 'nonexistent')).toEqual([]);
    });

    it('should return single-element path for root', () => {
      const root = buildTestTree();
      const path = getNodePath(root, root.id);
      expect(path).toHaveLength(1);
      expect(path[0]).toBe(root);
    });
  });

  describe('countDescendants', () => {
    it('should count all descendants', () => {
      const root = buildTestTree();
      expect(countDescendants(root)).toBe(5); // A, A1, A2, B, B1
    });

    it('should return 0 for leaf node', () => {
      const leaf = createNoteNode('Leaf', null);
      expect(countDescendants(leaf)).toBe(0);
    });

    it('should count correctly for subtree', () => {
      const root = buildTestTree();
      expect(countDescendants(root.children[0])).toBe(2); // A1, A2
    });
  });
});
