class Observer {
  constructor (editor) {
    this.editor = editor;
    this.changedElems = [];

    this.allNonTextFormat = [...this.editor.CONTAINER_LEVEL_ELEMENT.values(), ...this.editor.BLOCK_LEVEL_ELEMENT.values(), ...this.editor.INLINE_ELEMENT.values(), ...this.editor.EMBED_ELEMENT.values()];

    this.instance = new globalThis.MutationObserver(this.callback.bind(this));
    this.instance.observe(this.editor.root, Observer.config);
  }

  /* observe() {
    this.instance.observe(this.editor.root, this.observerConfig);
  } */

  disconnect () {
    this.instance.disconnect();
  }

  complete () {
    const mutationRecords = this.instance.takeRecords();

    if (mutationRecords.length) {
      this.editor.observer.callback(mutationRecords);
    }
  }

  callback (mutationList, observer) {
    this.changedElems = [];

    for (const mutation of mutationList) {
      // console.log(mutation);
      if (mutation.type === 'childList') {
        if (mutation.removedNodes.length) {
          // console.log('removedNodes: ', mutation.removedNodes);
          if (mutation.nextSibling && this.editor.contains(this.editor.root, mutation.nextSibling)) {
            this.changedElems.push(mutation.nextSibling);
          }

          if (mutation.previousSibling && this.editor.contains(this.editor.root, mutation.previousSibling)) {
            this.changedElems.push(mutation.previousSibling);
          }
          /* for (const removedNode of mutation.removedNodes) {

          } */
        }
        if (mutation.addedNodes.length) {
          // console.log('addedNodes: ', mutation.addedNodes);
          for (const addedNode of mutation.addedNodes) {
            this.push(addedNode);
            // console.log(this.changedElems);
          }
        }
      }

      if (mutation.type === 'characterData') {
        if (mutation.target) {
          if (mutation.target.nodeType === globalThis.Node.TEXT_NODE && !mutation.target.__detail) {
            new this.editor.TEXT_NODE(this.editor, { domNode: mutation.target });
          }
          this.changedElems.push(mutation.target);
        }
      } else if (mutation.target && !mutation.target.isSameNode(this.editor.root)) {
        this.changedElems.push(mutation.target);
      }
    }

    let lastTopParentElem;
    this.changedElems.forEach(elem => {
      if (elem.__detail) {
        // console.log(elem, elem.__detail.start, elem.__detail.end);
      }

      // en önce chidler geliyor. bu sebeple child parentleride whilde içinde yapıldığından tekrar yapmamak adına bunu yaptık.
      if (lastTopParentElem && lastTopParentElem.isSameNode(elem)) {
        return;
      } else {
        lastTopParentElem = elem;
      }

      let parent = elem;
      while (parent && this.editor.root.contains(parent) && !this.editor.root.isSameNode(parent)) {
        const _parent = parent;
        lastTopParentElem = parent;
        parent = parent.parentNode;

        if (!_parent.__detail) continue;

        _parent.__detail.update();
        _parent.__detail.optimize();
        _parent.normalize();
        _parent.__detail.update();
        // console.log(_parent, _parent.__detail.start, _parent.__detail.end, _parent.__detail);
      }

      // en sona new line ekleyince öncekinin length'i değişmiyor.
      if (lastTopParentElem.__detail && lastTopParentElem.__detail.prev) {
        lastTopParentElem.__detail.prev.update();
        lastTopParentElem.__detail.prev.optimize();
        lastTopParentElem.__detail.prev.domNode.normalize();
        /* if(!elem.__detail.prev) {
          console.log(elem);
          console.log(elem.__detail);
          console.log(elem.__detail.prev);
        } */
        // optimize içerisinde (preformatted) nextSibling silinince burada hata veriyor.
        if (lastTopParentElem.__detail.prev) lastTopParentElem.__detail.prev.update();
      }
      //
    });

    // console.log(changedElems);
    this.editor.paper.generate();
    this.complete();
    /* if (this.editor.history) {
      this.editor.history.record(mutationList);
    } */
  };

  push (domNode) {
    // console.log(domNode);

    if (!domNode.__detail) {
      if (domNode.nodeType === globalThis.Node.ELEMENT_NODE) {
        const FormatClassPrototype = this.allNonTextFormat.find((formatClassPrototype) => formatClassPrototype.tagName === domNode.tagName);
        // if (FormatClassPrototype) {
        //  new FormatClassPrototype(this.editor, { domNode: domNode });
        // }
        if (FormatClassPrototype) {
          const formatClassInstance = new FormatClassPrototype(this.editor, { domNode });
          const newDom = formatClassInstance.domNode;

          if (newDom.parentNode && newDom.parentNode.isSameNode(this.editor.root) && !(formatClassInstance instanceof this.editor.registry.get('pattern/block') || formatClassInstance instanceof this.editor.registry.get('pattern/container'))) {
            const FormatClassPrototype = this.editor.BLOCK_LEVEL_ELEMENT.get('paragraph');
            const formatClassInstance = new FormatClassPrototype(this.editor);
            const newDom = formatClassInstance.domNode;

            domNode.parentNode.insertBefore(newDom, domNode.nextElementSibling);
            newDom.appendChild(domNode);
          }
        } else {
          // fomatclassprototype olmayan element eklenince hata veriyor. hemen alttaki satır.
          // this.editor.selection.setMemCaretPosition(this.editor.selection.getCaretPosition());

          if (domNode.parentNode.isSameNode(this.editor.root)) {
            const FormatClassPrototype = this.editor.BLOCK_LEVEL_ELEMENT.get('paragraph');
            const formatClassInstance = new FormatClassPrototype(this.editor);
            const newDom = formatClassInstance.domNode;

            while (domNode.childNodes.length) {
              newDom.appendChild(domNode.childNodes[0]);
            }

            domNode.parentNode.insertBefore(newDom, domNode.nextElementSibling);
            domNode.parentNode.removeChild(domNode);
          } else {
            while (domNode.childNodes.length) {
              domNode.parentNode.appendChild(domNode.childNodes[0]);
            }

            domNode.remove();
          }
        }
      } else if (domNode.nodeType === globalThis.Node.TEXT_NODE) {
        new this.editor.TEXT_NODE(this.editor, { domNode });
      } else {
        domNode.parentNode.removeChild(domNode);
      }
    }

    if (domNode.hasChildNodes()) {
      Array.from(domNode.childNodes).forEach((domNodeChild) => this.push(domNodeChild));
    }

    this.changedElems.push(domNode);
    // console.log(domNode, domNode.__detail);
  }

  /* push(domNode) {
    if (domNode.hasChildNodes()) {
      Array.from(domNode.childNodes).forEach((domNodeChild) => this.push(domNodeChild));
    }

    if (!domNode.__detail) {
      if (domNode.nodeType === globalThis.Node.ELEMENT_NODE) {
        const FormatClassPrototype = this.allNonTextFormat.find((formatClassPrototype) => formatClassPrototype.tagName === domNode.tagName);

        // if (FormatClassPrototype) {
        //  new FormatClassPrototype(this.editor, { domNode: domNode });
        // }
        if (FormatClassPrototype) {
          const formatClassInstance = new FormatClassPrototype(this.editor, { domNode: domNode });
          const newDom = formatClassInstance.domNode;

          if (newDom.parentNode && newDom.parentNode.isSameNode(this.editor.root) && !(formatClassInstance instanceof this.editor.registry.get('pattern/block') || formatClassInstance instanceof this.editor.registry.get('pattern/container'))) {
            const FormatClassPrototype = this.editor.BLOCK_LEVEL_ELEMENT.get('paragraph');
            const formatClassInstance = new FormatClassPrototype(this.editor);
            const newDom = formatClassInstance.domNode;

            domNode.parentNode.insertBefore(newDom, domNode.nextElementSibling);
            newDom.appendChild(domNode);
          }
        } else {
          const FormatClassPrototype = this.editor.BLOCK_LEVEL_ELEMENT.get('paragraph');
          const formatClassInstance = new FormatClassPrototype(this.editor);
          const newDom = formatClassInstance.domNode;

          while (domNode.childNodes.length) {
            newDom.appendChild(domNode.childNodes[0]);
          }

          domNode.parentNode.insertBefore(newDom, domNode.nextElementSibling);
          domNode.parentNode.removeChild(domNode);
        }
      } else if (domNode.nodeType === globalThis.Node.TEXT_NODE) {
        new this.editor.TEXT_NODE(this.editor, { domNode: domNode });
      } else {
        domNode.parentNode.removeChild(domNode);
      }
    }

    this.changedElems.push(domNode);
    // console.log(domNode, domNode.__detail);
  } */
}

Observer.config = { attributes: true, attributeOldValue: true, childList: true, subtree: true, characterData: true, characterDataOldValue: true };

export default Observer;
