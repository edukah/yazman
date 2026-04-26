class History {
  constructor (editor, config = {}) {
    this.editor = editor;

    this.counterTiming = History.counterTiming = 2000;
    this.saveCoefficient = History.saveCoefficient = 6;

    for (const c in config) {
      if (Object.prototype.hasOwnProperty.call(config, c)) this[c] = config[c];
    }

    this.editor.event.add({ type: ['input', 'paste'], function: () => this.save() });

    // [HISTORY-1] reverse: past content
    // [HISTORY-2] active: current content
    // [HISTORY-3] forward: upcoming contents
    this.data = { reverse: [], active: null, forward: [] };

    const keyboardEvent = [
      { type: 'keydown', keyCode: 90, shortKey: true, shiftKey: true, function: this.redo.bind(this) },
      { type: 'keydown', keyCode: 90, shortKey: true, shiftKey: false, function: this.undo.bind(this) }
    ];

    keyboardEvent.forEach(keyboardEvent => this.editor.event.add(keyboardEvent));
  }

  save () {
    // [HISTORY-4] If the counter has never been started before, the active content will be empty. Fill it first.
    if (!this.editor.variables.has('historyCounter')) {
      this.data.active = { content: this.editor.paper.exportContent(), caretPos: this.editor.selection.getCaretPosition() };
    }

    const historyCounter = this.editor.variables.get('historyCounter') || 0;

    // [HISTORY-5] Save after a certain number of changes.
    if (historyCounter > this.saveCoefficient) {
      this.record();
    } else {
      this.editor.variables.set('historyCounter', historyCounter + 1);
    }

    // [HISTORY-6] If a change was made but the threshold was not exceeded within the time window, save this content as well.
    if (this.editor.variables.get('historyTimeoutID')) {
      globalThis.clearTimeout(this.editor.variables.get('historyTimeoutID'));
    }

    const historyTimeoutID = globalThis.setTimeout(() => {
      this.record();
    }, this.counterTiming);

    this.editor.variables.set('historyTimeoutID', historyTimeoutID);
  }

  record () {
    if (this.editor.variables.get('historyCounter') === 0) {
      return;
    }

    this.data.reverse.push(this.data.active);
    this.data.active = { content: this.editor.paper.exportContent(), caretPos: this.editor.selection.getCaretPosition() };

    this.editor.variables.set('historyCounter', 0);

    if (this.editor.variables.get('historyTimeoutID')) {
      globalThis.clearTimeout(this.editor.variables.get('historyTimeoutID'));
    }
  }

  undo (event) {
    event.preventDefault();

    this.record();

    if (!this.data.reverse.length) {
      return;
    }

    this.data.forward.push(this.data.active);
    this.data.active = this.data.reverse.pop();
    this.editor.paper.importContent(this.data.active.content);
    this.editor.selection.setCaretPosition([this.data.active.caretPos[0], this.data.active.caretPos[0]]);
    this.editor.scrollIntoView();
  }

  redo (event) {
    event.preventDefault();

    if (!this.data.forward.length) {
      return;
    }

    this.data.reverse.push(this.data.active);
    this.data.active = this.data.forward.pop();
    this.editor.paper.importContent(this.data.active.content);
    this.editor.selection.setCaretPosition([this.data.active.caretPos[0], this.data.active.caretPos[0]]);
    this.editor.scrollIntoView();
  }
}

History.counterTiming = 2000; // [HISTORY-7] save after x miliseconds without action;
History.saveCoefficient = 6; // [HISTORY-8] save after x consecutive actions;

export default History;
