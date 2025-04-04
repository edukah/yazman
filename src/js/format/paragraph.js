import Block from '../pattern/block.js';

class Paragraph extends Block {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: Paragraph.tagName, domNode });
  }
}

Paragraph.tagName = 'P';
Paragraph.formatName = 'paragraph';

export default Paragraph;
