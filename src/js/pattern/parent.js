class Parent {
  constructor (editor, { tagName = 'p', domNode = null } = {}) {
    this.editor = editor;

    if (domNode instanceof globalThis.Node) {
      this.domNode = domNode;
    } else {
      this.domNode = document.createElement(tagName);
    }

    this.format = Object.getPrototypeOf(this).constructor.getFormat(this.domNode);
    this.children = [];
    this.changeStatus = this.domNode.__detail ? this.domNode.__detail.changeStatus : false;

    this.domNode.__detail = this;
  }

  get start () {
    if (this.domNode.previousSibling && this.domNode.previousSibling.__detail) {
      return this.domNode.previousSibling.__detail.start + this.domNode.previousSibling.__detail.length;
    } else if (!this.domNode.previousSibling && this.domNode.parentNode && this.domNode.parentNode.__detail) {
      return this.domNode.parentNode.__detail.start;
    } else {
      return 0;
    }
  }

  get length () {
    if (this._length == null) {
      this._length = this.getLength();
    }

    // return this.getLength();
    return this._length;
  }

  set length (v) {
    this._length = v;
  }

  get end () {
    return this.start + (Number.isInteger(this.innerLength) ? this.innerLength : this.length);
  }

  get textContent () {
    return this.domNode.textContent;
  }

  get prev () {
    if (this.domNode.previousSibling) {
      return this.domNode.previousSibling.__detail;
    }

    if (this.parent) {
      return this.parent.prev;
    }

    return null;
  }

  get next () {
    if (this.domNode.nextSibling) {
      return this.domNode.nextSibling.__detail;
    }

    if (this.parent) {
      return this.parent.next;
    }

    return null;
  }

  get parent () {
    // Editor.js içinde deleteNode ve insertNode içerisinde kullanılıyor.
    return (this.domNode.parentNode && this.domNode.parentNode.__detail) ? this.domNode.parentNode.__detail : null;
  }

  get line () {
    return null;
  }

  update () {
    this.children = this.getChildren();
    this.length = this.getLength();

    // En sondaki block elementinin length'ini ayarlıyor, newline olmadığı için inner var sadece
    /* if (this.domNode.isSameNode(this.editor.root.lastChild)) {
      this.length = this.getInnerLength();
    } else {
      this.length = this.getLength();
    } */

    // this.length = this.domNode.isSameNode(this.editor.root.lastChild) ? this.getInnerLength() : this.getLength();
    this.format = Object.getPrototypeOf(this).constructor.getFormat(this.domNode);
  }

  optimize () {
    this.domNode.normalize();
  }

  remove () {
    if (!this.domNode.parentNode) return;

    const parent = this.domNode.parentNode;

    parent.removeChild(this.domNode);
    parent.normalize();
  }

  getInnerLength (cached = false) {
    if (cached && this.innerLength != null) {
      return this.innerLength;
    }

    this.innerLength = 0;

    this.domNode.childNodes.forEach(child => {
      if (!child.__detail) return;

      this.innerLength += child.__detail.length;
    });

    return this.innerLength;
  }

  getLength (cached = false) {
    return this.getInnerLength(cached);
  }

  getChildren () {
    const children = [];

    const recursive = (elem) => {
      elem.childNodes.forEach((child) => {
        if (!child.__detail) return;

        if (!child.hasChildNodes()) {
          child.__detail.update();
          children.push(child.__detail);
        } else {
          child.__detail.update();
          recursive(child);
        }
      });
    };

    recursive(this.domNode);

    return children;
  }

  static getFormat (domNode) {
    return {
      [this.formatName]: true
    };
  }

  static checkMerge () {
    return this;
  }
}

export default Parent;
