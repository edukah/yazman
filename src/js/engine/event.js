const SELECTION_CHANGE_EVENT = [
  'keyup',
  'blur',
  'focus',
  'click',
  'mouseup',
  'select'
];

const TEXT_CHANGE_EVENT = [
  'keydown',
  'input',
  'paste'
];

const SHORTKEY = /Mac/i.test(globalThis.navigator.platform) ? 'metaKey' : 'ctrlKey';

class Event {
  constructor (editor) {
    this.editor = editor;
    this.eventForTrigger = new Map();
    this._listeners = [];

    this._selectionChangeHandler = (event) => {
      if (!this.editor.root.contains(event.target.activeElement)) {
        return;
      }

      this.selectionChange(event);
    };
    document.addEventListener('selectionchange', this._selectionChangeHandler);

    SELECTION_CHANGE_EVENT.forEach((eventName) => {
      const handler = (event) => this.selectionChange(event);
      this.editor.root.addEventListener(eventName, handler);
      this._listeners.push({ target: this.editor.root, type: eventName, handler });
    });

    TEXT_CHANGE_EVENT.forEach((value) => {
      const handler = (event) => this.textChange(event);
      this.editor.root.addEventListener(value, handler);
      this._listeners.push({ target: this.editor.root, type: value, handler });
    });

    this._scrollHandler = () => {
      this.editor.variables.set('editorScrollTopPosition', this.editor.root.scrollTop);
      this.editor.variables.set('editorScrollLeftPosition', this.editor.root.scrollLeft);
    };
    this.editor.root.addEventListener('scroll', this._scrollHandler);
    this._listeners.push({ target: this.editor.root, type: 'scroll', handler: this._scrollHandler });
  }

  destroy () {
    document.removeEventListener('selectionchange', this._selectionChangeHandler);
    this._listeners.forEach(({ target, type, handler }) => target.removeEventListener(type, handler));
    this._listeners = [];
    this.eventForTrigger.clear();
  }

  textChange (event) {
    // TRIGGER FORMAT EVENTS
    const filteredTriggerEvent = [...this.eventForTrigger.values()].filter(this.useConditions(event));

    const [startIndex, endIndex] = this.editor.selection.getMemCaretPosition();
    const rangeLines = this.editor.paper.getLines(startIndex, endIndex);

    filteredTriggerEvent.forEach(triggerEvent => triggerEvent.function(event, this.editor, { lines: rangeLines, startIndex, endIndex }));
    /* END OF FORMAT EVENTS */

    this.editor.update();
    this.editor.emit('text-change');
  }

  selectionChange (event) {
    const caretPos = this.editor.selection.getCaretPosition();

    /* INDEX BOUNDARY */
    this.editor.selection.setMemCaretPosition(caretPos, 'trusted');

    // TRIGGER FORMAT EVENTS
    const filteredTriggerEvent = [...this.eventForTrigger.values()].filter(this.useConditions(event));

    const [startIndex, endIndex] = this.editor.selection.getMemCaretPosition();
    const rangeLines = this.editor.paper.getLines(startIndex, endIndex);

    filteredTriggerEvent.forEach(triggerEvent => triggerEvent.function(event, this.editor, { lines: rangeLines, startIndex, endIndex }));
    /* END OF FORMAT EVENTS */

    this.editor.update();

    this.editor.emit('selection-change', { start: startIndex, end: endIndex });
    if (event.type === 'focus') this.editor.emit('focus');
    if (event.type === 'blur') this.editor.emit('blur');
  }

  update () {
    const newCaretRange = this.editor.selection.getMemCaretPosition();
    const oldCaretRange = this.editor.variables.get('rangeMem') || [0, 0];
    if (!newCaretRange.every((caretIndex, index) => oldCaretRange[index] === caretIndex)) {
      // newlines'ın old linestan önce yapılması gerekiyor. oldda curusor var ise caret range değiştiğinden paragraf olarak önü ya da arkayı alabiliyor.
      const newLines = this.editor.paper.getLines(...newCaretRange);
      newLines.forEach(line => {
        this.editor.paper.optimize(line.domNode);
      });

      const oldLines = this.editor.paper.getLines(...oldCaretRange);
      oldLines.forEach(line => {
        this.editor.paper.optimize(line.domNode);
      });
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
    const uniqueKey = Event._nextKey = (Event._nextKey || 0) + 1;

    this.eventForTrigger.set(uniqueKey, eventData);

    return uniqueKey;
  }

  delete (uniqueKey) {
    this.eventForTrigger.delete(uniqueKey);
  }
}

export default Event;
