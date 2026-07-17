import { app, type WebContents } from 'electron';

/**
 * Returns whether a renderer-initiated navigation URL is allowed.
 * Production denies all navigation; development allows only the Vite
 * renderer origin (ELECTRON_RENDERER_URL).
 */
export function isAllowedNavigation(navigationUrl: string): boolean {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (!rendererUrl) {
    return false;
  }

  try {
    const allowed = new URL(rendererUrl);
    const target = new URL(navigationUrl);
    return target.origin === allowed.origin;
  } catch {
    return false;
  }
}

function attachNavigationGuards(contents: WebContents): void {
  contents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedNavigation(navigationUrl)) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

/**
 * Deny unexpected navigation and window.open for every WebContents.
 * Must be registered before any BrowserWindow is created.
 */
export function registerNavigationGuards(): void {
  app.on('web-contents-created', (_event, contents) => {
    attachNavigationGuards(contents);
  });
}
