import Range from './range.js';
// import Event from './event.js';

class Selection {
  constructor (editor) {
    this.editor = editor;
    this.ws = window.getSelection();

    // this.update();

    // Event.add({ type: ['selectionchange'], function: () => this.update() });
  }

  /* update() {
    // this.ws = window.getSelection();

    this.rangeMap = new WeakMap();

    if (this.ws.rangeCount !== 0) {
      for (let i = 0; i < this.ws.rangeCount; i++) {
        const nativeRange = this.ws.getRangeAt(i);

        if (this.editor.container.contains(nativeRange.commonAncestorContainer)) {
          this.rangeMap.set(nativeRange, new Range(this.editor, nativeRange));
        }
      }

      console.log(range);

      if (range != null && this.editor.container.contains(range.commonAncestorContainer)) {
        return range;
      }
    }
  } */

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
    /* if (!startLine) {
      console.trace(start, end, ...this.editor.paper.lines);
      debugger;
    } */

    let startNode = startLine.children.find((elem) => {
      if (elem.start <= start && elem.end >= start) {
        return true;
      }

      return false;
    });

    /* console.log(!startNode && !startLine.children.length);
    console.log(startLine, startLine.children.length, start, end);
    console.log('startLine: ', startLine, 'startLine.children.length: ', startLine.children.length, 'start: ', start, 'end: ', end); */
    if (!startLine.children.length) {
      startNode = startLine;
    }

    if (!startNode) return;
    /* if (!startNode) {
      console.trace(start, end, ...this.editor.paper.lines);
      debugger;
    } */

    let startNodeIndex = start - startNode.start;
    startNode = startNode.domNode;

    if (startNode.nodeType === 1) {
      // startNodeIndex = [...startNode.parentNode.childNodes].indexOf(startNode) + 1;
      startNodeIndex = [...startNode.parentNode.childNodes].indexOf(startNode);
      startNode = startNode.parentNode;
    }

    rangeToBeFormatted.setStart(startNode, startNodeIndex);

    if (end != null) {
      end = (end > scrollLength) ? scrollLength : end;
      const endLine = this.editor.paper.getLine(end);

      if (!endLine) return;
      /* if (!endLine) {
        console.trace(start, end, ...this.editor.paper.lines);
        debugger;
      } */

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
      // if (!endNode) debugger;

      let endNodeIndex = end - endNode.start;
      endNode = endNode.domNode;

      if (endNode.nodeType === 1) {
        // endNodeIndex = [...endNode.parentNode.childNodes].indexOf(endNode) + 1;
        endNodeIndex = [...endNode.parentNode.childNodes].indexOf(endNode);
        endNode = endNode.parentNode;
      }

      rangeToBeFormatted.setEnd(endNode, endNodeIndex);
    }

    // console.trace(rangeToBeFormatted);
    this.ws.addRange(rangeToBeFormatted);
  }

  /* ------------------------------------------------------- */
  getCaretPosition () {
    /* const range = this.getNativeRange(rangeIndex);

    if (range == null) {
      // console.trace('Range not found at specified index.');

      return this.getMemCaretPosition();
    } */

    /* nativeRange.__detail = 'anna';
    console.log('native1:');
    console.log(nativeRange.__detail);

    const nativeRange2 = this.ws.getRangeAt(0);
    console.log('native2:');
    console.log(nativeRange2.__detail); */

    // const normalizedRange = this.editor.range.normalizeRange(range);
    // this.update();
    // const nativeRange = this.getNativeRange(rangeIndex);

    /* if (nativeRange != null && !this.rangeMap.has(nativeRange)) {
      this.update();
    } else */
    const normalizedRange = this.getNormalizedRange();

    if (normalizedRange == null) {
      return this.getMemCaretPosition();
    }

    // const normalizedRange = new Range(this.editor, nativeRange).normalizedRange;

    return [normalizedRange.startOffset, normalizedRange.endOffset];
  }

  // setCaretPosition(caretPosition, ...additionalCaretPosition) {
  setCaretPosition (caretPosition) {
    // console.trace(caretPosition);
    // Bu sonda olursa event setSelection'dan sonra event tetiklendiğinden ve eventin için caretPositionFocusOn olduğundan ve bu değer önceki değer olduğundan selectionu bir öncekine göre ayarlayarak hataya sebep oluyor.
    this.editor.variables.set('rangeMem', this.getMemCaretPosition('trusted'));
    this.setMemCaretPosition(caretPosition, 'trusted');

    this.removeAllRanges();
    this.setSelection(...caretPosition);

    /* if (additionalCaretPosition.length) {
      additionalCaretPosition.forEach(v => this.setSelection(...v));
    } */

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
    // console.log(caretPosition);
    if (type === 'trusted') {
      if (!this.getMemCaretPosition('trusted').every((caretIndex, index) => caretPosition[index] === caretIndex)) {
        this.editor.variables.set('rangeMem', this.getMemCaretPosition('trusted'));
      }
      this.editor.variables.set('caretPositionTrusted', caretPosition);
      this.editor.variables.set('caretPositionFocusOn', caretPosition);

      if (!this.editor.variables.get('caretPositionRecursiveToken')) {
        // console.trace('here');
        this.editor.variables.delete('caretPosition', caretPosition);
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
