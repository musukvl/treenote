import type { NoteNode } from '../models/NoteNode';

/** Find a node by ID in the tree. Returns null if not found. */
export function findNodeById(root: NoteNode, id: string): NoteNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/** Remove a node by ID from the tree. Returns true if removed. */
export function removeNodeById(root: NoteNode, id: string): boolean {
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].id === id) {
      root.children.splice(i, 1);
      return true;
    }
    if (removeNodeById(root.children[i], id)) {
      return true;
    }
  }
  return false;
}

/**
 * Insert a node as a child of the node with the given parentId.
 * If index is provided, inserts at that position; otherwise appends.
 */
export function insertNode(
  root: NoteNode,
  parentId: string,
  node: NoteNode,
  index?: number,
): boolean {
  const parent = findNodeById(root, parentId);
  if (!parent) return false;
  if (index === undefined) {
    parent.children.push(node);
    return true;
  }

  const clampedIndex = Math.max(0, Math.min(index, parent.children.length));
  parent.children.splice(clampedIndex, 0, node);
  return true;
}

/** Flatten the tree into an array (depth-first pre-order). */
export function flattenTree(root: NoteNode): NoteNode[] {
  const result: NoteNode[] = [];
  const walk = (node: NoteNode): void => {
    result.push(node);
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return result;
}

/** Get the path from root to a target node. Returns empty array if not found. */
export function getNodePath(root: NoteNode, targetId: string): NoteNode[] {
  const path: NoteNode[] = [];
  const find = (node: NoteNode): boolean => {
    path.push(node);
    if (node.id === targetId) return true;
    for (const child of node.children) {
      if (find(child)) return true;
    }
    path.pop();
    return false;
  };
  find(root);
  return path;
}

/** Count all descendants of a node (not including the node itself). */
export function countDescendants(node: NoteNode): number {
  let count = 0;
  for (const child of node.children) {
    count += 1 + countDescendants(child);
  }
  return count;
}
