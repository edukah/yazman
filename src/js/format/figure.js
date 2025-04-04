import Container from '../pattern/container.js';
import Block, { BlockEmbed } from '../pattern/block.js';

class Figure extends Container {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: Figure.tagName, domNode });
  }

  optimize () {
    this.domNode.normalize();

    if (this.domNode.previousSibling && this.domNode.previousSibling.__detail) {
      const isChild = Figure.requiredChildren.some((FormatClass) => {
        return this.domNode.previousSibling.__detail instanceof FormatClass;
      });

      if (isChild) {
        this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition());
        this.domNode.insertBefore(this.domNode.previousSibling, this.domNode.childNodes[0]);
      }
    }

    if (this.domNode.nextSibling && this.domNode.nextSibling.__detail) {
      const isChild = Figure.requiredChildren.some((FormatClass) => {
        return this.domNode.nextSibling.__detail instanceof FormatClass;
      });

      if (isChild) {
        this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition());
        this.domNode.appendChild(this.domNode.nextSibling);
      }
    }

    Array.from(this.domNode.childNodes).forEach((child) => {
      const isAllowedChildren = Figure.allowedChildren.some((FormatClass) => {
        return (child.__detail instanceof FormatClass);
      });

      if (isAllowedChildren === false) {
        this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition());
        this.domNode.removeChild(child);
      }
    });

    const missingChildren = Figure.requiredChildren.filter((FormatClass) => {
      const missingChild = [].some.call(this.domNode.childNodes, (child) => {
        return (child.__detail instanceof FormatClass);
      });

      return !missingChild;
    });

    missingChildren.forEach((FormatClass) => {
      this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition());
      const formatInstance = new FormatClass(this.editor);
      const formatDom = formatInstance.domNode;

      this.domNode.appendChild(formatDom);
    });
  }
}

Figure.tagName = 'FIGURE';
Figure.formatName = 'figure';
Figure.toolbar = 'FIGURE';

class FigureImage extends BlockEmbed {
  constructor (editor, { figureImage = null, alt = null, domNode = null } = {}) {
    super(editor, { tagName: FigureImage.tagName, domNode });

    if (domNode != null) {
      figureImage = FigureImage.getFormat(domNode).figureImage;
    }

    if (!figureImage) {
      throw new Error('Yazman FigureImage: `figureImage` (src) parametresi zorunludur.');
    }

    this.domNode.setAttribute('src', figureImage);

    if (alt) {
      this.domNode.setAttribute('alt', alt);
    }
  }

  optimize () {
    this.domNode.normalize();

    if (this.domNode.parentNode.isSameNode(this.editor.root) || !(this.domNode.parentNode.__detail instanceof FigureImage.RequiredContainer)) {
      this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition());

      const formatInstance = new FigureImage.RequiredContainer(this.editor);
      const formatDom = formatInstance.domNode;

      this.domNode.parentNode.insertBefore(formatDom, this.domNode.nextSibling);
      formatDom.appendChild(this.domNode);
    }
  }

  focus () {
    if (!this.domNode.classList.contains('is-focused')) this.domNode.classList.add('is-focused');
  }

  unFocus () {
    this.domNode.classList.remove('is-focused');
  }

  isFocused () {
    return this.domNode.classList.contains('is-focused');
  }

  static getFormat (domNode) {
    return {
      [FigureImage.formatName]: domNode.getAttribute('src')
    };
  }

  static imageHandler (event, editor, { lines, startIndex, endIndex }) {
    const focusedImages = editor.root.querySelectorAll('img.is-focused');
    focusedImages.forEach(image => {
      if (image.__detail.start > endIndex) image.__detail.unFocus();
      if (image.__detail.end < startIndex) image.__detail.unFocus();
    });

    if (event.type === 'click') {
      if (event.target.__detail != null && event.target.__detail instanceof Figcaption !== true) {
        if (event.target.__detail instanceof FigureImage) {
          event.target.__detail.focus();
          editor.selection.setMemCaretPosition([event.target.__detail.start, event.target.__detail.start]);
        }
      }
    }

    lines.forEach(line => {
      if (line instanceof FigureImage) {
        line.focus();
      }
    });
  }

  static deleteHandler (event, editor, { lines, startIndex, endIndex }) {
    if (!lines.length) return;

    lines.forEach(line => {
      if (line instanceof FigureImage && line.parent && line.parent instanceof Figure && line.start <= startIndex) {
        if (line.start < startIndex) {
          const newLineStartIndex = startIndex > 0 ? startIndex - 1 : 0;
          editor.selection.setMemCaretPosition([newLineStartIndex, newLineStartIndex]);
        }

        line.parent.domNode.remove();

        event.preventDefault();

        return false;
      }
    });
  }

  static enterKeyHandler (event, editor, { lines, startIndex, endIndex }) {
    if (!lines.length) return;

    if (lines[0] instanceof FigureImage) {
      if (!lines[0].domNode.parentNode.previousSibling) {
        editor.insertNode({ format: { paragraph: true } }, 0);
        editor.selection.setMemCaretPosition([0, 0]);
      } else {
        editor.insertNode({ format: { paragraph: true } }, lines[0].parent.end + 1); // +1 for line break
        editor.selection.setMemCaretPosition([lines[0].parent.next.start, lines[0].parent.next.start]);
      }

      event.preventDefault();

      return false;
    }
  }

  static arrowKeyHandlerLR (event, editor, { lines, startIndex, endIndex }) {
    if (!lines.length) return;

    if (lines[0] instanceof FigureImage && startIndex === endIndex) {
      if (event.keyCode === 37) {
        if (lines[0].end === startIndex) {
          editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(v => lines[0].start - 1));

          event.preventDefault();

          return false;
        }
      }

      if (event.keyCode === 39) {
        if (lines[0].start === startIndex) {
          editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(v => lines[0].end + 1));

          event.preventDefault();

          return false;
        }
      }
    }
  }

  static toolbarListener (event, editor) {
    const imageInsertCallBack = (path) => {
      if (!editor.hasFocus()) editor.focus();

      let target = event.target;
      while (target && target.tagName !== 'SPAN') {
        target = target.parentNode;
      }

      const [startIndex, endIndex] = editor.selection.getMemCaretPosition();

      const formatName = target.__detail.format.formatName;
      const format = {};
      format[formatName] = path;

      editor.selection.setMemCaretPosition([startIndex, endIndex]);
      const image = editor.insertNode({ format }, startIndex);
      editor.selection.setMemCaretPosition([startIndex + 3, startIndex + 3]);

      editor.update();
      editor.scrollIntoView();

      return image;
    };

    const caretPos = editor.selection.getMemCaretPosition();
    editor.selection.setMemCaretPosition([caretPos[0], caretPos[0]]);

    const line = editor.paper.getLine(caretPos[0]);
    if (line instanceof FigureImage || line instanceof Figcaption) {
      const figureStart = line.domNode.parentNode.__detail.start > 0 ? line.domNode.parentNode.__detail.start - 1 : 0;
      editor.selection.setMemCaretPosition([figureStart, figureStart]);
    }

    new editor.ImageUploader(editor, imageInsertCallBack);
    editor.imageInsertCallBack = imageInsertCallBack;
  }
}

FigureImage.tagName = 'IMG';
FigureImage.formatName = 'figureImage';
FigureImage.EVENT = [{ type: 'keydown', keyCode: [8, 46], function: FigureImage.deleteHandler }, { type: 'keydown', keyCode: 13, function: FigureImage.enterKeyHandler }, { type: 'keydown', keyCode: [37, 39], function: FigureImage.arrowKeyHandlerLR }, { function: FigureImage.imageHandler }];
FigureImage.toolbar = '<svg enable-background="new 0 0 488.471 488.471" version="1.1" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m2 4c-1.10444 0-2 0.89556-2 2v20c0 1.10451 0.895556 2 2 2h28c1.10451 0 2-0.89555 2-2v-20c6.5e-5 -1.10444-0.89549-2-2-2zm2 4h24v14l-8-8-10 10h-6zm7 2c-0.767769 0-1.53504 0.29337-2.12083 0.87917-1.17159 1.17159-1.17159 3.07007 0 4.24167 1.17159 1.17159 3.07007 1.17159 4.24167 0 1.17159-1.1716 1.17159-3.07008 0-4.24167-0.585796-0.5858-1.35306-0.87917-2.12083-0.87917z"/></svg>';
FigureImage.allowedBlockFormat = [];
FigureImage.allowedInlineFormat = [];
FigureImage.RequiredContainer = Figure;

class Figcaption extends Block {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: Figcaption.tagName, domNode });

    this.domNode.classList.add('is-empty');
    this.domNode.setAttribute('data-yazman-placeholder', this.editor.language.get('contentFigcaptionPlaceholder'));
  }

  optimize () {
    this.domNode.normalize();

    const [startIndex, endIndex] = this.editor.selection.getMemCaretPosition();

    /* Önünde arkasında figcaption var ise textleri birleştirip tag'ları siliyor */
    if (this.prev && this.prev instanceof Figcaption) {
      if (this.prev.textContent && this.prev.textContent.length) {
        this.domNode.textContent = this.prev.textContent + this.textContent;
      }

      this.prev.domNode.remove();
    }

    if (this.next && this.next instanceof Figcaption) {
      if (this.next.textContent && this.next.textContent.length) {
        this.domNode.textContent += this.next.textContent;
      }

      this.next.domNode.remove();
    }
    /* ---------------------------------------------------------------- */

    /* Döngüyü Bozuyor */
    if (this.domNode.textContent.length || (startIndex <= this.domNode.__detail.start && endIndex >= this.domNode.__detail.start)) {
      if (this.domNode.classList.contains('is-empty')) {
        this.domNode.classList.remove('is-empty');
      }
    } else {
      if (!this.domNode.classList.contains('is-empty')) {
        this.domNode.classList.add('is-empty');
      }
    }

    if (!this.domNode.firstChild) {
      this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition());
      this.domNode.innerHTML = '<br>';
    }
  }

  static backspaceKeyHandler (event, editor, { lines, startIndex, endIndex }) {
    if (startIndex !== endIndex || (startIndex === endIndex && startIndex === 0)) return;
    if (!lines.length) return;

    if (lines[0] instanceof Figcaption) {
      if (lines[0].start === endIndex) {
        event.preventDefault();

        return false;
      }
    }
  }

  static deleteKeyHandler (event, editor, { lines, startIndex, endIndex }) {
    if (startIndex !== endIndex || (startIndex === endIndex && startIndex === 0)) return;
    if (!lines.length) return;

    if (lines[0] instanceof Figcaption) {
      if ((lines[0].length <= 2 && lines[0].children[0] instanceof editor.registry.get('format/break')) || lines[0].end === endIndex) {
        event.preventDefault();
      }
    }
  }

  static enterKeyHandler (event, editor, { lines, startIndex, endIndex }) {
    if (!lines.length) return;

    if (lines[0] instanceof Figcaption) {
      editor.insertNode({ format: { paragraph: true } }, lines[0].end + 1);
      editor.selection.setMemCaretPosition([lines[0].end + 1, lines[0].end + 1]);

      event.preventDefault();

      return false;
    }
  }
}

Figcaption.tagName = 'FIGCAPTION';
Figcaption.formatName = 'figcaption';
Figcaption.RequiredContainer = Figure;
Figcaption.EVENT = [{ type: 'keydown', keyCode: /* Backspace */ 8, function: Figcaption.backspaceKeyHandler }, { type: 'keydown', keyCode: /* Delete */ 46, function: Figcaption.deleteKeyHandler }, { type: 'keydown', keyCode: 13, function: Figcaption.enterKeyHandler }];
Figcaption.allowedBlockFormat = [];

Figure.requiredChildren = [FigureImage, Figcaption];
Figure.allowedChildren = [FigureImage, Figcaption];

export { Figure, FigureImage, Figcaption };
