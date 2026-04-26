import Block from '../pattern/block.js';
import Cursor from './cursor.js';

class Preformatted extends Block {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: Preformatted.tagName, domNode });
  }

  optimize () {
    super.optimize();

    // [PREFORMATTED-1] Not getMemCaretPosition(), because if this is not done, after creating the last line with enter, when a character is typed in pre it jumps to the beginning of the typed character.
    let caretPos = this.editor.selection.getMemCaretPosition();

    const regex = new RegExp(`(\r?\n)$`);
    if (!regex.test(this.domNode.textContent)) {
      const textContent = this.domNode.textContent.replace(Cursor.content, '') + '\n';

      while (this.domNode.childNodes.length) {
        this.domNode.removeChild(this.domNode.childNodes[0]);
      }

      const textInstance = new this.editor.TEXT_NODE(this.editor, { text: textContent.replace(/^\n+|\n+$/g, '') + '\n' });
      this.domNode.appendChild(textInstance.domNode);
      this.update();

      // [PREFORMATTED-2] Chrome backspace key fix, when coming from a normal paragraph
      caretPos = this.editor.selection.setMemCaretPosition(caretPos.map(value => {
        if (this.end + 1 === value) {
          return value - 1;
        }

        return value;
      }));
    }

    // [PREFORMATTED-3] In Firefox, when coming back from a paragraph to preformatted with the backspace key, it goes to the very end; we want the scroll to stop before the \n character, so we do this.
    if (caretPos[1] === this.end) {
      this.editor.selection.setMemCaretPosition(caretPos.map(value => {
        if (this.end === value) {
          return value - 1;
        }

        return value;
      }));
    }

    if (!this.domNode.textContent.length) {
      this.domNode.innerHTML = '\n';
    }

    if (this.domNode.nextSibling && this.domNode.nextSibling.__detail && this.domNode.nextSibling.__detail instanceof this.domNode.__detail.constructor) {
      const nextSiblingTextContent = this.domNode.nextSibling.textContent ? this.domNode.nextSibling.textContent : '\n';

      // [PREFORMATTED-4] At the end of the line make a pre-paragraph gap, that is why we put this.
      this.domNode.firstChild.__detail.insertText(nextSiblingTextContent);
      this.domNode.nextSibling.remove();
    }
  }

  onInsert ({ blockFormat = {}, inlineFormat = {} }, index) {
    const onInsertResult = super.onInsert({ blockFormat, inlineFormat }, index);
    const relIndex = Math.abs(index - this.domNode.firstChild.__detail.start);
    const lineText = this.domNode.firstChild.__detail.getText();
    const nextLineBreak = lineText.indexOf('\n', relIndex);

    if (this.start !== index && relIndex === nextLineBreak && Object.keys(blockFormat).length) {
      index++;
    }

    return { format: onInsertResult.format, index };
  }

  onFormat ({ blockFormat = {}, inlineFormat = {} }, caretRange) {
    const onFormatResult = super.onFormat({ blockFormat, inlineFormat }, caretRange);
    const [startIndex, endIndex] = onFormatResult.caretRange;

    // [PREFORMATTED-5] Pre => when transitioning to another format, if the line after pre is a different format, since the inter-line gap will decrease ('the \n character at the end of pre is trimmed'), we decrease the caret range by 1.
    if (this.next && Object.keys(this.next.format)[0] !== Preformatted.formatName && this.end <= endIndex) {
      this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition().map((v, i) => i === 1 ? v - 1 : v));
    }

    // [PREFORMATTED-6] If it is not transforming to another format, return from here.
    if (!Object.keys(onFormatResult.format.blockFormat).length || (Object.keys(onFormatResult.format.blockFormat).includes(Preformatted.formatName) && onFormatResult.format.blockFormat[Preformatted.formatName])) {
      return onFormatResult;
    }

    /* [PREFORMATTED-7] --------------------- CURSOR REGENERATE ------------------------- */
    // [PREFORMATTED-8] If the first line is not transforming, the index after it will increase by 1. After the first line there is \n but no new line, so since a newline will come, we do this.
    const firstLineBreakIndex = this.start + this.textContent.indexOf('\n');
    const firstLineWillFormat = firstLineBreakIndex >= startIndex;

    if (!firstLineWillFormat) {
      this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition().map((v, i) => v + 1));
    }
    /* [PREFORMATTED-9] --------------------- END OF CURSOR REGENERATE ------------------------- */

    delete onFormatResult.format.blockFormat[Preformatted.formatName];
    if (!Object.keys(onFormatResult.format.blockFormat).length) {
      Object.assign(onFormatResult.format.blockFormat, { paragraph: true });
    }

    const lineText = this.domNode.firstChild.__detail.getText();

    let absStartBorder = this.domNode.__detail.start;
    let relStartBorder = 0;
    if (startIndex > this.domNode.firstChild.__detail.start) {
      const relStart = Math.abs(startIndex - this.domNode.firstChild.__detail.start);
      relStartBorder = lineText.lastIndexOf('\n', (relStart < 1) ? 0 : relStart - 1); // [PREFORMATTED-10] We do -1, because if we do it on the \n character, relEnd and relStart turn out to be the same.
      relStartBorder = (relStartBorder <= 0) ? 0 : relStartBorder + 1;
      absStartBorder = this.domNode.__detail.start + relStartBorder;
    }

    let absEndBorder = this.domNode.__detail.end;
    let relEndBorder = lineText.length;
    if (endIndex < this.domNode.__detail.end) {
      const relEnd = Math.abs(endIndex - this.domNode.firstChild.__detail.start);
      relEndBorder = lineText.indexOf('\n', relEnd) + 1;
      absEndBorder = this.domNode.__detail.start + relEndBorder;
    }

    let rangeText = lineText.slice(relStartBorder, relEndBorder);

    // [PREFORMATTED-11] We take the double \n characters at the beginning and end of the text and convert them to a single \n character. Lines stay fixed this way. We replace with [:linebreak], because with trim we trim the single \n characters.

    rangeText = rangeText.replace(/^\n+|\n+$/g, function (match) {
      return match.replace(/\n{2}/mg, '[:linebreak]').trim();
    }).replace(/\[:linebreak\]/mg, '\n');

    let lengthDiff = 0;
    const newLines = rangeText.split('\n').map(v => {
      const beforeLength = v.length;
      v = v.trim();
      const afterLength = v.length;

      lengthDiff += beforeLength - afterLength;

      return v;
    });

    // [PREFORMATTED-12] Since the caret position stayed as it was and delete-optimize is done at this position, the preformatted optimize was changing the caret scroll that matched the condition. To prevent this, we stored the caret in memory and zeroed it. After delete, we restored it to its old state.
    const caretPos = this.editor.selection.getMemCaretPosition();
    this.editor.selection.setMemCaretPosition([0, 0]); // [PREFORMATTED-13] line break lenfgth;

    this.editor.deleteContent(absStartBorder, absEndBorder, true); // [PREFORMATTED-14] lineCleaner
    this.editor.selection.setMemCaretPosition(caretPos.map((v, i) => i === 1 ? v - lengthDiff : v));

    let border = absStartBorder;
    newLines.forEach(v => {
      this.editor.insertNode({ textContent: v, format: { ...onFormatResult.format.blockFormat } }, border);
      border += (v.length) ? v.length + 1 : 1;
    });

    return false;
  }

  static toolbarListener (event, editor) {
    // [PREFORMATTED-15] When you select pre's last line and the paragraph that comes after it and apply pre style, the paragraph shifts by 1 character; that issue is related to here. This currently assumes there is no line within the selected area.
    const rangeFormat = editor.paper.getFormat(...editor.selection.getMemCaretPosition());

    const [startIndex, endIndex] = editor.selection.getMemCaretPosition();

    const lines = editor.paper.getLines(startIndex, endIndex);

    const startLine = lines[0];
    const startLinePreviousSiblingIsPre = (startLine.domNode.previousSibling && startLine.domNode.previousSibling.__detail instanceof Preformatted);

    // [PREFORMATTED-16] We took caretPos into a variable beforehand, because after formatting it was being changed in optimize.

    editor.toolbar.listener(event);

    const caretPos = editor.selection.getMemCaretPosition();

    if (!Object.keys(rangeFormat).includes(Preformatted.formatName)) {
      // [PREFORMATTED-17] will transform to preformat;
      if (startLinePreviousSiblingIsPre) {
        editor.selection.setMemCaretPosition(caretPos.map((v, i) => v - 1));
      }
    }

    // [PREFORMATTED-18] First condition: if the one above is pre, the inter-line length goes away. Nothing is added in its place, so when making pre, if the one above is pre, we decreased by 1.
  }

  static enterKeyHandler (event, editor, { lines, startIndex, endIndex }) {
    if (lines[0] instanceof Preformatted) {
      /* [PREFORMATTED-19] FIXES THIS WHEN 4 OR MORE CONSECUTIVE ENTERS COME */
      const regex = new RegExp(`(\r?\n){3,}$`);
      if (regex.test(lines[0].textContent)) {
        const textContent = lines[0].textContent;
        lines[0].children[0].updateText(textContent.trim() + '\n');

        editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => value - '\n'.length * 2));

        editor.insertNode({ format: { paragraph: true } }, lines[0].end);
        editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => value + '\n'.length + 1));

        event.preventDefault();

        return false;
      }

      /* [PREFORMATTED-20] If there is selected text, delete it */
      if (startIndex !== endIndex) {
        editor.deleteContent(startIndex, endIndex);
        editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => startIndex));
      }
      /* [PREFORMATTED-21] */

      /* [PREFORMATTED-22] INSERTS THE ENTER CHARACTER INSTEAD OF MOVING TO A NEW LINE */
      editor.insertNode({ textContent: '\n' }, startIndex);
      editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => value + '\n'.length));
      /* [PREFORMATTED-23] END */

      event.preventDefault();

      return false;
    }
  }

  static tabKeyHandler (event, editor, { lines, startIndex, endIndex }) {
    if (!lines.length || !(lines[0] instanceof Preformatted)) return;

    /* [PREFORMATTED-24] If there is selected text, delete it */
    if (startIndex !== endIndex) {
      editor.deleteContent(startIndex, endIndex);
      editor.selection.setMemCaretPosition([startIndex, startIndex]);
    }
    /* [PREFORMATTED-25] */

    /* [PREFORMATTED-26] INSERTS THE ENTER CHARACTER INSTEAD OF MOVING TO A NEW LINE */
    const tabChar = `${editor.TEXT_NODE.spaceChar}${editor.TEXT_NODE.spaceChar}`;
    editor.insertNode({ textContent: tabChar }, startIndex);
    editor.selection.setMemCaretPosition([startIndex + tabChar.length, startIndex + tabChar.length]);
    /* [PREFORMATTED-27] END */

    event.preventDefault();

    return false;
  }
}

Preformatted.tagName = 'PRE';
Preformatted.formatName = 'preformatted';
Preformatted.toolbar = '<svg version="1.1" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m9.08398 3.5-9.08398 12.5 9.08398 12.5 4.16602-3.02734-6.88477-9.47266 6.88477-9.47266-4.16602-3.02734zm13.832 0-4.16602 3.02734 6.88477 9.47266-6.88477 9.47266 4.16602 3.02734 9.08398-12.5-9.08398-12.5z" style="paint-order:markers fill stroke"/></svg>';
Preformatted.allowedInlineFormat = [];
Preformatted.EVENT = [{ type: 'keydown', keyCode: 9, function: Preformatted.tabKeyHandler }, { type: 'keydown', keyCode: 13, function: Preformatted.enterKeyHandler }];

export default Preformatted;
