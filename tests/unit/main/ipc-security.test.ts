import { afterEach, describe, expect, it } from 'vitest';
import { isTrustedIpcSender } from '../../../src/main/ipc-security';

describe('isTrustedIpcSender', () => {
  const originalRendererUrl = process.env.ELECTRON_RENDERER_URL;

  afterEach(() => {
    if (originalRendererUrl === undefined) {
      delete process.env.ELECTRON_RENDERER_URL;
    } else {
      process.env.ELECTRON_RENDERER_URL = originalRendererUrl;
    }
  });

  it('rejects null or detached frames', () => {
    expect(isTrustedIpcSender(null)).toBe(false);
    expect(isTrustedIpcSender({ url: 'file:///app/index.html', detached: true } as never)).toBe(
      false,
    );
  });

  it('allows file: protocol in production', () => {
    delete process.env.ELECTRON_RENDERER_URL;

    expect(
      isTrustedIpcSender({
        url: 'file:///C:/app/out/renderer/index.html',
        detached: false,
      } as never),
    ).toBe(true);
    expect(isTrustedIpcSender({ url: 'https://evil.example', detached: false } as never)).toBe(
      false,
    );
  });

  it('allows only the Vite renderer origin in development', () => {
    process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173/';

    expect(isTrustedIpcSender({ url: 'http://localhost:5173/', detached: false } as never)).toBe(
      true,
    );
    expect(
      isTrustedIpcSender({ url: 'http://localhost:5173/src/main.ts', detached: false } as never),
    ).toBe(true);
    expect(
      isTrustedIpcSender({
        url: 'http://localhost:5173.attacker.com/',
        detached: false,
      } as never),
    ).toBe(false);
  });
});
