import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAllowedNavigation, registerNavigationGuards } from '../../../src/main/navigation-guards';

const { appOn, webContentsCreatedCallbacks } = vi.hoisted(() => {
  const callbacks: Array<(event: unknown, contents: unknown) => void> = [];
  return {
    webContentsCreatedCallbacks: callbacks,
    appOn: vi.fn((event: string, callback: (event: unknown, contents: unknown) => void) => {
      if (event === 'web-contents-created') {
        callbacks.push(callback);
      }
    }),
  };
});

vi.mock('electron', () => ({
  app: {
    on: appOn,
  },
}));

describe('isAllowedNavigation', () => {
  const originalRendererUrl = process.env.ELECTRON_RENDERER_URL;

  afterEach(() => {
    if (originalRendererUrl === undefined) {
      delete process.env.ELECTRON_RENDERER_URL;
    } else {
      process.env.ELECTRON_RENDERER_URL = originalRendererUrl;
    }
  });

  it('denies all navigation when ELECTRON_RENDERER_URL is unset (production)', () => {
    delete process.env.ELECTRON_RENDERER_URL;

    expect(isAllowedNavigation('https://evil.example')).toBe(false);
    expect(isAllowedNavigation('file:///tmp/index.html')).toBe(false);
  });

  it('allows navigation only to the Vite renderer origin in development', () => {
    process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173/';

    expect(isAllowedNavigation('http://localhost:5173/')).toBe(true);
    expect(isAllowedNavigation('http://localhost:5173/src/main.ts')).toBe(true);
    expect(isAllowedNavigation('http://localhost:5173.attacker.com/')).toBe(false);
    expect(isAllowedNavigation('https://evil.example')).toBe(false);
  });

  it('denies invalid URLs', () => {
    process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173/';

    expect(isAllowedNavigation('not-a-url')).toBe(false);
  });
});

describe('registerNavigationGuards', () => {
  beforeEach(() => {
    webContentsCreatedCallbacks.length = 0;
    vi.clearAllMocks();
    delete process.env.ELECTRON_RENDERER_URL;
  });

  it('registers a web-contents-created listener that denies navigation and window.open', () => {
    const preventDefault = vi.fn();
    const setWindowOpenHandler = vi.fn();
    const contentsOn = vi.fn();

    registerNavigationGuards();

    expect(appOn).toHaveBeenCalledWith('web-contents-created', expect.any(Function));
    expect(webContentsCreatedCallbacks).toHaveLength(1);

    webContentsCreatedCallbacks[0]!(
      {},
      {
        on: contentsOn,
        setWindowOpenHandler,
      },
    );

    expect(contentsOn).toHaveBeenCalledWith('will-navigate', expect.any(Function));
    expect(setWindowOpenHandler).toHaveBeenCalledWith(expect.any(Function));

    const willNavigate = contentsOn.mock.calls[0]![1] as (
      event: { preventDefault: () => void },
      url: string,
    ) => void;
    willNavigate({ preventDefault }, 'https://evil.example');
    expect(preventDefault).toHaveBeenCalled();

    const windowOpenHandler = setWindowOpenHandler.mock.calls[0]![0] as () => {
      action: string;
    };
    expect(windowOpenHandler()).toEqual({ action: 'deny' });
  });

  it('allows will-navigate to the Vite renderer origin', () => {
    process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173/';

    const preventDefault = vi.fn();
    const contentsOn = vi.fn();

    registerNavigationGuards();
    webContentsCreatedCallbacks[0]!(
      {},
      {
        on: contentsOn,
        setWindowOpenHandler: vi.fn(),
      },
    );

    const willNavigate = contentsOn.mock.calls[0]![1] as (
      event: { preventDefault: () => void },
      url: string,
    ) => void;
    willNavigate({ preventDefault }, 'http://localhost:5173/');
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
