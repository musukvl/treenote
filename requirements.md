# Treenote - Functional Requirements

## Overview

Treenote is a notes management application that organizes notes in a hierarchical tree structure.

## Similar applciations
* Obsidian - but it has folders to create the tree hierarchy instead of using documents as tree node.
* Confluense - allows to organize documents in tree as planned, but saas solution, not a single executable.
* OneNote - single file, but too complex structure.


## Core Features

### Note Management

- Notes are organized in a tree hierarchy (parent-child relationships)
- Each note has a node name and content
- Users can create, rename, and delete notes
- Users can create child notes under any existing note
- Notes persist between sessions

### User Interface

- Split-panel layout with tree view and editor
- Tree view displays the note hierarchy
- Editor displays and allows editing of the selected note's title and content
- Search panel allows filtering notes by title or content
- Menu bar provides access to all actions
- Scrollbars indicate when content exceeds visible area

### Navigation

- Users can navigate between tree, editor, and search using keyboard shortcuts
- Users can select notes in the tree to view/edit them
- Search filters the tree view to show matching notes (search goes through node name and note content)
- Search filter should be case insensitive

### Data Persistence

- Notes are stored in a single a file
- Changes are auto-saved after a short delay
- Manual save is available via keyboard shortcut
- New file is created with a welcome note if none exists

### Keyboard Shortcuts

- Quick access to common actions (save, quit, new note, etc.)
- Standard text editing shortcuts in the editor
- Focus switching between panels

### Logging

- Optional debug logging for troubleshooting
- Logs capture application events and errors

## Non-Functional Requirements

- Application runs as single executable without dependencies on extra databases or other running processes installed separately
- Responsive UI that handles keyboard input without lag
- Graceful handling of edge cases (empty titles, missing files)
