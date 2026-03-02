# ✏️ Yazman

[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![GitHub](https://img.shields.io/badge/View_on_GitHub-blue?logo=github)](https://github.com/edukah/yazman)
[![Live Demo](https://img.shields.io/badge/Demo-View%20Live-orange?logo=google-chrome)](https://edukah.github.io/yazman/)

A modular, lightweight WYSIWYG rich text editor built with vanilla JavaScript. Zero dependencies.

## ✨ Features

- **Block formats**: paragraph, headings (H2, H3), preformatted code, blockquote, ordered/unordered lists
- **Inline formats**: bold, italic, subscript, superscript, hyperlinks
- **Image support**: inline images and figure with figcaption
- **Undo/redo**: configurable history with keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z)
- **Clipboard**: plain-text paste with automatic paragraph splitting
- **Auto-save**: adapter-pattern save with page unload prevention
- **Customizable toolbar**: configurable button groups with overflow scroll
- **Dark mode**: toggle via `.dark-mode` CSS class
- **i18n ready**: Turkish included by default

## 📦 Installation

### CDN / Script Tag

```html
<link rel="stylesheet" href="yazman.min.css">
<script src="yazman.min.js"></script>
```

### npm

```bash
npm install yazman
```

```javascript
import Yazman from 'yazman';
```

## Quick Start

```html
<div id="editor"></div>

<script>
  const editor = new Yazman(document.getElementById('editor'), {
    placeholder: 'Start typing...'
  });
</script>
```

## ⚙️ Configuration

```javascript
const editor = new Yazman(container, options);
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `placeholder` | `string` | `''` | Placeholder text shown when editor is empty |
| `toolbar` | `Array` | See below | Toolbar button configuration |
| `history` | `Object` | See below | Undo/redo settings |
| `autosave` | `Object` | See below | Auto-save settings |
| `ImageUploader` | `Class` | `null` | Custom image uploader class for figure images |
| `onError` | `Function` | `null` | Error callback: `(error, context) => {}` |

### Error Handling

Yazman provides a centralized error handling mechanism via the `onError` callback. All recoverable errors in public API methods (`format`, `insertNode`, `deleteContent`, etc.) and the internal MutationObserver are routed through this callback.

```javascript
const editor = new Yazman(document.getElementById('editor'), {
  placeholder: 'Start typing...',
  onError: (error, context) => {
    // context: { module, operation, ... }
    console.log(error.message, context);
  }
});
```

If `onError` is not provided, errors are logged to `console.error` by default. If the callback itself throws, the editor remains stable.

**Error context structure:**

| Field | Type | Description |
|-------|------|-------------|
| `module` | `string` | Source module (`'editor'`, `'observer'`, `'toolbar'`, `'emitter'`, `'plugin'`) |
| `operation` | `string` | Operation that failed (`'format'`, `'insertNode'`, `'init'`, `'callback'`, etc.) |

**Unrecoverable errors** (invalid constructor arguments) throw immediately:

```javascript
// Throws: 'Yazman: "container" parameter must be a valid DOM element.'
new Yazman(null);
```

### Toolbar

The toolbar is defined as an array of button groups. Each group is an array of format names.

```javascript
toolbar: [
  ['bold', 'italic'],
  ['headerTwo', 'headerThree'],
  ['preformatted', 'blockquote'],
  ['subscript', 'supscript'],
  ['hyperlink'],
  ['figureImage'],
  [{ listItem: 'ordered' }, { listItem: 'unordered' }]
]
```

**Available format names:**

| Name | Format | HTML Tag |
|------|--------|----------|
| `bold` | Bold text | `<strong>` |
| `italic` | Italic text | `<em>` |
| `subscript` | Subscript text | `<sub>` |
| `supscript` | Superscript text | `<sup>` |
| `hyperlink` | Link (opens URL dialog) | `<a>` |
| `headerTwo` | Heading level 2 | `<h2>` |
| `headerThree` | Heading level 3 | `<h3>` |
| `preformatted` | Code block | `<pre>` |
| `blockquote` | Block quote | `<blockquote>` |
| `figureImage` | Image with caption | `<figure>` |
| `{ listItem: 'ordered' }` | Ordered list | `<ol><li>` |
| `{ listItem: 'unordered' }` | Unordered list | `<ul><li>` |

### History (Undo/Redo)

```javascript
history: {
  counterTiming: 2000,   // Save snapshot after this many ms of inactivity (default: 2000)
  saveCoefficient: 6      // Save snapshot after this many consecutive edits (default: 6)
}
```

Keyboard shortcuts: **Ctrl+Z** (undo), **Ctrl+Shift+Z** (redo).

### Auto-save

```javascript
autosave: {
  enable: true,            // Enable auto-save (default: false)
  counterTiming: 5000,     // Save after this many ms of inactivity (default: 36000)
  saveCoefficient: 3,      // Save after this many consecutive edits (default: 40)
  preventUnload: true,     // Warn user before leaving page with unsaved changes (default: false)
  adaptor: function () {   // Save callback - called when auto-save triggers
    const content = editor.paper.exportContent();
    // send content to server
  }
}
```

**Autosave methods:**

| Method | Description |
|--------|-------------|
| `editor.autosave.setBlock(true)` | Temporarily block auto-save |
| `editor.autosave.setBlock(false)` | Resume auto-save |
| `editor.autosave.setGlobalUnLoad(false)` | Disable page unload warning |

## 🔧 API

### Content Operations

#### `editor.format(start, end, formatObj)`

Apply formatting to a range of text.

```javascript
// Apply bold to characters 0-10
editor.format(0, 10, { bold: true });

// Remove bold
editor.format(0, 10, { bold: false });

// Apply hyperlink
editor.format(5, 15, { hyperlink: 'https://example.com' });

// Change block format to heading
editor.format(0, 10, { headerTwo: true });
```

#### `editor.formatLine(start, end, format)`

Apply block-level formatting only (headings, blockquote, preformatted, lists). Does not affect inline formats.

```javascript
editor.formatLine(0, 50, { preformatted: true });
```

#### `editor.formatText(start, end, format)`

Apply inline formatting only (bold, italic, hyperlink, etc.). Does not affect block formats.

```javascript
editor.formatText(0, 10, { bold: true, italic: true });
```

#### `editor.insertNode(nodeObj, index)`

Insert content at the specified character index.

```javascript
// Insert text at position 5
editor.insertNode({ textContent: 'Hello world', format: {} }, 5);

// Insert text with formatting
editor.insertNode({ textContent: 'Bold text', format: { bold: true } }, 10);

// Insert a new paragraph (block format)
editor.insertNode({ textContent: 'New paragraph', format: { paragraph: true }, generateBlock: true }, 20);

// Insert at the end
editor.insertNode({ textContent: 'End text', format: {} }, -1);
```

#### `editor.deleteContent(start, end)`

Delete content in the specified range.

```javascript
editor.deleteContent(5, 15);
```

### Content Import/Export

#### `editor.getContent(start?, end?)`

Export editor content as a structured array. Each element represents a line with its format and children.

```javascript
const content = editor.getContent();
// Returns:
// [
//   {
//     format: { paragraph: true },
//     children: [
//       { textContent: 'Hello ', format: {} },
//       { textContent: 'world', format: { bold: true } }
//     ]
//   },
//   ...
// ]

// Export a specific range
const partial = editor.getContent(0, 50);
```

#### `editor.setContent(contentArray)`

Import content from a structured array (same format as `getContent`).

```javascript
editor.setContent([
  {
    format: { paragraph: true },
    children: [
      { textContent: 'Imported content', format: {} }
    ]
  }
]);
```

#### `editor.getText()`

Get the plain text content of the editor (no formatting).

```javascript
const text = editor.getText();
```

#### `editor.getLength()`

Get the total character length of the editor content.

```javascript
const length = editor.getLength();
```

### Querying Content

#### `editor.paper.getFormat(start, end)`

Get the active formats in a range.

```javascript
const format = editor.paper.getFormat(0, 10);
// Returns: { paragraph: true, bold: true }
```

#### `editor.paper.getLine(index)`

Get the line (block-level format instance) at a character index.

```javascript
const line = editor.paper.getLine(5);
// line.format  → { paragraph: true }
// line.start   → 0
// line.end     → 25
```

#### `editor.paper.getLines(start, end)`

Get all lines in a range.

```javascript
const lines = editor.paper.getLines(0, 100);
```

#### `editor.paper.getNode(index)`

Get the inline node (child) at a character index.

```javascript
const node = editor.paper.getNode(5);
// node.textContent → 'Hello'
// node.format      → { bold: true }
// node.start       → 0
// node.end         → 5
```

#### `editor.paper.getNodes(start, end)`

Get all inline nodes in a range.

```javascript
const nodes = editor.paper.getNodes(0, 50);
```

### Selection / Caret

#### `editor.selection.getCaretPosition()`

Get the current caret position as `[start, end]`. When collapsed (no selection), both values are equal.

```javascript
const [start, end] = editor.selection.getCaretPosition();
```

#### `editor.selection.setCaretPosition([start, end])`

Set the caret position or selection range.

```javascript
// Place caret at position 10
editor.selection.setCaretPosition([10, 10]);

// Select characters 5 to 15
editor.selection.setCaretPosition([5, 15]);
```

#### `editor.selection.isCollapsed()`

Check if the current selection is collapsed (no text selected).

```javascript
if (editor.selection.isCollapsed()) {
  // cursor is at a single point
}
```

### Editor State

#### `editor.update()`

Manually trigger editor state update. Regenerates the Paper model, updates the toolbar, and repositions the caret. Called automatically after most operations.

```javascript
editor.update();
```

#### `editor.isEmpty(insertWarning?, message?)`

Check if the editor is empty. Optionally show a warning message.

```javascript
// Check without warning
if (editor.isEmpty(false)) {
  console.log('Editor is empty');
}

// Check with warning (default behavior)
if (editor.isEmpty()) {
  // warning message is shown on the editor
}

// Check with custom warning message
editor.isEmpty(true, 'Please enter content');
```

#### `editor.isSaved`

Get or set the saved state of the editor.

```javascript
if (!editor.isSaved) {
  // editor has unsaved changes
}

editor.isSaved = true;
```

### Focus

#### `editor.focus(preventScroll?)`

Focus the editor. By default, prevents scroll jump.

```javascript
editor.focus();

// Focus and allow scroll to editor
editor.focus(false);
```

#### `editor.hasFocus()`

Check if the editor currently has focus.

```javascript
if (editor.hasFocus()) {
  // editor is focused
}
```

#### `editor.scrollIntoView()`

Scroll the editor viewport so the current caret position is visible.

```javascript
editor.scrollIntoView();
```

### Enable / Disable

#### `editor.enable()`

Enable editing (set `contenteditable` to true).

```javascript
editor.enable();
```

#### `editor.disable()`

Disable editing (set `contenteditable` to false). The editor becomes read-only.

```javascript
editor.disable();
```

### Lifecycle

#### `editor.destroy()`

Destroy the editor instance. Disconnects the MutationObserver, removes all event listeners, destroys plugins, clears timers (autosave, history), and removes the editor DOM from the container.

```javascript
editor.destroy();
```

### UI

#### `editor.status(content, expire?)`

Show a status message at the bottom of the editor. Disappears after the specified duration.

```javascript
// Show text status
editor.status('Saved!', 3000);

// Show DOM element as status
const el = document.createElement('span');
el.textContent = 'Custom status';
editor.status(el, 5000);
```

#### `editor.dialog.insertModal(domElement, options?)`

Open a modal dialog inside the editor container.

```javascript
const form = document.createElement('div');
form.innerHTML = '<p>Modal content</p>';

editor.dialog.insertModal(form, { backcloth: true });
```

#### `editor.dialog.closeModal()`

Close the currently open modal.

```javascript
editor.dialog.closeModal();
```

### Events

#### `editor.on(event, handler)`

Listen to editor events. Returns the editor instance for chaining.

```javascript
editor.on('text-change', () => {
  console.log('Content changed');
});

editor.on('selection-change', ({ start, end }) => {
  console.log('Caret position:', start, end);
});

editor.on('focus', () => console.log('Editor focused'));
editor.on('blur', () => console.log('Editor blurred'));
```

**Available events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `text-change` | — | Content was modified (typing, paste, etc.) |
| `selection-change` | `{ start, end }` | Caret position or selection range changed |
| `focus` | — | Editor received focus |
| `blur` | — | Editor lost focus |

#### `editor.off(event, handler?)`

Remove an event listener. If no handler is provided, removes all listeners for that event.

```javascript
const onChange = () => console.log('changed');
editor.on('text-change', onChange);
editor.off('text-change', onChange);
```

### Static Methods

#### `Yazman.register(key, FormatClass)`

Register a custom format or module.

```javascript
Yazman.register('format/strikethrough', StrikethroughClass);
```

#### `Yazman.addFormatSet(formatSet)`

Register a format set (group of mutually exclusive formats).

```javascript
Yazman.addFormatSet(['headerTwo', 'headerThree', 'preformatted', 'blockquote']);
```

#### `Yazman.plugin(name, fn)`

Register a plugin. The function receives the editor instance and may return an object with a `destroy()` method for cleanup.

```javascript
Yazman.plugin('word-count', (editor) => {
  const counter = document.createElement('span');

  const onChange = () => {
    counter.textContent = editor.getLength() + ' chars';
    editor.status(counter, 10000);
  };

  editor.on('text-change', onChange);

  return {
    destroy () {
      editor.off('text-change', onChange);
    }
  };
});
```

Plugins are initialized automatically when a new editor instance is created. If a plugin throws during init, it's caught by `handleError` and doesn't prevent the editor from working.

#### `Yazman.help()`

Display an interactive configuration guide in the browser console.

```javascript
Yazman.help();
```

## 🧩 Custom Formats

To create a custom inline format:

```javascript
class Strikethrough extends Yazman.registry.get('pattern/inline') {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: 'S', domNode });
  }

  static getFormat (domNode) {
    return { strikethrough: true };
  }
}

Strikethrough.tagName = 'S';
Strikethrough.formatName = 'strikethrough';
Strikethrough.toolbar = '<svg>...</svg>';

Yazman.register('format/strikethrough', Strikethrough);
```

## Dark Mode

Add the `dark-mode` class to the editor container or any parent element:

```javascript
document.body.classList.add('dark-mode');
```

## Placeholder

Set via the configuration option or HTML attribute:

```html
<div id="editor" data-yazman-placeholder="Type here..."></div>
```

## Development

```bash
npm install
npm run dev       # Dev server at localhost:9006
npm run build     # Production build -> dist/
npm run release   # Build + copy to docs/assets/
```

## 📜 License

[MIT](LICENSE)
