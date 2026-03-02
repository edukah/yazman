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

class Editor {
  constructor (container, config = {}, exampleContent = false) {
    if (!globalThis.__yazman) globalThis.__yazman = {};

    if (!(container instanceof globalThis.Element)) {
      throw new Error('Yazman: "container" parameter must be a valid DOM element.');
    }

    if (exampleContent) {
      container.innerHTML = '<p>123456789</p><pre>kod satırı örneği\n\n112345678\n212345678\n312345678\n412345678\n</pre><p>Birinci satır <a href="http://www.mynet.com">örnek</a></p><p>İkinci satır <strong>kalın <em></em><em>kalın italik</em></strong> Örnek</p><p>Üçünci satır örnek</p><figure><img src="example.jpg" /><figcaption data-yazman-placeholder="Yazı Gir"><br></figcaption></figure><p>Beşinci satır örnek</p><p>Altıncı satır örnek</p><ol><li>Yedinci satır liste örnek</li><li>Sekizinci satır <strong>kalın <em></em><em>kalın italik</em></strong> örnek</li></ol><p>Dokuzuncu satır örnek</p><p>Onuncu satır örnek</p><p>Onbirinci satır örnek</p><p>Onikinci satır örnek</p>';
    }

    let editorVirginContent = container.innerHTML;

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
      this.root.classList.add('blank');
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
        // Classification
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
        // End of Classification

        // Events
        if (Array.isArray(value.EVENT)) {
          value.EVENT.forEach(event => this.event.add(event));
        }
        // End of Events
      }
    });

    this.FORMAT_SETS = new Map();
    // Format sets biri varken diğeri aktif olamayan taglar için kullanılır.
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

  static _plugins = [];

  static register (key, value) {
    RegistryInstance.set(key, value);
  }

  static addFormatSet (formatSet) {
    formatSets.push(formatSet);
  }

  static plugin (name, fn) {
    Editor._plugins.push({ name, fn });
  }

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

  hasFocus () {
    return (
      document.activeElement === this.root ||
      this.contains(this.root, document.activeElement)
    );
  }

  focus (preventScroll = true) {
    /* focus yapıldığında scroll en tepeye kayıyor bunu önlemek için preventScroll koyduk. aslında false olması iyi bir şey fakat hedef nodeye focus yapılmadığı için false olunca editor root'unu referans aldığı için scrollu en tepeye çekiyor. ileride get node kısmından node çekilir ona scroll yapılırsa belki değişik birşeyler oratay çıkabilir. */
    this.root.focus({ preventScroll });

    // editorScrollTopTanımlı değilse focus durumunda carete gitmiyor carete gitmesi için scrollToptan sonra scrollIntoView koyduk.
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

      // Liste içerikte sondan önceki paragraflara resim ekleme sırasında resimleri listenin sonrasına eklediği için (referansı container alıyor) bunu buradan kaldırdık. ileride bi sorun çıkartır mı? neden referenceline yapmışısız şu an hatırlamadığım için bunu buraya not düşüyorum.
      // Hatırladım, imageden önce block değşikliği yaparken (preformatted => paragraph) paragrafı en sona ekliyordu.
      while (referenceLine.parent) {
        referenceLine = referenceLine.parent;
      }

      const referenceLineDom = referenceLine.domNode;
      const currentLineDom = currentLine.domNode;

      // Listelerde yukarıda anlatılan problemi çözmek için container içindeki currentLineden sonra gelen tüm çocukları contaier dışına taşıyor.
      if (referenceLine instanceof this.registry.get('pattern/container')) {
        while (currentLineDom.nextElementSibling) {
          referenceLineDom.parentNode.insertBefore(currentLineDom.nextElementSibling, referenceLineDom.nextElementSibling);
        }
      }

      const newLineDom = document.createElement('p');
      const newLine = { domNode: newLineDom, format: blockFormat, children: [], changeStatus: true };

      // Sadece BR var ise başlangıca ekliyor. currentLine.start !== currentLine.end bu koşulu ekledik bu yüzden.
      // preformatted onFormat reverse newLines yüzünden burayı iptal ettik. boşluk olunca boşluk en başta kalıyordu.
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

  format (start, end, format) {
    // format parametresini kayıtlı parametrelerin dışında kalanları çıkartıcak şekilde filtreliyor.

    // o rangenin arasında kalan elementleri filtreliyor.
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

    // elementin etkilenen kısımlarını tespit edit stillendiriyor.
    linesInRange.forEach((line) => {
      // Embed elementler farklı kaynaklardan gelen elementler olduğundan içlerinde text içeriğini bizim değiştirmemiz anlamsız oluyor. Bu yüzden eyer line Embed formatı içeriyorsa devam etmiyoruz.
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
      // getInRangeTextWithFormat line'ın textlerini parçalıyor. textler style'ına göre parçalanıyor. örneğin 'bu gece hava soğuk' tek parça gelirken 'bu gece <strong>hava</strong> soğuk' 3 parça halinde geliyor. parçalar array için obje halinde geliyor. [{'textContent': textcontent, 'format': ['bold', 'italic']}] gibi.

      // yukarıdan gelen array döngüye sokuluyor.
      let offsetLocation = 0;
      const lineChildNodesWithNewFormat = [];
      line.children.forEach((child, i) => {
        // Embed elementler farklı kaynaklardan gelen elementler olduğundan içlerinde text içeriğini bizim değiştirmemiz anlamsız oluyor. Bu yüzden eyer line Embed formatı içeriyorsa devam etmiyoruz.
        const isEmbed = Object.keys(child.format).some(v => {
          return this.EMBED_ELEMENT.has(v);
        });

        // tekrarlayan formatlar engelleniyor. birde zaten for olan format tekrar uygulanırsa onu siliyor.
        let newInlineFormat = { ...child.format, ...inlineFormat };
        Object.entries(newInlineFormat).forEach(([key, value]) => {
          if (value === false || !this.INLINE_ELEMENT.has(key) || blockedFormat.includes(key) || this.EMBED_ELEMENT.has(key)) {
            delete newInlineFormat[key];
          }
        });

        // her textContent'ın range içinde olup olmadığı kontrol ediliyor. rangenin başladığı konum textContent'i etkiliyorsa bağıl index hesaplanıyor. etkilenmiyorsa borderStart buradan false olarak geliyor.
        // start: seçili rangenin başlangıç konumu
        // line.start: ait olduğu line'nin başlangıç konumu
        // offsetLocation döngüden şimdiye kadar geçen textContent'lerin lenght'lerinin toplamı.
        let borderStart = start - (line.start + offsetLocation + child.length);
        // borderStart'ın sıfırdan küçük olması demek bu textContent içerisinde bir sınır bulunuyor anlamına geliyor. 0'dan büyük olması ise range'nin daha ileride başladığı anlamına geliyor.
        borderStart = (borderStart < 0) ? start - (line.start + offsetLocation) : false;
        // yine borderStart'ın sıfırdan küçük çıkmış olması başlangıç noktasının bundan daha önceki bir textContent'in içinde yer aldığını gösteriyor.
        if (borderStart < 0) {
          // end buranın öncesinde bitmesi rangenin bittiği anlamına geliyor. end'i kontrol etmemizin nedeni yukarıdaki mantıksal hesaplamanın sadece başlangıçı kontrol ediyor olması. yani rangenin sonu gelsede start noktasının ilerisinde yer alan bir index'i formatlanıcak olarak kabul ediyor. Onu aşağıdaki koşulda düzeltiyoruz. Range (yani formatlandırma için seçili alan) bitmediyse başlangıç noktasını geçerli textContent için 0 olarak alıyor.
          if (end <= line.start + offsetLocation) {
            borderStart = false;
          } else {
            borderStart = 0;
          }
        }

        // her textContent'ın range içinde olup olmadığı kontrol ediliyor. rangenin başladığı konum textContent'i etkiliyorsa bağıl index hesaplanıyor. Etkilenmiyorsa borderEnd buradan false olarak geliyor.
        // end: seçili rangenin başlangıç konumu
        // line.start: ait olduğu line'nin başlangıç konumu
        // offsetLocation döngüden şimdiye kadar geçen textContent'lerin lenght'lerinin toplamı.
        let borderEnd = end - (line.start + offsetLocation + child.length);
        // borderEnd'ın sıfırdan küçük olması demek bu textContent içerisinde bir sınır bulunuyor anlamına geliyor. 0'dan büyük olması ise range'nin daha ileride son bulduğu anlamına geliyor.
        borderEnd = (borderEnd < 0) ? end - (line.start + offsetLocation) : child.length;
        // Yukarıdan ne gelirse gelsin format false olursa end'te false olur. Başlangıçı olmayan bir olgunun bitişide olmaz. FormatStarts'ın neden false olduğu yukarıda yazıldı. borderEnd'te yukarıda mantıksal hesaplama borderStart'tan bağımsız olarak kontrol yapıyor. Alttaki koşullamayla bunu borderStart'la ilişkilendirdik. Bu olmazsa line'nin başında range'in dışında yer alan bir textContent formatlınıcakmış gibi gözüküyor.
        if (borderStart === false || (borderStart === 0 && borderEnd === 0) || isEmbed || child.textContent == null) {
          borderStart = false;
          borderEnd = false;
        }

        // CURSOR
        let cursorChildBorderControl = false;
        let isChildCursor = false;

        Object.entries(newInlineFormat).forEach(([key, value]) => {
          if (key === this.registry.get('format/cursor').formatName) {
            // range startını cursor lengthi (1) kadar küçülterek rangenin aralığını cursora göre doğru ayarlıyoruz. bunu yapmamız hemen altındaki koşulunda false dönmesine sebep oluyor.
            start--;
            // bu gelen child zaten crusor ise ona göre muamele yapıyoruz. burada onu belirledik aşşağıda yakalayacağız.
            isChildCursor = true;
          }
        });

        // yukarıda start pozisyonu değişmedi ise burada cursor yok manasına geliyor. bu yüzden bu child'i kontrol ediyoruz bu child'in sınırları içerisinde crusor koyucaksa koyuyoruz.
        if (start === end && child.start <= start && child.end >= end) {
          cursorChildBorderControl = true;
          // childden önceki ya da sonraki eleman crusorsa kontrol ediyoruz. sınır değerlerde (index'in en başta ya da en sonda olması durumunda iki defa cursor eklenmesine sebep olabiliyor.)
          if (line.children[i + 1]) {
            // bu child'den sonraki eleman cursor mu değil mi? onu kontrol ediyoruz.
            if (Object.keys(line.children[i + 1].format).includes(this.registry.get('format/cursor').formatName)) {
              cursorChildBorderControl = false;
            }
          }

          if (lineChildNodesWithNewFormat[lineChildNodesWithNewFormat.length - 1]) {
            // childen önceki eleman crusor mu değil mi kontrol ediyoruz.
            if (Object.keys(lineChildNodesWithNewFormat[lineChildNodesWithNewFormat.length - 1].format).includes(this.registry.get('format/cursor').formatName)) {
              cursorChildBorderControl = false;
            }
          }
        }

        if (cursorChildBorderControl || isChildCursor) {
          if (isChildCursor) {
            lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat });
          }

          // Önceki ya da sonraki eleman cursor değilse cursor ekliyoruz.
          if (cursorChildBorderControl) {
            newInlineFormat = { ...newInlineFormat, cursor: true };
            // Child'in sınırlarında index'in bulunması durumu.
            if (child.end === end || child.start === start) {
              // End'in yukarıda olma sebebi child'ten sonraya eklemek crusoru.
              if (child.end === end) {
                lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: child.format });
              }

              lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat });

              if (child.start === start) {
                lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: child.format });
              }
            } else {
              // Crusor sınır değerlerde değilse child'i bölüp cursor'u yerleştiriyoruz.
              const part1 = child.textContent.slice(0, borderStart);
              const part2 = '';
              const part3 = child.textContent.slice(borderEnd);

              lineChildNodesWithNewFormat.push({ textContent: part1, format: child.format });
              lineChildNodesWithNewFormat.push({ textContent: part2, format: newInlineFormat });
              lineChildNodesWithNewFormat.push({ textContent: part3, format: child.format });
            }

            // Cursor eklenirse cursorun length'i kadar child.length'i arrtırmak gerekiyor. cursor 1 karakter olduğundan bunu bu şekilde yaptık. Cursor sınıfından Cursor.Content.length çekilip bu ekleme yapılabilir.
            child.length++;
          }

          offsetLocation += child.length;

          return;
        }
        // CURSOR END

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

        // line.format sıralamada ilk geldiğinden ve block formatta ilk gelen key alındığındığından, blockFormat var ise ve içersinden aynı style yoksa line.formatın stylını geçersiz kılıyoruz.
        if (Object.keys(blockFormat).length && line.format[key] != null && blockFormat[key] == null) {
          delete newBlockFormat[key];
        }
      });
      line.format = newBlockFormat;
    });

    this.paper.initialize();
  }

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

    // elementin etkilenen kısımlarını tespit edit stillendiriyor.
    linesInRange.forEach((line) => {
      // Embed elementler farklı kaynaklardan gelen elementler olduğundan içlerinde text içeriğini bizim değiştirmemiz anlamsız oluyor. Bu yüzden eyer line Embed formatı içeriyorsa devam etmiyoruz.
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

        // line.format sıralamada ilk geldiğinden ve block formatta ilk gelen key alındığındığından, blockFormat var ise ve içersinden aynı style yoksa line.formatın stylını geçersiz kılıyoruz.
        if (Object.keys(blockFormat).length && line.format[key] != null && blockFormat[key] == null) {
          delete newBlockFormat[key];
        }
      });
      line.format = newBlockFormat;
    });

    this.paper.initialize();
  }

  formatText (start, end, format) {
    // format parametresini kayıtlı parametrelerin dışında kalanları çıkartıcak şekilde filtreliyor.

    // o rangenin arasında kalan elementleri filtreliyor.
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

    // elementin etkilenen kısımlarını tespit edit stillendiriyor.
    linesInRange.forEach((line) => {
      // Embed elementler farklı kaynaklardan gelen elementler olduğundan içlerinde text içeriğini bizim değiştirmemiz anlamsız oluyor. Bu yüzden eyer line Embed formatı içeriyorsa devam etmiyoruz.
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
      // getInRangeTextWithFormat line'ın textlerini parçalıyor. textler style'ına göre parçalanıyor. örneğin 'bu gece hava soğuk' tek parça gelirken 'bu gece <strong>hava</strong> soğuk' 3 parça halinde geliyor. parçalar array için obje halinde geliyor. [{'textContent': textcontent, 'format': ['bold', 'italic']}] gibi.

      // yukarıdan gelen array döngüye sokuluyor.
      let offsetLocation = 0;
      const lineChildNodesWithNewFormat = [];
      line.children.forEach((child, i) => {
        // Embed elementler farklı kaynaklardan gelen elementler olduğundan içlerinde text içeriğini bizim değiştirmemiz anlamsız oluyor. Bu yüzden eyer line Embed formatı içeriyorsa devam etmiyoruz.
        const isEmbed = Object.keys(child.format).some(v => {
          return this.EMBED_ELEMENT.has(v);
        });

        // tekrarlayan formatlar engelleniyor. birde zaten for olan format tekrar uygulanırsa onu siliyor.
        let newInlineFormat = { ...child.format, ...inlineFormat };
        Object.entries(newInlineFormat).forEach(([key, value]) => {
          if (value === false || !this.INLINE_ELEMENT.has(key) || blockedFormat.includes(key) || this.EMBED_ELEMENT.has(key)) {
            delete newInlineFormat[key];
          }
        });

        // her textContent'ın range içinde olup olmadığı kontrol ediliyor. rangenin başladığı konum textContent'i etkiliyorsa bağıl index hesaplanıyor. etkilenmiyorsa borderStart buradan false olarak geliyor.
        // start: seçili rangenin başlangıç konumu
        // line.start: ait olduğu line'nin başlangıç konumu
        // offsetLocation döngüden şimdiye kadar geçen textContent'lerin lenght'lerinin toplamı.
        let borderStart = start - (line.start + offsetLocation + child.length);
        // borderStart'ın sıfırdan küçük olması demek bu textContent içerisinde bir sınır bulunuyor anlamına geliyor. 0'dan büyük olması ise range'nin daha ileride başladığı anlamına geliyor.
        borderStart = (borderStart < 0) ? start - (line.start + offsetLocation) : false;
        // yine borderStart'ın sıfırdan küçük çıkmış olması başlangıç noktasının bundan daha önceki bir textContent'in içinde yer aldığını gösteriyor.
        if (borderStart < 0) {
          // end buranın öncesinde bitmesi rangenin bittiği anlamına geliyor. end'i kontrol etmemizin nedeni yukarıdaki mantıksal hesaplamanın sadece başlangıçı kontrol ediyor olması. yani rangenin sonu gelsede start noktasının ilerisinde yer alan bir index'i formatlanıcak olarak kabul ediyor. Onu aşağıdaki koşulda düzeltiyoruz. Range (yani formatlandırma için seçili alan) bitmediyse başlangıç noktasını geçerli textContent için 0 olarak alıyor.
          if (end <= line.start + offsetLocation) {
            borderStart = false;
          } else {
            borderStart = 0;
          }
        }

        // her textContent'ın range içinde olup olmadığı kontrol ediliyor. rangenin başladığı konum textContent'i etkiliyorsa bağıl index hesaplanıyor. Etkilenmiyorsa borderEnd buradan false olarak geliyor.
        // end: seçili rangenin başlangıç konumu
        // line.start: ait olduğu line'nin başlangıç konumu
        // offsetLocation döngüden şimdiye kadar geçen textContent'lerin lenght'lerinin toplamı.
        let borderEnd = end - (line.start + offsetLocation + child.length);
        // borderEnd'ın sıfırdan küçük olması demek bu textContent içerisinde bir sınır bulunuyor anlamına geliyor. 0'dan büyük olması ise range'nin daha ileride son bulduğu anlamına geliyor.
        borderEnd = (borderEnd < 0) ? end - (line.start + offsetLocation) : child.length;
        // Yukarıdan ne gelirse gelsin format false olursa end'te false olur. Başlangıçı olmayan bir olgunun bitişide olmaz. FormatStarts'ın neden false olduğu yukarıda yazıldı. borderEnd'te yukarıda mantıksal hesaplama borderStart'tan bağımsız olarak kontrol yapıyor. Alttaki koşullamayla bunu borderStart'la ilişkilendirdik. Bu olmazsa line'nin başında range'in dışında yer alan bir textContent formatlınıcakmış gibi gözüküyor.
        if (borderStart === false || (borderStart === 0 && borderEnd === 0) || isEmbed || child.textContent == null) {
          borderStart = false;
          borderEnd = false;
        }

        // CURSOR
        let cursorChildBorderControl = false;
        let isChildCursor = false;

        Object.entries(newInlineFormat).forEach(([key, value]) => {
          if (key === this.registry.get('format/cursor').formatName) {
            // range startını cursor lengthi (1) kadar küçülterek rangenin aralığını cursora göre doğru ayarlıyoruz. bunu yapmamız hemen altındaki koşulunda false dönmesine sebep oluyor.
            start--;
            // bu gelen child zaten crusor ise ona göre muamele yapıyoruz. burada onu belirledik aşşağıda yakalayacağız.
            isChildCursor = true;
          }
        });

        // yukarıda start pozisyonu değişmedi ise burada cursor yok manasına geliyor. bu yüzden bu child'i kontrol ediyoruz bu child'in sınırları içerisinde crusor koyucaksa koyuyoruz.
        if (start === end && child.start <= start && child.end >= end) {
          cursorChildBorderControl = true;
          // childden önceki ya da sonraki eleman crusorsa kontrol ediyoruz. sınır değerlerde (index'in en başta ya da en sonda olması durumunda iki defa cursor eklenmesine sebep olabiliyor.)
          if (line.children[i + 1]) {
            // bu child'den sonraki eleman cursor mu değil mi? onu kontrol ediyoruz.
            if (Object.keys(line.children[i + 1].format).includes(this.registry.get('format/cursor').formatName)) {
              cursorChildBorderControl = false;
            }
          }

          if (lineChildNodesWithNewFormat[lineChildNodesWithNewFormat.length - 1]) {
            // childen önceki eleman crusor mu değil mi kontrol ediyoruz.
            if (Object.keys(lineChildNodesWithNewFormat[lineChildNodesWithNewFormat.length - 1].format).includes(this.registry.get('format/cursor').formatName)) {
              cursorChildBorderControl = false;
            }
          }
        }

        if (cursorChildBorderControl || isChildCursor) {
          if (isChildCursor) {
            lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat });
          }

          // Önceki ya da sonraki eleman cursor değilse cursor ekliyoruz.
          if (cursorChildBorderControl) {
            newInlineFormat = { ...newInlineFormat, cursor: true };
            // Child'in sınırlarında index'in bulunması durumu.
            if (child.end === end || child.start === start) {
              // End'in yukarıda olma sebebi child'ten sonraya eklemek crusoru.
              if (child.end === end) {
                lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: child.format });
              }

              lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat });

              if (child.start === start) {
                lineChildNodesWithNewFormat.push({ textContent: child.textContent, format: child.format });
              }
            } else {
              // Crusor sınır değerlerde değilse child'i bölüp cursor'u yerleştiriyoruz.
              const part1 = child.textContent.slice(0, borderStart);
              const part2 = '';
              const part3 = child.textContent.slice(borderEnd);

              lineChildNodesWithNewFormat.push({ textContent: part1, format: child.format });
              lineChildNodesWithNewFormat.push({ textContent: part2, format: newInlineFormat });
              lineChildNodesWithNewFormat.push({ textContent: part3, format: child.format });
            }

            // Cursor eklenirse cursorun length'i kadar child.length'i arrtırmak gerekiyor. cursor 1 karakter olduğundan bunu bu şekilde yaptık. Cursor sınıfından Cursor.Content.length çekilip bu ekleme yapılabilir.
            child.length++;
          }

          offsetLocation += child.length;

          return;
        }
        // CURSOR END

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

  deleteContent (start, end, cleanLine = false) {
    if (start === end) return;
    const linesInRange = this.paper.getLines(start, end);

    const exportedContent = this.paper.exportContent(start, end);

    const borderLines = linesInRange.filter((line) => {
      // start !== line.start bu koşul en baştaki line'nin sadece çocuklarının silinmesini sağlıyor. eğer bütün lineleri kkomple silersek normal akışa ters oluyor.
      if ((line.start > start && line.end <= end) || (line.start >= start && line.end < end) || (line.start >= start && line.end <= end && cleanLine)) {
        const lineIndex = this.paper.lines.indexOf(line);

        this.paper.lines.splice(lineIndex, 1);
        line.domNode.parentNode.removeChild(line.domNode);

        // Bunu yapmamazın nedeni updatenin en baş/parent elemente yapılması lazım yoksa sayıları doğru güncellemiyor.
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
        if (child.end <= start || child.start >= end) { // child komple  sınırın dışında kalırsa
          remainingChildren.push(child);
        } else if (child.start >= start && child.end <= end) { // child sınırın içinde komple kalırsa
          // siliniyor
        } else if (child.start <= start && child.end >= end) { // sınır child'in içinden başlar ve biterse
          const remainingText1 = child.textContent.slice(0, start - child.start);
          remainingChildren.push({ textContent: remainingText1, format: child.format });

          if (Math.abs(end - child.end)) {
            const remainingText2 = child.textContent.slice(end - child.end);
            remainingChildren.push({ textContent: remainingText2, format: child.format });
          }
        } else if (child.start <= start) { // sınır child'in içinden başlarsa
          if (Math.abs(start - child.start)) {
            const remainingText = child.textContent.slice(0, start - child.start);
            remainingChildren.push({ textContent: remainingText, format: child.format });
          }
        } else if (child.end >= end) { // sınır child'in içinde sonlanırsa
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

    // line aralarındaki boşlukları kesiyor. lineları birleştiriyor.

    this.paper.initialize();
    this.history.save({ action: 'delete', caret: [start, end], content: exportedContent });
  }

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

  static help () {
    const lines = helpData.map(({ text, style }) => [`%c${text}\n`, style]);
    const messages = lines.map(([text]) => text);
    const styles = lines.flatMap(([_, style]) => style || '');

    console.log(messages.join(''), ...styles);
  }

  getContent (start, end) {
    return this.paper.exportContent(start, end);
  }

  setContent (contentArray) {
    this.paper.importContent(contentArray);
  }

  getText () {
    return this.root.textContent;
  }

  getLength () {
    return this.paper.getLength();
  }

  enable () {
    this.root.setAttribute('contenteditable', 'true');
  }

  disable () {
    this.root.setAttribute('contenteditable', 'false');
  }

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

  on (event, handler) {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    this._events.get(event).push(handler);

    return this;
  }

  off (event, handler) {
    if (!this._events.has(event)) return this;

    if (handler) {
      this._events.set(event, this._events.get(event).filter(h => h !== handler));
    } else {
      this._events.delete(event);
    }

    return this;
  }

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

  handleError (error, context = {}) {
    if (typeof this.onError === 'function') {
      try {
        this.onError(error, context);
      } catch (callbackError) {
        console.error('Yazman: onError callback threw an error.', callbackError);
      }
    } else {
      console.error('Yazman:', error.message || error, context);
    }
  }

  contains (parent, descendant) {
    try {
      // Firefox inserts inaccessible nodes around video elements
      descendant.parentNode;
    } catch (e) {
      return false;
    }

    return parent.contains(descendant);
  }
}

// Error boundary wrapper for public API methods
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
