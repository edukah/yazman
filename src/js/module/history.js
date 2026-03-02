class History {
  constructor (editor, config = {}) {
    this.editor = editor;

    this.counterTiming = History.counterTiming = 2000;
    this.saveCoefficient = History.saveCoefficient = 6;

    for (const c in config) {
      if (Object.prototype.hasOwnProperty.call(config, c)) this[c] = config[c];
    }

    this.editor.event.add({ type: ['input', 'paste'], function: () => this.save() });

    // reverse geçmiş içerik
    // active güncel içerik
    // forward ileriki içerikler
    this.data = { reverse: [], active: null, forward: [] };

    const keyboardEvent = [
      { type: 'keydown', keyCode: 90, shortKey: true, shiftKey: true, function: this.redo.bind(this) },
      { type: 'keydown', keyCode: 90, shortKey: true, shiftKey: false, function: this.undo.bind(this) }
    ];

    keyboardEvent.forEach(keyboardEvent => this.editor.event.add(keyboardEvent));
  }

  save () {
    // daha önce hiç sayaç çalışıtırılmamış ise aktif içerik boş olucaktır. önce bunu doldur.
    if (!this.editor.variables.has('historyCounter')) {
      this.data.active = { content: this.editor.paper.exportContent(), caretPos: this.editor.selection.getCaretPosition() };
    }

    let historyCounter = this.editor.variables.get('historyCounter') || 0;

    // belirli sayıda değişiklik sonrası kaydet.
    if (historyCounter > this.saveCoefficient) {
      this.record();
    } else {
      this.editor.variables.set('historyCounter', ++historyCounter);
    }

    // değişiklik yapılmış fakat süre içerisinde sınır aşılmamış ise bu içeriği de kaydet.
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

History.counterTiming = 2000; // save after x miliseconds without action;
History.saveCoefficient = 6; // save after x consecutive actions;

export default History;
