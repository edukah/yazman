import Parent from './parent.js';

class Block extends Parent {
  constructor (editor, { tagName, domNode }) {
    super(editor, { tagName, domNode });
  }

  get line () {
    return this.domNode;
  }

  optimize () {
    super.optimize();

    if (!this.domNode.childNodes.length) {
      const FormatClass = this.editor.registry.get('format/break');
      const formatInstance = new FormatClass(this.editor);

      this.domNode.appendChild(formatInstance.domNode);
      formatInstance.update();
    }

    if (this.parent instanceof this.editor.registry.get('pattern/block')) {
      while (this.domNode.childNodes.length) {
        this.parent.domNode.insertBefore(this.domNode.childNodes[0], this.domNode);
      }

      this.domNode.remove();
    }
  }

  getLength () {
    return this.next ? super.getInnerLength() + Block.NEWLINE_LENGTH : super.getInnerLength();
  }

  onInsert ({ blockFormat = {}, inlineFormat = {} }, index) {
    const format = this.formatFilter({ blockFormat, inlineFormat });

    return { format, index };
  }

  onFormat ({ blockFormat = {}, inlineFormat = {} }, caretRange) {
    const format = this.formatFilter({ blockFormat, inlineFormat });

    return { format, caretRange };
  }

  formatFilter ({ blockFormat = {}, inlineFormat = {} }) {
    const proto = this.constructor;

    if (proto.allowedBlockFormat instanceof Array) {
      Object.keys(blockFormat).forEach(v => {
        if (!proto.allowedBlockFormat.includes(v)) {
          delete blockFormat[v];
        }
      });
    }

    if (proto.allowedInlineFormat instanceof Array) {
      Object.keys(inlineFormat).forEach(v => {
        if (!proto.allowedInlineFormat.includes(v)) {
          delete inlineFormat[v];
        }
      });
    }

    return { blockFormat, inlineFormat };
  }
}
Block.NEWLINE_LENGTH = 1;

class BlockEmbed extends Block {
  constructor (editor, { tagName, domNode }) {
    super(editor, { tagName, domNode });
  }

  get textContent () {
    return null;
  }

  getChildren () {
    return [];
  }

  getInnerLength () {
    this.innerLength = BlockEmbed.LINE_LENGTH;

    return this.innerLength;
  }

  getLength () {
    return this.next ? this.getInnerLength() + Block.NEWLINE_LENGTH : this.getInnerLength();
  }
}
BlockEmbed.LINE_LENGTH = 1;

export { Block as default, BlockEmbed };
