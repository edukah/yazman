import Parent from './parent.js';

class Container extends Parent {
  constructor (editor, { tagName, domNode }) {
    super(editor, { tagName, domNode });
  }

  getInnerLength () {
    this.innerLength = super.getInnerLength() - this.editor.registry.get('pattern/block').NEWLINE_LENGTH;

    return this.innerLength;
  }

  getLength () {
    return this.next ? this.getInnerLength() + this.editor.registry.get('pattern/block').NEWLINE_LENGTH : this.getInnerLength();
  }
}

export default Container;
