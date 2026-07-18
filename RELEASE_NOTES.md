# TreeNote v1.0.7 Release Notes

## Overview

File-type release. TreeNote notes now use the dedicated `.tnyml` extension (content is still YAML inside), the OS registers `.tnyml` with a TreeNote document icon, and double-clicking a `.tnyml` file opens it in TreeNote on all platforms.

## File type: `.tnyml`

- **New extension**: the default data file is now `notes.tnyml`; the Open File dialog filters on `*.tnyml`; CLI positional arguments accept `.tnyml` paths.
- **File association**: the Windows installer registers `.tnyml` (ProgID `TreeNote Note`) with a document-style icon and an `Open with TreeNote` command. macOS gets `CFBundleDocumentTypes`, Linux gets a `application/x-treenote` mime type in the desktop entry.
- **Document icon**: new `.tnyml` file icon derived from the app icon (page with the TreeNote tree badge), shipped as `.ico` / `.icns` / `.png`; regenerate with `node __scripts/generate-file-icon.cjs`.
- **"Open with" works while running**: opening a `.tnyml` file from Explorer/Finder now switches the running instance to that file (macOS `open-file` event; Windows/Linux second-instance argv). Pending edits are flushed to the previous file first.
- **Linux desktop integration**: `build-linux.sh` installs the mime XML, mime icon, and a desktop entry, then refreshes the xdg mime/desktop databases so AppImage users get the association too.

## Breaking change

- `.yaml` / `.yml` files are no longer picked up automatically. Rename an existing `notes.yaml` to `notes.tnyml`, or open it once via File → Open with the "All Files" filter.

## Downloads (Windows)

| Artifact               | Description         |
| ---------------------- | ------------------- |
| `TreeNote Setup *.exe` | NSIS installer      |
| `TreeNote *.exe`       | Portable executable |

## Downloads (macOS)

See previous release notes for Homebrew / DMG install paths when a macOS build is published for this version.
