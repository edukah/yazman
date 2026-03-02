import { InlineEmbed } from '../pattern/inline.js';

class Image extends InlineEmbed {
  constructor (editor, { image = '#src_must_send', domNode = null } = {}) {
    super(editor, { tagName: Image.tagName, domNode });

    this.domNode.setAttribute('src', image);
  }
}

Image.tagName = 'IMG';
Image.formatName = 'image';
Image.toolbar = 'IMG';

export default Image;
