import Container from '../pattern/container.js';
import Block from '../pattern/block.js';

class OrderedList extends Container {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: OrderedList.tagName, domNode });
  }

  optimize () {
    // taşıyıcı element (ul) içinde li ve p ler karışık var ise onları dışarı taşıyor.
    const nextSibling = this.domNode.nextSibling;
    Array.from(this.domNode.childNodes).reduce((data, child) => {
      if (!OrderedList.allowedChildren.some(value => child.__detail instanceof value)) {
        this.domNode.parentNode.insertBefore(child, nextSibling);
        data.lastChildNotList = true;
      } else if (data.lastChildNotList) {
        const formatInstance = new child.__detail.RequiredContainer(this.editor);
        data.listContainer = formatInstance.domNode;

        this.domNode.parentNode.insertBefore(data.listContainer, nextSibling);
        data.listContainer.appendChild(child);
        data.lastChildNotList = false;
      } else if (data.listContainer != null) {
        data.listContainer.appendChild(child);
      }

      return data;
    }, { lastChildNotList: false, listContainer: null });

    if (this.domNode.parentNode && !this.domNode.childNodes.length) {
      this.domNode.parentNode.removeChild(this.domNode);
    }

    // Merge if same containers
    if (this.next instanceof OrderedList) {
      while (this.next.domNode.childNodes.length) {
        this.domNode.appendChild(this.next.domNode.childNodes[0]);
      }

      this.next.domNode.remove();
    }

    if (this.prev instanceof OrderedList) {
      while (this.domNode.childNodes.length) {
        this.prev.domNode.appendChild(this.domNode.childNodes[0]);
      }

      this.domNode.remove();
    }
  }
}

OrderedList.tagName = 'OL';
OrderedList.formatName = 'orderedList';

class UnorderedList extends Container {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: UnorderedList.tagName, domNode });
  }

  optimize () {
    // taşıyıcı element (ul) içinde li ve p ler karışık var ise onları dışarı taşıyor.
    const nextSibling = this.domNode.nextSibling;
    Array.from(this.domNode.childNodes).reduce((data, child) => {
      if (!UnorderedList.allowedChildren.some(value => child.__detail instanceof value)) {
        this.domNode.parentNode.insertBefore(child, nextSibling);
        data.lastChildNotList = true;
      } else if (data.lastChildNotList) {
        const formatInstance = new child.__detail.RequiredContainer(this.editor);
        data.listContainer = formatInstance.domNode;

        this.domNode.parentNode.insertBefore(data.listContainer, nextSibling);
        data.listContainer.appendChild(child);
        data.lastChildNotList = false;
      } else if (data.listContainer != null) {
        data.listContainer.appendChild(child);
      }

      return data;
    }, { lastChildNotList: false, listContainer: null });

    if (this.domNode.parentNode && !this.domNode.childNodes.length) {
      this.domNode.parentNode.removeChild(this.domNode);
    }

    // Merge if same containers
    if (this.next instanceof UnorderedList) {
      while (this.next.domNode.childNodes.length) {
        this.domNode.appendChild(this.next.domNode.childNodes[0]);
      }

      this.next.domNode.remove();
    }

    if (this.prev instanceof UnorderedList) {
      while (this.domNode.childNodes.length) {
        this.prev.domNode.appendChild(this.domNode.childNodes[0]);
      }

      this.domNode.remove();
    }
  }
}

UnorderedList.tagName = 'UL';
UnorderedList.formatName = 'unorderedList';

class ListItem extends Block {
  constructor (editor, { listItem = null, domNode = null }) {
    super(editor, { tagName: ListItem.tagName, domNode });

    if (!listItem && domNode != null) {
      listItem = ListItem.getFormat(domNode).listItem;
    }

    if (listItem === 'unordered') {
      this.domNode.__detail.RequiredContainer = UnorderedList;
    } else {
      this.domNode.__detail.RequiredContainer = OrderedList;
    }
  }

  optimize () {
    super.optimize();

    if (this.domNode.parentNode.isSameNode(this.editor.root)) {
      const formatInstance = new this.domNode.__detail.RequiredContainer(this.editor);
      const listContainer = formatInstance.domNode;

      this.domNode.parentNode.insertBefore(listContainer, this.domNode.nextSibling);
      listContainer.appendChild(this.domNode);
    } else if (!(this.domNode.parentNode.__detail instanceof this.domNode.__detail.RequiredContainer)) {
      const formatInstance = new this.domNode.__detail.RequiredContainer(this.editor);
      const listContainer = formatInstance.domNode;

      const oldContainer = this.domNode.parentNode;
      while (oldContainer.childNodes.length) {
        oldContainer.childNodes[0].__detail.RequiredContainer = this.domNode.__detail.RequiredContainer;
        listContainer.appendChild(oldContainer.childNodes[0]);
      }

      oldContainer.parentNode.insertBefore(listContainer, oldContainer.nextSibling);
      oldContainer.parentNode.removeChild(oldContainer);
    }
  }

  static getFormat (domNode) {
    let type = 'ordered';

    if (domNode.parentNode && domNode.parentNode.tagName === UnorderedList.tagName) {
      type = 'unordered';
    }

    return {
      [ListItem.formatName]: type
    };
  }
}

ListItem.tagName = 'LI';
ListItem.formatName = 'listItem';
ListItem.toolbar = { ordered: '<svg version="1.1" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m4.04136 3.21094-2.9668 0.441406v1.05273h1.41992v3.74023h-1.41992v1.16016h4.38672v-1.16016h-1.41992zm5.67578 2.00977v4.25586h21.2832v-4.25586zm-6.54688 7.5625c-0.654735 0-1.18121 0.202436-1.57812 0.609375-0.396919 0.406938-0.588809 0.89718-0.574219 1.48242l0.00977 0.01953h1.43359c0-0.257992 0.063417-0.522184 0.189453-0.708984 0.126037-0.186916 0.299333-0.277344 0.519531-0.277344 0.246214 0 0.429569 0.07402 0.552734 0.21875 0.123048 0.144963 0.185547 0.340581 0.185547 0.583985 0 0.17092-0.061952 0.371891-0.183594 0.603515-0.121642 0.231799-0.333805 0.495524-0.591797 0.791016l-2.05859 2.13867v0.908203h4.38672v-1.0332h-2.37891l-0.013672-0.05078 0.857422-0.927734c0.556355-0.605454 0.937224-1.06785 1.14453-1.375 0.207014-0.307093 0.310547-0.664722 0.310547-1.06445 0-0.593855-0.194448-1.06222-0.583984-1.4043-0.389653-0.341668-0.931671-0.513674-1.62695-0.513674zm6.54688 1.08008v4.25586h21.2832v-4.25586zm0 8.38281v4.25781h21.2832v-4.25781zm-6.51367 0.04102c-0.591042 0-1.09349 0.155797-1.50781 0.46875s-0.613164 0.743959-0.595703 1.24805l0.00977 0.04883h1.42578c0-0.257992 0.071834-0.337108 0.216797-0.447265 0.144846-0.110158 0.312771-0.177735 0.503906-0.177735 0.243401 0 0.429022 0.06298 0.556641 0.199219 0.127443 0.136232 0.191406 0.30197 0.191406 0.501953 0 0.252015-0.071034 0.461541-0.212891 0.603516-0.142033 0.142033-0.3457 0.224609-0.609375 0.224609h-0.6875v1.03125h0.6875c0.292679 0 0.520799 0.08611 0.681641 0.226563 0.160842 0.140568 0.240234 0.37271 0.240234 0.679687 0 0.220315-0.077127 0.405936-0.230469 0.550781-0.153635 0.144847-0.359313 0.220704-0.617188 0.220704-0.225999 0-0.418143-0.0988-0.576172-0.236328-0.158038-0.137528-0.236332-0.281079-0.236332-0.53907h-1.43359l-0.00977 0.05664c-0.0144728 0.591043 0.201752 1.05576 0.646484 1.36719 0.444732 0.311371 0.962786 0.47461 1.55664 0.474609 0.689598 0 1.25589-0.160425 1.69922-0.492187 0.443326-0.331644 0.666016-0.785793 0.666016-1.36523 0-0.3535-0.095798-0.65656-0.287109-0.910157-0.191306-0.253713-0.455948-0.441833-0.794918-0.566405 0.298363-0.136232 0.536717-0.324586 0.714844-0.566406 0.178244-0.241878 0.267578-0.506384 0.267578-0.792969 0-0.57657-0.205854-1.02164-0.617188-1.33594-0.411333-0.314476-0.96171-0.472657-1.64844-0.472657z"/></svg>', unordered: '<svg version="1.1" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m1 5.2207v4.28516h4.28516v-4.28516zm8.57227 0v4.28516h21.4277v-4.28516zm-8.57227 8.70117v4.28516h4.28516v-4.28516zm8.57227 0v4.28516h21.4277v-4.28516zm0 8.44141v4.28516h21.4277v-4.28516zm-8.57227 0.13086v4.28516h4.28516v-4.28516z"/></svg>' };

UnorderedList.allowedChildren = [ListItem];
OrderedList.allowedChildren = [ListItem];

export { ListItem, OrderedList, UnorderedList };
