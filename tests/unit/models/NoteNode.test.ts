import { describe, it, expect } from 'vitest';
import { createNoteNode, createWelcomeData, generateId } from '../../../src/renderer/models/NoteNode';

describe('NoteNode', () => {
  describe('generateId', () => {
    it('should return a string matching UUID v4 format', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('createNoteNode', () => {
    it('should create a node with the given name and parentId', () => {
      const node = createNoteNode('Test Note', 'parent-1');
      expect(node.name).toBe('Test Note');
      expect(node.parentId).toBe('parent-1');
    });

    it('should have default empty content', () => {
      const node = createNoteNode('Test', null);
      expect(node.content).toBe('');
    });

    it('should have empty children array', () => {
      const node = createNoteNode('Test', null);
      expect(node.children).toEqual([]);
    });

    it('should have timestamps', () => {
      const before = Date.now();
      const node = createNoteNode('Test', null);
      const after = Date.now();
      expect(node.createdAt).toBeGreaterThanOrEqual(before);
      expect(node.createdAt).toBeLessThanOrEqual(after);
      expect(node.updatedAt).toBe(node.createdAt);
    });

    it('should default to collapsed', () => {
      const node = createNoteNode('Test', null);
      expect(node.isExpanded).toBe(false);
    });

    it('should have a valid ID', () => {
      const node = createNoteNode('Test', null);
      expect(node.id).toBeTruthy();
      expect(typeof node.id).toBe('string');
    });
  });

  describe('createWelcomeData', () => {
    it('should create data with a root node', () => {
      const data = createWelcomeData();
      expect(data.root).toBeDefined();
      expect(data.root.name).toBe('My Notes');
    });

    it('should have root expanded', () => {
      const data = createWelcomeData();
      expect(data.root.isExpanded).toBe(true);
    });

    it('should have one welcome child note', () => {
      const data = createWelcomeData();
      expect(data.root.children).toHaveLength(1);
      expect(data.root.children[0].name).toBe('Welcome');
    });

    it('should have welcome note with content', () => {
      const data = createWelcomeData();
      expect(data.root.children[0].content).toContain('Welcome to TreeNote');
    });

    it('should have metadata', () => {
      const data = createWelcomeData();
      expect(data.metadata.version).toBe('1.0.0');
      expect(data.metadata.createdAt).toBeGreaterThan(0);
    });

    it('should set correct parentId on welcome note', () => {
      const data = createWelcomeData();
      expect(data.root.children[0].parentId).toBe(data.root.id);
    });
  });
});
