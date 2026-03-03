import { describe, it, expect, beforeAll } from 'vitest';
import { createEl, createDiv, createSpan, installDomExtensions } from '../../../src/renderer/helpers/dom';

describe('dom helpers', () => {
  beforeAll(() => {
    installDomExtensions();
  });

  describe('createEl', () => {
    it('should create an element with the given tag', () => {
      const el = createEl('button');
      expect(el.tagName).toBe('BUTTON');
    });

    it('should apply class names', () => {
      const el = createEl('div', { cls: 'foo bar' });
      expect(el.classList.contains('foo')).toBe(true);
      expect(el.classList.contains('bar')).toBe(true);
    });

    it('should set text content', () => {
      const el = createEl('span', { text: 'hello' });
      expect(el.textContent).toBe('hello');
    });

    it('should set attributes', () => {
      const el = createEl('input', { attr: { type: 'text', placeholder: 'hi' } });
      expect(el.getAttribute('type')).toBe('text');
      expect(el.getAttribute('placeholder')).toBe('hi');
    });

    it('should append to parent', () => {
      const parent = document.createElement('div');
      createEl('span', { parent, text: 'child' });
      expect(parent.children).toHaveLength(1);
      expect(parent.children[0].textContent).toBe('child');
    });

    it('should work with no options', () => {
      const el = createEl('div');
      expect(el.tagName).toBe('DIV');
    });
  });

  describe('createDiv', () => {
    it('should create a div element', () => {
      const el = createDiv();
      expect(el.tagName).toBe('DIV');
    });

    it('should pass options through', () => {
      const el = createDiv({ cls: 'test', text: 'hello' });
      expect(el.classList.contains('test')).toBe(true);
      expect(el.textContent).toBe('hello');
    });
  });

  describe('createSpan', () => {
    it('should create a span element', () => {
      const el = createSpan();
      expect(el.tagName).toBe('SPAN');
    });
  });

  describe('HTMLElement extensions', () => {
    it('empty() should remove all children', () => {
      const el = document.createElement('div');
      el.appendChild(document.createElement('span'));
      el.appendChild(document.createElement('span'));
      expect(el.children).toHaveLength(2);
      el.empty();
      expect(el.children).toHaveLength(0);
    });

    it('addClass() should add class names', () => {
      const el = document.createElement('div');
      el.addClass('a', 'b');
      expect(el.classList.contains('a')).toBe(true);
      expect(el.classList.contains('b')).toBe(true);
    });

    it('removeClass() should remove class names', () => {
      const el = document.createElement('div');
      el.classList.add('a', 'b');
      el.removeClass('a');
      expect(el.classList.contains('a')).toBe(false);
      expect(el.classList.contains('b')).toBe(true);
    });

    it('toggleClass() should toggle a class', () => {
      const el = document.createElement('div');
      el.toggleClass('active');
      expect(el.classList.contains('active')).toBe(true);
      el.toggleClass('active');
      expect(el.classList.contains('active')).toBe(false);
    });

    it('toggleClass() should support force parameter', () => {
      const el = document.createElement('div');
      el.toggleClass('active', true);
      expect(el.classList.contains('active')).toBe(true);
      el.toggleClass('active', true);
      expect(el.classList.contains('active')).toBe(true);
      el.toggleClass('active', false);
      expect(el.classList.contains('active')).toBe(false);
    });
  });
});
