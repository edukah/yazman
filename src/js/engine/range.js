class Range {
  constructor (editor, nativeRange) {
    this.editor = editor;
    this.nativeRange = nativeRange;

    this.correction(nativeRange);
  }

  get normalizedRange () {
    return this.nativeToNormal();
  }

  get collapsed () {
    return this.nativeRange.collapsed;
  }

  correction () {
    if (this.nativeRange.startContainer.isSameNode(this.editor.root)) {
      if (this.editor.root.childNodes == null) return;
      const childIndex = this.editor.root.childNodes.length === this.nativeRange.startOffset ? this.nativeRange.startOffset - 1 : this.nativeRange.startOffset;

      if (this.editor.root.childNodes[childIndex] == null) return;
      const startNode = this.editor.root.childNodes[childIndex].childNodes.length ? this.editor.root.childNodes[childIndex].firstChild : this.editor.root.childNodes[childIndex];

      this.nativeRange.setStartBefore(startNode);
    }

    if (this.nativeRange.endContainer.isSameNode(this.editor.root)) {
      if (this.editor.root.childNodes == null) return;
      const childIndex = this.editor.root.childNodes.length === this.nativeRange.endOffset ? this.nativeRange.endOffset - 1 : this.nativeRange.endOffset;

      if (this.editor.root.childNodes[childIndex] == null) return;
      const endNode = this.editor.root.childNodes[childIndex].childNodes.length ? this.editor.root.childNodes[childIndex].lastChild : this.editor.root.childNodes[childIndex];

      this.nativeRange.setEndAfter(endNode);
    }

    // iki nodenin arasında kalırsa geliş yönüne göre start, end veriyordu örneğin <p><b>örnek</b><i>naber</i></p> startNode: b, startOffset: 5 ; startNode: i, startOffset: 0. biz her zaman ilk seçeneğin gelmesini sağladık.

    if (this.nativeRange.collapsed && this.nativeRange.startContainer.isSameNode(this.nativeRange.endContainer) && this.nativeRange.startOffset === 0 && (this.nativeRange.startContainer.__detail instanceof this.editor.registry.get('format/text') || this.nativeRange.startContainer.__detail instanceof this.editor.registry.get('pattern/inline'))) {
      let parent = this.nativeRange.startContainer;

      while (!parent.previousSibling && !(parent.parentNode.__detail instanceof this.editor.registry.get('pattern/block'))) {
        parent = parent.parentNode;
      }

      if (!parent.previousSibling) return;
      if (parent.previousSibling.__detail instanceof this.editor.registry.get('format/hyperlink')) {
        return;
      }

      this.nativeRange.setStartBefore(parent);
      this.nativeRange.setEndBefore(parent);

      let child = this.nativeRange.startContainer.childNodes[(this.nativeRange.endOffset === 0) ? 0 : this.nativeRange.endOffset - 1];

      while (child.__detail instanceof this.editor.registry.get('pattern/inline') && child.lastChild) {
        child = child.lastChild;
      }

      this.nativeRange.setStart(child, child.__detail.length);
      this.nativeRange.setEnd(child, child.__detail.length);
    }
  }

  nativeToNormal () {
    // range'nin başladığı line ve node tespit ediliyor. tag içindeki nodelerde en üst tag'a çıkıyor aşağıda line'ın child nodelerinden kontrol yaptığımız için.
    let start;

    if (!this.nativeRange.startContainer.__detail) {
      this.editor.observer.complete();
    }

    if (this.nativeRange.startContainer.__detail instanceof this.editor.registry.get('format/text')) {
      start = this.nativeRange.startOffset + this.nativeRange.startContainer.__detail.start;
    } else {
      if (this.nativeRange.startOffset === 0) {
        if (this.nativeRange.startContainer.childNodes[0] && !this.nativeRange.startContainer.childNodes[0].__detail) {
          this.editor.observer.complete();
        }

        start = (this.nativeRange.startContainer.childNodes[0]) ? this.nativeRange.startContainer.childNodes[0].__detail.start : 0;
      } else {
        start = this.nativeRange.startContainer.childNodes[this.nativeRange.startOffset - 1].__detail.end;
      }
    }

    let end;

    if (!this.nativeRange.endContainer.__detail) {
      this.editor.observer.complete();
    }

    if (this.nativeRange.endContainer.__detail instanceof this.editor.registry.get('format/text')) {
      end = this.nativeRange.endOffset + this.nativeRange.endContainer.__detail.start;
    } else {
      if (this.nativeRange.endOffset === 0) {
        if (this.nativeRange.endContainer.childNodes[0] && !this.nativeRange.endContainer.childNodes[0].__detail) {
          this.editor.observer.complete();
        }

        end = (this.nativeRange.endContainer.childNodes[0]) ? this.nativeRange.endContainer.childNodes[0].__detail.start : 0; // backspace ile hızlıca slilince error veriyor (this.nativeRange.endContainer.childNodes[0]) bu koşul olmazsa.
      } else {
        end = this.nativeRange.endContainer.childNodes[this.nativeRange.endOffset - 1].__detail.end;
      }
    }

    return { startOffset: start, endOffset: end, length: (end - start), nativeRange: this.nativeRange };
  }
}

export default Range;
