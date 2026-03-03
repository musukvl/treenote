import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Component } from '../../../src/renderer/core/Component';
import { Events } from '../../../src/renderer/core/Events';

describe('Component', () => {
  let component: Component;

  beforeEach(() => {
    component = new Component();
  });

  it('should not be loaded initially', () => {
    expect(component.loaded).toBe(false);
  });

  it('should call onload when loaded', () => {
    const spy = vi.spyOn(component, 'onload');
    component.load();
    expect(spy).toHaveBeenCalledOnce();
    expect(component.loaded).toBe(true);
  });

  it('should not double-load', () => {
    const spy = vi.spyOn(component, 'onload');
    component.load();
    component.load();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('should call onunload when unloaded', () => {
    const spy = vi.spyOn(component, 'onunload');
    component.load();
    component.unload();
    expect(spy).toHaveBeenCalledOnce();
    expect(component.loaded).toBe(false);
  });

  it('should not unload if not loaded', () => {
    const spy = vi.spyOn(component, 'onunload');
    component.unload();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should load children when parent is loaded', () => {
    component.load();
    const child = new Component();
    const spy = vi.spyOn(child, 'onload');
    component.addChild(child);
    expect(spy).toHaveBeenCalledOnce();
    expect(child.loaded).toBe(true);
  });

  it('should defer child loading until parent loads', () => {
    const child = new Component();
    component.addChild(child);
    expect(child.loaded).toBe(false);
    component.load();
    expect(child.loaded).toBe(true);
  });

  it('should unload children when parent unloads', () => {
    component.load();
    const child = new Component();
    component.addChild(child);
    expect(child.loaded).toBe(true);
    component.unload();
    expect(child.loaded).toBe(false);
  });

  it('should remove and unload a child', () => {
    component.load();
    const child = new Component();
    component.addChild(child);
    component.removeChild(child);
    expect(child.loaded).toBe(false);
  });

  it('should run registered cleanup callbacks on unload', () => {
    const cleanup = vi.fn();
    component.load();
    component.register(cleanup);
    component.unload();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('should detach event refs on unload', () => {
    const events = new Events();
    const callback = vi.fn();
    const ref = events.on('tree-changed', callback);

    component.load();
    component.registerEvent(ref);
    component.unload();

    // Trigger after unload - callback should NOT fire
    events.trigger('tree-changed');
    expect(callback).not.toHaveBeenCalled();
  });

  it('should remove DOM event listeners on unload', () => {
    const el = document.createElement('div');
    const callback = vi.fn();

    component.load();
    component.registerDomEvent(el, 'click', callback);

    // Click should fire
    el.click();
    expect(callback).toHaveBeenCalledOnce();

    component.unload();

    // Click after unload should NOT fire
    el.click();
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should clear intervals on unload', () => {
    const clearSpy = vi.spyOn(window, 'clearInterval');
    component.load();
    const id = window.setInterval(() => {}, 1000);
    component.registerInterval(id);
    component.unload();
    expect(clearSpy).toHaveBeenCalledWith(id);
    clearSpy.mockRestore();
  });
});
