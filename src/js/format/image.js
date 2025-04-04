import { InlineEmbed } from '../pattern/inline.js';

class Image extends InlineEmbed {
  constructor (editor, { image = null, domNode = null } = {}) {
    super(editor, { tagName: Image.tagName, domNode });

    if (domNode != null) {
      image = Image.getFormat(domNode).image;
    }

    if (!image) {
      throw new Error('Yazman Image: `image` (src) parametresi zorunludur.');
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
