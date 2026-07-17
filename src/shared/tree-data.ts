/** A single node in the note tree. */
export interface NoteNode {
  id: string;
  name: string;
  content: string;
  children: NoteNode[];
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  isExpanded: boolean;
}

/** File-level metadata. */
export interface TreeDataMetadata {
  version: string;
  createdAt: number;
  updatedAt: number;
}

/** Root data structure stored in the YAML file. */
export interface TreeData {
  root: NoteNode;
  metadata: TreeDataMetadata;
}
