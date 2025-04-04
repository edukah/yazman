// const eventForTrigger = new Map();

const SELECTION_CHANGE_EVENT = [
  'keyup',
  'blur',
  'focus',
  // 'selectstart',
  // 'selectionchange',
  'click',
  'mouseup',
  // 'mousedown',
  // 'touchend',
  'onselect'
];

const TEXT_CHANGE_EVENT = [
  'keydown',
  'input',
  'paste'
];

const SHORTKEY = /Mac/i.test(window.navigator.platform) ? 'metaKey' : 'ctrlKey';
// const SHORTKEY = /Mac/i.test(navigator.platform) ? 'metaKey' : 'ctrlKey';

class Event {
  constructor (editor) {
    this.editor = editor;
    this.eventForTrigger = new Map();

    document.addEventListener('selectionchange', (event) => {
      if (!this.editor.root.contains(event.target.activeElement)) {
        return;
      }

      this.selectionChange(event);
    });

    // For unique we use new Set();
    // const allEvent = [...new Set([...SELECTION_CHANGE_EVENT, ...TEXT_CHANGE_EVENT])];
    SELECTION_CHANGE_EVENT.forEach((eventName) => {
      this.editor.root.addEventListener(eventName, (event) => {
        this.selectionChange(event);
      });
    });

    TEXT_CHANGE_EVENT.forEach((value) => {
      this.editor.root.addEventListener(value, (event) => this.textChange(event));
    });

    this.editor.root.addEventListener('scroll', () => {
      this.editor.variables.set('editorScrollTopPosition', this.editor.root.scrollTop);
      this.editor.variables.set('editorScrollLeftPosition', this.editor.root.scrollLeft);
    });
  }

  textChange (event) {
    // TRIGGER FORMAT EVENTS */
    const filteredTriggerEvent = [...this.eventForTrigger.values()].filter(this.useConditions(event));

    const [startIndex, endIndex] = this.editor.selection.getMemCaretPosition();
    const rangeLines = this.editor.paper.getLines(startIndex, endIndex);

    filteredTriggerEvent.forEach(triggerEvent => triggerEvent.function(event, this.editor, { lines: rangeLines, startIndex, endIndex }));
    /* END OF FORMAT EVENTS */

    // this.editor.observer.complete();
    this.editor.update();
    /* if (event.type === 'input' || event.type === 'paste') {
      this.editor.history.save();
      this.editor.autosave.save();
    } */

    // this.update();
  }

  selectionChange (event) {
    // console.log(event.type);
    /* if (event.type === 'selectionchange' && !this.editor.root.contains(event.target.activeElement)) {
      return;
    } */
    const caretPos = this.editor.selection.getCaretPosition();

    /* BLUR-FOCUS EVENT */
    /* if (event.type === 'focus') {
      const lines = this.editor.paper.getLines(...caretPos);

      console.log(lines);

      lines.forEach(line => {
        this.editor.paper.optimize(line.domNode);
      });
    } */
    /* END BLUR-FOCUS EVENT */

    /* INDEX BOUNDARY */
    // console.log(event.type);
    // console.log(event);
    this.editor.selection.setMemCaretPosition(caretPos, 'trusted');
    // this.update();

    // TRIGGER FORMAT EVENTS */
    const filteredTriggerEvent = [...this.eventForTrigger.values()].filter(this.useConditions(event));

    const [startIndex, endIndex] = this.editor.selection.getMemCaretPosition();
    const rangeLines = this.editor.paper.getLines(startIndex, endIndex);

    filteredTriggerEvent.forEach(triggerEvent => triggerEvent.function(event, this.editor, { lines: rangeLines, startIndex, endIndex }));
    /* END OF FORMAT EVENTS */

    // this.editor.observer.complete();
    this.editor.update();

    // this.update();
    // console.log('memCaretPos:', this.editor.selection.getMemCaretPosition());
    // console.log('caretPos:', this.editor.selection.getCaretPosition());
    // console.log('---------------');
  }

  update () {
    // const newCaretRange = this.editor.selection.getCaretPosition();
    const newCaretRange = this.editor.selection.getMemCaretPosition();
    const oldCaretRange = this.editor.variables.get('rangeMem') || [0, 0];
    /* console.log('old', oldCaretRange);
    console.log('new', newCaretRange);
    console.log('------------------'); */
    if (!newCaretRange.every((caretIndex, index) => oldCaretRange[index] === caretIndex)) {
      // console.log(event, event.type);
      // console.log(oldCaretRange);
      // console.log(newCaretRange);
      // newlines'ın old linestan önce yapılması gerekiyor. oldda curusor var ise caret range değiştiğinden paragraf olarak önü ya da arkayı alabiliyor.
      const newLines = this.editor.paper.getLines(...newCaretRange);
      newLines.forEach(line => {
        this.editor.paper.optimize(line.domNode);
        // this.editor.paper.update(line.domNode);
      });

      const oldLines = this.editor.paper.getLines(...oldCaretRange);
      oldLines.forEach(line => {
        this.editor.paper.optimize(line.domNode);
        // this.editor.paper.update(line.domNode);
      });
      // console.log('oldLines:', ...oldLines);
      // console.log('newLines:', ...newLines);
      // this.editor.observer.complete();
      // this.editor.update();
    }

    const isEmpty = this.editor.isEmpty(false);
    if (isEmpty && !this.editor.root.classList.contains('blank')) {
      this.editor.root.classList.add('blank');
    } else if (!isEmpty && this.editor.root.classList.contains('blank')) {
      this.editor.root.classList.remove('blank');
    }
    /* END OF INDEX BOUNDARY */
  }

  useConditions (eventData) {
    return formatData => {
      formatData = this.normalizeFormatData(formatData);

      return Object.keys(formatData).every(formatDataKey => formatDataKey === 'function' || formatData[formatDataKey] === eventData[formatDataKey] || (Array.isArray(formatData[formatDataKey]) && formatData[formatDataKey].includes(eventData[formatDataKey])) || (Array.isArray(eventData[formatDataKey]) && eventData[formatDataKey].includes(formatData[formatDataKey])));
    };
  }

  normalizeFormatData (formatData) {
    if (formatData.shortKey) {
      formatData[SHORTKEY] = formatData.shortKey;
      delete formatData.shortKey;
    }

    return formatData;
  }

  add (eventData) {
    const uniqueKey = Math.floor(Math.random() * 100000);

    this.eventForTrigger.set(uniqueKey, eventData);

    return uniqueKey;
  }

  delete (uniqueKey) {
    this.eventForTrigger.delete(uniqueKey);
  }
}

export default Event;
