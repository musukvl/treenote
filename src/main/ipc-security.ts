import type { WebFrameMain } from 'electron';

/**
 * Returns whether an IPC sender frame is from this app's renderer.
 * Development: Vite renderer origin. Production: file: protocol only.
 */
export function isTrustedIpcSender(frame: WebFrameMain | null): boolean {
  if (!frame || frame.detached) {
    return false;
  }

  // Capture URL immediately — senderFrame can become null after awaits.
  let url: URL;
  try {
    url = new URL(frame.url);
  } catch {
    return false;
  }

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    try {
      return url.origin === new URL(rendererUrl).origin;
    } catch {
      return false;
    }
  }

  return url.protocol === 'file:';
}
