# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yazman is a modular WYSIWYG rich text editor built with vanilla JavaScript. It produces a `contenteditable` div with toolbar, undo/redo, clipboard handling, and autosave. It's consumed by Dukkan (e-commerce platform), Bikonuvar, and Burtest as a UMD library (`window.Yazman`).

## Build & Development

```bash
npm run dev      # Webpack dev server on localhost:9006 (or https://yazman.dev:9006 with local SSL)
npm run build    # Production build → dist/yazman.min.js + dist/yazman.min.css
npm run release  # Build + copy to docs/assets/
```

No test framework is configured. There are no tests.

## Architecture

### Dual-Model Design

The editor maintains two models in sync:
1. **DOM Model** — the live `contenteditable` tree users interact with
2. **Paper Model** (`engine/paper.js`) — a serialized array of "lines" (block-level elements) used for all editing operations, content export/import, and undo/redo

All edit operations use `[start, end]` character indices, not DOM nodes. `Paper.getLine(index)` and `Paper.getLines(start, end)` resolve positions to format instances.

### Format Class Hierarchy

```
Parent (pattern/parent.js) — base interface for all formats
├── Block (pattern/block.js) — one element per line (p, h2, h3, pre, blockquote, li)
│   └── BlockEmbed — non-text block (figure image)
├── Container (pattern/container.js) — wraps blocks (ul, ol)
├── Inline (pattern/inline.js) — spans within a block (strong, em, a, sup, sub)
│   └── InlineEmbed — non-text inline (img)
└── Text (format/text.js) — wraps native TextNode
```

Every DOM node stores `domNode.__detail` pointing to its format instance for O(1) lookup. Format instances store a back-reference via `this.domNode`.

### Registry Pattern

All formats and modules are registered via `Yazman.register(key, Class)` into a singleton `Registry` (Map-based). Keys follow `format/name` or `module/name` convention. Registration happens in `src/js/index.js`.

### Engine Layer (`src/js/engine/`)

| File | Role |
|------|------|
| `editor.js` | Main `Yazman` class — constructor, `format()`, `insertNode()`, `deleteContent()`, `update()` |
| `paper.js` | Content model — `generate()`, `initialize()`, `importContent()`, `exportContent()` |
| `observer.js` | MutationObserver — detects DOM changes, instantiates formats, calls `update()`/`optimize()` |
| `event.js` | Event delegation — keyboard, mouse, input events; format-specific event handlers |
| `selection.js` | Caret management — `getCaretPosition()`, `setCaretPosition()` as `[start, end]` indices |
| `range.js` | Range utilities |

### Format Change Flow

1. User types/pastes → `event.js` fires `textChange`
2. `observer.js` detects DOM mutations → calls `format.update()` and `format.optimize()` on affected lines
3. `paper.js` regenerates line array (`generate()`)
4. Lines with `changeStatus = true` get DOM updates via `paper.initialize()`
5. Toolbar updates active format state

### Modules (`src/js/module/`)

- **toolbar.js** — button groups, active state highlighting, overflow scroll
- **history.js** — undo/redo stack with configurable timing (`counterTiming`, `saveCoefficient`)
- **clipboard.js** — plain-text paste, splits on newlines into paragraphs
- **autosave.js** — adapter-pattern save with `preventUnload` support
- **dialog.js** — modal forms (used by hyperlink format)

### Format Classification Maps (in `editor.js`)

Formats are classified into `CONTAINER_LEVEL_ELEMENT`, `BLOCK_LEVEL_ELEMENT`, `INLINE_ELEMENT`, and `EMBED_ELEMENT` Maps. These control what formatting operations are valid in a given context.

## SCSS

- `src/scss/main.scss` — all editor styles (~450 lines)
- `src/scss/_variables.scss` — CSS custom properties, theme colors, breakpoint (667px)
- BEM-ish naming: `.yazman-container`, `.yazman`, `.yazman-toolbar`
- Dark mode via `.dark-mode` class
- Placeholder text via `data-yazman-placeholder` attribute + CSS `::before`

## Editor API

```javascript
const editor = new Yazman(containerElement, {
  placeholder: 'Type here...',
  toolbar: { /* button config */ },
  history: { counterTiming: 2000, saveCoefficient: 6 },
  autosave: { enable: true, counterTiming: 5000, adaptor: fn, preventUnload: true },
  ImageUploader: CustomUploaderClass
});

editor.format(start, end, formatObj);  // Apply formatting
editor.insertNode(/* ... */);          // Insert content
editor.deleteContent(start, end);      // Delete range
editor.update();                       // Regenerate Paper + update UI
editor.isEmpty();                      // Check if editor has content
editor.focus();                        // Focus the editor
```

## Conventions

- Format classes define static properties: `tagName`, `formatName`, `toolbar` (SVG icon string)
- Each format can register keyboard event handlers via `EVENT` array: `{ type, keyCode, fn }`
- Turkish is used for UI text (`src/js/language/tr.js`) and some development notes
- Inline formats auto-merge adjacent same-type elements in `optimize()`
- Empty blocks always contain a `<br>` placeholder (via Break format)
