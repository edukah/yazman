import Inline from '../pattern/inline.js';

class Bold extends Inline {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: Bold.tagName, domNode });
  }
}

Bold.tagName = 'STRONG';
Bold.formatName = 'bold';
Bold.toolbar = '<svg version="1.1" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m13.8451 18.8503-2.59272 2.81593v6.83379h-5.58036v-25h5.58036v11.1092l2.18063-3.14217 5.90659-7.96703h6.85096l-8.65385 11.1092 8.79121 13.8908h-6.59341z"/></svg>';

export default Bold;
