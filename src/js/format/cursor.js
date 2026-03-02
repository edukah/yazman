import Inline from '../pattern/inline.js';

class Cursor extends Inline {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: Cursor.tagName, domNode });

    const cursorcontent = new editor.TEXT_NODE(editor, { text: Cursor.content });

    this.domNode.appendChild(cursorcontent.domNode);
    this.domNode.classList.add('cursor');
  }

  optimize () {
    const caretPosition = this.editor.selection.getMemCaretPosition();
    if (this.parent instanceof this.editor.registry.get('format/preformatted')) {
      // preformatted crusoru kendi içerisinde gömüyor.
      return;
    }

    if (this.domNode.__detail.start === caretPosition[0]) {
      this.editor.selection.setMemCaretPosition(caretPosition.map(value => value + 1));

      return;
    }

    const textContentRegEx = new RegExp(Cursor.content, 'g');
    const textContentFitered = this.domNode.textContent.replace(textContentRegEx, '');
    const textInstance = new this.editor.TEXT_NODE(this.editor, { text: textContentFitered });

    if (textContentFitered.length) {
      this.domNode.parentNode.insertBefore(textInstance.domNode, this.domNode);
      textInstance.update();

      this.editor.selection.setMemCaretPosition(caretPosition.map(value => value + textContentFitered.length - 1));
      // trimliyiouz çünki spaceleri kendimiz ekliyoruz ve cusroun içinde bunu yaparsak cursor indexi problem yapıyor.
      // problemi görmek için trim()'i kaldır herhangi bir caret(collpased iken yani range 0) pozisyonunda inline biçim ver. space tuşuna bas.
      this.domNode.parentNode.removeChild(this.domNode);

      return;
    }

    const caretEnd = this.editor.selection.getMemCaretPosition()[1];
    // Herşey tanımlı ise ve index cursorla alakalı değilse cursoru sildik.

    if (caretEnd != null && this.domNode.__detail.end !== caretEnd) {
      if (caretEnd >= this.domNode.__detail.start) {
        this.editor.selection.setMemCaretPosition(caretPosition.map(value => value - 1));
      } else {
        this.editor.selection.setMemCaretPosition(caretPosition);
      }

      this.editor.deleteContent(this.domNode.__detail.start, this.domNode.__detail.end);

      this.editor.update();
    }
  }

  static leftArrowHandler (event, editor, { lines, startIndex, endIndex }) {
    const node = editor.paper.getNode(startIndex);
    const format = editor.paper.getFormat(startIndex, startIndex);

    if (Object.keys(format).includes('cursor')) {
      editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => value - node.length - 1));

      let rootParent = node;
      while (rootParent.parent && rootParent.parent.textContent.length < 2 && rootParent.parent instanceof editor.registry.get('pattern/inline')) {
        rootParent = rootParent.parent;
      }
      rootParent.domNode.parentNode.removeChild(rootParent.domNode);

      event.preventDefault();

      return false;
    }
  }

  static enterKeyHandler (event, editor, { lines, startIndex, endIndex }) {
    const format = editor.paper.getFormat(startIndex, startIndex);

    if (Object.keys(format).includes('cursor')) {
      const node = editor.paper.getNode(startIndex);

      editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => value - node.length));

      let rootParent = node;
      while (rootParent.parent && rootParent.parent.textContent.length < 2 && rootParent.parent instanceof editor.registry.get('pattern/inline')) {
        rootParent = rootParent.parent;
      }

      rootParent.domNode.parentNode.removeChild(rootParent.domNode);
    }
  }
}

Cursor.tagName = 'SPAN';
Cursor.formatName = 'cursor';
Cursor.EVENT = [{ type: 'keydown', keyCode: 37, function: Cursor.leftArrowHandler }, { type: 'keydown', keyCode: 13, function: Cursor.enterKeyHandler }];
Cursor.content = '\uFEFF'; // Zero width no break space

export default Cursor;
