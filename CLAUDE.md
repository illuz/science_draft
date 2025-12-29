# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A uTools desktop plugin called "智能理科草稿本" (Intelligent Science Draft Notebook) - a productivity tool for science students with math calculations, drawing capabilities, and folder-based project management.

## Tech Stack

- React 18+ with Vite
- uTools Plugin API (desktop plugin framework)
- Node.js bridge via preload.js for file operations
- math.js for calculations

## Build Commands

No package.json exists yet. When configured, standard Vite commands apply:
```bash
npm run dev      # Development server
npm run build    # Production build
```

## Architecture

### Plugin Entry Flow
`plugin.json` defines entry commands (草稿, 计算, calc, 绘图, draft) → `index.html` loads → `preload.js` exposes `window.services` for Node.js file operations.

### Key Components
- **index.html / editor_logic.js** - Main editor UI with canvas drawing (undo/redo stack of 20 states)
- **preload.js** - Node.js bridge exposing `window.services.selectFolder()`, `saveToFolder()`, `loadFromFolder()`
- **src/App.jsx** - React router that listens to `window.utools.onPluginEnter()` and routes to Hello/Read/Write components

### File Operations Pattern
Projects are saved as timestamped folders (`YYYYMMDD_HHMM_草稿计算器/`) containing:
- `draft.txt` - Text content
- `img_*.png` - Images (base64 encoded)
- `project.json` - Metadata

### uTools APIs Used
- `window.utools.onPluginEnter/onPluginOut` - Lifecycle
- `window.utools.showOpenDialog` - File/folder dialogs
- `window.utools.showNotification` - User feedback
- `window.utools.shellShowItemInFolder` - Open in explorer

## UI Theme

Dark theme with background #303133, text #E0E0E0. All UI is in Chinese.
