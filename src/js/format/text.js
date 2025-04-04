class Text {
  constructor (editor, { text = null, domNode = null }) {
    this.editor = editor;

    if (domNode instanceof window.Node && !(domNode instanceof window.Element)) {
      this.domNode = domNode;
    } else {
      this.domNode = document.createTextNode(text);
    }

    this.format = this.getFormat();
    this.children = [];
    this.changeStatus = this.domNode.__detail ? this.domNode.__detail.changeStatus : false;

    this.domNode.__detail = this;
  }

  get start () {
    if (this.domNode.previousSibling && this.domNode.previousSibling.__detail) {
      return this.domNode.previousSibling.__detail.start + this.domNode.previousSibling.__detail.length;
    } else if (!this.domNode.previousSibling && this.domNode.parentNode && this.domNode.parentNode.__detail) {
      return this.domNode.parentNode.__detail.start;
    } else {
      return 0;
    }
  }

  get length () {
    if (this._length == null) {
      this._length = this.getLength();
    }

    return this._length;
  }

  set length (v) {
    this._length = v;
  }

  get end () {
    return this.start + this.length;
  }

  get textContent () {
    return this.domNode.textContent;
  }

  get prev () {
    return (this.domNode.previousSibling) ? this.domNode.previousSibling.__detail : null;
  }

  get next () {
    return (this.domNode.nextSibling) ? this.domNode.nextSibling.__detail : null;
  }

  get parent () {
    // editor.js içinde deleteNode ve insertNode içerisinde kullanılıyor.
    return (this.domNode.parentNode.__detail) ? this.domNode.parentNode.__detail : null;
  }

  get line () {
    let parent = this.domNode;

    while (parent && parent.__detail && !(parent.__detail instanceof this.editor.registry.get('pattern/block'))) {
      parent = parent.parentNode;
    }

    return parent;
  }

  update () {
    this.length = this.getLength();
    this.format = this.getFormat();
  }

  optimize () {
    this.domNode.normalize();
  }

  insertText (text, index = -1) {
    let textContent = this.domNode.textContent;
    if (index < 0) { // is integer koşulu ekle
      textContent = textContent + text;
    } else {
      textContent = textContent.slice(0, index) + text + textContent.slice(index);
    }

    this.updateText(textContent);
  }

  getText (start = this.domNode.__detail.start, end = this.domNode.__detail.start) {
    const startRel = Math.abs(start - this.domNode.__detail.start);
    const endRel = Math.abs(this.domNode.__detail.end - end);

    return this.domNode.__detail.textContent.slice(startRel, endRel);
  }

  updateText (text) {
    this.domNode.textContent = text;
    this.domNode.normalize();
    this.line.__detail.update();
  }

  getLength () {
    return this.domNode.textContent.length;
  }

  getFormat () {
    let parent = this.domNode.parentNode;

    const formatClassPrototypes = [...this.editor.INLINE_ELEMENT.values()];
    const formatClassPrototypesMap = new Map();
    formatClassPrototypes.forEach((formatClassPrototype) => {
      formatClassPrototypesMap.set(formatClassPrototype.tagName, formatClassPrototype);
    });

    let format = {};
    while (parent && formatClassPrototypesMap.has(parent.tagName)) {
      const formatClassPrototype = formatClassPrototypesMap.get(parent.tagName);
      format = { ...format, ...formatClassPrototype.getFormat(parent) };

      parent = parent.parentNode;
    }

    const reversedFormat = {};
    Object.entries(format).reverse().forEach(function ([key, value]) { reversedFormat[key] = value; });

    return reversedFormat;
  }

  static getFormat (domNode) {
    return {};
  }

  static spaceKeyHandler (event, editor, { lines, startIndex, endIndex }) {
    const node = editor.paper.getActiveNode();

    if (node && node instanceof Text) {
      const position = startIndex - node.start;
      node.insertText(Text.spaceChar, position);

      const rangeLength = endIndex - startIndex;
      if (rangeLength > 0) {
        editor.deleteContent(startIndex + Text.spaceChar.length, endIndex + Text.spaceChar.length);
        editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => startIndex + Text.spaceChar.length));
      } else {
        editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => value + Text.spaceChar.length));
      }

      event.preventDefault();
      return false;
    }
  }
}

Text.EVENT = [{ type: 'keydown', keyCode: 32, function: Text.spaceKeyHandler }];
Text.spaceChar = '\u0020';

export default Text;
