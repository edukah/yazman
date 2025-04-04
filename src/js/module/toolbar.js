class Toolbar {
  constructor (editor, config = {}) {
    this.editor = editor;

    this.buttons = Toolbar.buttons;

    for (const c in config) {
      if (Object.prototype.hasOwnProperty.call(config, c)) this[c] = config[c];
    }

    this.container = document.createElement('div');
    this.container.className = 'yazman-toolbar';

    this.buttonContainer = document.createElement('div');
    this.buttonContainer.className = 'button-container';
    this.container.appendChild(this.buttonContainer);

    this.buttons.forEach((buttonGroup) => {
      const buttonGroupElem = document.createElement('div');
      buttonGroupElem.className = 'button-group';

      buttonGroup.forEach((button) => {
        let buttonValue = true;

        if (typeof button === 'object') {
          [button, buttonValue] = Object.entries(button)[0];
        }

        if (!this.editor.registry.has('format/' + button)) {
          this.editor.handleError(
            new Error(`Toolbar format "${button}" not found in registered formats.`),
            { module: 'toolbar', operation: 'init', formatName: button }
          );

          return;
        }

        const buttonElem = document.createElement('span');
        const buttonFormat = this.editor.registry.get('format/' + button);
        buttonElem.__detail = { format: buttonFormat, formatValue: buttonValue };

        if (buttonFormat.toolbar[buttonValue]) {
          buttonElem.innerHTML = buttonFormat.toolbar[buttonValue];
        } else {
          buttonElem.innerHTML = buttonFormat.toolbar;
        }

        const listener = event => {
          if (!this.editor.hasFocus()) this.editor.focus();

          if (buttonFormat.toolbarListener) {
            return buttonFormat.toolbarListener(event, this.editor);
          }

          return this.listener(event);
        };

        buttonElem.addEventListener('click', listener);
        buttonGroupElem.appendChild(buttonElem);
      });

      this.buttonContainer.appendChild(buttonGroupElem);
    });

    this.editor.container.insertBefore(this.container, null);

    globalThis.addEventListener('resize', this.scrollArrowControl.bind(this));
    globalThis.addEventListener('load', this.scrollArrowControl.bind(this));

    return this;
  }

  scrollArrowControl () {
    const containerDim = globalThis.getComputedStyle(this.container, null);
    const containerBlankSpace = parseFloat(containerDim.getPropertyValue('margin-left')) + parseFloat(containerDim.getPropertyValue('margin-right')) + parseFloat(containerDim.getPropertyValue('padding-left')) + parseFloat(containerDim.getPropertyValue('padding-right'));

    if ((this.container.clientWidth - containerBlankSpace) < this.buttonContainer.scrollWidth - 1) { // -1 çıkardık, çünkü getComputedStyle küsuratlı sayıları bir üstüne yuvarlıyor. Bu da hataya sebep olabiliyor.
      if (!this.container.classList.contains('is-scrolling')) {
        this.container.classList.add('is-scrolling');
      }
    } else {
      if (this.container.classList.contains('is-scrolling')) {
        this.container.classList.remove('is-scrolling');
      }
    }
  }

  update () {
    const caretPos = this.editor.selection.getMemCaretPosition();

    let rangeFormat;
    const range = this.editor.selection.getRange();
    if (range && range.collapsed) {
      const activeNode = this.editor.paper.getActiveNode();
      const line = this.editor.paper.getLine(caretPos[0]);

      if (line && activeNode && activeNode.__detail) {
        rangeFormat = { ...line.format, ...activeNode.__detail.format };
      } else {
        rangeFormat = this.editor.paper.getFormat(...caretPos);
      }
    } else {
      rangeFormat = this.editor.paper.getFormat(...caretPos);
    }

    const buttons = this.container.querySelectorAll('span');
    buttons.forEach((button) => {
      if (button.__detail) {
        const formatCheck = Object.entries(rangeFormat).filter(([key, value]) => {
          if (button.__detail.format.formatName === key) {
            if (button.__detail.formatValue !== true && button.__detail.formatValue !== value) {
              return false;
            }

            return button.__detail.formatValue;
          }

          return false;
        });

        if (formatCheck.length > 0) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      };
    });
  }

  listener (event) {
    let target = event.target;
    while (target && target.tagName !== 'SPAN') {
      target = target.parentNode;
    }

    const formatName = target.__detail.format.formatName;
    const format = {};
    format[formatName] = target.__detail.formatValue;

    const caretRange = this.editor.selection.getMemCaretPosition();

    this.editor.selection.setMemCaretPosition(caretRange);
    this.editor.format(...caretRange, format);

    this.editor.update();
  }
}

Toolbar.buttons = [
  ['bold', 'italic'],
  ['headerTwo', 'headerThree'],
  ['preformatted', 'blockquote'],
  ['subscript', 'supscript'],
  ['hyperlink'],
  ['figureImage'],
  [{ listItem: 'ordered' }, { listItem: 'unordered' }]
];

export default Toolbar;
