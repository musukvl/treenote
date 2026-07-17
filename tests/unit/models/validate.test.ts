import { describe, it, expect } from 'vitest';
import { validateTreeData } from '../../../src/shared/validate-tree-data';

describe('validateTreeData', () => {
  const validData = {
    root: {
      id: 'root-1',
      name: 'Root',
      content: '',
      children: [
        {
          id: 'child-1',
          name: 'Child',
          content: 'Some text',
          children: [],
          parentId: 'root-1',
          createdAt: 1000,
          updatedAt: 2000,
          isExpanded: false,
        },
      ],
      parentId: null,
      createdAt: 1000,
      updatedAt: 2000,
      isExpanded: true,
    },
    metadata: {
      version: '1.0.0',
      createdAt: 1000,
      updatedAt: 2000,
    },
  };

  it('should accept valid TreeData', () => {
    expect(validateTreeData(validData)).toEqual(validData);
  });

  it('should reject null', () => {
    expect(validateTreeData(null)).toBeNull();
  });

  it('should reject non-object', () => {
    expect(validateTreeData('string')).toBeNull();
    expect(validateTreeData(42)).toBeNull();
  });

  it('should reject missing root', () => {
    expect(validateTreeData({ metadata: validData.metadata })).toBeNull();
  });

  it('should reject missing metadata', () => {
    expect(validateTreeData({ root: validData.root })).toBeNull();
  });

  it('should reject root without id', () => {
    const bad = { ...validData, root: { ...validData.root, id: '' } };
    expect(validateTreeData(bad)).toBeNull();
  });

  it('should reject root without children array', () => {
    const bad = { ...validData, root: { ...validData.root, children: 'not-array' } };
    expect(validateTreeData(bad)).toBeNull();
  });

  it('should reject metadata without version string', () => {
    const bad = { ...validData, metadata: { ...validData.metadata, version: 123 } };
    expect(validateTreeData(bad)).toBeNull();
  });

  it('should reject invalid child node', () => {
    const bad = {
      ...validData,
      root: { ...validData.root, children: [{ notANode: true }] },
    };
    expect(validateTreeData(bad)).toBeNull();
  });
});
