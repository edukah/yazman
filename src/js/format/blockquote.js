import Block from '../pattern/block.js';
import Cursor from './cursor.js';

class Blockquote extends Block {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: Blockquote.tagName, domNode });
  }

  static enterKeyHandler (event, editor, { lines, startIndex, endIndex }) {
    if (!lines.length) return;

    if (lines[0] instanceof Blockquote) {
      if (lines[0].length <= 2 && !lines[0].domNode.textContent.trim(Cursor.content).length) {
        const caretPos = [lines[0].start, lines[0].start];

        editor.insertNode({ format: { paragraph: true } }, lines[0].end);
        lines[0].domNode.parentNode.removeChild(lines[0].domNode);

        editor.selection.setMemCaretPosition(caretPos);
      } else {
        if (startIndex !== endIndex) {
          editor.deleteContent(startIndex, endIndex);
        }

        editor.insertNode({ format: { blockquote: true } }, startIndex);
        const indexAdd = (startIndex === lines[0].start) ? 2 : 1;

        editor.selection.setMemCaretPosition([startIndex + indexAdd, startIndex + indexAdd]);
      }

      event.preventDefault();
      return false;
    }
  }
}

Blockquote.tagName = 'BLOCKQUOTE';
Blockquote.formatName = 'blockquote';
Blockquote.EVENT = [{ type: 'keydown', keyCode: 13, function: Blockquote.enterKeyHandler }];
Blockquote.toolbar = '<svg version="1.1" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m1.94141 4.5v9.42188h5.99805c-0.129177 5.50692-1.68867 7.25126-3.65039 7.42969l-0.757812 0.0957v6.05274l0.873047-0.04492c2.56166-0.144125 5.39175-0.606877 7.28125-2.93945 1.65632-2.0448 2.38672-5.38547 2.38672-10.5137v-9.50196zm15.9844 0v9.42188h5.90039c-0.129177 5.50692-1.64375 7.25126-3.60547 7.42969l-0.703125 0.0957v6.05274l0.820313-0.04492c2.56166-0.144126 5.42104-0.606877 7.31055-2.93945 1.65617-2.04479 2.41016-5.38547 2.41016-10.5137v-9.50196z"/></svg>';

export default Blockquote;
