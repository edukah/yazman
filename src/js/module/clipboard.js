class Clipboard {
  constructor (editor) {
    this.editor = editor;

    this._pasteHandler = (event) => {
      const text = event.clipboardData.getData('text/plain');

      const paragraphArray = text.trim().replace(/\r\n/g, '\n').split('\n').filter(v => v.trim().length);

      const [startIndex, endIndex] = this.editor.selection.getMemCaretPosition();
      if (!this.editor.selection.isCollapsed()) {
        this.editor.deleteContent(startIndex, endIndex, true); // preformatted
      }

      let totalLength = 0;
      paragraphArray.reverse().forEach(t => {
        this.editor.insertNode({ textContent: t, format: { paragraph: true } }, startIndex);
        totalLength += t.length + 1; // +1 for line break
      });

      const endPos = startIndex + totalLength;
      this.editor.selection.setMemCaretPosition([endPos, endPos]);

      event.preventDefault();
    };

    this.editor.root.addEventListener('paste', this._pasteHandler);
  }

  destroy () {
    this.editor.root.removeEventListener('paste', this._pasteHandler);
  }
}

export default Clipboard;
