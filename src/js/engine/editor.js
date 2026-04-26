import Registry from './registry.js';
import Paper from './paper.js';
import Selection from './selection.js';
import Event from './event.js';
import Observer from './observer.js';
import Toolbar from '../module/toolbar.js';
import Dialog from '../module/dialog.js';
import Clipboard from '../module/clipboard.js';
import History from '../module/history.js';
import Autosave from '../module/autosave.js';
import Language from '../language/language.js';
import helpData from '../docs/help.json';

const RegistryInstance = new Registry();
const formatSets = [];

/**
 * Yazman WYSIWYG rich text editor.
 * @class
 */
class Editor {
  /**
   * Create a new editor instance.
   * @param {Element} container - DOM element to attach the editor to.
   * @param {object} [config={}] - Editor configuration options.
   * @param {string} [config.languageCode] - Language code ('auto' detects from <html lang>, falls back to 'en').
   * @param {string} [config.placeholder] - Placeholder text when empty.
   * @param {Array} [config.toolbar] - Toolbar button groups.
   * @param {object} [config.history] - Undo/redo configuration.
   * @param {object} [config.autosave] - Auto-save configuration.
   * @param {Function} [config.ImageUploader] - Custom image upload handler class.
   * @param {Function} [config.onError] - Error callback: (error, context) => {}.
   * @param {boolean} [exampleContent=false] - Whether to populate with example content.
   */
  constructor (container, config = {}, exampleContent = false) {
    if (!globalThis.__yazman) globalThis.__yazman = {};

    if (!(container instanceof globalThis.Element)) {
      throw new Error('Yazman: "container" parameter must be a valid DOM element.');
    }

    if (container.__yazman) return container.__yazman;

    if (exampleContent) {
      container.innerHTML = '<p>123456789</p><pre>kod satırı örneği\n\n112345678\n212345678\n312345678\n412345678\n</pre><p>Birinci satır <a href="https://example.com">örnek</a></p><p>İkinci satır <strong>kalın <em></em><em>kalın italik</em></strong> Örnek</p><p>Üçünci satır örnek</p><figure><img src="example.jpg" /><figcaption data-yazman-placeholder="Yazı Gir"><br></figcaption></figure><p>Beşinci satır örnek</p><p>Altıncı satır örnek</p><ol><li>Yedinci satır liste örnek</li><li>Sekizinci satır <strong>kalın <em></em><em>kalın italik</em></strong> örnek</li></ol><p>Dokuzuncu satır örnek</p><p>Onuncu satır örnek</p><p>Onbirinci satır örnek</p><p>Onikinci satır örnek</p>';
    }

    let editorVirginContent = container.innerHTML;

    if (config.languageCode) {
      Language.init(config.languageCode);
    }

    this.language = Language;

    this.container = container;
    this.container.classList.add('yazman-container');
    this.container.innerHTML = '';
    this.container.__yazman = this;
    this.container.wysiwyg = this;
    this.onError = typeof config.onError === 'function' ? config.onError : null;
    this._events = new Map();

    this.root = document.createElement('div');
    this.root.className = 'yazman';
    this.root.setAttribute('contenteditable', 'true');
    if (config.placeholder && typeof config.placeholder === 'string') {
      this.root.setAttribute('data-yazman-placeholder', config.placeholder);
    }

    this.container.appendChild(this.root);

    if (!editorVirginContent.length) {
      editorVirginContent = '<p><br></p>';
      this.root.classList.add('is-empty');
    }

    this.registry = RegistryInstance;
    this.event = new Event(this);

    this.TEXT_NODE = this.registry.get('format/text');

    this.CONTAINER_LEVEL_ELEMENT = new Map();
    this.BLOCK_LEVEL_ELEMENT = new Map();
    this.INLINE_ELEMENT = new Map();
    this.EMBED_ELEMENT = new Map();
    this.registry.map().forEach((value, key) => {
      if (key.search('format/') !== -1) {
        // [EDITOR-1] Classification
        if (value.prototype instanceof this.registry.get('pattern/container')) {
          this.CONTAINER_LEVEL_ELEMENT.set(value.formatName, value);
        }
        if (value.prototype instanceof this.registry.get('pattern/block')) {
          this.BLOCK_LEVEL_ELEMENT.set(value.formatName, value);
        }
        if (value.prototype instanceof this.registry.get('pattern/inline')) {
          this.INLINE_ELEMENT.set(value.formatName, value);
        }
        if (value.prototype instanceof this.registry.get('pattern/inlineEmbed') || value.prototype instanceof this.registry.get('pattern/blockEmbed')) {
          this.EMBED_ELEMENT.set(value.formatName, value);
        }
        // [EDITOR-2] End of Classification

        // [EDITOR-3] Events
        if (Array.isArray(value.EVENT)) {
          value.EVENT.forEach(event => this.event.add(event));
        }
        // [EDITOR-4] End of Events
      }
    });

    this.FORMAT_SETS = new Map();
    // [EDITOR-5] Format sets, used for tags that cannot be active when another is active.
    formatSets.forEach((formatSet) => {
      formatSet.forEach((format) => {
        const formatSetDifference = formatSet.filter(value => format !== value);
        this.FORMAT_SETS.set(format, formatSetDifference);
      });
    });

    this.toolbar = new Toolbar(this, config.toolbar);
    this.variables = new Map();
    this.selection = new Selection(this);
    this.paper = new Paper(this);
    this.dialog = new Dialog(this);
    this.observer = new Observer(this);
    this.clipboard = new Clipboard(this);
    this.history = new History(this, config.history);
    this.autosave = new Autosave(this, config.autosave);

    this.root.innerHTML = editorVirginContent;

    if (config.ImageUploader) {
      this.ImageUploader = config.ImageUploader;
    }

    this.observer.complete();
    this.history.save();

    this._pluginInstances = [];
    Editor._plugins.forEach(({ name, fn }) => {
      try {
        const instance = fn(this);
        this._pluginInstances.push({ name, instance });
      } catch (error) {
        this.handleError(error, { module: 'plugin', operation: 'init', pluginName: name });
      }
    });
  }

  set isSaved (value) {
    this.autosave.saved = value;
  }

  get isSaved () {
    return this.autosave.saved;
  }

  /**
   * Returns the Yazman instance attached to the given element.
   * @param {Element} element - Container element or a child of it.
   * @returns {Editor|undefined} Yazman instance or undefined.
   */
  static getInstance (element) {
    return element?.__yazman ?? element?.closest('.yazman-container')?.__yazman;
  }

  static _plugins = [];

  /**
   * Register a format or module in the global registry.
   * @param {string} key - Registry key (e.g. 'format/bold', 'module/toolbar').
   * @param {*} value - The class or value to register.
   */
  static register (key, value) {
    RegistryInstance.set(key, value);
  }

  /**
   * Add a mutually exclusive format group (only one can be active at a time).
   * @param {string[]} formatSet - Array of format names that are mutually exclusive.
   */
  static addFormatSet (formatSet) {
    formatSets.push(formatSet);
  }

  /**
   * Register a plugin that will be initialized on every new editor instance.
   * @param {string} name - Plugin name.
   * @param {Function} fn - Plugin initializer that receives the editor instance.
   */
  static plugin (name, fn) {
    Editor._plugins.push({ name, fn });
  }

  /**
   * Regenerate the paper model and synchronize the UI (toolbar, selection, events).
   */
  update () {
    this.observer.complete();
    this.paper.generate();

    if (this.selection.changedCursorPosition()) {
      this.selection.setCaretPosition(this.selection.getMemCaretPosition());
    } else {
      this.selection.setMemCaretPosition(this.selection.getCaretPosition(), 'trusted');
    }

    this.event.update();
    this.toolbar.update();
  }

  /**
   * Check if the editor content is empty. Optionally shows a visual warning.
   * @param {boolean} [insertWarning=true] - Whether to display a warning when empty.
   * @param {string} [message] - Custom warning message.
   * @returns {boolean} True if the editor is empty.
   */
  isEmpty (insertWarning = true, message = Language.get('notEmptyField')) {
    let result = false;

    if (this.root.childNodes.length <= 1) {
      result = this.paper.getLength() === 0;
    }

    if (result && insertWarning && !this.root.hasAttribute('data-on-error')) {
      if (this.root.hasAttribute('data-yazman-placeholder')) {
        this.root.setAttribute('data-default-placeholder', this.root.getAttribute('data-yazman-placeholder'));
      }
      this.root.setAttribute('data-yazman-placeholder', message);
      this.root.setAttribute('data-on-error', 'true');
      this.root.style.borderColor = 'red';

      const eventKey = this.event.add({ type: ['keydown', 'input', 'paste'], function: () => this.isEmpty(insertWarning, message) });
      this.variables.set('editorIsEmptyEventKey', eventKey);
    } else if (!result && this.root.hasAttribute('data-on-error')) {
      this.root.removeAttribute('data-yazman-placeholder');
      this.root.removeAttribute('data-on-error');
      if (this.root.hasAttribute('data-default-placeholder')) {
        this.root.setAttribute('data-yazman-placeholder', this.root.getAttribute('data-default-placeholder'));
      }
      this.root.style.borderColor = '';

      this.event.delete(this.variables.get('editorIsEmptyEventKey'));
      this.variables.delete('editorIsEmptyEventKey');
    }

    return result;
  }

  /**
   * Scroll the editor so the current caret position is visible.
   */
  scrollIntoView () {
    const range = this.selection.getNativeRange();
    if (!range) return;

    let rects;
    if (range.getClientRects().length) {
      rects = range.getClientRects()[0];
    } else if (range.startContainer && range.startContainer.getClientRects && range.startContainer.getClientRects().length) {
      rects = range.startContainer.getClientRects()[0];
    }

    if (!rects) return;

    const rangeTopPosition = rects.y;

    const editorRects = this.root.getClientRects()[0];
    const editorbottomBorder = editorRects.y + editorRects.height;
    const editorTopBorder = editorRects.y;

    const editorStyle = this.root.currentStyle || globalThis.getComputedStyle(this.root);
    const editorTopBlankSpace = globalThis.parseInt(editorStyle.marginTop) + globalThis.parseInt(editorStyle.paddingTop);
    const editorBottomBlankSpace = globalThis.parseInt(editorStyle.marginBottom) + globalThis.parseInt(editorStyle.paddingBottom);

    if (rangeTopPosition < editorTopBorder) {
      this.root.scrollTop -= Math.abs(rangeTopPosition - editorTopBorder - editorTopBlankSpace);
    }

    if (rangeTopPosition > editorbottomBorder) {
      this.root.scrollTop += Math.abs(rangeTopPosition - editorbottomBorder + rects.height + editorBottomBlankSpace);
    }
  }

  /**
   * Check whether the editor currently has focus.
   * @returns {boolean} True if the editor or a descendant is focused.
   */
  hasFocus () {
    return (
      document.activeElement === this.root ||
      this.contains(this.root, document.activeElement)
    );
  }

  /**
   * Focus the editor.
   * @param {boolean} [preventScroll=true] - Whether to prevent scroll jump on focus.
   */
  focus (preventScroll = true) {
    /* [EDITOR-6] When focus is applied the scroll jumps to the very top; we added preventScroll to avoid this. Actually false would be a good thing, but since focus is not applied to the target node, when it is false it takes the editor root as reference and pulls the scroll to the very top. In the future, if the node is fetched from the get node section and scroll is applied to it, perhaps something different may emerge. */
    this.root.focus({ preventScroll });

    // [EDITOR-7] If editorScrollTop is not defined, on focus it does not go to the caret; to make it go to the caret we added scrollIntoView after scrollTop.
    this.root.scrollTop = this.variables.get('editorScrollTopPosition') || 0;
    this.scrollIntoView();

    if (this.variables.has('caretPositionFocusOn')) {
      this.selection.setCaretPosition(this.variables.get('caretPositionFocusOn'));
    }
  }

  formatFilter (format) {
    const blockFormat = Object.entries(format).reduce((obj, [key, value]) => {
      if (Object.keys(obj).length) return obj;

      if (this.BLOCK_LEVEL_ELEMENT.has(key)) obj[key] = value;

      return obj;
    }, {});

    const inlineFormat = Object.entries(format).reduce((obj, [key, value]) => {
      if (this.INLINE_ELEMENT.has(key)) obj[key] = value;

      return obj;
    }, {});

    return { blockFormat, inlineFormat };
  }

  /**
   * Insert content at a given position.
   * @param {object} nodeData - Data for the node to insert.
   * @param {string|null} [nodeData.textContent=null] - Text content to insert.
   * @param {object} [nodeData.format={}] - Format to apply (block and/or inline keys).
   * @param {boolean} [nodeData.generateBlock=true] - Whether to create a new block element.
   * @param {number} [index=-1] - Character index to insert at (-1 for end).
   * @returns {object|null} The inserted line or child node, or null.
   */
  insertNode ({ textContent = null, format = {}, generateBlock = true }, index = -1) {
    let currentLine = this.paper.getLine(index);
    if (!currentLine) {
      currentLine = this.paper.lines[this.paper.lines.length - 1];
      index = currentLine.end;
    }

    let { blockFormat, inlineFormat } = this.formatFilter(format);
    if (currentLine.end !== index && currentLine.start !== index) {
      const onInsertResult = currentLine.onInsert({ blockFormat, inlineFormat }, index);

      index = onInsertResult.index;
      ({ blockFormat, inlineFormat } = onInsertResult.format);
    }

    if (Object.keys(blockFormat).length && generateBlock) {
      let referenceLine = currentLine;

      // [EDITOR-8] In list content, when inserting images into paragraphs before the last one, it was inserting the images after the list (taking the container as reference), so we removed this from here. Will it cause an issue in the future? Since I don't remember right now why we used referenceLine, I'm leaving this note here.
      // [EDITOR-9] I remembered: while changing the block before an image (preformatted => paragraph), it was appending the paragraph at the very end.
      while (referenceLine.parent) {
        referenceLine = referenceLine.parent;
      }

      const referenceLineDom = referenceLine.domNode;
      const currentLineDom = currentLine.domNode;

      // [EDITOR-10] To solve the problem described above in lists, it moves all children inside the container that come after currentLine outside the container.
      if (referenceLine instanceof this.registry.get('pattern/container')) {
        while (currentLineDom.nextElementSibling) {
          referenceLineDom.parentNode.insertBefore(currentLineDom.nextElementSibling, referenceLineDom.nextElementSibling);
        }
      }

      const newLineDom = document.createElement('p');
      const newLine = { domNode: newLineDom, format: blockFormat, children: [], changeStatus: true };

      // [EDITOR-11] If only BR exists, it inserts at the start. That's why we added the currentLine.start !== currentLine.end condition.
      // [EDITOR-12] We disabled this because of preformatted onFormat reverse newLines. When there was a space, the space was staying at the very beginning.
      if (currentLine.start === index && currentLine.start !== currentLine.end) {
        this.paper.lines.splice(this.paper.lines.indexOf(currentLine), 0, newLine);
        referenceLineDom.parentNode.insertBefore(newLineDom, referenceLineDom);

        if (textContent) {
          newLine.children.push({ textContent, format: inlineFormat });
        }
      } else if (currentLine.end === index) {
        this.paper.lines.splice(this.paper.lines.indexOf(currentLine) + 1, 0, newLine);
        referenceLineDom.parentNode.insertBefore(newLineDom, referenceLineDom.nextElementSibling);

        if (textContent) {
          newLine.children.push({ textContent, format: inlineFormat });
        }
      } else {
        if (JSON.stringify(blockFormat) !== JSON.stringify(currentLine.format)) {
          const nextLineSiblingDom = document.createElement('p');
          const newLineNextSibling = { domNode: nextLineSiblingDom, format: currentLine.format, children: [], changeStatus: true };

          currentLine.children.reduce((o, c) => {
            if (c.start < index && index < c.end) {
              const part1 = c.textContent.slice(0, index - c.start);
              const part2 = c.textContent.slice(index - c.start);

              o.currentLineChildren.push({ textContent: part1, format: c.format });
              if (textContent) {
                o.newLineChildren.push({ textContent, format: inlineFormat });
              }
              o.newLineNextSiblingChildren.push({ textContent: part2, format: c.format });
            } else if (c.end <= index) {
              o.currentLineChildren.push(c);
            } else if (c.start >= index) {
              o.newLineNextSiblingChildren.push(c);
            }

            return o;
          }, { currentLineChildren: currentLine.children = [], newLineChildren: newLine.children = [], newLineNextSiblingChildren: newLineNextSibling.children = [] });

          currentLine.changeStatus = true;

          this.paper.lines.splice(this.paper.lines.indexOf(currentLine) + 1, 0, newLine);
          this.paper.lines.splice(this.paper.lines.indexOf(currentLine) + 2, 0, newLineNextSibling);

          referenceLineDom.parentNode.insertBefore(newLineDom, referenceLineDom.nextElementSibling);
          referenceLineDom.parentNode.insertBefore(nextLineSiblingDom, newLineDom.nextElementSibling);
        } else {
          currentLine.children.reduce((o, c) => {
            if (c.start < index && index < c.end) {
              const part1 = c.textContent.slice(0, index - c.start);
              const part2 = c.textContent.slice(index - c.start);

              o.currentLineChildren.push({ textContent: part1, format: c.format });
              if (textContent) {
                o.newLineChildren.push({ textContent, format: inlineFormat });
              }
              o.newLineChildren.push({ textContent: part2, format: c.format });
            } else if (c.end <= index) {
              o.currentLineChildren.push(c);
            } else if (c.start >= index) {
              o.newLineChildren.push(c);
            }

            return o;
          }, { currentLineChildren: currentLine.children = [], newLineChildren: newLine.children = [] });

          currentLine.changeStatus = true;

          this.paper.lines.splice(this.paper.lines.indexOf(currentLine) + 1, 0, newLine);

          referenceLineDom.parentNode.insertBefore(newLineDom, referenceLineDom.nextElementSibling);
        }
      }

      const newLineIndex = this.paper.lines.indexOf(newLine);
      this.paper.initialize();

      return this.paper.lines[newLineIndex];
    } else if (textContent) {
      const newChild = { textContent, format: inlineFormat };
      let isNewNodeAdded = false;

      currentLine.children.reduce((o, c) => {
        if (c.start < index && index < c.end && !isNewNodeAdded) {
          const part1 = c.textContent.slice(0, index - c.start);
          const part2 = c.textContent.slice(index - c.start);

          o.push({ textContent: part1, format: c.format });
          o.push(newChild);
          o.push({ textContent: part2, format: c.format });

          isNewNodeAdded = true;
        } else {
          if (index === c.end && !isNewNodeAdded) {
            o.push(c);
            o.push({ textContent, format: inlineFormat });

            isNewNodeAdded = true;
          } else if (index === c.start && !isNewNodeAdded) {
            o.push({ textContent, format: inlineFormat });
            o.push(c);

            isNewNodeAdded = true;
          } else {
            o.push(c);
          }
        }

        return o;
      }, currentLine.children = []);

      currentLine.changeStatus = true;
      this.paper.initialize();

      return newChild;
    }

    return null;
  }

  /**
   * Apply formatting (block and/or inline) to a range.
   * @param {number} start - Start index of the range.
   * @param {number} end - End index of the range.
   * @param {object} format - Format object with format names as keys.
   */
  format (start, end, format) {
    // [EDITOR-13] Filters the format parameter to remove anything outside the registered parameters.

    // [EDITOR-14] Filters the elements that fall within that range.
    const linesInRange = this.paper.getLines(start, end);
    const rangeFormat = this.paper.getFormat(start, end);

    Object.keys(rangeFormat).forEach((key) => {
      if (format[key] && format[key] === rangeFormat[key]) {
        format[key] = false;
      }
    });

    let { blockFormat, inlineFormat } = this.formatFilter(format);

    const blockedFormat = Object.entries(format).reduce((arr, [key, value]) => {
      if (this.FORMAT_SETS.has(key)) arr = arr.concat(this.FORMAT_SETS.get(key));

      return arr;
    }, []);

    // [EDITOR-15] Detects the affected parts of the element and styles them.
    linesInRange.forEach((line) => {
      // [EDITOR-16] Since Embed elements come from different sources, modifying their text content ourselves is meaningless. Therefore, if the line contains an Embed format, we do not continue.
      const isContainEmbed = Object.entries(line.format).some(([key, value]) => {
        return this.EMBED_ELEMENT.has(key);
      });

      if (isContainEmbed) {
        return;
      }

      const onFormatResult = line.onFormat({ blockFormat, inlineFormat }, [start, end]);
      if (!onFormatResult) return;
      ({ blockFormat, inlineFormat } = onFormatResult.format);
      ([start, end] = onFormatResult.caretRange);

      if (!Object.keys(blockFormat).length && !Object.keys(inlineFormat).length) {
        return;
      }
      // [EDITOR-17] getInRangeTextWithFormat splits the line's texts. Texts are split according to their style. For example 'tonight the weather is cold' comes as a single piece, while 'tonight the weather <strong>is</strong> cold' comes in 3 pieces. The pieces come as objects inside an array, like [{'textContent': textcontent, 'format': ['bold', 'italic']}].

      // [EDITOR-18] The array coming from above is run through a loop.
      let offsetLocation = 0;
      const lineChildNodesWithNewFormat = [];
      line.children.forEach((child, i) => {
        // [EDITOR-19] Since Embed elements come from different sources, modifying their text content ourselves is meaningless. Therefore, if the line contains an Embed format, we do not continue.
        const isEmbed = Object.keys(child.format).some(v => {
          return this.EMBED_ELEMENT.has(v);
        });

        // [EDITOR-20] Repeated formats are prevented. Also, if a format that is already applied is reapplied, it removes it.
        let newInlineFormat = { ...child.format, ...inlineFormat };
        Object.entries(newInlineFormat).forEach(([key, value]) => {
          if (value === false || !this.INLINE_ELEMENT.has(key) || blockedFormat.includes(key) || this.EMBED_ELEMENT.has(key)) {
            delete newInlineFormat[key];
          }
        });

        // [EDITOR-21] Each textContent is checked whether it is within the range. If the position where the range starts affects the textContent, the relative index is calculated. If it is not affected, borderStart comes from here as false.
        // [EDITOR-22] start: starting position of the selected range
        // [EDITOR-23] line.start: starting position of the line it belongs to
        // [EDITOR-24] offsetLocation: the sum of the lengths of textContents that have passed in the loop until now.
        let borderStart = start - (line.start + offsetLocation + child.length);
        // [EDITOR-25] borderStart being less than zero means that there is a boundary inside this textContent. Being greater than 0 means that the range starts further ahead.
        borderStart = (borderStart < 0) ? start - (line.start + offsetLocation) : false;
        // [EDITOR-26] Again, borderStart having come out less than zero shows that the start point lies inside an earlier textContent.
        if (borderStart < 0) {
          // [EDITOR-27] end ending before this point means the range has ended. The reason we check end is that the logical calculation above only checks the start. That is, even if the range ends, it accepts an index further than the start point as one to be formatted. We correct that in the condition below. If the range (i.e. the area selected for formatting) has not ended, it takes the start point as 0 for the current textContent.
          if (end <= line.start + offsetLocation) {
            borderStart = false;
          } else {
            borderStart = 0;
          }
        }

        // [EDITOR-28] Each textContent is checked whether it is within the range. If the position where the range starts affects the textContent, the relative index is calculated. If it is not affected, borderEnd comes from here as false.
        // [EDITOR-29] end: starting position of the selected range
        // [EDITOR-30] line.start: starting position of the line it belongs to
        // [EDITOR-31] offsetLocation: the sum of the lengths of textContents that have passed in the loop until now.
        let borderEnd = end - (line.start + offsetLocation + child.length);
        // [EDITOR-32] borderEnd being less than zero means that there is a boundary inside this textContent. Being greater than 0 means that the range ends further ahead.
        borderEnd = (borderEnd < 0) ? end - (line.start + offsetLocation) : child.length;
        // [EDITOR-33] Whatever comes from above, if format is false then end is also false. Something that has no beginning has no end either. Why FormatStarts is false was written above. The logical calculation above for borderEnd checks independently from borderStart. We tied this to borderStart with the condition below. Without this, a textContent at the beginning of the line that lies outside the range looked as if it would be formatted.
        if (borderStart === false || (borderStart === 0 && borderEnd === 0) || isEmbed || child.textContent == null) {
          borderStart = false;
          borderEnd = false;
        }

        // [EDITOR-34] CURSOR
        let cursorChildBorderControl = false;
        let isChildCursor = false;

        Object.entries(newInlineFormat).forEach(([key, value]) => {
          if (key === this.registry.get('format/cursor').formatName) {
            // [EDITOR-35] By shrinking the range start by the cursor length (1), we adjust the range correctly with respect to the cursor. Doing this causes the condition just below to return false.
            start--;
            // [EDITOR-36] If this incoming child is already a cursor, we treat it accordingly. We marked it here, we will catch it below.
            isChildCursor = true;
          }
        });

        // [EDITOR-37] If the start position did not change above, it means there is no cursor here. Therefore we check this child; if a cursor is to be placed within the bounds of this child, we place it.
        if (start === end && child.start <= start && child.end >= end) {
          cursorChildBorderControl = true;
          // [EDITOR-38] We check whether the element before or after the child is a cursor. At boundary values (when the index is at the very start or the very end), it can cause two cursors to be added.
          if (line.children[i + 1]) {
            // [EDITOR-39] We check whether the element after this child is a cursor or not.
            if (Object.keys(line.children[i + 1].format).includes(this.registry.get('format/cursor').formatName)) {
              cursorChildBorderControl = false;
            }
          }

          if (lineChildNodesWithNewFormat[lineChildNodesWithNewFormat.length - 1]) {
            // [EDITOR-40] We check whether the element before the child is a cursor or not.
            if (Object.keys(lineChildNodesWithNewFormat[lineChildNodesWithNewFormat.length - 1].format).includes(this.registry.get('format/cursor').formatName)) {
              cursorChildBorderControl = false;
            }
          }
        }

        if (cursorChildBorderControl || isChildCursor) {
          if (isChildCursor) {
            lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat });
          }

          // [EDITOR-41] If the previous or next element is not a cursor, we add a cursor.
          if (cursorChildBorderControl) {
            newInlineFormat = { ...newInlineFormat, cursor: true };
            // [EDITOR-42] The case where the index is on the boundaries of the child.
            if (child.end === end || child.start === start) {
              // [EDITOR-43] The reason End is at the top is to insert the cursor after the child.
              if (child.end === end) {
                lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: child.format });
              }

              lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat });

              if (child.start === start) {
                lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: child.format });
              }
            } else {
              // [EDITOR-44] If the cursor is not on the boundary values, we split the child and place the cursor.
              const part1 = child.textContent.slice(0, borderStart);
              const part2 = '';
              const part3 = child.textContent.slice(borderEnd);

              lineChildNodesWithNewFormat.push({ textContent: part1, format: child.format });
              lineChildNodesWithNewFormat.push({ textContent: part2, format: newInlineFormat });
              lineChildNodesWithNewFormat.push({ textContent: part3, format: child.format });
            }

            // [EDITOR-45] When a cursor is added, child.length needs to be increased by the cursor's length. Since the cursor is 1 character, we did it this way. Cursor.Content.length could be pulled from the Cursor class to perform this addition.
            child.length++;
          }

          offsetLocation += child.length;

          return;
        }
        // [EDITOR-46] CURSOR END

        if (borderStart === false && borderEnd === false) {
          lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: child.format });
        }

        if (borderStart === 0) {
          if (borderEnd === child.length) {
            lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: newInlineFormat });
          } else {
            const part1 = child.textContent.slice(borderStart, borderEnd);
            const part2 = child.textContent.slice(borderEnd);

            lineChildNodesWithNewFormat.push({ textContent: part1, format: newInlineFormat });
            lineChildNodesWithNewFormat.push({ textContent: part2, format: child.format });
          }
        }

        if (borderStart > 0) {
          if (borderEnd === child.length) {
            const part1 = child.textContent.slice(0, borderStart);
            const part2 = child.textContent.slice(borderStart);

            lineChildNodesWithNewFormat.push({ textContent: part1, format: child.format });
            lineChildNodesWithNewFormat.push({ textContent: part2, format: newInlineFormat });
          } else {
            const part1 = child.textContent.slice(0, borderStart);
            const part2 = child.textContent.slice(borderStart, borderEnd);
            const part3 = child.textContent.slice(borderEnd);

            lineChildNodesWithNewFormat.push({ textContent: part1, format: child.format });
            lineChildNodesWithNewFormat.push({ textContent: part2, format: newInlineFormat });
            lineChildNodesWithNewFormat.push({ textContent: part3, format: child.format });
          }
        }

        offsetLocation += child.length;
      });

      line.changeStatus = true;
      line.children = lineChildNodesWithNewFormat;

      const newBlockFormat = { ...line.format, ...blockFormat };
      Object.entries(newBlockFormat).forEach(([key, value]) => {
        if (value === false || !this.BLOCK_LEVEL_ELEMENT.has(key)) {
          delete newBlockFormat[key];
        }

        // [EDITOR-47] Since line.format comes first in the order and the first incoming key is taken in the block format, if blockFormat exists and does not contain the same style, we override line.format's style.
        if (Object.keys(blockFormat).length && line.format[key] != null && blockFormat[key] == null) {
          delete newBlockFormat[key];
        }
      });
      line.format = newBlockFormat;
    });

    this.paper.initialize();
  }

  /**
   * Apply block-level formatting only to a range.
   * @param {number} start - Start index of the range.
   * @param {number} end - End index of the range.
   * @param {object} format - Block format object.
   */
  formatLine (start, end, format) {
    const linesInRange = this.paper.getLines(start, end);
    const rangeFormat = this.paper.getFormat(start, end);

    Object.keys(rangeFormat).forEach((key) => {
      if (format[key] && format[key] === rangeFormat[key]) {
        format[key] = false;
      }
    });

    let blockFormat = Object.entries(format).reduce((obj, [key, value]) => {
      if (Object.keys(obj).length) return obj;

      if (this.BLOCK_LEVEL_ELEMENT.has(key)) obj[key] = value;

      return obj;
    }, {});

    // [EDITOR-48] Detects the affected parts of the element and styles them.
    linesInRange.forEach((line) => {
      // [EDITOR-49] Since Embed elements come from different sources, modifying their text content ourselves is meaningless. Therefore, if the line contains an Embed format, we do not continue.
      const isContainEmbed = Object.entries(line.format).some(([key, value]) => {
        return this.EMBED_ELEMENT.has(key);
      });

      if (isContainEmbed) {
        return;
      }

      const onFormatResult = line.onFormat({ blockFormat }, [start, end]);
      if (!onFormatResult) return;
      ({ blockFormat } = onFormatResult.format);
      ([start, end] = onFormatResult.caretRange);

      if (!Object.keys(blockFormat).length) {
        return;
      }

      line.changeStatus = true;

      const newBlockFormat = { ...line.format, ...blockFormat };
      Object.entries(newBlockFormat).forEach(([key, value]) => {
        if (value === false || !this.BLOCK_LEVEL_ELEMENT.has(key)) {
          delete newBlockFormat[key];
        }

        // [EDITOR-50] Since line.format comes first in the order and the first incoming key is taken in the block format, if blockFormat exists and does not contain the same style, we override line.format's style.
        if (Object.keys(blockFormat).length && line.format[key] != null && blockFormat[key] == null) {
          delete newBlockFormat[key];
        }
      });
      line.format = newBlockFormat;
    });

    this.paper.initialize();
  }

  /**
   * Apply inline formatting only to a range.
   * @param {number} start - Start index of the range.
   * @param {number} end - End index of the range.
   * @param {object} format - Inline format object.
   */
  formatText (start, end, format) {
    // [EDITOR-51] Filters the format parameter to remove anything outside the registered parameters.

    // [EDITOR-52] Filters the elements that fall within that range.
    const linesInRange = this.paper.getLines(start, end);
    const rangeFormat = this.paper.getFormat(start, end);

    Object.keys(rangeFormat).forEach((key) => {
      if (format[key] && format[key] === rangeFormat[key]) {
        format[key] = false;
      }
    });

    let inlineFormat = Object.entries(format).reduce((obj, [key, value]) => {
      if (this.INLINE_ELEMENT.has(key)) obj[key] = value;

      return obj;
    }, {});

    const blockedFormat = Object.entries(format).reduce((arr, [key, value]) => {
      if (this.FORMAT_SETS.has(key)) arr = arr.concat(this.FORMAT_SETS.get(key));

      return arr;
    }, []);

    // [EDITOR-53] Detects the affected parts of the element and styles them.
    linesInRange.forEach((line) => {
      // [EDITOR-54] Since Embed elements come from different sources, modifying their text content ourselves is meaningless. Therefore, if the line contains an Embed format, we do not continue.
      const isContainEmbed = Object.entries(line.format).some(([key, value]) => {
        return this.EMBED_ELEMENT.has(key);
      });

      if (isContainEmbed) {
        return;
      }

      const onFormatResult = line.onFormat({ inlineFormat }, [start, end]);
      if (!onFormatResult) return;
      ({ inlineFormat } = onFormatResult.format);
      ([start, end] = onFormatResult.caretRange);

      if (!Object.keys(inlineFormat).length) {
        return;
      }
      // [EDITOR-55] getInRangeTextWithFormat splits the line's texts. Texts are split according to their style. For example 'tonight the weather is cold' comes as a single piece, while 'tonight the weather <strong>is</strong> cold' comes in 3 pieces. The pieces come as objects inside an array, like [{'textContent': textcontent, 'format': ['bold', 'italic']}].

      // [EDITOR-56] The array coming from above is run through a loop.
      let offsetLocation = 0;
      const lineChildNodesWithNewFormat = [];
      line.children.forEach((child, i) => {
        // [EDITOR-57] Since Embed elements come from different sources, modifying their text content ourselves is meaningless. Therefore, if the line contains an Embed format, we do not continue.
        const isEmbed = Object.keys(child.format).some(v => {
          return this.EMBED_ELEMENT.has(v);
        });

        // [EDITOR-58] Repeated formats are prevented. Also, if a format that is already applied is reapplied, it removes it.
        let newInlineFormat = { ...child.format, ...inlineFormat };
        Object.entries(newInlineFormat).forEach(([key, value]) => {
          if (value === false || !this.INLINE_ELEMENT.has(key) || blockedFormat.includes(key) || this.EMBED_ELEMENT.has(key)) {
            delete newInlineFormat[key];
          }
        });

        // [EDITOR-59] Each textContent is checked whether it is within the range. If the position where the range starts affects the textContent, the relative index is calculated. If it is not affected, borderStart comes from here as false.
        // [EDITOR-60] start: starting position of the selected range
        // [EDITOR-61] line.start: starting position of the line it belongs to
        // [EDITOR-62] offsetLocation: the sum of the lengths of textContents that have passed in the loop until now.
        let borderStart = start - (line.start + offsetLocation + child.length);
        // [EDITOR-63] borderStart being less than zero means that there is a boundary inside this textContent. Being greater than 0 means that the range starts further ahead.
        borderStart = (borderStart < 0) ? start - (line.start + offsetLocation) : false;
        // [EDITOR-64] Again, borderStart having come out less than zero shows that the start point lies inside an earlier textContent.
        if (borderStart < 0) {
          // [EDITOR-65] end ending before this point means the range has ended. The reason we check end is that the logical calculation above only checks the start. That is, even if the range ends, it accepts an index further than the start point as one to be formatted. We correct that in the condition below. If the range (i.e. the area selected for formatting) has not ended, it takes the start point as 0 for the current textContent.
          if (end <= line.start + offsetLocation) {
            borderStart = false;
          } else {
            borderStart = 0;
          }
        }

        // [EDITOR-66] Each textContent is checked whether it is within the range. If the position where the range starts affects the textContent, the relative index is calculated. If it is not affected, borderEnd comes from here as false.
        // [EDITOR-67] end: starting position of the selected range
        // [EDITOR-68] line.start: starting position of the line it belongs to
        // [EDITOR-69] offsetLocation: the sum of the lengths of textContents that have passed in the loop until now.
        let borderEnd = end - (line.start + offsetLocation + child.length);
        // [EDITOR-70] borderEnd being less than zero means that there is a boundary inside this textContent. Being greater than 0 means that the range ends further ahead.
        borderEnd = (borderEnd < 0) ? end - (line.start + offsetLocation) : child.length;
        // [EDITOR-71] Whatever comes from above, if format is false then end is also false. Something that has no beginning has no end either. Why FormatStarts is false was written above. The logical calculation above for borderEnd checks independently from borderStart. We tied this to borderStart with the condition below. Without this, a textContent at the beginning of the line that lies outside the range looked as if it would be formatted.
        if (borderStart === false || (borderStart === 0 && borderEnd === 0) || isEmbed || child.textContent == null) {
          borderStart = false;
          borderEnd = false;
        }

        // [EDITOR-72] CURSOR
        let cursorChildBorderControl = false;
        let isChildCursor = false;

        Object.entries(newInlineFormat).forEach(([key, value]) => {
          if (key === this.registry.get('format/cursor').formatName) {
            // [EDITOR-73] By shrinking the range start by the cursor length (1), we adjust the range correctly with respect to the cursor. Doing this causes the condition just below to return false.
            start--;
            // [EDITOR-74] If this incoming child is already a cursor, we treat it accordingly. We marked it here, we will catch it below.
            isChildCursor = true;
          }
        });

        // [EDITOR-75] If the start position did not change above, it means there is no cursor here. Therefore we check this child; if a cursor is to be placed within the bounds of this child, we place it.
        if (start === end && child.start <= start && child.end >= end) {
          cursorChildBorderControl = true;
          // [EDITOR-76] We check whether the element before or after the child is a cursor. At boundary values (when the index is at the very start or the very end), it can cause two cursors to be added.
          if (line.children[i + 1]) {
            // [EDITOR-77] We check whether the element after this child is a cursor or not.
            if (Object.keys(line.children[i + 1].format).includes(this.registry.get('format/cursor').formatName)) {
              cursorChildBorderControl = false;
            }
          }

          if (lineChildNodesWithNewFormat[lineChildNodesWithNewFormat.length - 1]) {
            // [EDITOR-78] We check whether the element before the child is a cursor or not.
            if (Object.keys(lineChildNodesWithNewFormat[lineChildNodesWithNewFormat.length - 1].format).includes(this.registry.get('format/cursor').formatName)) {
              cursorChildBorderControl = false;
            }
          }
        }

        if (cursorChildBorderControl || isChildCursor) {
          if (isChildCursor) {
            lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat });
          }

          // [EDITOR-79] If the previous or next element is not a cursor, we add a cursor.
          if (cursorChildBorderControl) {
            newInlineFormat = { ...newInlineFormat, cursor: true };
            // [EDITOR-80] The case where the index is on the boundaries of the child.
            if (child.end === end || child.start === start) {
              // [EDITOR-81] The reason End is at the top is to insert the cursor after the child.
              if (child.end === end) {
                lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: child.format });
              }

              lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat });

              if (child.start === start) {
                lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: child.format });
              }
            } else {
              // [EDITOR-82] If the cursor is not on the boundary values, we split the child and place the cursor.
              const part1 = child.textContent.slice(0, borderStart);
              const part2 = '';
              const part3 = child.textContent.slice(borderEnd);

              lineChildNodesWithNewFormat.push({ textContent: part1, format: child.format });
              lineChildNodesWithNewFormat.push({ textContent: part2, format: newInlineFormat });
              lineChildNodesWithNewFormat.push({ textContent: part3, format: child.format });
            }

            // [EDITOR-83] When a cursor is added, child.length needs to be increased by the cursor's length. Since the cursor is 1 character, we did it this way. Cursor.Content.length could be pulled from the Cursor class to perform this addition.
            child.length++;
          }

          offsetLocation += child.length;

          return;
        }
        // [EDITOR-84] CURSOR END

        if (borderStart === false && borderEnd === false) {
          lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: child.format });
        }

        if (borderStart === 0) {
          if (borderEnd === child.length) {
            lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: newInlineFormat });
          } else {
            const part1 = child.textContent.slice(borderStart, borderEnd);
            const part2 = child.textContent.slice(borderEnd);

            lineChildNodesWithNewFormat.push({ textContent: part1, format: newInlineFormat });
            lineChildNodesWithNewFormat.push({ textContent: part2, format: child.format });
          }
        }

        if (borderStart > 0) {
          if (borderEnd === child.length) {
            const part1 = child.textContent.slice(0, borderStart);
            const part2 = child.textContent.slice(borderStart);

            lineChildNodesWithNewFormat.push({ textContent: part1, format: child.format });
            lineChildNodesWithNewFormat.push({ textContent: part2, format: newInlineFormat });
          } else {
            const part1 = child.textContent.slice(0, borderStart);
            const part2 = child.textContent.slice(borderStart, borderEnd);
            const part3 = child.textContent.slice(borderEnd);

            lineChildNodesWithNewFormat.push({ textContent: part1, format: child.format });
            lineChildNodesWithNewFormat.push({ textContent: part2, format: newInlineFormat });
            lineChildNodesWithNewFormat.push({ textContent: part3, format: child.format });
          }
        }

        offsetLocation += child.length;
      });
    });

    this.paper.initialize();
  }

  /**
   * Delete content in a range.
   * @param {number} start - Start index of the range.
   * @param {number} end - End index of the range.
   * @param {boolean} [cleanLine=false] - Whether to remove lines entirely when fully selected.
   */
  deleteContent (start, end, cleanLine = false) {
    if (start === end) return;
    const linesInRange = this.paper.getLines(start, end);

    const exportedContent = this.paper.exportContent(start, end);

    const borderLines = linesInRange.filter((line) => {
      // [EDITOR-85] start !== line.start: this condition makes sure only the children of the first line are deleted. If we delete all lines completely, it goes against the normal flow.
      if ((line.start > start && line.end <= end) || (line.start >= start && line.end < end) || (line.start >= start && line.end <= end && cleanLine)) {
        const lineIndex = this.paper.lines.indexOf(line);

        this.paper.lines.splice(lineIndex, 1);
        line.domNode.parentNode.removeChild(line.domNode);

        // [EDITOR-86] The reason we do this is that the update needs to be applied to the topmost/parent element; otherwise it does not update the numbers correctly.
        if (this.paper.lines[lineIndex]) {
          let referenceLine = this.paper.lines[lineIndex];

          while (referenceLine.parent) {
            referenceLine = referenceLine.parent;
          }

          referenceLine.update();
        }
      } else {
        return true;
      }

      return false;
    });

    borderLines.forEach((line) => {
      const remainingChildren = [];
      line.children.forEach((child) => {
        if (child.end <= start || child.start >= end) { // [EDITOR-87] if the child stays completely outside the boundary
          remainingChildren.push(child);
        } else if (child.start >= start && child.end <= end) { // [EDITOR-88] if the child stays completely inside the boundary
          // [EDITOR-89] gets deleted
        } else if (child.start <= start && child.end >= end) { // [EDITOR-90] if the boundary starts and ends inside the child
          const remainingText1 = child.textContent.slice(0, start - child.start);
          remainingChildren.push({ textContent: remainingText1, format: child.format });

          if (Math.abs(end - child.end)) {
            const remainingText2 = child.textContent.slice(end - child.end);
            remainingChildren.push({ textContent: remainingText2, format: child.format });
          }
        } else if (child.start <= start) { // [EDITOR-91] if the boundary starts inside the child
          if (Math.abs(start - child.start)) {
            const remainingText = child.textContent.slice(0, start - child.start);
            remainingChildren.push({ textContent: remainingText, format: child.format });
          }
        } else if (child.end >= end) { // [EDITOR-92] if the boundary ends inside the child
          if (Math.abs(end - child.end)) {
            const remainingText2 = child.textContent.slice(end - child.end);
            remainingChildren.push({ textContent: remainingText2, format: child.format });
          }
        }
      });

      line.children = remainingChildren;
      line.changeStatus = true;
    });

    if (borderLines.length === 2) {
      const secondBorderLine = borderLines[1];

      this.formatText(start + 1, start + 1, borderLines[0].format);

      if (secondBorderLine.domNode.parentNode) {
        secondBorderLine.domNode.parentNode.removeChild(secondBorderLine.domNode);
      }
      secondBorderLine.children.forEach(child => {
        if (child.textContent == null || child.textContent.length) {
          borderLines[0].children.push(child);
        }
      });

      borderLines[0].changeStatus = true;
    }

    // [EDITOR-93] Cuts the gaps between lines. Merges the lines.

    this.paper.initialize();
    this.history.save({ action: 'delete', caret: [start, end], content: exportedContent });
  }

  /**
   * Show a temporary status message below the editor.
   * @param {string|HTMLElement} [content=''] - Message text or DOM element.
   * @param {number} [expire=6000] - Duration in ms before the message disappears.
   */
  status (content = '', expire = 6000) {
    const existingStatus = this.container.querySelector('.yazman-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    const statusContainer = document.createElement('div');
    statusContainer.classList.add('yazman-status');
    statusContainer.classList.add('fsi-14', 'fwe-semibold');

    if (typeof content === 'object' && content instanceof globalThis.HTMLElement) {
      statusContainer.appendChild(content);
    } else {
      const statusText = document.createElement('span');
      statusText.innerHTML = content;
      statusText.classList.add('yazman-status-text');
      statusContainer.appendChild(statusText);
    }

    this.container.appendChild(statusContainer);

    globalThis.setTimeout(() => {
      if (statusContainer.parentNode) {
        statusContainer.remove();
      }
    }, expire);
  }

  /**
   * Print the Yazman help manual to the browser console.
   */
  static help () {
    const lines = helpData.map(({ text, style }) => [`%c${text}\n`, style]);
    const messages = lines.map(([text]) => text);
    const styles = lines.flatMap(([_, style]) => style || '');

    console.info(messages.join(''), ...styles);
  }

  /**
   * Export content as a structured array.
   * @param {number} [start] - Start index (defaults to full content).
   * @param {number} [end] - End index (defaults to full content).
   * @returns {Array} Structured content array.
   */
  getContent (start, end) {
    return this.paper.exportContent(start, end);
  }

  /**
   * Import content from a structured array (replaces current content).
   * @param {Array} contentArray - Structured content array.
   */
  setContent (contentArray) {
    this.paper.importContent(contentArray);
  }

  /**
   * Get the plain text content of the editor.
   * @returns {string} Plain text content.
   */
  getText () {
    return this.root.textContent;
  }

  /**
   * Get the total character length of the editor content.
   * @returns {number} Character count.
   */
  getLength () {
    return this.paper.getLength();
  }

  /**
   * Enable editing (make the editor editable).
   */
  enable () {
    this.root.setAttribute('contenteditable', 'true');
  }

  /**
   * Disable editing (make the editor read-only).
   */
  disable () {
    this.root.setAttribute('contenteditable', 'false');
  }

  /**
   * Destroy the editor instance, removing all DOM elements and event listeners.
   */
  destroy () {
    this._pluginInstances.forEach(({ name, instance }) => {
      try {
        if (instance && typeof instance.destroy === 'function') {
          instance.destroy();
        }
      } catch (error) {
        this.handleError(error, { module: 'plugin', operation: 'destroy', pluginName: name });
      }
    });
    this._pluginInstances = [];

    this.observer.disconnect();
    this.clipboard.destroy();
    this.event.destroy();

    if (this.variables.get('autosaveTimeoutID')) {
      globalThis.clearTimeout(this.variables.get('autosaveTimeoutID'));
    }

    if (this.variables.get('historyTimeoutID')) {
      globalThis.clearTimeout(this.variables.get('historyTimeoutID'));
    }

    this.variables.clear();
    this._events.clear();

    this.container.removeChild(this.toolbar.container);
    this.container.removeChild(this.root);
    this.container.classList.remove('yazman-container');
    delete this.container.__yazman;
    delete this.container.wysiwyg;
  }

  /**
   * Listen to an editor event.
   * @param {string} event - Event name.
   * @param {Function} handler - Event handler function.
   * @returns {Editor} This editor instance (for chaining).
   */
  on (event, handler) {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    this._events.get(event).push(handler);

    return this;
  }

  /**
   * Remove an event listener. If no handler is given, removes all listeners for the event.
   * @param {string} event - Event name.
   * @param {Function} [handler] - Specific handler to remove.
   * @returns {Editor} This editor instance (for chaining).
   */
  off (event, handler) {
    if (!this._events.has(event)) return this;

    if (handler) {
      this._events.set(event, this._events.get(event).filter(h => h !== handler));
    } else {
      this._events.delete(event);
    }

    return this;
  }

  /**
   * Emit a custom event, calling all registered handlers.
   * @param {string} event - Event name.
   * @param {...*} args - Arguments to pass to handlers.
   */
  emit (event, ...args) {
    if (!this._events.has(event)) return;

    this._events.get(event).forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        this.handleError(error, { module: 'emitter', operation: event });
      }
    });
  }

  /**
   * Route an error to the onError callback, or log to console if none is set.
   * @param {Error} error - The error object.
   * @param {object} [context={}] - Additional context (module, operation, etc.).
   */
  handleError (error, context = {}) {
    if (typeof this.onError === 'function') {
      try {
        this.onError(error, context);
      } catch (callbackError) {
        console.error('[Yazman|Editor] onError callback threw an error.', callbackError);
      }
    } else {
      console.error('[Yazman|Editor]', error.message || error, context);
    }
  }

  contains (parent, descendant) {
    try {
      // [EDITOR-94] Firefox inserts inaccessible nodes around video elements
      descendant.parentNode;
    } catch (e) {
      return false;
    }

    return parent.contains(descendant);
  }
}

// [EDITOR-95] Error boundary wrapper for public API methods
['format', 'formatLine', 'formatText', 'insertNode', 'deleteContent', 'update', 'setContent', 'getContent'].forEach(method => {
  const original = Editor.prototype[method];
  Editor.prototype[method] = function (...args) {
    try {
      return original.apply(this, args);
    } catch (error) {
      this.handleError(error, { module: 'editor', operation: method });
    }
  };
});

export default Editor;
