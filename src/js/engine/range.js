class Range {
  constructor (editor, nativeRange) {
    this.editor = editor;
    this.nativeRange = nativeRange;

    this.correction(nativeRange);
    // this.normalizedRange = this.nativeToNormal(nativeRange);
  }

  get normalizedRange () {
    return this.nativeToNormal();
  }

  get collapsed () {
    return this.nativeRange.collapsed;
  }

  correction () {
    // console.log('--------------');
    // console.log(this.nativeRange.cloneRange());
    // console.log(this.nativeRange.startContainer.parentNode.isSameNode(this.editor.root) || this.nativeRange.startContainer.isSameNode(this.editor.root));
    // console.log(this.nativeRange.endContainer.parentNode.isSameNode(this.editor.root) || this.nativeRange.startContainer.isSameNode(this.editor.root));
    // const rangeToBeFormatted = document.createRange();
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
      /* const childIndex = (this.nativeRange.endOffset < 1) ? 0 : this.nativeRange.endOffset - 1;
      const endChild = this.editor.root.childNodes[childIndex];

      this.nativeRange.setEndAfter(endChild.childNodes[endChild.childNodes.length - 1]); */
    }

    /* console.log(this.nativeRange.collapsed);
    console.log(this.nativeRange.startContainer.isSameNode(this.nativeRange.endContainer));
    console.log(this.nativeRange.startOffset === 0);
    console.log((this.nativeRange.startContainer.__detail instanceof this.editor.registry.get('format/text') || this.nativeRange.startContainer.__detail instanceof this.editor.registry.get('pattern/inline'))); */

    // iki nodenin arasında kalırsa geliş yönüne göre start, end veriyordu örneğin <p><b>örnek</b><i>naber</i></p> startNode: b, startOffset: 5 ; startNode: i, startOffset: 0. biz her zaman ilk seçeneğin gelmesini sağladık.

    if (this.nativeRange.collapsed && this.nativeRange.startContainer.isSameNode(this.nativeRange.endContainer) && this.nativeRange.startOffset === 0 && (this.nativeRange.startContainer.__detail instanceof this.editor.registry.get('format/text') || this.nativeRange.startContainer.__detail instanceof this.editor.registry.get('pattern/inline'))) {
      let parent = this.nativeRange.startContainer;

      while (!parent.previousSibling && !(parent.parentNode.__detail instanceof this.editor.registry.get('pattern/block'))) {
        parent = parent.parentNode;
      }

      if (!parent.previousSibling) return;
      if (parent.previousSibling.__detail instanceof this.editor.registry.get('format/hyperlink')) {
        // console.log('heyperlink varrr');
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

    // console.log('burada');

    // console.log(this.nativeRange);
    // console.log(this.normalizedRange);
    // console.trace(range);
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

    /* console.log('------');
    console.log('newStart:', start);

    let rangeStartNode = this.nativeRange.startContainer;
    let rangeStartLine = rangeStartNode.__detail.line;
    let oldStart = this.nativeRange.startOffset;

    // bunu koyduk çünki bazen editor divni gönderiyor taşıyıcı olarak.
    if (!rangeStartNode.__detail || rangeStartNode.__detail instanceof this.editor.registry.get('pattern/container') || rangeStartNode.__detail instanceof this.editor.registry.get('pattern/block')) {
      rangeStartNode = rangeStartNode.childNodes[(this.nativeRange.startOffset === 0) ? 0 : this.nativeRange.startOffset - 1];

      // console.log('rangeStartNode:', rangeStartNode);

      // Bunu yapmamızın nedeni image gibi hem block olup hem chidi olmayanları yakalamak. Aksi takdirde caret index hesaplaması start offsetten dolayın yanlış hesaplanıyor.
      if (rangeStartNode.__detail.domNode.isSameNode(rangeStartNode.__detail.line)) {
        rangeStartLine = rangeStartNode;
        oldStart = this.nativeRange.startOffset;
      } else {
        rangeStartLine = rangeStartNode.__detail.line;
        oldStart = (this.nativeRange.startOffset === 0) ? 0 : rangeStartNode.__detail.length;
      }
    }

    oldStart += rangeStartLine.__detail.start;
    if (!rangeStartLine.isSameNode(rangeStartNode)) {
      rangeStartLine.__detail.children.some((child) => {
        if (child.domNode.isSameNode(rangeStartNode)) {
          return true;
        }

        oldStart += child.length;
      });
    }

    console.log('oldStart:', oldStart);

    /* *-* */
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

    /* console.log('newEnd:', end);

    let rangeEndNode = this.nativeRange.endContainer;
    let rangeEndLine = rangeEndNode.__detail.line;
    let oldEnd = this.nativeRange.endOffset;

    if (!rangeEndNode.__detail || rangeEndNode.__detail instanceof this.editor.registry.get('pattern/container') || rangeEndNode.__detail instanceof this.editor.registry.get('pattern/block')) {
      rangeEndNode = rangeEndNode.childNodes[(this.nativeRange.endOffset === 0) ? 0 : this.nativeRange.endOffset - 1];

      // console.log('rangeEndNode:', rangeEndNode);

      // Bunu yapmamızın nedeni image gibi hem block olup hem chidi olmayanları yakalamak. Aksi takdirde caret index hesaplaması start offsetten dolayın yanlış hesaplanıyor.
      if (rangeEndNode.__detail.domNode.isSameNode(rangeEndNode.__detail.line)) {
        rangeEndLine = rangeEndNode;
        oldEnd = this.nativeRange.endOffset;
      } else {
        rangeEndLine = rangeEndNode.__detail.line;
        oldEnd = (this.nativeRange.endOffset === 0) ? 0 : rangeEndNode.__detail.length;
      }
    }

    oldEnd += rangeEndLine.__detail.start;
    if (!rangeEndLine.isSameNode(rangeEndNode)) {
      rangeEndLine.__detail.children.some((child) => {
        if (child.domNode.isSameNode(rangeEndNode)) {
          return true;
        }

        oldEnd += child.length;
      });
    }

    console.log('oldEnd:', oldEnd);

    /* let reachStart = false;
    let reachEnd = false; */

    // this.editor.paper.lines.forEach((line) => {
    /* if (!line.domNode.isSameNode(rangeStartLine) && !reachStart) {
      start += line.length;
    } else if (line.domNode.isSameNode(rangeStartLine)) {
      if (rangeStartLine.isSameNode(rangeStartNode)) {
        reachStart = true;
      }

      line.children.forEach((child) => {
        if (reachStart) return;

        if (!child.domNode.isSameNode(rangeStartNode)) {
          start += child.length;
        } else {
          reachStart = true;
        }
      });
    } */

    /* if (!line.domNode.isSameNode(rangeEndLine) && !reachEnd) {
      end += line.length;
    } else if (line.domNode.isSameNode(rangeEndLine)) {
      if (rangeEndLine.isSameNode(rangeEndNode)) {
        reachEnd = true;
      }

      line.children.forEach((child) => {
        if (reachEnd) return;

        if (!child.domNode.isSameNode(rangeEndNode)) {
          end += child.length;
        } else {
          reachEnd = true;
        }
      });
    } */
    // });
    // console.log('start: ', start);

    /* Development Section */
    /* console.log('-------------------');
    console.log('range: ', range);
    console.log('rangeStartNode: ', rangeStartNode);
    console.log('rangeEndNode: ', rangeEndNode);

    console.log('rangeStartLine: ', rangeStartLine);
    console.log('rangeEndLine: ', rangeEndLine);

    console.log('start: ', start);
    console.log('end: ', end);
    console.log('return:', { startOffset: start, endOffset: end, length: (end - start), nativeRange: range });
    /* --------------------------- */

    // Return Normalized Range
    // console.log({ startOffset: start, endOffset: end, length: (end - start), nativeRange: this.nativeRange });
    return { startOffset: start, endOffset: end, length: (end - start), nativeRange: this.nativeRange };
  }
}

export default Range;
