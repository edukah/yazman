import Inline from '../pattern/inline.js';

class Italic extends Inline {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: Italic.tagName, domNode });
  }
}

Italic.tagName = 'EM';
Italic.formatName = 'italic';
Italic.toolbar = '<svg version="1.1" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m15.5843 3.5-0.873198 3.81055h6.56362l0.875287-3.81055zm-1.8404 8.02148-3.89389 16.9785h6.56571l3.89388-16.9785z"/></svg>';

export default Italic;
