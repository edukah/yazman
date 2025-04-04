import Parent from './parent.js';

class Inline extends Parent {
  constructor (editor, { tagName, domNode }) {
    super(editor, { tagName, domNode });
  }

  get line () {
    let parent = this.domNode;

    while (parent && parent.__detail && !(parent.__detail instanceof this.editor.registry.get('pattern/block'))) {
      parent = parent.parentNode;
    }

    return parent;
  }

  getLength () {
    return this.textContent.length;
  }

  optimize () {
    if (this.domNode.nextSibling && this.domNode.nextSibling.__detail instanceof this.constructor) {
      this.domNode.append(...this.domNode.nextSibling.childNodes);
      /* this.domNode.childNodes.forEach((child) => {
        this.editor.paper.optimiza(child);
      }); */
      this.domNode.normalize();
      this.update();

      this.domNode.parentNode.removeChild(this.domNode.nextSibling);
    }

    if (this.domNode.previousSibling && this.domNode.previousSibling.__detail instanceof this.constructor) {
      this.domNode.previousSibling.append(...this.domNode.childNodes);
      /* this.domNode.previousSibling.childNodes.forEach((child) => {
        this.editor.paper.optimiza(child);
      }); */
      this.domNode.previousSibling.normalize();
      this.domNode.previousSibling.__detail.update();

      this.domNode.parentNode.removeChild(this.domNode);
    }

    if (this.parent && this.parent.domNode.isSameNode(this.editor.root)) {
      const FormatClassPrototype = this.editor.BLOCK_LEVEL_ELEMENT.get('paragraph');
      const formatClassInstance = new FormatClassPrototype(this.editor);
      const newDom = formatClassInstance.domNode;

      this.domNode.parentNode.insertBefore(newDom, this.domNode.nextElementSibling);
      newDom.appendChild(this.domNode);
    }
  }
}

class InlineEmbed extends Inline {
  constructor (editor, { tagName, domNode }) {
    super(editor, { tagName, domNode });
  }

  get textContent () {
    return null;
  }

  getLength () {
    return 1;
  }
}

export { Inline as default, InlineEmbed };
