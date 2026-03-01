class Clipboard {
  constructor (editor) {
    this.editor = editor;

    this.editor.root.addEventListener('paste', (event) => {
      const text = event.clipboardData.getData('text/plain');

      /* const html = event.clipboardData.getData('text/html');
      const doc = new globalThis.DOMParser().parseFromString(html, 'text/html');
      const body = document.body;
      console.log(parsedHtml); */

      const paragraphArray = text.trim().replace(/\r\n/g, '\n').split('\n').filter(v => v.trim().length);

      const [startIndex, endIndex] = this.editor.selection.getMemCaretPosition();
      if (!this.editor.selection.isCollapsed()) {
        this.editor.deleteContent(startIndex, endIndex, true); // preformatted
      }

      paragraphArray.reverse().forEach(t => {
        this.editor.insertNode({ textContent: t, format: { paragraph: true } }, startIndex); // preformatted
        // this.editor.insertNode({ textContent: t, format: { paragraph: true }, preventBlock: false }, startIndex);
      });

      this.editor.selection.setMemCaretPosition([startIndex, startIndex]);

      event.preventDefault();
    });
  }
}

export default Clipboard;
