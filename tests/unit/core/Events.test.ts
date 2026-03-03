import { describe, it, expect, vi } from 'vitest';
import { Events } from '../../../src/renderer/core/Events';

describe('Events', () => {
  it('should trigger registered callbacks', () => {
    const events = new Events();
    const callback = vi.fn();
    events.on('tree-changed', callback);
    events.trigger('tree-changed');
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should pass arguments to callbacks', () => {
    const events = new Events();
    const callback = vi.fn();
    events.on('note-renamed', callback);
    events.trigger('note-renamed', 'id-1', 'New Name');
    expect(callback).toHaveBeenCalledWith('id-1', 'New Name');
  });

  it('should support multiple listeners for same event', () => {
    const events = new Events();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    events.on('tree-changed', cb1);
    events.on('tree-changed', cb2);
    events.trigger('tree-changed');
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('should remove a listener with off()', () => {
    const events = new Events();
    const callback = vi.fn();
    events.on('tree-changed', callback);
    events.off('tree-changed', callback);
    events.trigger('tree-changed');
    expect(callback).not.toHaveBeenCalled();
  });

  it('should remove a listener with offref()', () => {
    const events = new Events();
    const callback = vi.fn();
    const ref = events.on('tree-changed', callback);
    events.offref(ref);
    events.trigger('tree-changed');
    expect(callback).not.toHaveBeenCalled();
  });

  it('should return an EventRef from on()', () => {
    const events = new Events();
    const ref = events.on('tree-changed', () => {});
    expect(ref).toHaveProperty('id');
    expect(ref).toHaveProperty('eventName', 'tree-changed');
    expect(ref).toHaveProperty('callback');
    expect(ref).toHaveProperty('emitter', events);
  });

  it('should not throw when triggering event with no listeners', () => {
    const events = new Events();
    expect(() => events.trigger('tree-changed')).not.toThrow();
  });

  it('should catch errors in handlers and continue', () => {
    const events = new Events();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badCb = vi.fn(() => {
      throw new Error('handler error');
    });
    const goodCb = vi.fn();

    events.on('tree-changed', badCb);
    events.on('tree-changed', goodCb);

    events.trigger('tree-changed');

    expect(badCb).toHaveBeenCalled();
    expect(goodCb).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should not affect other events when removing listener', () => {
    const events = new Events();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    events.on('tree-changed', cb1);
    events.on('data-saved', cb2);
    events.off('tree-changed', cb1);

    events.trigger('tree-changed');
    events.trigger('data-saved');

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledOnce();
  });
});
