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

    // [RANGE-1] When it stays between two nodes, it used to give start/end based on the direction of arrival. For example <p><b>ornek</b><i>naber</i></p> startNode: b, startOffset: 5; startNode: i, startOffset: 0. We made sure the first option is always returned.

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
    // [RANGE-2] The line and node where the Range starts are detected. For nodes inside a tag, it walks up to the topmost tag, because below we perform the check from the line's child nodes.
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

        end = (this.nativeRange.endContainer.childNodes[0]) ? this.nativeRange.endContainer.childNodes[0].__detail.start : 0; // [RANGE-3] When deleted quickly with Backspace it throws an error if the (this.nativeRange.endContainer.childNodes[0]) condition is not present.
      } else {
        end = this.nativeRange.endContainer.childNodes[this.nativeRange.endOffset - 1].__detail.end;
      }
    }

    return { startOffset: start, endOffset: end, length: (end - start), nativeRange: this.nativeRange };
  }
}

export default Range;
