class Observer {
  constructor (editor) {
    this.editor = editor;
    this.changedElems = [];

    this.allNonTextFormat = [...this.editor.CONTAINER_LEVEL_ELEMENT.values(), ...this.editor.BLOCK_LEVEL_ELEMENT.values(), ...this.editor.INLINE_ELEMENT.values(), ...this.editor.EMBED_ELEMENT.values()];

    this.instance = new globalThis.MutationObserver(this.callback.bind(this));
    this.instance.observe(this.editor.root, Observer.config);
  }

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
      if (mutation.type === 'childList') {
        if (mutation.removedNodes.length) {
          if (mutation.nextSibling && this.editor.contains(this.editor.root, mutation.nextSibling)) {
            this.changedElems.push(mutation.nextSibling);
          }

          if (mutation.previousSibling && this.editor.contains(this.editor.root, mutation.previousSibling)) {
            this.changedElems.push(mutation.previousSibling);
          }
        }
        if (mutation.addedNodes.length) {
          for (const addedNode of mutation.addedNodes) {
            this.push(addedNode);
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
      // En önce child'lar geliyor. Bu sebeple child parent'leri de while içinde yapıldığından, tekrar yapmamak adına bunu yaptık.
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
      }

      // En sona new line ekleyince öncekinin length'i değişmiyor.
      if (lastTopParentElem.__detail && lastTopParentElem.__detail.prev) {
        lastTopParentElem.__detail.prev.update();
        lastTopParentElem.__detail.prev.optimize();
        // optimize içerisinde (preformatted) nextSibling silinince prev kaybolabiliyor.
        if (lastTopParentElem.__detail.prev) {
          lastTopParentElem.__detail.prev.domNode.normalize();
          lastTopParentElem.__detail.prev.update();
        }
      }
    });

    this.editor.paper.generate();
    this.complete();
  };

  push (domNode) {
    if (!domNode.__detail) {
      if (domNode.nodeType === globalThis.Node.ELEMENT_NODE) {
        const FormatClassPrototype = this.allNonTextFormat.find((formatClassPrototype) => formatClassPrototype.tagName === domNode.tagName);
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
          // FormatClassPrototype olmayan element eklenince hata veriyor. Hemen alttaki satır.
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
              domNode.parentNode.insertBefore(domNode.childNodes[0], domNode);
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
  }
}

Observer.config = { attributes: true, attributeOldValue: true, childList: true, subtree: true, characterData: true, characterDataOldValue: true };

// Error boundary for MutationObserver callback
const _observerCallback = Observer.prototype.callback;
Observer.prototype.callback = function (...args) {
  try {
    return _observerCallback.apply(this, args);
  } catch (error) {
    this.editor.handleError(error, { module: 'observer', operation: 'callback' });
  }
};

export default Observer;
