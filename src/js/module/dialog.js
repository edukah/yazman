class Dialog {
  constructor (editor) {
    this.editor = editor;
  }

  insertModal (modalInnerDom, { backcloth = true } = {}) {
    this.closeModal();

    if (backcloth && !this.editor.container.classList.contains('is-backdrop-visible')) {
      this.editor.container.classList.add('is-backdrop-visible');
    }

    const modal = document.createElement('div');
    modal.classList.add('yazman-modal');
    modal.appendChild(modalInnerDom);

    this.editor.container.appendChild(modal);
  }

  closeModal () {
    if (this.editor.container.classList.contains('is-backdrop-visible')) {
      this.editor.container.classList.remove('is-backdrop-visible');
    }

    const modalContainer = this.editor.container.querySelector('.yazman-modal');
    if (!modalContainer) return;

    this.editor.container.removeChild(modalContainer);
    this.editor.focus();
  }
}

export default Dialog;
