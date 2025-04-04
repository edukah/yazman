class Autosave {
  constructor (editor, config = {}) {
    this.editor = editor;

    this.enable = Autosave.enable;
    this.counterTiming = Autosave.counterTiming;
    this.saveCoefficient = Autosave.saveCoefficient;
    this.preventUnload = Autosave.preventUnload;
    this.adaptor = Autosave.adaptor;

    for (const c in config) {
      if (Object.prototype.hasOwnProperty.call(config, c)) this[c] = config[c];
    }

    if (!this.enable) {
      return;
    }

    this.editor.event.add({ type: ['input', 'paste'], function: () => this.save() });

    this.saved = true;
    this.processing = false;
    this.counter = 0;
    window.__yazman.autosavePreventUnload = false;

    /* window.onbeforeunload = (event) => {
      if (!this.saved) {
        event = event || window.event;

        event.preventDefault();
        event.returnValue = '';

        return '';
      }
    }; */
    if (this.preventUnload) {
      window.__yazman.autosavePreventUnload = true;
      window.addEventListener('beforeunload', (event) => {
        if (!this.saved && window.__yazman.autosavePreventUnload && !this.editor.isEmpty(false)) {
          window.__yazman.autosavePreventUnload = false;
          window.setTimeout(() => { window.__yazman.autosavePreventUnload = true; }, 2000);

          event = event || window.event;

          event.preventDefault();
          event.returnValue = '';

          return '';
        }
      });
    }
  }

  setGlobalUnLoad (value = true) {
    window.__yazman.autosavePreventUnload = Boolean(value);
  }

  setBlock (value = false) {
    this.editor.registry.set('autosaveIsBlocked', Boolean(value));
  }

  save () {
    let autosaveCounter = this.editor.registry.get('autosaveCounter') || 0;
    this.saved = false;

    // belirli sayıda değişiklik sonrası kaydet.
    if (autosaveCounter > this.saveCoefficient) {
      this.adaptor();

      this.saved = true;
      this.editor.registry.set('autosaveCounter', 0);

      if (this.editor.registry.get('autosaveTimeoutID')) {
        window.clearTimeout(this.editor.registry.get('autosaveTimeoutID'));
        this.editor.registry.delete('autosaveTimeoutID');
      }
    } else {
      this.editor.registry.set('autosaveCounter', ++autosaveCounter);
    }

    // değişiklik yapılmış fakat süre içerisinde sınır aşılmamış ise bu içeriği de kaydet.
    if (!this.editor.registry.has('autosaveTimeoutID')) {
      const autosaveTimeoutID = window.setTimeout(() => {
        this.adaptor();

        this.saved = true;
        this.editor.registry.set('autosaveCounter', 0);
      }, this.counterTiming);

      this.editor.registry.set('autosaveTimeoutID', autosaveTimeoutID);
    }
  }
}

Autosave.enable = false; // save after x miliseconds without action;
Autosave.counterTiming = 36000; // save after x miliseconds without action;
Autosave.saveCoefficient = 40; // save after x consecutive actions;
Autosave.preventUnload = false; // save after x consecutive actions;
Autosave.adaptor = () => {}; // save after x consecutive actions;

export default Autosave;
