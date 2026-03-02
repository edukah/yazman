import Inline from '../pattern/inline.js';

class Hyperlink extends Inline {
  constructor (editor, { hyperlink = '#location_must_send', domNode = null } = {}) {
    super(editor, { tagName: Hyperlink.tagName, domNode });

    if (domNode != null) {
      hyperlink = Hyperlink.getFormat(domNode).hyperlink;
    }

    this.domNode.setAttribute('href', hyperlink);
  }

  optimize () {
    const caretRange = this.editor.selection.getCaretPosition();
    // console.log('optimieze');
    // console.trace(caretRange);

    if (caretRange[0] === caretRange[1] && caretRange[0] === this.end) {
      const range = this.editor.selection.getNativeRange();

      let parent = range.startContainer;

      while (!parent.nextSibling && !(parent.__detail instanceof this.editor.registry.get('format/hyperlink')) && !(parent.parentNode.__detail instanceof this.editor.registry.get('pattern/block'))) {
        parent = parent.parentNode;
      }

      if (!(parent.__detail instanceof this.editor.registry.get('format/hyperlink'))) return;

      range.setStartAfter(parent);
      range.setEndAfter(parent);

      // console.log(range);

      let child = range.startContainer.childNodes[(range.startOffset === 0) ? 0 : range.startOffset];

      if (!child) return;

      while (child.__detail instanceof this.editor.registry.get('pattern/inline') && child.firstChild) {
        child = child.firstChild;
      }

      range.setStart(child, 0);
      range.setEnd(child, 0);
    }
  }

  static getFormat (domNode) {
    return {
      [Hyperlink.formatName]: domNode.getAttribute('href')
    };
  }

  static urlValidate (url) {
    const regex = new RegExp(`^(https?://)?(www\\.)?[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,5}\\.?`);
    if (!regex.test(url)) {
      return false;
    }

    return true;
  }

  static toolbarListener (event, editor) {
    const caretRange = editor.selection.getMemCaretPosition();

    const rangeNodes = editor.paper.getNodes(...caretRange);

    const filteredNode = rangeNodes.filter(node => {
      if (Object.keys(node.format).includes('hyperlink')) {
        node.format.hyperlink = false;
        editor.format(node.start, node.end, node.format);

        return true;
      }

      return false;
    });

    if (filteredNode.length) {
      editor.selection.setMemCaretPosition(caretRange);
      editor.update();

      return;
    }

    const formContainer = document.createElement('div');
    formContainer.classList.add('yazman-form');

    const inputData = [{ type: 'text', name: 'url', title: 'URL' }];
    inputData.forEach(inputDataObj => {
      const label = document.createElement('label');

      const title = document.createElement('span');
      title.classList.add('fsi-14', 'fwe-semibold');
      title.innerText = inputDataObj.title;
      label.appendChild(title);

      const input = document.createElement('input');
      input.type = inputDataObj.type;
      input.name = inputDataObj.name;
      label.appendChild(input);

      formContainer.appendChild(label);
    });

    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('yazman-form-button-container');
    buttonContainer.classList.add('text-right');
    buttonContainer.style.marginTop = '10px';
    formContainer.appendChild(buttonContainer);

    const buttonData = [{ type: 'submit', className: 'bttn bttn--sm color-text-primary-base fsi-14 fwe-semibold yazman-modal-close', value: 'İPTAL', onclick: () => editor.dialog.closeModal() }, { type: 'submit', className: 'bttn bttn--sm bttn--theme-1 fsi-14 fwe-semibold ffa-sans ', value: 'DEVAM', onclick: () => this.toolbarFormListener(editor) }];
    buttonData.forEach(buttonDataObj => {
      const button = document.createElement('input');
      Object.entries(buttonDataObj).forEach(([key, value]) => {
        button[key] = value;
      });
      buttonContainer.appendChild(button);
    });

    editor.dialog.insertModal(formContainer);
  }

  static toolbarFormListener (editor) {
    const url = editor.container.querySelector('.yazman-modal input[name="url"]').value.trim();
    const caretRange = editor.selection.getMemCaretPosition();

    editor.dialog.closeModal();

    if (caretRange[0] === caretRange[1]) return;
    if (!url.length) return;

    editor.format(...caretRange, { hyperlink: url });
    editor.selection.setMemCaretPosition([caretRange[1], caretRange[1]]);

    editor.update();
  }
}

Hyperlink.tagName = 'A';
Hyperlink.formatName = 'hyperlink';
Hyperlink.toolbar = '<svg enable-background="new 0 0 515.556 515.556" version="1.1" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m22.5169 3.5c-1.59759 0-3.09862 0.623035-4.22852 1.75293l-4.6582 4.6582c0.356023-0.0497 0.710293-0.104167 1.07422-0.104167 1.00343 0 1.9867 0.195187 2.89063 0.556641l2.90202-2.90202c0.540145-0.539417 1.25695-0.836589 2.01986-0.836589 1.57548 0 2.85807 1.28096 2.85807 2.85644 0 0.762962-0.297172 1.48134-0.836589 2.02148l-5.22298 5.22298c-1.08034 1.07878-2.96101 1.07878-4.04134 0l-2.20703 2.21191c1.12917 1.12839 2.63007 1.74967 4.22689 1.74967 1.59759 0 3.1002-0.623035 4.23014-1.75293l5.22298-5.22298c1.12989-1.1299 1.75293-2.63255 1.75293-4.23014-4.9e-5 -3.29891-2.68412-5.98144-5.98307-5.98144zm-7.8125 7.86946c-1.54962 2e-4 -3.0986 0.566051-4.22852 1.69596l-5.22298 5.22298c-1.12994 1.1299-1.75293 2.63255-1.75293 4.23014 0 3.29896 2.68254 5.98144 5.98145 5.98144 1.59759 0 3.1002-0.623035 4.23014-1.75293l4.59635-4.59635c-0.335607 0.04509-0.669613 0.09928-1.014 0.09928-1.0189 4.9e-5 -2.0045-0.203438-2.91667-0.585938l-2.87435 2.87435c-0.540144 0.539417-1.25857 0.836588-2.02148 0.836588-1.57548 0-2.85645-1.28096-2.85645-2.85644 0-0.762913 0.297172-1.48134 0.836588-2.02148l5.22298-5.22298c1.08034-1.07878 2.961-1.07878 4.04134 0l2.20703-2.21191c-1.12953-1.12839-2.67889-1.6929-4.22852-1.6927z"/></svg>';

export default Hyperlink;
