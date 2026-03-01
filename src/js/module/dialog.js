// import { Message } from '../../common/dialog.js';

class Dialog {
  constructor (editor) {
    this.editor = editor;
  }

  /* insertMessage(messageObj) {
    Message.insert(messageObj);
  } */

  insertModal (modalInnerDom, { backcloth = true } = {}) {
    this.closeModal();

    if (backcloth && !this.editor.container.classList.contains('shadow')) {
      this.editor.container.classList.add('shadow');
    }

    const modal = document.createElement('div');
    modal.classList.add('yazman-modal');
    modal.appendChild(modalInnerDom);

    this.editor.container.appendChild(modal);
  }

  closeModal () {
    if (this.editor.container.classList.contains('shadow')) {
      this.editor.container.classList.remove('shadow');
    }

    const modalContainer = this.editor.container.querySelector('.yazman-modal');
    if (!modalContainer) return;

    this.editor.container.removeChild(modalContainer);
    this.editor.focus();
  }
}

export default Dialog;
