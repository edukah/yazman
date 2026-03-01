# Yazman

A modular, lightweight WYSIWYG rich text editor built with vanilla JavaScript. Zero dependencies.

## Features

- Block formats: paragraph, headings (H2, H3), preformatted code, blockquote, ordered/unordered lists
- Inline formats: bold, italic, subscript, superscript, hyperlinks
- Image support with figure/figcaption
- Undo/redo history
- Clipboard paste handling
- Auto-save with page unload prevention
- Customizable toolbar
- Dark mode support
- i18n ready (Turkish included)

## Installation

```html
<link rel="stylesheet" href="yazman.min.css">
<script src="yazman.min.js"></script>
```

Or via npm:

```bash
npm install yazman
```

```javascript
import Yazman from 'yazman';
```

## Usage

```html
<div id="editor"></div>

<script>
  const editor = new Yazman(document.getElementById('editor'), {
    placeholder: 'Start typing...'
  });
</script>
```

### Configuration

```javascript
new Yazman(container, {
  placeholder: 'Start typing...',
  toolbar: [
    ['bold', 'italic'],
    ['headerTwo', 'headerThree'],
    ['preformatted', 'blockquote'],
    ['subscript', 'supscript'],
    ['hyperlink'],
    ['figureImage'],
    [{ listItem: 'ordered' }, { listItem: 'unordered' }]
  ],
  history: {
    counterTiming: 2000,
    saveCoefficient: 6
  },
  autosave: {
    enable: true,
    counterTiming: 5000,
    saveCoefficient: 3,
    preventUnload: true,
    adaptor: function () {
      // save logic
    }
  },
  ImageUploader: CustomUploaderClass
});
```

### API

```javascript
// Content operations
editor.format(start, end, { bold: true });
editor.insertNode({ textContent: 'Hello', format: {} }, index);
editor.deleteContent(start, end);

// State
editor.isEmpty();
editor.isSaved;

// Focus
editor.focus();
editor.hasFocus();

// Update editor state
editor.update();

// Status message
editor.status('Saved!', 3000);
```

## Console Help

You can access a built-in console reference using:

```js
Yazman.help();
```

This will display a styled, interactive configuration guide in the browser console.

## Development

```bash
npm install
npm run dev       # Dev server at localhost:9006
npm run build     # Production build → dist/
npm run release   # Build + copy to docs/assets/
```

## License

[MIT](LICENSE)
