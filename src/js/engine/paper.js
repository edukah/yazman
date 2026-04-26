class Paper {
  constructor (editor) {
    this.editor = editor;
    this.lines = [];
  }

  generate () {
    if (!this.editor.root.children.length) {
      this.editor.root.appendChild(document.createElement('p'));
    }

    this.lines = [];

    const recursivePushFunction = (domElement) => {
      Array.from(domElement.childNodes).forEach((domElementChild) => {
        if (domElementChild.__detail instanceof this.editor.registry.get('pattern/container') && domElementChild.hasChildNodes()) {
          recursivePushFunction(domElementChild);
        } else if (domElementChild.__detail instanceof this.editor.registry.get('pattern/block')) {
          this.lines.push(domElementChild.__detail);
        }
      });
    };

    recursivePushFunction(this.editor.root);
  }

  initialize () {
    if (!this.lines.length) this.generate();

    this.lines.forEach((line, lineIndex) => {
      if (line.changeStatus === false) return;

      const lineChildren = line.children;
      if (!Object.getPrototypeOf(line).constructor.getFormat || (JSON.stringify(Object.getPrototypeOf(line).constructor.getFormat(line.domNode)) !== JSON.stringify(line.format))) {
        let DomClass;
        const lineFormatKeys = Object.keys(line.format);

        if (this.editor.BLOCK_LEVEL_ELEMENT.has(lineFormatKeys[0] || 'paragraph')) {
          DomClass = this.editor.BLOCK_LEVEL_ELEMENT.get(lineFormatKeys[0] || 'paragraph');
        } else {
          DomClass = this.editor.BLOCK_LEVEL_ELEMENT.get('paragraph');
        }

        const formatInstance = new DomClass(this.editor, line.format);
        const newLineDom = formatInstance.domNode;

        line.domNode.parentNode.insertBefore(newLineDom, line.domNode);
        line.domNode.parentNode.removeChild(line.domNode);

        line = newLineDom.__detail;
        this.lines[lineIndex] = newLineDom.__detail;
      }

      line.domNode.__detail.changeStatus = false;

      while (line.domNode.childNodes.length) {
        line.domNode.removeChild(line.domNode.childNodes[0]);
      }

      lineChildren.forEach((child) => {
        if (child.textContent == null) {
          const textFreeContents = new Map();
          this.editor.EMBED_ELEMENT.forEach((value, key) => {
            textFreeContents.set(key, value);
          });

          const DomClass = textFreeContents.get(Object.keys(child.format)[0]);
          const formatInstance = new DomClass(this.editor, child.format);
          const newDom = formatInstance.domNode;
          line.domNode.appendChild(newDom);
        } else {
          let innerFormat;
          let parentFormat;

          const textFormatInstance = new this.editor.TEXT_NODE(this.editor, { text: child.textContent });
          const textNode = textFormatInstance.domNode;

          const orderedChildFormatKeys = Array.from(this.editor.INLINE_ELEMENT.keys()).filter((key) => child.format[key] != null);

          orderedChildFormatKeys.forEach((key) => {
            const DomClass = this.editor.INLINE_ELEMENT.get(key);
            const formatInstance = new DomClass(this.editor, child.format);
            const newDom = formatInstance.domNode;

            if (innerFormat) {
              innerFormat.appendChild(newDom);
            } else {
              parentFormat = newDom;
            }

            innerFormat = newDom;
          });

          if (innerFormat) {
            innerFormat.appendChild(textNode);
          }

          line.domNode.appendChild(parentFormat || textNode);
        }
      });
      // [PAPER-1] When the line below is shifted, preformatted blocks get corrupted. If the caret is at the very start and you toggle paragraph<>pre, the caret shifts because optimize runs at the very start. This will be fixed when the remove function is implemented. When you toggle paragraph<>pre at the end of an intermediate line, the caret shifts down. When you select the last paragraph inside pre together with the next paragraph and toggle pre<>paragraph, end shifts by 1. This block prevents all of the above.
    });

    this.editor.observer.complete();
  }

  importContent (contentArray) {
    this.editor.root.innerHTML = '';
    this.initialize();

    let first = false;
    contentArray.forEach(content => {
      this.editor.insertNode({ format: content.format, generateBlock: first }, -1); // [PAPER-2] preformatted
      content.children.forEach(child => {
        this.editor.insertNode({ ...child }, -1);
      });

      first = true;
    });

    this.editor.update();
  }

  exportContent (start = 0, end = null) {
    if (end == null) {
      end = this.getLength();
    }

    const lines = this.getLines(start, end);

    const exportedContent = lines.reduce((exportedContent, line, index) => {
      const exportedLine = { format: line.format, children: [] };

      line.children.forEach(child => {
        let textContent = (child.textContent) ? child.textContent : '';

        if (child instanceof this.editor.registry.get('format/break')) {
          textContent = '';
        }

        if (line instanceof this.editor.registry.get('format/preformatted') && textContent.endsWith('\n')) {
          textContent = textContent.slice(0, -1);
        }

        if (child.end <= start || child.start >= end) { // [PAPER-3] If the child stays entirely outside the boundary
          return;
        } else if (child.start >= start && child.end <= end) { // [PAPER-4] If the child stays entirely inside the boundary
          // [PAPER-5] textContent stays as is
        } else if (child.start <= start && child.end >= end) { // [PAPER-6] If the boundary starts and ends inside the child
          textContent = textContent.slice(start - child.start, end - child.start);
        } else if (child.start <= start) { // [PAPER-7] If the boundary starts inside the child
          textContent = textContent.slice(start - child.start);
        } else if (child.end >= end) { // [PAPER-8] If the boundary ends inside the child
          textContent = textContent.slice(0, end - child.start);
        }

        const paragraphArray = textContent.replace(/\r\n/g, '\n').split('\n');
        paragraphArray.forEach((textContent, index) => {
          if (line instanceof this.editor.registry.get('format/preformatted') && !textContent.length) {
            textContent = '\n';
          }

          const exportedChild = { textContent, format: child.format };
          exportedLine.children.push(exportedChild);
        });
      });

      exportedContent.push(exportedLine);

      return exportedContent;
    }, []);

    return exportedContent;
    // [PAPER-9] [{textContent: '\n', format: {paragraph: true}}, {textContent: 'asdas', format: {bold: true}}]
  }

  /* *************************** to paper ****************************** */
  getText () {
    const range = this.editor.selection.getNativeRange();

    if (!range) return '';

    return range.toString();
  }

  getActiveNode () {
    const range = this.editor.selection.getRange();

    if (!range.collapsed) return null;

    return range.nativeRange.startContainer;
  }

  getNode (index) {
    const line = this.getLine(index);

    if (!line) {
      return null;
    }

    const child = line.children.find((child) => {
      if ((child.end >= index) && (child.start <= index)) {
        return true;
      }

      return false;
    });

    if (!child) {
      return line;
    }

    return child;
  }

  getNodes (start = 0, end = null) {
    if (end == null) {
      end = this.getLength();
    }

    if (start === end) {
      return this.getNode(start) ? [this.getNode(start)] : [];
    }

    const lines = this.getLines(start, end);

    const children = [];
    lines.forEach(line => line.children.forEach((child) => {
      if ((child.end > start) && (child.start < end)) {
        children.push(child);
      }
    }));

    return children;
  }

  getLine (index) {
    const line = this.lines.find((line) => {
      if ((line.end >= index) && (line.start <= index)) {
        return true;
      }

      return false;
    });

    return line;
  }

  getLines (start = 0, end = null) {
    if (end == null) {
      end = this.getLength();
    }

    if (start === end) {
      return this.getLine(start) ? [this.getLine(start)] : [];
    }

    const linesInRange = this.editor.paper.lines.filter((line) => {
      if ((line.end > start) && (line.start < end)) {
        return true;
      };

      return false;
    });

    return linesInRange;
  }

  getFormat (start, end) {
    // [PAPER-10] Filters the elements that fall within that range.
    const linesInRange = this.getLines(start, end);

    let blockFormat;
    let inlineFormat;
    linesInRange.forEach((line) => {
      // [PAPER-11] Since embed elements come from different sources, modifying their text content does not make sense for us. Therefore, if the line contains an Embed format, we do not continue.
      const isLineEmbed = Object.entries(line.format).some(([key, value]) => {
        return this.editor.EMBED_ELEMENT.has(key);
      });

      if (blockFormat == null) {
        blockFormat = line.format;
      }

      // [PAPER-12] Duplicate formats are prevented.
      if (Object.keys(blockFormat).length > 0) {
        const newBlockFormat = {};

        Object.entries(blockFormat).forEach(([key, value]) => {
          if (line.format[key] && line.format[key] === value) {
            newBlockFormat[key] = value;
          }
        });

        blockFormat = newBlockFormat;
      }

      if (isLineEmbed) {
        return;
      }

      line.children.forEach((child) => {
        if ((child.end > start && child.start < end) ||
          (line.start === child.start && child.start === start) ||
          child.end === end) {
          if (inlineFormat == null) {
            inlineFormat = child.format;
          }

          if (Object.keys(inlineFormat).length > 0) {
            const newInlineFormat = {};

            Object.entries(inlineFormat).forEach(([key, value]) => {
              if (child.format[key] && child.format[key] === value) {
                newInlineFormat[key] = value;
              }
            });

            inlineFormat = newInlineFormat;
          }
        };
      });
    });

    return { ...blockFormat, ...inlineFormat };
  }
  /* ************** to paper end ************************************** */

  optimize (domNode) {
    if (!domNode || domNode.__detail == null) return;

    domNode.normalize();

    if (domNode.childNodes) {
      Array.from(domNode.childNodes).forEach((child) => {
        this.optimize(child);
      });
    }

    domNode.__detail.optimize();
  }

  update (domNode) {
    if (!domNode || domNode.__detail == null) return;

    domNode.normalize();

    if (domNode.childNodes) {
      Array.from(domNode.childNodes).forEach((child) => {
        this.update(child);
      });
    }

    domNode.__detail.update();
  }

  remove (elem) {
    if (!elem || !elem.domNode || elem.domNode.__detail == null) return;

    elem.domNode.__detail.remove();
  }

  getLength () {
    if (!this.lines.length) return 0;

    const lastLineEnd = this.lines[this.lines.length - 1].end;

    return lastLineEnd;
  }
}

export default Paper;
