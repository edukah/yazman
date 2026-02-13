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
          console.error('Format that inside toolbarFormat not found in registered formats... ' + button);
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

    // this.addDevelomentButton();
    this.editor.container.insertBefore(this.container, null);

    globalThis.addEventListener('resize', this.scrollArrowControl.bind(this));
    globalThis.addEventListener('load', this.scrollArrowControl.bind(this));

    return this;
  }

  scrollArrowControl () {
    const containerDim = globalThis.getComputedStyle(this.container, null);
    const containerBlankSpace = parseFloat(containerDim.getPropertyValue('margin-left')) + parseFloat(containerDim.getPropertyValue('margin-right')) + parseFloat(containerDim.getPropertyValue('padding-left')) + parseFloat(containerDim.getPropertyValue('padding-right'));

    /* console.log(this.container, 'scroll-width:', this.container.scrollWidth);
    console.log(this.container, 'client-width:', this.container.clientWidth);
    console.log(this.container, 'containerBlankSpace:', containerBlankSpace);
    console.log(this.buttonContainer, 'scroll-width:', this.buttonContainer.scrollWidth);
    console.log(this.buttonContainer, 'client-width:', this.buttonContainer.clientWidth);
    console.log('----------------------------------'); */

    if ((this.container.clientWidth - containerBlankSpace) < this.buttonContainer.scrollWidth - 1) { // -1 çıkardık çünki getComputedStyle küsürülü sayıları bir üstüne yuvarlıyor. bu da hataya sebep olabiliyor.
      if (!this.container.classList.contains('onScroll')) {
        this.container.classList.add('onScroll');
      }
    } else {
      if (this.container.classList.contains('onScroll')) {
        this.container.classList.remove('onScroll');
      }
    }

    /* console.log(this.buttonContainer.scrollWidth);
    console.log(this.container.offsetWidth);
    console.log(this.container.clientWidth);
    console.log('------------'); */
  }

  update () {
    /* const range = this.editor.selection.getRaange(0);
    if (range == null) return; */
    const caretPos = this.editor.selection.getMemCaretPosition();

    let rangeFormat;
    const range = this.editor.selection.getRange();
    if (range && range.collapsed) {
      const activeNode = this.editor.paper.getActiveNode();
      const line = this.editor.paper.getLine(caretPos[0]);

      rangeFormat = { ...line.format, ...activeNode.__detail.format };
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
    // if (!this.editor.hasFocus()) this.editor.focus();

    let target = event.target;
    while (target && target.tagName !== 'SPAN') {
      target = target.parentNode;
    }

    const formatName = target.__detail.format.formatName;
    const format = {};
    format[formatName] = target.__detail.formatValue;

    const caretRange = this.editor.selection.getMemCaretPosition();
    // console.log('caretRange: ', caretRange);

    this.editor.selection.setMemCaretPosition(caretRange);
    this.editor.format(...caretRange, format);

    this.editor.update();
  }

  addDevelomentButton () {
    const buttonGroupElem = document.createElement('div');
    buttonGroupElem.className = 'button-group';
    const toolbarDevelopmentButton = document.createElement('span');
    toolbarDevelopmentButton.innerHTML = '<svg version="1.1" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g stroke-width=".32"><path d="m16 0c8.83648 0 16 7.16352 16 16s-7.16352 16-16 16-16-7.16352-16-16 7.16352-16 16-16z" fill="#e2574c"/><path d="m23.6733 12.2525c-0.19328-0.03936-0.39456 0.02048-0.53504 0.16064l-4.55136 4.64128c-0.45888 0.45952-2.0016 0.12384-3.04-0.28128-0.40576-1.0384-0.74112-2.58144-0.28352-3.04l4.664-4.52928c0.14016-0.13984 0.20096-0.34048 0.16064-0.53376-0.04-0.19392-0.176-0.35424-0.35872-0.4272-2.9056-1.15552-6.21216-0.47424-8.4224 1.73504-1.95136 1.95136-2.67456 4.68768-2.10176 7.23136-0.0736 1.2608-1.21984 2.73824-1.81248 3.3408l-4.55424 4.54432c1.16672 1.68576 2.64832 3.13568 4.36064 4.26592l4.33824-4.33024c0.60832-0.59936 2.2512-1.72928 3.50272-1.85888 0.1888 0.01216 0.57952 0.03808 0.66624 0.05728l-6.4e-4 -0.0074c2.44032 0.35456 4.90528-0.44224 6.65856-2.19328 2.21024-2.20672 2.8928-5.512 1.73696-8.41568-0.07296-0.18432-0.2336-0.31936-0.42784-0.35968z" fill="#cd4f45"/><path d="m23.6733 11.9325c-0.19328-0.03936-0.39456 0.02048-0.53504 0.16064l-4.55136 4.64128c-0.45888 0.45952-2.0016 0.12384-3.04-0.28128-0.40576-1.0384-0.74112-2.58144-0.28352-3.04l4.664-4.52928c0.14016-0.13984 0.20096-0.34048 0.16064-0.53376-0.04-0.19392-0.176-0.35424-0.35872-0.4272-2.9056-1.15552-6.21216-0.47424-8.4224 1.73504-1.95136 1.95136-2.67456 4.68768-2.10176 7.23136-0.0736 1.2608-1.21984 2.73824-1.81248 3.3408l-4.68608 4.67552c1.14304 1.70272 2.60448 3.17344 4.2992 4.32736l4.5312-4.5232c0.60832-0.59936 2.2512-1.72928 3.50272-1.85888 0.1888 0.01216 0.57952 0.03808 0.66624 0.05728l-6.4e-4 -0.0074c2.44032 0.35456 4.90528-0.44224 6.65856-2.19328 2.21024-2.20672 2.8928-5.512 1.73696-8.41568-0.07264-0.184-0.23328-0.31904-0.42752-0.35936z" fill="#ededed"/><path d="m24.5958 14.2579c0.04064 0.34752 0.05984 0.696 0.0544 1.0432-0.02336-0.9056-0.2016-1.81536-0.54944-2.68896-0.07296-0.184-0.23328-0.31936-0.42784-0.35936-0.19328-0.03936-0.39456 0.02048-0.53504 0.16064l-4.55104 4.64096c-0.45888 0.45952-2.0016 0.12384-3.04-0.28128-0.03552-0.09088-0.0704-0.18592-0.10464-0.28384l-10.7891 10.7894c0.71904 0.72352 1.50688 1.37824 2.35296 1.95424l4.5312-4.5232c0.60832-0.59936 2.2512-1.72928 3.50272-1.85888 0.1888 0.01216 0.57952 0.03808 0.66624 0.05728l-6.4e-4 -0.0074c2.44032 0.35456 4.90528-0.44224 6.65856-2.19328 1.72224-1.71968 2.51168-4.10592 2.23168-6.4496zm-0.27776-1.33792-0.04672-0.1488zm0.26016 1.19328c-0.01248-0.0928-0.02656-0.18496-0.04288-0.27712 0.016 0.09216 0.0304 0.18464 0.04288 0.27712zm-0.10272-0.58048-0.05568-0.24128z" fill="#e1e1e1"/><path d="m11.3069 9.97792c2.21024-2.20928 5.5168-2.89056 8.4224-1.73504 0.17088 0.06816 0.29792 0.2144 0.34656 0.39168 0.0272-0.0912 0.03232-0.18848 0.01216-0.28448-0.04-0.19392-0.176-0.35424-0.35872-0.4272-2.9056-1.15552-6.21216-0.47424-8.4224 1.73504-1.53952 1.53952-2.31136 3.568-2.28832 5.6048 0.05728-1.92832 0.82944-3.82592 2.28832-5.2848zm-3.91424 10.2522-4.68608 4.67552 0.13152 0.1888 4.55424-4.54432c0.59232-0.60288 1.73856-2.08 1.81248-3.3408l-0.02208-0.11552c-0.17408 1.21216-1.22944 2.56576-1.79008 3.13632z" fill="#f4f4f4"/><path d="m9.18752 21.6694-5.05792 5.0576c0.3584 0.39616 0.73632 0.77504 1.13248 1.13376l5.05856-5.05856c0.31296-0.31328 0.31296-0.82016 0-1.13312s-0.82016-0.31264-1.13312 3.2e-4z" fill="#ccd0d2"/><path d="m9.18752 21.6694-5.05792 5.0576 0.15488 0.16544 4.90304-4.90304c0.31328-0.31296 0.82016-0.31296 1.13312 0 0.11552 0.11552 0.18752 0.2576 0.21792 0.40672 0.05184-0.25472-0.02048-0.52896-0.21792-0.72672-0.31296-0.31296-0.82016-0.31296-1.13312 0z" fill="#b8bcbe"/></g></svg>';
    const toolbarDevelopmentListener = (event) => {
      this.editor.focus();
    };
    toolbarDevelopmentButton.addEventListener('click', toolbarDevelopmentListener);
    buttonGroupElem.appendChild(toolbarDevelopmentButton);
    this.buttonContainer.appendChild(buttonGroupElem);
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
