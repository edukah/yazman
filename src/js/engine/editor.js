import Registry from './registry.js';
import Paper from './paper.js';
import Selection from './selection.js';
// import Range from './range.js';
import Event from './event.js';
import Observer from './observer.js';
import Toolbar from '../module/toolbar.js';
import Dialog from '../module/dialog.js';
import Clipboard from '../module/clipboard.js';
import History from '../module/history.js';
import Autosave from '../module/autosave.js';
import Language from '../language/language.js';
import helpData from '../docs/help.json';
// import Cursor from '../format/cursor.js';

const RegistryInstance = new Registry();
const formatSets = [];

class Editor {
  constructor (container, config = {}, exampleContent = false) {
    globalThis.__yazman = {};

    if (!(container instanceof globalThis.Element)) {
      console.warn('Please provide valid selector for Editor.');
      
      return;
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
    // this.range = new Range(this);
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
  }

  set isSaved (value) {
    this.autosave.saved = value;
  }

  get isSaved () {
    return this.autosave.saved;
  }

  static register (key, value) {
    RegistryInstance.set(key, value);
  }

  static addFormatSet (formatSet) {
    formatSets.push(formatSet);
  }

  update () {
    this.observer.complete();
    this.paper.generate();
    // this.selection.update();

    if (this.selection.changedCursorPosition()) {
      this.selection.setCaretPosition(this.selection.getMemCaretPosition());
    } else {
      this.selection.setMemCaretPosition(this.selection.getCaretPosition(), 'trusted');
    }

    this.event.update();
    this.toolbar.update();
  }

  // isEmpty(insertWarning = true, message = 'Boş bırakılamaz') {
  isEmpty (insertWarning = true, message = Language.get('notEmptyField')) {
    let result = false;

    if (this.root.childNodes.length <= 1) {
      result = this.paper.getLength() === 0;
    }
    /* else if (this.root.childNodes.length <= 1 && this.root.childNodes[0].textContent.replace(Cursor.content, '').length === 0 && this.paper.getLength()) {
         result = true;
       } */

    /* if (!result && this.root.childNodes.length <= 1 && !this.root.childNodes[0].textContent.replace(Cursor.content, '').length) {
      result = !this.paper.getLines().some(line => {
        return (line instanceof this.registry.get('pattern/inlineEmbed') || line instanceof this.registry.get('pattern/blockEmbed')) && line.getLength();
      });
    } */
    /*  else if (!textTrim && this.root.textContent.length === 0) {
          result = true;
        } */

    if (result && insertWarning && !this.root.hasAttribute('data-on-error')) {
      if (this.root.hasAttribute('data-yazman-placeholder')) {
        this.root.setAttribute('data-default-placeholder', this.root.getAttribute('data-yazman-placeholder'));
      }
      this.root.setAttribute('data-yazman-placeholder', message);
      this.root.setAttribute('data-on-error', 'true');
      this.root.style.borderColor = 'red';

      const eventKey = this.event.add({ type: ['keydown', 'input', 'paste'], function: () => this.isEmpty(insertWarning, message) });
      this.registry.set('editorIsEmptyEventKey', eventKey);
    } else if (!result && this.root.hasAttribute('data-on-error')) {
      this.root.removeAttribute('data-yazman-placeholder');
      this.root.removeAttribute('data-on-error');
      if (this.root.hasAttribute('data-default-placeholder')) {
        this.root.setAttribute('data-yazman-placeholder', this.root.getAttribute('data-default-placeholder'));
      }
      this.root.style.borderColor = '';

      this.event.delete(this.registry.get('editorIsEmptyEventKey'));
      this.registry.delete('editorIsEmptyEventKey');
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

    // console.log(rects);

    const rangeTopPosition = rects.y;

    const editorRects = this.root.getClientRects()[0];
    const editorbottomBorder = editorRects.y + editorRects.height;
    const editorTopBorder = editorRects.y;

    const editorStyle = this.root.currentStyle || globalThis.getComputedStyle(this.root);
    const editorTopBlankSpace = globalThis.parseInt(editorStyle.marginTop) + globalThis.parseInt(editorStyle.paddingTop);
    const editorBottomBlankSpace = globalThis.parseInt(editorStyle.marginBottom) + globalThis.parseInt(editorStyle.paddingBottom);

    /* console.log('editorTopBlankSpace', editorTopBlankSpace);
    console.log('editorBottomBlankSpace', editorBottomBlankSpace);

    console.log('editorRects', this.root.getClientRects());
    console.log('editorbottomBorder', editorbottomBorder);
    console.log('editorTopBorder', editorTopBorder);
    console.log('rangeTopPosition', rangeTopPosition);
    console.log('editorStyle', editorStyle); */

    if (rangeTopPosition < editorTopBorder) {
      // console.log('burada 1');

      // console.log('scrollTop:', this.root.scrollTop);
      // console.log('1', Math.abs(rangeTopPosition - editorTopBorder));
      this.root.scrollTop -= Math.abs(rangeTopPosition - editorTopBorder - editorTopBlankSpace);
      // console.log(this.root.scrollTop);
    }

    if (rangeTopPosition > editorbottomBorder) {
      // console.log('burada 2');
      // console.log(this.root.scrollTop);
      this.root.scrollTop += Math.abs(rangeTopPosition - editorbottomBorder + rects.height + editorBottomBlankSpace);
      // console.log(this.root.scrollTop);
    }

    // console.log('----------------');
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
    this.root.scrollTop = this.variables.get('editorScrollTopPosition');
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

    /* const blockFormatKey = Object.keys(format).find(key => {
      return this.BLOCK_LEVEL_ELEMENT.has(key);
    }); */

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
    // debugger;

    if (Object.keys(blockFormat).length && generateBlock) {
      let referenceLine = currentLine;

      // console.log(referenceLine);
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
      if (currentLine.start === index && currentLine.start !== currentLine.end) { /* && currentLine.start !== currentLine.end */
        // console.log('burada');
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

    // save history {action: 'insert', caretIndex: [start, end], content: ['string', {object}] };

    // save history {action: 'delete', caretIndex: [start, end], content: ['string', {object}] };

    return null;
  }

  format (start, end, format) {
    // console.log(start, end, format);
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
      // if (this.FORMAT_SETS.has(key)) arr = arr.concat(key);

      return arr;
    }, []);

    /* const blockFormat = {};
    const inlineFormat = {};
    let blockedFormat = [];
    Object.entries(format).forEach(([key, value]) => {
      if (this.BLOCK_LEVEL_ELEMENT.has(key)) {
        blockFormat[key] = value;
      }

      if (this.INLINE_ELEMENT.has(key)) {
        inlineFormat[key] = value;
      }

      if (this.FORMAT_SETS.has(key)) {
        blockedFormat = blockedFormat.concat(this.FORMAT_SETS.get(key));
      }
    });

    console.log(blockFormat, inlineFormat, blockedFormat);
    console.log(...this.formatFilter(format)); */

    // elementin etkilenen kısımlarını tespit edit stillendiriyor.
    // const range = this.selection.getRangeAt(0);
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
      // const lineTextContentsWithFormat = this.getInRangeTextWithFormat(line);

      // yukarıdan gelen array döngüye sokuluyor.
      let offsetLocation = 0;
      const lineChildNodesWithNewFormat = [];
      line.children.forEach((child, i) => {
        // Embed elementler farklı kaynaklardan gelen elementler olduğundan içlerinde text içeriğini bizim değiştirmemiz anlamsız oluyor. Bu yüzden eyer line Embed formatı içeriyorsa devam etmiyoruz.
        const isEmbed = Object.keys(child.format).some(v => {
          return this.EMBED_ELEMENT.has(v);
        });

        /* if (isContainEmbed || child.textContent == null) {
          offsetLocation += child.length;
          lineChildNodesWithNewFormat.push({ textContent: null, format: child.format });

          return;
        } */

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
            // lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat, start: start, end: start + 1 });
            // lineChildNodesWithNewFormat.push({ ...child, textContent: '', format: newInlineFormat });
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
              // lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat, start: start, end: start + 1 });

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
              // lineChildNodesWithNewFormat.push({ textContent: part2, format: newInlineFormat, start: start, end: start + 1 });
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

      // console.log(lineChildNodesWithNewFormat);
      // debugger;

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
    // console.log(...this.paper.lines);
    // debugger;
    // save history {action: 'format', caretIndex: [start, end], value: [oldFormat, newFormat] };
    /* this.formatLine(start, end, format);
    this.formatText(start, end, format); */
  }

  formatLine (start, end, format) {
    const linesInRange = this.paper.getLines(start, end);
    const rangeFormat = this.paper.getFormat(start, end);

    Object.keys(rangeFormat).forEach((key) => {
      if (format[key] && format[key] === rangeFormat[key]) {
        format[key] = false;
      }
    });

    // let { blockFormat, inlineFormat } = this.formatFilter(format);
    /* const blockFormat = {};
    Object.entries(format).forEach(([key, value]) => {
      if (this.BLOCK_LEVEL_ELEMENT.has(key)) {
        blockFormat[key] = value;
      }
    }); */

    let blockFormat = Object.entries(format).reduce((obj, [key, value]) => {
      if (Object.keys(obj).length) return obj;

      if (this.BLOCK_LEVEL_ELEMENT.has(key)) obj[key] = value;

      return obj;
    }, {});

    // elementin etkilenen kısımlarını tespit edit stillendiriyor.
    // const range = this.selection.getRangeAt(0);
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
    // console.log(start, end, format);
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

    // let { inlineFormat } = this.formatFilter(format);

    const blockedFormat = Object.entries(format).reduce((arr, [key, value]) => {
      if (this.FORMAT_SETS.has(key)) arr = arr.concat(this.FORMAT_SETS.get(key));
      // if (this.FORMAT_SETS.has(key)) arr = arr.concat(key);

      return arr;
    }, []);

    /* const blockFormat = {};
    const inlineFormat = {};
    let blockedFormat = [];
    Object.entries(format).forEach(([key, value]) => {
      if (this.BLOCK_LEVEL_ELEMENT.has(key)) {
        blockFormat[key] = value;
      }

      if (this.INLINE_ELEMENT.has(key)) {
        inlineFormat[key] = value;
      }

      if (this.FORMAT_SETS.has(key)) {
        blockedFormat = blockedFormat.concat(this.FORMAT_SETS.get(key));
      }
    });

    console.log(blockFormat, inlineFormat, blockedFormat);
    console.log(...this.formatFilter(format)); */

    // elementin etkilenen kısımlarını tespit edit stillendiriyor.
    // const range = this.selection.getRangeAt(0);
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
      // const lineTextContentsWithFormat = this.getInRangeTextWithFormat(line);

      // yukarıdan gelen array döngüye sokuluyor.
      let offsetLocation = 0;
      const lineChildNodesWithNewFormat = [];
      line.children.forEach((child, i) => {
        // Embed elementler farklı kaynaklardan gelen elementler olduğundan içlerinde text içeriğini bizim değiştirmemiz anlamsız oluyor. Bu yüzden eyer line Embed formatı içeriyorsa devam etmiyoruz.
        const isEmbed = Object.keys(child.format).some(v => {
          return this.EMBED_ELEMENT.has(v);
        });

        /* if (isContainEmbed || child.textContent == null) {
          offsetLocation += child.length;
          lineChildNodesWithNewFormat.push({ textContent: null, format: child.format });

          return;
        } */

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
            // lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat, start: start, end: start + 1 });
            // lineChildNodesWithNewFormat.push({ ...child, textContent: '', format: newInlineFormat });
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
              // lineChildNodesWithNewFormat.push({ textContent: '', format: newInlineFormat, start: start, end: start + 1 });

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
              // lineChildNodesWithNewFormat.push({ textContent: part2, format: newInlineFormat, start: start, end: start + 1 });
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

      // console.log(lineChildNodesWithNewFormat);
      // debugger;

      /* line.changeStatus = true;
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
      line.format = newBlockFormat; */
    });

    this.paper.initialize();
    // console.log(...this.paper.lines);
    // debugger;
    // save history {action: 'format', caretIndex: [start, end], value: [oldFormat, newFormat] };
  }

  deleteContent (start, end, cleanLine = false) {
    if (start === end) return;
    const linesInRange = this.paper.getLines(start, end);

    const exportedContent = this.paper.exportContent(start, end);
    // const removedElement = [];
    /* console.log(start, end);
    console.log(preserveBlock); */
    // console.log(linesInRange);
    // debugger;

    // debugger;
    const borderLines = linesInRange.filter((line) => {
      // start !== line.start bu koşul en baştaki line'nin sadece çocuklarının silinmesini sağlıyor. eğer bütün lineleri kkomple silersek normal akışa ters oluyor.
      // console.log('line.start: ', line.start, 'start: ', start, 'line.end: ', line.end, 'end: ', end);
      // if (line.start >= start && line.end <= end && (start !== line.start || clean)) {
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
      // let offsetLocation = 0;
      // debugger;
      line.children.forEach((child) => {
        // debugger;
        if (child.end <= start || child.start >= end) { // child komple  sınırın dışında kalırsa
          remainingChildren.push(child);
        } else if (child.start >= start && child.end <= end) { // child sınırın içinde komple kalırsa
          // child.domNode.parentNode.removeChild(child.domNode);
        } else if (child.start <= start && child.end >= end) { // sınır child'in içinden başlar ve biterse
          const remainingText1 = child.textContent.slice(0, start - child.start);
          remainingChildren.push({ textContent: remainingText1, format: child.format });

          if (Math.abs(end - child.end)) {
            const remainingText2 = child.textContent.slice(end - child.end);
            remainingChildren.push({ textContent: remainingText2, format: child.format });
          }

          // child.domNode.parentNode.removeChild(child.domNode);
        } else if (child.start <= start) { // sınır child'in içinden başlarsa
          if (Math.abs(start - child.start)) {
            const remainingText = child.textContent.slice(0, start - child.start);
            remainingChildren.push({ textContent: remainingText, format: child.format });
          }

          // child.domNode.parentNode.removeChild(child.domNode);
        } else if (child.end >= end) { // sınır child'in içinde sonlanırsa
          if (Math.abs(end - child.end)) {
            const remainingText2 = child.textContent.slice(end - child.end);
            remainingChildren.push({ textContent: remainingText2, format: child.format });
          }

          // child.domNode.parentNode.removeChild(child.domNode);
        }
        /* let borderStart = start - (line.start + offsetLocation + child.length);
        borderStart = (borderStart < 0) ? start - (line.start + offsetLocation) : false;

        if (borderStart < 0) {
          if (end <= line.start + offsetLocation) {
            borderStart = false;
          } else {
            borderStart = 0;
          }
        }

        let borderEnd = end - (line.start + offsetLocation + child.length);
        borderEnd = (borderEnd < 0) ? end - (line.start + offsetLocation) : child.length;


        if (borderStart === false) {
          borderEnd = false;
        }

        if (borderStart === false && borderEnd === false) {
          remainingChildren.push(child);
        }

        if (borderStart === 0) {
          if (borderEnd === child.length) {
            child.domNode.parentNode.removeChild(child.domNode);
          } else {
            const remainingText = child.textContent.slice(borderEnd);
            remainingChildren.push({ textContent: remainingText, format: child.format });

            child.domNode.parentNode.removeChild(child.domNode);
          }
        }

        if (borderStart > 0) {
          if (borderEnd === child.length) {
            const remainingText = child.textContent.slice(0, borderStart);
            remainingChildren.push({ textContent: remainingText, format: child.format });

            child.domNode.parentNode.removeChild(child.domNode);
          } else {
            const remainingText1 = child.textContent.slice(0, borderStart);
            const remainingText2 = child.textContent.slice(borderEnd);

            remainingChildren.push({ textContent: remainingText1, format: child.format });
            remainingChildren.push({ textContent: remainingText2, format: child.format });

            child.domNode.parentNode.removeChild(child.domNode);
          }
        }

        offsetLocation += child.length; */
      });

      line.children = remainingChildren;
      line.changeStatus = true;
    });

    /* if (borderLines.length === 2) {
      this.formatText(end, end, borderLines[0].format);

      const endLine = this.paper.getLine(end);
    } */
    if (borderLines.length === 2) {
      this.formatText(start + 1, start + 1, borderLines[0].format);

      const newLine = this.paper.getLine(end);
      newLine.domNode.parentNode.removeChild(newLine.domNode);
      newLine.children.forEach(child => {
        // instanceof embed te olabilir.
        if (child.textContent && child.textContent.trim().length) {
          borderLines[0].children.push(child);
        }
      });

      borderLines[0].changeStatus = true;
    }

    /* console.log(borderLines);
    debugger; */

    // line aralarındaki boşlukları kesiyor. lineları birleştiriyor.
    /* if (borderLines[0] != null) {
      borderLines[0].children = remainingChildren;
      borderLines[0].changeStatus = true;
    } */

    /* if (borderLines[1] != null) {
      borderLines[1].domNode.parentNode.removeChild(borderLines[1].domNode);
    } */

    // debugger;

    this.paper.initialize();
    this.history.save({ action: 'delete', caret: [start, end], content: exportedContent });

    // save history {action: 'delete', caretIndex: [start, end], value: [{object}] };
    // object means line
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

export default Editor;
