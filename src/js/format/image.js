import { InlineEmbed } from '../pattern/inline.js';

class Image extends InlineEmbed {
  constructor (editor, { image = '#src_must_send', domNode = null } = {}) {
    super(editor, { tagName: Image.tagName, domNode });

    if (domNode != null) {
      image = Image.getFormat(domNode).image;
    }

    this.domNode.setAttribute('src', image);
  }

  static getFormat (domNode) {
    return {
      [Image.formatName]: domNode.getAttribute('src')
    };
  }
}

Image.tagName = 'IMG';
Image.formatName = 'image';
Image.toolbar = 'IMG';

export default Image;
