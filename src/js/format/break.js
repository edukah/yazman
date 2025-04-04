import { InlineEmbed } from '../pattern/inline.js';

class Break extends InlineEmbed {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: Break.tagName, domNode });
  }

  optimize () {
    this.domNode.normalize();

    if (this.domNode.nextSibling || this.domNode.previousSibling) {
      this.domNode.parentNode.removeChild(this.domNode);
    };
  }

  getLength () {
    return 0;
  }
}

Break.tagName = 'BR';
Break.formatName = 'break';
Break.toolbar = 'BR';

export default Break;
