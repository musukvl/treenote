import type { NoteNode, TreeData } from './NoteNode';

/** Validate that a raw parsed value is a valid TreeData structure. */
export function validateTreeData(raw: unknown): TreeData | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;
  if (!obj.root || typeof obj.root !== 'object') return null;
  if (!validateNoteNode(obj.root)) return null;
  if (!obj.metadata || typeof obj.metadata !== 'object') return null;

  const meta = obj.metadata as Record<string, unknown>;
  if (typeof meta.version !== 'string') return null;
  if (typeof meta.createdAt !== 'number') return null;
  if (typeof meta.updatedAt !== 'number') return null;

  return raw as TreeData;
}

/** Recursively validate a NoteNode shape. */
function validateNoteNode(raw: unknown): raw is NoteNode {
  if (!raw || typeof raw !== 'object') return false;

  const node = raw as Record<string, unknown>;
  if (typeof node.id !== 'string' || !node.id) return false;
  if (typeof node.name !== 'string') return false;
  if (typeof node.content !== 'string' && node.content !== undefined) {
    // Allow missing content (default to empty string)
    return false;
  }
  if (!Array.isArray(node.children)) return false;

  // Validate children recursively
  for (const child of node.children) {
    if (!validateNoteNode(child)) return false;
  }

  return true;
}
