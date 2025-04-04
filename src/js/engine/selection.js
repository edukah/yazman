import Range from './range.js';

class Selection {
  constructor (editor) {
    this.editor = editor;
    this.ws = globalThis.getSelection();
  }

  removeAllRanges () {
    this.ws.removeAllRanges();
  }

  setSelection (start, end = null) {
    if (!this.editor.hasFocus()) this.editor.focus();

    const rangeToBeFormatted = document.createRange();
    const scrollLength = this.editor.paper.getLength();

    start = (start < 0 || scrollLength < start) ? 0 : start;
    const startLine = this.editor.paper.getLine(start);

    if (!startLine) return;

    let startNode = startLine.children.find((elem) => {
      if (elem.start <= start && elem.end >= start) {
        return true;
      }

      return false;
    });

    if (!startLine.children.length) {
      startNode = startLine;
    }

    if (!startNode) return;

    let startNodeIndex = start - startNode.start;
    startNode = startNode.domNode;

    if (startNode.nodeType === 1) {
      startNodeIndex = [...startNode.parentNode.childNodes].indexOf(startNode);
      startNode = startNode.parentNode;
    }

    rangeToBeFormatted.setStart(startNode, startNodeIndex);

    if (end != null) {
      end = (end > scrollLength) ? scrollLength : end;
      const endLine = this.editor.paper.getLine(end);

      if (!endLine) return;

      let endNode = endLine.children.find((elem) => {
        if (elem.end >= end) {
          return true;
        }

        return false;
      });

      if (!endLine.children.length) {
        endNode = endLine;
      }

      if (!endNode) return;

      let endNodeIndex = end - endNode.start;
      endNode = endNode.domNode;

      if (endNode.nodeType === 1) {
        endNodeIndex = [...endNode.parentNode.childNodes].indexOf(endNode);
        endNode = endNode.parentNode;
      }

      rangeToBeFormatted.setEnd(endNode, endNodeIndex);
    }

    this.ws.addRange(rangeToBeFormatted);
  }

  /* ------------------------------------------------------- */
  getCaretPosition () {
    const normalizedRange = this.getNormalizedRange();

    if (normalizedRange == null) {
      return this.getMemCaretPosition();
    }

    return [normalizedRange.startOffset, normalizedRange.endOffset];
  }

  setCaretPosition (caretPosition) {
    // Bu sonda olursa event setSelection'dan sonra event tetiklendiğinden ve eventin içinde caretPositionFocusOn olduğundan ve bu değer önceki değer olduğundan, selection'ı bir öncekine göre ayarlayarak hataya sebep oluyor.
    this.editor.variables.set('rangeMem', this.getMemCaretPosition('trusted'));
    this.setMemCaretPosition(caretPosition, 'trusted');

    this.removeAllRanges();
    this.setSelection(...caretPosition);

    return caretPosition;
  }

  changedCursorPosition () {
    if (this.editor.variables.has('caretPosition')) {
      return true;
    }

    return false;
  }

  isCollapsed () {
    const [startIndex, endIndex] = this.getMemCaretPosition();

    return (startIndex === endIndex);
  }

  getMemCaretPosition (type = false) {
    if (this.editor.variables.has('caretPosition') && type === false) {
      return this.editor.variables.get('caretPosition');
    }

    if (this.editor.variables.has('caretPositionTrusted')) {
      return this.editor.variables.get('caretPositionTrusted');
    }

    return [0, 0];
  }

  setMemCaretPosition (caretPosition, type = null) {
    if (type === 'trusted') {
      if (!this.getMemCaretPosition('trusted').every((caretIndex, index) => caretPosition[index] === caretIndex)) {
        this.editor.variables.set('rangeMem', this.getMemCaretPosition('trusted'));
      }
      this.editor.variables.set('caretPositionTrusted', caretPosition);
      this.editor.variables.set('caretPositionFocusOn', caretPosition);

      if (!this.editor.variables.get('caretPositionRecursiveToken')) {
        this.editor.variables.delete('caretPosition');
      } else {
        this.editor.variables.set('caretPositionRecursiveToken', 0);
      }
    } else {
      if (this.editor.variables.has('caretPosition')) {
        this.editor.variables.set('caretPositionRecursiveToken', 1);
      }

      this.editor.variables.set('caretPosition', caretPosition);
    }

    return caretPosition;
  }
  /* --------------------------------------------------------- */

  getRange () {
    const nativeRange = this.getNativeRange();

    if (!nativeRange) {
      return null;
    }

    return new Range(this.editor, nativeRange);
  }

  getNormalizedRange () {
    const nativeRange = this.getNativeRange();

    if (!nativeRange) {
      return null;
    }

    return new Range(this.editor, nativeRange).normalizedRange;
  }

  getNativeRange () {
    if (this.ws.rangeCount !== 0) {
      const range = this.ws.getRangeAt(0);

      if (range != null && this.editor.root.contains(range.commonAncestorContainer)) {
        return range;
      }
    }

    return null;
  }
}

export default Selection;
